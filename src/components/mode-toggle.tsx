"use client";

import type { AppMode } from "@/types";

const MODES: { value: AppMode; label: string }[] = [
  { value: "grind", label: "grind" },
  { value: "yap", label: "yap" },
];

type ModeToggleProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  disabled?: boolean;
};

export function ModeToggle({ mode, onModeChange, disabled }: ModeToggleProps) {
  return (
    <div
      className="mode-toggle"
      style={{
        display: "flex",
        gap: "4px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.85rem",
        letterSpacing: "0.05em",
        opacity: disabled ? 0.25 : 1,
        transition: "opacity 200ms ease",
        pointerEvents: disabled ? "none" : "auto",
        padding: "4px",
        borderRadius: "8px",
        backgroundColor: "var(--yb-bg-sub)",
      }}
    >
      {MODES.map(({ value, label }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            className={`mode-pill${isActive ? " mode-pill-active" : ""}`}
            onClick={() => onModeChange(value)}
          >
            {label}
          </button>
        );
      })}

      <style>{`
        .mode-pill {
          padding: 6px 18px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          background: transparent;
          color: var(--yb-text-sub);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          font-weight: 500;
          transition: color 150ms ease, background 150ms ease;
        }
        .mode-pill:hover {
          color: var(--yb-text);
        }
        .mode-pill-active {
          background: var(--yb-main);
          color: var(--yb-bg);
          font-weight: 700;
        }
        .mode-pill-active:hover {
          color: var(--yb-bg);
        }
      `}</style>
    </div>
  );
}
