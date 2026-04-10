"use client";

import type { WordScore } from "@/types";

type PhonemeDetailProps = {
  word: WordScore;
  onClose: () => void;
};

function scoreColor(score: number): string {
  if (score >= 80) return "var(--yb-correct)";
  if (score >= 50) return "var(--yb-partial)";
  return "var(--yb-error)";
}

function scoreIcon(score: number): string {
  if (score >= 80) return "✓";
  if (score >= 50) return "~";
  return "✗";
}

export function PhonemeDetail({ word, onClose }: PhonemeDetailProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--yb-bg-sub)",
        border: "1px solid rgba(124, 131, 255, 0.15)",
        borderRadius: "8px",
        padding: "16px 20px",
        maxWidth: "360px",
        width: "100%",
        fontFamily: "var(--font-mono)",
        animation: "fadeIn 150ms ease-out",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--yb-text)", fontSize: "1.1rem", fontWeight: 600 }}>
            &ldquo;{word.word}&rdquo;
          </span>
          <span style={{ color: "var(--yb-text-sub)", fontSize: "0.85rem" }}>
            {Math.round(word.accuracyScore)}/100
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            color: "var(--yb-text-sub)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
          className="hover:brightness-150"
        >
          esc
        </button>
      </div>

      {/* Phoneme list */}
      <div className="flex flex-col gap-1">
        {word.phonemes.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ fontSize: "0.9rem", padding: "2px 0" }}
          >
            <span style={{ color: "var(--yb-text)", width: "32px", textAlign: "right" }}>
              /{p.phoneme}/
            </span>
            {/* Mini bar */}
            <div
              style={{
                width: "80px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, p.accuracyScore)}%`,
                  height: "100%",
                  borderRadius: "2px",
                  backgroundColor: scoreColor(p.accuracyScore),
                }}
              />
            </div>
            <span
              style={{
                color: "var(--yb-text-sub)",
                width: "28px",
                textAlign: "right",
                fontSize: "0.8rem",
              }}
            >
              {Math.round(p.accuracyScore)}
            </span>
            <span style={{ color: scoreColor(p.accuracyScore), fontSize: "0.85rem" }}>
              {scoreIcon(p.accuracyScore)}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
