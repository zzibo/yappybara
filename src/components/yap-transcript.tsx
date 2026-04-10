"use client";

import { useEffect, useRef } from "react";
import type { WordScore } from "@/types";

type YapTranscriptProps = {
  /**
   * Words with per-word pronunciation accuracy scores. Rendered red/yellow/
   * green based on accuracy in real time as the user speaks.
   */
  scoredWords: WordScore[];
  /** Unconfirmed text from the latest `recognizing` event — shown dim. */
  interimText: string;
};

/** Map a 0-100 pronunciation score to the same color palette grind mode uses. */
function colorFor(score: number): string {
  if (score >= 80) return "var(--yb-correct)";
  if (score >= 50) return "var(--yb-partial)";
  return "var(--yb-error)";
}

export function YapTranscript({ scoredWords, interimText }: YapTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new text comes in
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scoredWords, interimText]);

  const isEmpty = scoredWords.length === 0 && !interimText;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: "60ch",
        minHeight: "160px",
        maxHeight: "260px",
        overflowY: "auto",
        padding: "16px 20px",
        borderRadius: "8px",
        backgroundColor: "var(--yb-bg-sub)",
        fontFamily: "var(--font-mono)",
        fontSize: "1rem",
        lineHeight: 1.7,
        color: "var(--yb-text)",
      }}
    >
      {isEmpty ? (
        <span
          style={{
            color: "var(--yb-text-sub)",
            fontStyle: "italic",
            opacity: 0.6,
          }}
        >
          your words will appear here...
        </span>
      ) : (
        <>
          {scoredWords.map((w, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              style={{
                color: colorFor(w.accuracyScore),
                transition: "color 200ms ease",
              }}
            >
              {w.word}
              {i < scoredWords.length - 1 || interimText ? " " : ""}
            </span>
          ))}
          {interimText && (
            <span
              style={{
                color: "var(--yb-text-sub)",
                opacity: 0.55,
              }}
            >
              {interimText}
            </span>
          )}
        </>
      )}
    </div>
  );
}
