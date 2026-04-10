"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── State machine ────────────────────────────────────────────────────────────

export type YapRecorderState =
  | "idle"
  | "requesting-mic"
  | "recording"
  | "processing"
  | "done"
  | "error";

/** Default yap duration in milliseconds. */
export const YAP_DURATION_MS = 2 * 60 * 1000;

export interface YapRecorderReturn {
  state: YapRecorderState;
  /** Accumulated finalized transcript (all `recognized` phrases joined). */
  transcript: string;
  /** Current interim text (from last `recognizing` event). */
  interimText: string;
  /** Milliseconds remaining in the 2-minute window. */
  remainingMs: number;
  /** Total elapsed ms when recording finished (only valid after `done`). */
  durationMs: number;
  mediaStream: MediaStream | null;
  audioBlob: Blob | null;
  error: string | null;
  start: (token: string, region: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Plain continuous speech-to-text recorder for the Yap mode.
 *
 * Differences from `use-realtime-recorder`:
 *   - No PronunciationAssessmentConfig (plain STT only)
 *   - Accumulates a raw transcript string instead of mapping to reference words
 *   - Auto-stops at YAP_DURATION_MS
 *   - Exposes a countdown via `remainingMs`
 */
export function useYapRecorder(): YapRecorderReturn {
  const [state, setState] = useState<YapRecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [remainingMs, setRemainingMs] = useState(YAP_DURATION_MS);
  const [durationMs, setDurationMs] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup & async access
  const recognizerRef = useRef<
    import("microsoft-cognitiveservices-speech-sdk").SpeechRecognizer | null
  >(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  // ── Cleanup helpers ────────────────────────────────────────────────────────

  const stopMediaRecorder = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
        return;
      }
      mr.addEventListener(
        "stop",
        () => resolve(new Blob(chunksRef.current, { type: "audio/webm" })),
        { once: true },
      );
      mr.stop();
    });
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  // ── stop ───────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current;
    clearTimers();
    if (!recognizer) return;

    setState("processing");
    const duration = Date.now() - startTimeRef.current;
    setDurationMs(duration);

    const finalize = async () => {
      const blob = await stopMediaRecorder();
      releaseStream();
      setAudioBlob(blob);
      setInterimText("");
      setState("done");
      recognizerRef.current = null;
    };

    recognizer.stopContinuousRecognitionAsync(
      () => {
        void finalize();
      },
      () => {
        void finalize();
      },
    );
  }, [stopMediaRecorder, releaseStream, clearTimers]);

  // ── start ──────────────────────────────────────────────────────────────────

  const start = useCallback(
    async (token: string, region: string) => {
      setTranscript("");
      setInterimText("");
      setAudioBlob(null);
      setError(null);
      setDurationMs(0);
      setRemainingMs(YAP_DURATION_MS);
      chunksRef.current = [];

      // 1. Request mic
      setState("requesting-mic");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setState("error");
        setError("Microphone access denied");
        return;
      }
      streamRef.current = stream;
      setMediaStream(stream);

      // 2. Lazy-load SDK
      let SDK: typeof import("microsoft-cognitiveservices-speech-sdk");
      try {
        SDK = await import("microsoft-cognitiveservices-speech-sdk");
      } catch {
        releaseStream();
        setState("error");
        setError("Connection error");
        return;
      }

      // 3. SpeechConfig — plain STT, no pronunciation assessment
      const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";

      // 4. AudioConfig from existing stream
      const audioConfig = SDK.AudioConfig.fromStreamInput(stream);

      // 5. SpeechRecognizer (no PronunciationAssessmentConfig)
      const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // 6. MediaRecorder for audio capture
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(100);

      startTimeRef.current = Date.now();
      setState("recording");

      // ── Events ─────────────────────────────────────────────────────────────

      recognizer.recognizing = (_sender, event) => {
        const text = event.result?.text ?? "";
        setInterimText(text);
      };

      recognizer.recognized = (_sender, event) => {
        if (event.result.reason !== SDK.ResultReason.RecognizedSpeech) return;
        const text = event.result.text?.trim();
        if (!text) return;
        setTranscript((prev) => (prev ? `${prev} ${text}` : text));
        setInterimText("");
      };

      recognizer.canceled = (_sender, event) => {
        if (event.reason === SDK.CancellationReason.EndOfStream) return;
        const details = event.errorDetails || "";
        if (details.includes("timeout")) return;

        clearTimers();
        void stopMediaRecorder().then(() => releaseStream());
        setState("error");
        setError("Connection error");
        recognizerRef.current = null;
      };

      // 7. Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {},
        (err: string) => {
          clearTimers();
          void stopMediaRecorder().then(() => releaseStream());
          setState("error");
          setError(err?.includes("timeout") ? "Speech service timed out" : "Connection error");
          recognizerRef.current = null;
        },
      );

      // 8. Countdown interval (updates `remainingMs` every 100ms)
      countdownRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const left = Math.max(0, YAP_DURATION_MS - elapsed);
        setRemainingMs(left);
      }, 100);

      // 9. Auto-stop timer
      autoStopRef.current = window.setTimeout(() => {
        stop();
      }, YAP_DURATION_MS);
    },
    [releaseStream, stopMediaRecorder, clearTimers, stop],
  );

  // ── reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(
        () => {},
        () => {},
      );
    }
    clearTimers();
    void stopMediaRecorder().then(() => releaseStream());
    recognizerRef.current = null;
    setState("idle");
    setTranscript("");
    setInterimText("");
    setRemainingMs(YAP_DURATION_MS);
    setDurationMs(0);
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
  }, [releaseStream, stopMediaRecorder, clearTimers]);

  // ── Unmount cleanup ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimers();
      const recognizer = recognizerRef.current;
      if (recognizer) {
        recognizer.stopContinuousRecognitionAsync(
          () => {},
          () => {},
        );
      }
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
    };
  }, [clearTimers]);

  return {
    state,
    transcript,
    interimText,
    remainingMs,
    durationMs,
    mediaStream,
    audioBlob,
    error,
    start,
    stop,
    reset,
  };
}
