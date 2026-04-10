"use client";

import { useEffect, useRef } from "react";

type YapTranscriptProps = {
  transcript: string;
  interimText: string;
};

export function YapTranscript({ transcript, interimText }: YapTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new text comes in
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, interimText]);

  const isEmpty = !transcript && !interimText;

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
          <span>{transcript}</span>
          {interimText && (
            <>
              {transcript && " "}
              <span
                style={{
                  color: "var(--yb-text-sub)",
                  opacity: 0.6,
                }}
              >
                {interimText}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
