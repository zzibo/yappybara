"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type CategoryFilter, ConfigBar } from "@/components/config-bar";
import { ModeToggle } from "@/components/mode-toggle";
import { PaceIndicator } from "@/components/pace-indicator";
import { type DisplayWord, ParagraphDisplay } from "@/components/paragraph-display";
import { PhonemeDetail } from "@/components/phoneme-detail";
import { Results } from "@/components/results";
import { Waveform } from "@/components/waveform";
import { YapMode } from "@/components/yap-mode";
import { paragraphs } from "@/data/paragraphs";
import { useRealtimeRecorder } from "@/hooks/use-realtime-recorder";
import { useSpeechToken } from "@/hooks/use-speech-token";
import { initSounds, sounds } from "@/lib/sounds";
import { useSpeechStore } from "@/stores/speech";
import type { AppMode, PracticeState, WordScore } from "@/types";

function getRandomParagraph(category: CategoryFilter, excludeId?: string) {
  let pool = category === "all" ? paragraphs : paragraphs.filter((p) => p.category === category);
  if (excludeId) pool = pool.filter((p) => p.id !== excludeId);
  if (pool.length === 0) pool = paragraphs.filter((p) => p.category === category);
  return pool[Math.floor(Math.random() * pool.length)];
}

function wordToDisplayState(w: WordScore): DisplayWord["state"] {
  if (w.errorType === "omission") return "omitted";
  if (w.errorType === "insertion") return "inserted";
  if (w.accuracyScore >= 80) return "correct";
  if (w.accuracyScore >= 50) return "partial";
  return "error";
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("grind");
  const [paragraph, setParagraph] = useState(paragraphs[0]);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [practiceState, setPracticeState] = useState<PracticeState>("idle");
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null);
  const [soundsInitialized, setSoundsInitialized] = useState(false);

  useEffect(() => {
    setParagraph(getRandomParagraph("all"));
  }, []);

  const handleCategoryChange = useCallback(
    (cat: CategoryFilter) => {
      if (practiceState !== "idle") return;
      setCategory(cat);
      setParagraph(getRandomParagraph(cat));
    },
    [practiceState],
  );

  // ── Zustand selectors ──────────────────────────────────────────────────────
  const cursorIndex = useSpeechStore((s) => s.cursorIndex);
  const scoredWords = useSpeechStore((s) => s.scoredWords);
  const interimWordIndices = useSpeechStore((s) => s.interimWordIndices);
  const currentPace = useSpeechStore((s) => s.currentPace);

  // ── TanStack Query for token ───────────────────────────────────────────────
  const { data: tokenData } = useSpeechToken();

  const recorder = useRealtimeRecorder(paragraph.text);

  // Sync recorder state → practice state
  useEffect(() => {
    switch (recorder.state) {
      case "idle":
        if (practiceState !== "results") setPracticeState("idle");
        break;
      case "requesting-mic":
      case "recording":
        setPracticeState("recording");
        break;
      case "processing":
        setPracticeState("processing");
        break;
      case "done":
        setPracticeState("results");
        sounds.reveal();
        break;
      case "error":
        sounds.error();
        setPracticeState("idle");
        break;
    }
  }, [recorder.state]);

  // Build display words based on state
  const displayWords: DisplayWord[] = useMemo(() => {
    const textWords = paragraph.text.split(/\s+/);

    // Results mode — use final result data
    if (practiceState === "results" && recorder.result) {
      return recorder.result.words.map((w) => ({
        word: w.word,
        state: wordToDisplayState(w),
        score: w.accuracyScore,
        phonemes: w.phonemes,
        onClick: () => setSelectedWord(w),
      }));
    }

    // Recording mode — real-time cursor + scored words + interim hearing
    if (practiceState === "recording") {
      return textWords.map((word, i) => {
        // Already scored
        const scored = scoredWords.get(i);
        if (scored) {
          return {
            word,
            state: wordToDisplayState(scored),
            score: scored.accuracyScore,
            phonemes: scored.phonemes,
          };
        }

        // Current cursor position
        if (i === cursorIndex) {
          return { word, state: "active" as const };
        }

        // Being heard (interim recognition)
        if (interimWordIndices.has(i)) {
          return { word, state: "hearing" as const };
        }

        // Spoken but not yet scored
        if (i < cursorIndex) {
          return { word, state: "spoken" as const };
        }

        // Upcoming
        return { word, state: "idle" as const };
      });
    }

    // Idle / processing — all gray
    return textWords.map((word) => ({
      word,
      state: "idle" as const,
    }));
  }, [
    paragraph.text,
    practiceState,
    recorder.result,
    cursorIndex,
    scoredWords,
    interimWordIndices,
  ]);

  // Keyboard handler (grind mode only — yap has its own handler)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!soundsInitialized) {
        initSounds();
        setSoundsInitialized(true);
      }
      if (mode !== "grind") return;

      if (e.code === "Space") {
        e.preventDefault();
        sounds.click();

        if (practiceState === "idle") {
          if (!tokenData) return;
          sounds.start();
          useSpeechStore.getState().reset();
          recorder.start(tokenData.token, tokenData.region);
        } else if (practiceState === "recording") {
          sounds.stop();
          recorder.stop();
        } else if (practiceState === "results") {
          setSelectedWord(null);
          recorder.reset();
          setParagraph(getRandomParagraph(category, paragraph.id));
          setPracticeState("idle");
        }
      }

      if (e.key === "r" && practiceState === "results") {
        e.preventDefault();
        sounds.click();
        setSelectedWord(null);
        recorder.reset();
        setPracticeState("idle");
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedWord(null);
        if (practiceState === "recording") {
          recorder.stop();
        }
        recorder.reset();
        setPracticeState("idle");
      }
    },
    [practiceState, recorder, paragraph.id, soundsInitialized, tokenData, category, mode],
  );

  const handleModeChange = useCallback(
    (next: AppMode) => {
      if (next === mode) return;
      // Reset grind-side state when leaving grind
      if (mode === "grind") {
        recorder.reset();
        setSelectedWord(null);
        setPracticeState("idle");
      }
      setMode(next);
    },
    [mode, recorder],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Hint text
  const hintText = (() => {
    switch (practiceState) {
      case "idle":
        return tokenData ? "press space to start" : "loading...";
      case "recording":
        return "speaking... press space when done";
      case "processing":
        return "analyzing...";
      case "results":
        return "[space] new  ·  [r] retry  ·  click words for detail";
    }
  })();

  return (
    <div
      className="flex flex-col items-center w-full min-h-screen select-none"
      style={{
        backgroundColor: "var(--yb-bg)",
        // Top padding clears the fixed logo; bottom padding clears the fixed hint bar
        padding: "72px 0 72px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "24px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.9rem",
          color: "var(--yb-text-sub)",
          opacity: 0.5,
          letterSpacing: "0.05em",
        }}
      >
        yappybara
      </div>

      <main
        className="flex flex-col items-center gap-8"
        style={{
          maxWidth: "700px",
          width: "100%",
          padding: "0 24px",
          // Auto top+bottom margin: vertically centers main when content is
          // shorter than the viewport, and collapses to zero when content
          // overflows so the page scrolls naturally.
          margin: "auto 0",
        }}
      >
        {/* Mode toggle (grind vs yap) */}
        <ModeToggle
          mode={mode}
          onModeChange={handleModeChange}
          disabled={practiceState === "recording" || practiceState === "processing"}
        />

        {mode === "grind" ? (
          <>
            {/* MonkeyType-style config bar */}
            <ConfigBar
              activeCategory={category}
              onCategoryChange={handleCategoryChange}
              disabled={practiceState === "recording" || practiceState === "processing"}
            />

            {/* Results (shown above paragraph when done) */}
            {practiceState === "results" && recorder.result && (
              <Results result={recorder.result} referenceText={paragraph.text} />
            )}

            {/* Paragraph */}
            {practiceState !== "processing" && <ParagraphDisplay words={displayWords} />}

            {/* Processing spinner */}
            {practiceState === "processing" && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1rem",
                  color: "var(--yb-text-sub)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                analyzing your speech...
              </div>
            )}

            {/* Waveform + Pace indicator */}
            {(practiceState === "recording" || practiceState === "processing") && (
              <div
                className="flex flex-col items-center gap-3"
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  opacity: practiceState === "processing" ? 0.3 : 1,
                  transition: "opacity 200ms",
                }}
              >
                <Waveform
                  mediaStream={recorder.mediaStream}
                  isActive={practiceState === "recording"}
                />
                {practiceState === "recording" && <PaceIndicator pace={currentPace} />}
              </div>
            )}

            {/* Phoneme detail panel */}
            {selectedWord && (
              <PhonemeDetail word={selectedWord} onClose={() => setSelectedWord(null)} />
            )}

            {/* Error message */}
            {recorder.error && practiceState === "idle" && (
              <p
                style={{
                  color: "var(--yb-error)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                {recorder.error}
              </p>
            )}
          </>
        ) : (
          <YapMode />
        )}
      </main>

      {/* Hint (grind mode only — yap mode renders its own hint) */}
      {mode === "grind" && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: 0,
            right: 0,
            textAlign: "center",
            color: "var(--yb-text-sub)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
            transition: "opacity 150ms",
          }}
        >
          {hintText}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
