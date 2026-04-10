"use client";

import { useEffect, useState } from "react";
import type { DetailedFeedback } from "@/lib/feedback";
import { computeGrade } from "@/lib/scoring";
import type { PracticeResult } from "@/types";

type ResultsProps = {
  result: PracticeResult;
};

const GRADE_COLORS: Record<string, string> = {
  S: "#FFD700",
  A: "var(--yb-correct)",
  B: "var(--yb-main)",
  C: "var(--yb-partial)",
  D: "var(--yb-error)",
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
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{display}</>;
}

function MetricBar({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  return (
    <div className="flex flex-col items-center gap-1">
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
          fontSize: "1.25rem",
          fontWeight: 600,
        }}
      >
        {Math.round(score)}
      </span>
      <div
        style={{
          width: "60px",
          height: "3px",
          borderRadius: "2px",
          backgroundColor: "var(--yb-bg-sub)",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, score)}%`,
            height: "100%",
            borderRadius: "2px",
            backgroundColor:
              score >= 85
                ? "var(--yb-correct)"
                : score >= 70
                  ? "var(--yb-main)"
                  : score >= 50
                    ? "var(--yb-partial)"
                    : "var(--yb-error)",
            transition: "width 400ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

// ── Feedback section ─────────────────────────────────────────────────────────

function FeedbackSection({
  title,
  borderColor,
  children,
}: {
  title: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: "12px",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--yb-text-sub)",
          marginBottom: "4px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          color: "var(--yb-text)",
          lineHeight: 1.5,
          fontFamily: "var(--font-sans)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DetailedFeedbackPanel({ feedback }: { feedback: DetailedFeedback }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "50ch",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <FeedbackSection title="strengths" borderColor="var(--yb-correct)">
          {feedback.strengths.map((s, i) => (
            <div key={i} style={{ opacity: 0.9 }}>
              {s}
            </div>
          ))}
        </FeedbackSection>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <FeedbackSection title="to improve" borderColor="var(--yb-partial)">
          {feedback.improvements.map((tip, i) => (
            <div key={i} style={{ marginBottom: "2px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{tip}</span>
            </div>
          ))}
        </FeedbackSection>
      )}

      {/* Pace */}
      <FeedbackSection title="pace" borderColor="var(--yb-text-sub)">
        {feedback.paceAnalysis.summary}
      </FeedbackSection>

      {/* Hesitations (only if > 0) */}
      {feedback.hesitationAnalysis.count > 0 && (
        <FeedbackSection title="hesitations" borderColor="var(--yb-text-sub)">
          {feedback.hesitationAnalysis.summary}
        </FeedbackSection>
      )}

      {/* Skipped words (only if any) */}
      {feedback.skippedWords.length > 0 && (
        <FeedbackSection title="skipped" borderColor="var(--yb-error)">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
            {feedback.skippedWords.map((w) => `"${w}"`).join(", ")}
          </span>
        </FeedbackSection>
      )}

      {/* Takeaway */}
      <div
        style={{
          marginTop: "4px",
          padding: "8px 12px",
          borderRadius: "6px",
          backgroundColor: "var(--yb-bg-sub)",
          fontSize: "0.85rem",
          color: "var(--yb-text)",
          fontFamily: "var(--font-sans)",
          lineHeight: 1.5,
        }}
      >
        {feedback.takeaway}
      </div>
    </div>
  );
}

// ── Main Results component ───────────────────────────────────────────────────

export function Results({ result }: ResultsProps) {
  const grade = computeGrade(result.overallScore);
  const gradeColor = GRADE_COLORS[grade];

  return (
    <div className="flex flex-col items-center gap-6" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Big score + encouragement */}
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
          <AnimatedScore target={Math.round(result.overallScore)} />
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
        {result.detailedFeedback && (
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--yb-text-sub)",
              marginTop: "2px",
            }}
          >
            {result.detailedFeedback.encouragement}
          </span>
        )}
      </div>

      {/* Metric breakdown */}
      <div className="flex items-center gap-8">
        <MetricBar label="accuracy" score={result.accuracyScore} />
        <MetricBar label="fluency" score={result.fluencyScore} />
        <MetricBar label="completeness" score={result.completenessScore} />
        <MetricBar label="prosody" score={result.prosodyScore} />
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
        <span>{(result.durationMs / 1000).toFixed(1)}s</span>
        {result.hesitationCount > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              {result.hesitationCount} pause{result.hesitationCount > 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {/* Detailed feedback */}
      {result.detailedFeedback ? (
        <DetailedFeedbackPanel feedback={result.detailedFeedback} />
      ) : (
        result.suggestion && (
          <p
            style={{
              color: "var(--yb-text)",
              fontSize: "0.95rem",
              maxWidth: "50ch",
              textAlign: "center",
              lineHeight: 1.6,
              opacity: 0.85,
            }}
          >
            {result.suggestion}
          </p>
        )
      )}
    </div>
  );
}
