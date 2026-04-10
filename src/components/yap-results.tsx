"use client";

import { useEffect, useState } from "react";
import { computeGrade } from "@/lib/scoring";
import type { YapDimension, YapResult } from "@/types";

type YapResultsProps = {
  result: YapResult;
};

const GRADE_COLORS: Record<string, string> = {
  S: "#FFD700",
  A: "var(--yb-correct)",
  B: "var(--yb-main)",
  C: "var(--yb-partial)",
  D: "var(--yb-error)",
};

const DIMENSION_LABELS: Record<YapDimension, string> = {
  accuracy: "accuracy",
  depth: "depth",
  clarity: "clarity",
  examples: "examples",
  fluency: "fluency",
};

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 400;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{display}</>;
}

function DimensionBar({
  label,
  score,
  feedback,
}: {
  label: string;
  score: number;
  feedback: string;
}) {
  // score is 1-5, normalize to 0-100 for bar width
  const pct = ((score - 1) / 4) * 100;
  const barColor =
    score >= 5
      ? "var(--yb-correct)"
      : score >= 4
        ? "var(--yb-main)"
        : score >= 3
          ? "var(--yb-partial)"
          : "var(--yb-error)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "8px",
        }}
      >
        <span
          style={{
            color: "var(--yb-text-sub)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: "var(--yb-text)",
            fontFamily: "var(--font-mono)",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          {score}
          <span style={{ color: "var(--yb-text-sub)", opacity: 0.5 }}> / 5</span>
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "4px",
          borderRadius: "2px",
          backgroundColor: "var(--yb-bg-sub)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "2px",
            backgroundColor: barColor,
            transition: "width 600ms ease-out",
          }}
        />
      </div>
      {feedback && (
        <span
          style={{
            color: "var(--yb-text-sub)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            lineHeight: 1.4,
            opacity: 0.85,
          }}
        >
          {feedback}
        </span>
      )}
    </div>
  );
}

function FeedbackSection({
  title,
  borderColor,
  items,
}: {
  title: string;
  borderColor: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: "12px",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--yb-text-sub)",
          marginBottom: "6px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {title}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: "16px",
          fontSize: "0.85rem",
          color: "var(--yb-text)",
          lineHeight: 1.5,
          fontFamily: "var(--font-sans)",
        }}
      >
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: "2px" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YapResults({ result }: YapResultsProps) {
  const grade = computeGrade(result.overallScore);
  const gradeColor = GRADE_COLORS[grade];

  return (
    <div
      className="flex flex-col items-center gap-6"
      style={{ fontFamily: "var(--font-sans)", width: "100%" }}
    >
      {/* Big score */}
      <div className="flex flex-col items-center gap-1">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "5rem",
            fontWeight: 700,
            color: gradeColor,
            lineHeight: 1,
          }}
        >
          <AnimatedScore target={result.overallScore} />
        </span>
        <span
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: gradeColor,
            opacity: 0.8,
            letterSpacing: "0.15em",
          }}
        >
          — {grade} —
        </span>
      </div>

      {/* Rubric bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: "100%",
          maxWidth: "50ch",
        }}
      >
        {result.scores.map((s) => (
          <DimensionBar
            key={s.dimension}
            label={DIMENSION_LABELS[s.dimension]}
            score={s.score}
            feedback={s.feedback}
          />
        ))}
      </div>

      {/* Secondary metrics */}
      <div
        className="flex items-center gap-4"
        style={{
          color: "var(--yb-text-sub)",
          fontSize: "0.85rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{result.wpm} wpm</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{(result.durationMs / 1000).toFixed(0)}s</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{result.transcript.split(/\s+/).filter(Boolean).length} words</span>
      </div>

      {/* Qualitative feedback */}
      <div
        style={{
          width: "100%",
          maxWidth: "50ch",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <FeedbackSection
          title="strengths"
          borderColor="var(--yb-correct)"
          items={result.strengths}
        />
        <FeedbackSection
          title="to improve"
          borderColor="var(--yb-partial)"
          items={result.improvements}
        />

        {/* Summary */}
        {result.summary && (
          <div
            style={{
              marginTop: "4px",
              padding: "10px 14px",
              borderRadius: "6px",
              backgroundColor: "var(--yb-bg-sub)",
              fontSize: "0.85rem",
              color: "var(--yb-text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.6,
            }}
          >
            {result.summary}
          </div>
        )}
      </div>
    </div>
  );
}
