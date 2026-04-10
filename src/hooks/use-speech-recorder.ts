"use client";

import { useCallback, useRef, useState } from "react";
import { parseAzureResult } from "@/lib/azure/parse-result";
import { getAzureSpeechToken } from "@/lib/azure/token";
import { computeOverallScore } from "@/lib/scoring";
import type { PracticeResult } from "@/types";

// ── State machine ─────────────────────────────────────────────────────────────

export type RecorderState =
  | "idle"
  | "requesting-mic"
  | "recording"
  | "processing"
  | "done"
  | "error";

export interface SpeechRecorderReturn {
  state: RecorderState;
  result: PracticeResult | null;
  error: string | null;
  mediaStream: MediaStream | null;
  audioBlob: Blob | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpeechRecorder(referenceText: string): SpeechRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs for cleanup — not part of render state
  const recognizerRef = useRef<
    import("microsoft-cognitiveservices-speech-sdk").SpeechRecognizer | null
  >(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Cleanup helpers ──────────────────────────────────────────────────────────

  const stopMediaRecorder = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
        return;
      }
      mr.addEventListener(
        "stop",
        () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          resolve(blob);
        },
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

  // ── start ────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    // Reset leftover state
    setResult(null);
    setError(null);
    setAudioBlob(null);
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

    // 2. Fetch Azure token
    let token: string;
    let region: string;
    try {
      ({ token, region } = await getAzureSpeechToken());
    } catch {
      releaseStream();
      setState("error");
      setError("Connection error");
      return;
    }

    // 3. Lazy-load SDK (~5 MB)
    let SDK: typeof import("microsoft-cognitiveservices-speech-sdk");
    try {
      SDK = await import("microsoft-cognitiveservices-speech-sdk");
    } catch {
      releaseStream();
      setState("error");
      setError("Connection error");
      return;
    }

    // 4. SpeechConfig
    const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = "en-US";

    // 5. PronunciationAssessmentConfig
    const pronunciationConfig = new SDK.PronunciationAssessmentConfig(
      referenceText,
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.Phoneme,
      true, // enableMiscue
    );
    pronunciationConfig.enableProsodyAssessment = true;

    // 6. AudioConfig from default mic
    const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();

    // 7. SpeechRecognizer
    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);
    recognizerRef.current = recognizer;

    // 9. MediaRecorder for audio playback capture
    const mr = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(100); // collect in 100 ms slices

    setState("recording");

    // 8. Recognition
    recognizer.recognizeOnceAsync(
      async (sdkResult) => {
        setState("processing");

        // Capture audio first
        const blob = await stopMediaRecorder();
        releaseStream();

        // Check for no-speech / cancelled results
        const ResultReason = SDK.ResultReason;
        if (sdkResult.reason === ResultReason.NoMatch) {
          setState("error");
          setError("No speech detected");
          recognizerRef.current = null;
          return;
        }
        if (sdkResult.reason === ResultReason.Canceled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const details = SDK.CancellationDetails.fromResult(sdkResult as any);
          const msg =
            details.ErrorCode === SDK.CancellationErrorCode.ConnectionFailure
              ? "Connection error"
              : details.ErrorCode === SDK.CancellationErrorCode.ServiceTimeout
                ? "Speech service timed out"
                : details.errorDetails?.includes("timeout")
                  ? "Speech service timed out"
                  : "Speech service timed out";
          setState("error");
          setError(msg);
          recognizerRef.current = null;
          return;
        }

        // Parse and score
        try {
          const parsed = parseAzureResult(sdkResult, blob);
          const overallScore = computeOverallScore(parsed, parsed.words);
          const final: PracticeResult = { ...parsed, overallScore };
          setAudioBlob(blob);
          setResult(final);
          setState("done");
        } catch (err) {
          setState("error");
          setError(err instanceof Error ? err.message : "Failed to parse result");
        }

        recognizerRef.current = null;
      },
      (err: string) => {
        void stopMediaRecorder().then(() => releaseStream());
        const lower = (err ?? "").toLowerCase();
        const msg = lower.includes("timeout")
          ? "Speech service timed out"
          : lower.includes("no speech")
            ? "No speech detected"
            : "Connection error";
        setState("error");
        setError(msg);
        recognizerRef.current = null;
      },
    );
  }, [referenceText, releaseStream, stopMediaRecorder]);

  // ── stop ─────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    // recognizeOnceAsync stops on silence or when the audio stream ends.
    // Closing the mic stream signals end-of-audio, which triggers the SDK
    // to finalize and return the result through the recognizeOnceAsync callback.
    void stopMediaRecorder().then(() => {
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      streamRef.current = null;
      setMediaStream(null);
    });
  }, [stopMediaRecorder]);

  // ── reset ────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    recognizerRef.current?.stopContinuousRecognitionAsync();
    void stopMediaRecorder().then(() => releaseStream());
    recognizerRef.current = null;
    setState("idle");
    setResult(null);
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
  }, [releaseStream, stopMediaRecorder]);

  return {
    state,
    result,
    error,
    mediaStream,
    audioBlob,
    start,
    stop,
    reset,
  };
}
