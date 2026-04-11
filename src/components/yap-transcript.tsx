"use client";

import { useEffect, useRef } from "react";
import type { WordScore } from "@/types";

type YapTranscriptProps = {
  /**
   * Words captured so far, carrying per-word pronunciation scores from Azure
   * (unscripted assessment). We keep the scores on the data model — we might
   * surface them in the results view later — but we don't colorize them in the
   * live transcript. During the yap itself, colored words are distracting
   * rather than helpful; the user just wants to see what they're saying.
   */
  scoredWords: WordScore[];
  /** Unconfirmed text from the latest `recognizing` event — shown dim. */
  interimText: string;
};

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
          <span>
            {scoredWords.map((w) => w.word).join(" ")}
            {scoredWords.length > 0 && interimText ? " " : ""}
          </span>
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
