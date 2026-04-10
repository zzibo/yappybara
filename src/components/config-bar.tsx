"use client";

import type { ParagraphCategory } from "@/types";

export type CategoryFilter = ParagraphCategory | "all";

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "everyday", label: "everyday" },
  { value: "facts", label: "facts" },
  { value: "professional", label: "professional" },
  { value: "descriptive", label: "descriptive" },
  { value: "twisters", label: "twisters" },
  { value: "stories", label: "stories" },
];

type ConfigBarProps = {
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  disabled?: boolean;
};

export function ConfigBar({ activeCategory, onCategoryChange, disabled }: ConfigBarProps) {
  return (
    <div
      className="config-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "4px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        letterSpacing: "0.03em",
        opacity: disabled ? 0.25 : 1,
        transition: "opacity 200ms ease",
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {CATEGORIES.map(({ value, label }) => {
        const isActive = activeCategory === value;
        return (
          <button
            key={value}
            type="button"
            className={`config-pill${isActive ? " config-pill-active" : ""}`}
            onClick={() => onCategoryChange(value)}
          >
            {label}
          </button>
        );
      })}

      <style>{`
        .config-pill {
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
        .config-pill:hover {
          color: var(--yb-text);
        }
        .config-pill-active {
          background: var(--yb-main);
          color: var(--yb-bg);
          font-weight: 600;
        }
        .config-pill-active:hover {
          color: var(--yb-bg);
        }
      `}</style>
    </div>
  );
}
