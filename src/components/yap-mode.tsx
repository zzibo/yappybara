"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Waveform } from "@/components/waveform";
import { YapResults } from "@/components/yap-results";
import { YapTimer } from "@/components/yap-timer";
import { YapTranscript } from "@/components/yap-transcript";
import { type Topic, type TopicCategory, topics } from "@/data/topics";
import { useSpeechToken } from "@/hooks/use-speech-token";
import { useYapRecorder, YAP_DURATION_MS } from "@/hooks/use-yap-recorder";
import { sounds } from "@/lib/sounds";
import type { PracticeState, YapResult } from "@/types";

type YapPhase = PracticeState;

const CATEGORY_LABELS: { value: TopicCategory | "all"; label: string }[] = [
  { value: "all", label: "all" },
  { value: "cs", label: "cs" },
  { value: "webdev", label: "web" },
  { value: "systems", label: "systems" },
  { value: "data", label: "data" },
  { value: "general", label: "general" },
];

function getRandomTopic(category: TopicCategory | "all", excludeId?: string): Topic {
  let pool = category === "all" ? topics : topics.filter((t) => t.category === category);
  if (excludeId) pool = pool.filter((t) => t.id !== excludeId);
  if (pool.length === 0) pool = topics;
  return pool[Math.floor(Math.random() * pool.length)];
}

type HintProps = { text: string };
function Hint({ text }: HintProps) {
  return (
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
      }}
    >
      {text}
    </div>
  );
}

export function YapMode() {
  const [category, setCategory] = useState<TopicCategory | "all">("all");
  const [topic, setTopic] = useState<Topic>(topics[0]);
  const [phase, setPhase] = useState<YapPhase>("idle");
  const [result, setResult] = useState<YapResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const { data: tokenData } = useSpeechToken();
  const recorder = useYapRecorder();

  // Pick a random starting topic on mount
  useEffect(() => {
    setTopic(getRandomTopic("all"));
  }, []);

  // Sync recorder state → phase
  useEffect(() => {
    switch (recorder.state) {
      case "idle":
        if (phase !== "results") setPhase("idle");
        break;
      case "requesting-mic":
      case "recording":
        setPhase("recording");
        break;
      case "processing":
        setPhase("processing");
        break;
      case "done":
        // Recorder stopped; now call evaluation API
        void evaluateYap();
        break;
      case "error":
        sounds.error();
        setPhase("idle");
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state]);

  // Call Claude evaluation API after recording stops
  const evaluateYap = useCallback(async () => {
    setPhase("processing");
    setEvalError(null);
    try {
      const res = await fetch("/api/yap/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.prompt,
          transcript: recorder.transcript,
          durationMs: recorder.durationMs,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Evaluation failed (${res.status})`);
      }

      const data = (await res.json()) as YapResult;
      setResult(data);
      setPhase("results");
      sounds.reveal();
    } catch (err) {
      console.error("[yap] evaluation failed:", err);
      sounds.error();
      setEvalError(err instanceof Error ? err.message : "Evaluation failed");
      setPhase("idle");
      recorder.reset();
    }
  }, [topic.prompt, recorder]);

  const handleCategoryChange = useCallback(
    (cat: TopicCategory | "all") => {
      if (phase !== "idle") return;
      setCategory(cat);
      setTopic(getRandomTopic(cat));
    },
    [phase],
  );

  const nextTopic = useCallback(() => {
    setResult(null);
    setEvalError(null);
    recorder.reset();
    setTopic(getRandomTopic(category, topic.id));
    setPhase("idle");
  }, [category, topic.id, recorder]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        sounds.click();

        if (phase === "idle") {
          if (!tokenData) return;
          sounds.start();
          setResult(null);
          setEvalError(null);
          void recorder.start(tokenData.token, tokenData.region);
        } else if (phase === "recording") {
          sounds.stop();
          recorder.stop();
        } else if (phase === "results") {
          nextTopic();
        }
      }

      if (e.key === "n" && phase === "idle") {
        e.preventDefault();
        sounds.click();
        setTopic(getRandomTopic(category, topic.id));
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (phase === "recording") recorder.stop();
        recorder.reset();
        setResult(null);
        setEvalError(null);
        setPhase("idle");
      }
    },
    [phase, tokenData, recorder, nextTopic, category, topic.id],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Hint text
  const hintText = useMemo(() => {
    if (evalError) return evalError;
    switch (phase) {
      case "idle":
        return tokenData ? "[space] start  ·  [n] new topic" : "loading...";
      case "recording":
        return "speaking... [space] to finish early";
      case "processing":
        return "evaluating...";
      case "results":
        return "[space] new topic  ·  [esc] exit";
    }
  }, [phase, tokenData, evalError]);

  return (
    <>
      {/* Category bar (only visible when idle or results) */}
      {phase !== "recording" && phase !== "processing" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "4px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.03em",
          }}
        >
          {CATEGORY_LABELS.map(({ value, label }) => {
            const isActive = category === value;
            return (
              <button
                key={value}
                type="button"
                className={`yap-cat-pill${isActive ? " yap-cat-pill-active" : ""}`}
                onClick={() => handleCategoryChange(value)}
              >
                {label}
              </button>
            );
          })}
          <style>{`
            .yap-cat-pill {
              padding: 4px 12px;
              border-radius: 4px;
              border: none;
              cursor: pointer;
              background: transparent;
              color: var(--yb-text-sub);
              font-family: var(--font-mono);
              font-size: 0.75rem;
              letter-spacing: 0.03em;
              font-weight: 400;
              transition: color 150ms ease, background 150ms ease;
            }
            .yap-cat-pill:hover {
              color: var(--yb-text);
            }
            .yap-cat-pill-active {
              background: var(--yb-main);
              color: var(--yb-bg);
              font-weight: 600;
            }
          `}</style>
        </div>
      )}

      {/* Topic display (idle + recording) */}
      {(phase === "idle" || phase === "recording") && (
        <div
          style={{
            maxWidth: "60ch",
            width: "100%",
            textAlign: "center",
            padding: "20px 24px",
            borderRadius: "12px",
            backgroundColor: phase === "recording" ? "transparent" : "var(--yb-bg-sub)",
            border: phase === "recording" ? "1px solid var(--yb-bg-sub)" : "1px solid transparent",
            transition: "background-color 300ms, border-color 300ms",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--yb-text-sub)",
              marginBottom: "10px",
              fontFamily: "var(--font-mono)",
            }}
          >
            topic
          </div>
          <div
            style={{
              fontSize: "1.15rem",
              color: "var(--yb-text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {topic.prompt}
          </div>
        </div>
      )}

      {/* Recording: timer + transcript + waveform */}
      {phase === "recording" && (
        <>
          <YapTimer remainingMs={recorder.remainingMs} totalMs={YAP_DURATION_MS} />
          <YapTranscript transcript={recorder.transcript} interimText={recorder.interimText} />
          <div style={{ width: "100%", maxWidth: "500px" }}>
            <Waveform mediaStream={recorder.mediaStream} isActive={true} />
          </div>
        </>
      )}

      {/* Processing */}
      {phase === "processing" && (
        <>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "1rem",
              color: "var(--yb-text-sub)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            evaluating your explanation...
          </div>
          {/* Show transcript under processing so user sees what was captured */}
          <YapTranscript transcript={recorder.transcript} interimText="" />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
        </>
      )}

      {/* Results */}
      {phase === "results" && result && <YapResults result={result} />}

      {/* Mic error */}
      {recorder.error && phase === "idle" && !evalError && (
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

      <Hint text={hintText} />
    </>
  );
}
