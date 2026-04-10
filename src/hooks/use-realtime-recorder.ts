"use client";

import { useCallback, useRef, useState } from "react";
import { parsePhraseResult } from "@/lib/azure/parse-result";
import { generateDetailedFeedback } from "@/lib/feedback";
import { computeRollingWpm } from "@/lib/pace";
import { computeOverallScore } from "@/lib/scoring";
import { generateSuggestion } from "@/lib/suggestions";
import { getActiveWordIndex, matchCursorPosition } from "@/lib/word-matcher";
import { useSpeechStore } from "@/stores/speech";
import type { PhraseResult, PracticeResult, WordScore } from "@/types";

// ── State machine ─────────────────────────────────────────────────────────────

export type RealtimeState =
  | "idle"
  | "requesting-mic"
  | "recording"
  | "processing"
  | "done"
  | "error";

export interface RealtimeRecorderReturn {
  state: RealtimeState;
  result: PracticeResult | null;
  error: string | null;
  mediaStream: MediaStream | null;
  audioBlob: Blob | null;
  start: (token: string, region: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeRecorder(referenceText: string): RealtimeRecorderReturn {
  const [state, setState] = useState<RealtimeState>("idle");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs for cleanup
  const recognizerRef = useRef<
    import("microsoft-cognitiveservices-speech-sdk").SpeechRecognizer | null
  >(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Accumulator refs for continuous recognition results
  const phrasesRef = useRef<PhraseResult[]>([]);
  const scoredWordsRef = useRef<Map<number, WordScore>>(new Map());
  const nextRefIndexRef = useRef(0);

  const referenceWordsRef = useRef<string[]>([]);
  referenceWordsRef.current = referenceText.split(/\s+/).filter(Boolean);

  const startTimeRef = useRef<number>(0);

  // RAF buffer for high-frequency recognizing events
  const rafRef = useRef<number | null>(null);
  const interimBufferRef = useRef<string | null>(null);

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

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    interimBufferRef.current = null;
  }, []);

  // ── Aggregate final result from all phrases ──────────────────────────────────

  const buildFinalResult = useCallback(
    (blob: Blob): PracticeResult => {
      const phrases = phrasesRef.current;
      const refWords = referenceWordsRef.current;
      const scoredMap = scoredWordsRef.current;
      const durationMs = Date.now() - startTimeRef.current;

      const finalWords: WordScore[] = refWords.map((word, i) => {
        const scored = scoredMap.get(i);
        if (scored) return scored;
        return {
          word,
          accuracyScore: 0,
          errorType: "omission" as const,
          phonemes: [],
        };
      });

      // Aggregate phrase-level scores (weighted by word count)
      let totalAcc = 0;
      let totalFlu = 0;
      let totalComp = 0;
      let totalPros = 0;
      let prosodyCount = 0;
      let totalWords = 0;

      for (const phrase of phrases) {
        const w = phrase.words.length;
        totalAcc += phrase.accuracyScore * w;
        totalFlu += phrase.fluencyScore * w;
        totalComp += phrase.completenessScore * w;
        if (phrase.prosodyScore !== null) {
          totalPros += phrase.prosodyScore * w;
          prosodyCount += w;
        }
        totalWords += w;
      }

      const safeDiv = totalWords || 1;
      const accuracyScore = totalAcc / safeDiv;
      const fluencyScore = totalFlu / safeDiv;

      const spokenCount = finalWords.filter((w) => w.errorType !== "omission").length;
      const completenessScore =
        refWords.length > 0 ? (spokenCount / refWords.length) * 100 : totalComp / safeDiv;

      const prosodyScore = prosodyCount > 0 ? totalPros / prosodyCount : null;

      const wordCount = finalWords.filter((w) => w.errorType !== "insertion").length;
      const wpm = durationMs > 0 ? Math.round((wordCount / durationMs) * 60_000) : 0;

      const suggestion = generateSuggestion(finalWords);

      // Count hesitations
      let hesitationCount = 0;
      for (let i = 0; i < finalWords.length - 1; i++) {
        const curr = finalWords[i];
        const next = finalWords[i + 1];
        if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
          const gap = next.offsetMs - (curr.offsetMs + curr.durationMs);
          if (gap > 800) hesitationCount++;
        }
      }

      const partial: PracticeResult = {
        overallScore: 0,
        accuracyScore,
        fluencyScore,
        completenessScore,
        prosodyScore,
        words: finalWords,
        hesitationCount,
        durationMs,
        wpm,
        audioBlob: blob,
        suggestion,
        detailedFeedback: null,
      };

      const withScore = {
        ...partial,
        overallScore: computeOverallScore(partial, finalWords),
      };

      // Generate detailed feedback
      withScore.detailedFeedback = generateDetailedFeedback(withScore, referenceText);

      return withScore;
    },
    [referenceText],
  );

