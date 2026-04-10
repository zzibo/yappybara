"use client";

import type { PaceInfo } from "@/lib/pace";

type PaceIndicatorProps = {
  pace: PaceInfo | null;
};

function getPaceColor(level: PaceInfo["level"]): string {
  switch (level) {
    case "slow":
      return "var(--yb-partial)";
    case "fast":
      return "var(--yb-error)";
    default:
      return "var(--yb-text-sub)";
  }
}

function getPaceLabel(level: PaceInfo["level"]): string | null {
  switch (level) {
    case "slow":
      return "slow down";
    case "fast":
      return "too fast";
    default:
      return null;
  }
}

export function PaceIndicator({ pace }: PaceIndicatorProps) {
  if (!pace) return null;

  const color = getPaceColor(pace.level);
  const label = getPaceLabel(pace.level);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "12px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        color,
        backgroundColor: "var(--yb-bg-sub)",
        transition: "color 300ms ease, opacity 300ms ease",
        opacity: 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>{pace.wpm} wpm</span>
      {label && <span style={{ opacity: 0.85, fontFamily: "var(--font-sans)" }}>· {label}</span>}
    </div>
  );
}