  // ── start ────────────────────────────────────────────────────────────────────

  const start = useCallback(
    async (token: string, region: string) => {
      setResult(null);
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      phrasesRef.current = [];
      scoredWordsRef.current = new Map();
      nextRefIndexRef.current = 0;
      useSpeechStore.getState().reset();

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

      // 3. SpeechConfig — with reduced segmentation timeout for faster phrase scoring
      const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";
      speechConfig.setProperty("Speech_SegmentationSilenceTimeoutMs", "500");

      // 4. PronunciationAssessmentConfig
      const pronunciationConfig = new SDK.PronunciationAssessmentConfig(
        referenceText,
        SDK.PronunciationAssessmentGradingSystem.HundredMark,
        SDK.PronunciationAssessmentGranularity.Phoneme,
        false,
      );
      pronunciationConfig.enableProsodyAssessment = true;

      // 5. AudioConfig — use the stream we already have (avoids double mic request,
      //    and makes segmentation timeout more reliable in the JS SDK)
      const audioConfig = SDK.AudioConfig.fromStreamInput(stream);

      // 6. SpeechRecognizer
      const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);
      recognizerRef.current = recognizer;

      // 7. MediaRecorder for audio playback capture
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

      // ── RAF flush loop for interim updates ─────────────────────────────────

      const flushInterim = () => {
        const text = interimBufferRef.current;
        if (text !== null) {
          const refWords = referenceWordsRef.current;
          const startFrom = nextRefIndexRef.current;
          const activeIdx = getActiveWordIndex(text, refWords, startFrom);

          // Move cursor
          useSpeechStore.getState().moveCursor(activeIdx);

          // Compute interim word indices (between last scored and cursor)
          const interimIndices: number[] = [];
          for (let i = startFrom; i <= activeIdx && i < refWords.length; i++) {
            if (!scoredWordsRef.current.has(i)) {
              interimIndices.push(i);
            }
          }
          useSpeechStore.getState().setInterimWords(interimIndices);

          interimBufferRef.current = null;
        }
        rafRef.current = requestAnimationFrame(flushInterim);
      };
      rafRef.current = requestAnimationFrame(flushInterim);

      // ── Event: recognizing (interim) → buffer for RAF ────────────────────

      recognizer.recognizing = (_sender, event) => {
        const text = event.result?.text;
        if (!text) return;
        // Write to buffer — RAF loop picks it up once per frame
        interimBufferRef.current = text;
      };

      // ── Event: recognized (final) → score phrase words ────────────────────

      recognizer.recognized = (_sender, event) => {
        const ResultReason = SDK.ResultReason;
        if (event.result.reason !== ResultReason.RecognizedSpeech) return;

        const recognizedText = event.result.text;
        const phrase = parsePhraseResult(event.result);

        if (process.env.NODE_ENV === "development") {
          console.log("[recognized]", {
            text: recognizedText,
            hasPhrase: !!phrase,
            phraseWords: phrase?.words.map((w) => `${w.word}(${w.accuracyScore})`),
          });
        }

        const refWords = referenceWordsRef.current;
        const startIdx = nextRefIndexRef.current;

        if (phrase) {
          phrasesRef.current.push(phrase);

          // Map scored words to reference words using greedy fuzzy matching
          const nonInsertionWords = phrase.words.filter((w) => w.errorType !== "insertion");
          let refI = startIdx;
          let lastMappedRef = startIdx - 1;
          const maxSkip = 2;

          for (const scoredWord of nonInsertionWords) {
            let matched = false;
            for (let skip = 0; skip <= maxSkip && refI + skip < refWords.length; skip++) {
              const refNorm = refWords[refI + skip].toLowerCase().replace(/[^a-z0-9']/g, "");
              const spokenNorm = scoredWord.word.toLowerCase().replace(/[^a-z0-9']/g, "");
              if (
                refNorm === spokenNorm ||
                refNorm.startsWith(spokenNorm) ||
                spokenNorm.startsWith(refNorm)
              ) {
                scoredWordsRef.current.set(refI + skip, scoredWord);
                lastMappedRef = refI + skip;
                refI = refI + skip + 1;
                matched = true;
                break;
              }
            }
            if (!matched) {
              if (refI < refWords.length) {
                scoredWordsRef.current.set(refI, scoredWord);
                lastMappedRef = refI;
                refI++;
              }
            }
          }

          const endIdx = lastMappedRef >= startIdx ? lastMappedRef : startIdx - 1;
          nextRefIndexRef.current = endIdx + 1;

          // Update Zustand store
          const s = useSpeechStore.getState();
          s.scoreWords(phrase.words, startIdx);
          s.moveCursor(endIdx + 1);

          // Compute rolling WPM
          const allScored = Array.from(scoredWordsRef.current.values());
          const elapsed = Date.now() - startTimeRef.current;
          const pace = computeRollingWpm(allScored, elapsed, s.currentPace?.level);
          if (pace) s.updatePace(pace);
        } else if (recognizedText) {
          const endIdx = matchCursorPosition(recognizedText, refWords, startIdx);
          if (endIdx >= startIdx) {
            nextRefIndexRef.current = endIdx + 1;
            useSpeechStore.getState().moveCursor(endIdx + 1);
          }
        }
      };

      // ── Event: canceled → handle errors ───────────────────────────────────

      recognizer.canceled = (_sender, event) => {
        if (event.reason === SDK.CancellationReason.EndOfStream) return;
        const details = event.errorDetails || "";
        if (details.includes("timeout")) return;

        cancelRaf();
        void stopMediaRecorder().then(() => releaseStream());
        setState("error");
        setError("Connection error");
        recognizerRef.current = null;
      };

      // ── Event: session stopped ────────────────────────────────────────────

      recognizer.sessionStopped = () => {
        // Finalization happens in stop()
      };

      // 8. Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {},
        (err: string) => {
          cancelRaf();
          void stopMediaRecorder().then(() => releaseStream());
          setState("error");
          setError(err?.includes("timeout") ? "Speech service timed out" : "Connection error");
          recognizerRef.current = null;
        },
      );
    },
    [referenceText, releaseStream, stopMediaRecorder, buildFinalResult, cancelRaf],
  );

  // ── stop ─────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return;

    cancelRaf();
    setState("processing");

    recognizer.stopContinuousRecognitionAsync(
      async () => {
        const blob = await stopMediaRecorder();
        releaseStream();

        const finalResult = buildFinalResult(blob);
        setAudioBlob(blob);
        setResult(finalResult);
        setState("done");
        recognizerRef.current = null;
      },
      () => {
        void stopMediaRecorder().then(async (blob) => {
          releaseStream();
          const finalResult = buildFinalResult(blob);
          setAudioBlob(blob);
          setResult(finalResult);
          setState("done");
          recognizerRef.current = null;
        });
      },
    );
  }, [stopMediaRecorder, releaseStream, buildFinalResult, cancelRaf]);

  // ── reset ────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(
        () => {},
        () => {},
      );
    }
    cancelRaf();
    void stopMediaRecorder().then(() => releaseStream());
    recognizerRef.current = null;
    setState("idle");
    setResult(null);
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    phrasesRef.current = [];
    scoredWordsRef.current = new Map();
    nextRefIndexRef.current = 0;
    useSpeechStore.getState().reset();
  }, [releaseStream, stopMediaRecorder, cancelRaf]);

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
