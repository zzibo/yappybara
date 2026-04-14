"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetailedFeedback } from "@/lib/feedback";
import { computeGrade } from "@/lib/scoring";
import type { CoachNotes, PracticeResult } from "@/types";

type ResultsProps = {
  result: PracticeResult;
  referenceText: string;
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

// ── Coach Notes (async, Claude-powered) ─────────────────────────────────────

function CoachNotesPanel({ notes }: { notes: CoachNotes }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "50ch",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginTop: "4px",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--yb-main)",
          fontFamily: "var(--font-mono)",
          marginBottom: "2px",
        }}
      >
        coach&apos;s notes
      </div>

      {notes.tips.map((tip, i) => (
        <FeedbackSection key={i} title={tip.focus} borderColor="var(--yb-main)">
          {tip.advice}
        </FeedbackSection>
      ))}

      {notes.drill && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            backgroundColor: "var(--yb-bg-sub)",
            border: "1px solid var(--yb-main)",
            borderLeftWidth: "3px",
            fontSize: "0.85rem",
            color: "var(--yb-text)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--yb-main)",
              marginBottom: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            try this now
          </div>
          {notes.drill}
        </div>
      )}
    </div>
  );
}

function CoachNotesLoading() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "50ch",
        marginTop: "4px",
        padding: "10px 12px",
        borderRadius: "6px",
        fontSize: "0.8rem",
        color: "var(--yb-text-sub)",
        fontFamily: "var(--font-mono)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      generating coach&apos;s notes...
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

/** Build the API payload from PracticeResult data. */
function buildCoachPayload(result: PracticeResult, referenceText: string) {
  // Extract hesitation gaps from word timing
  const hesitations: { word: string; gapMs: number }[] = [];
  for (let i = 0; i < result.words.length - 1; i++) {
    const curr = result.words[i];
    const next = result.words[i + 1];
    if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
      const gap = next.offsetMs - (curr.offsetMs + curr.durationMs);
      if (gap > 800) {
        hesitations.push({ word: next.word, gapMs: gap });
      }
    }
  }

  // Extract struggle words — get phoneme from word data, tip from feedback
  const struggleWords = (result.detailedFeedback?.struggleWords ?? []).map((sw) => {
    // Find the matching word in result.words to get phoneme data
    const wordData = result.words.find(
      (w) => w.word.toLowerCase() === sw.word.toLowerCase() && w.accuracyScore < 80,
    );
    const worstPhoneme =
      wordData?.phonemes.reduce(
        (a, b) => (a.accuracyScore <= b.accuracyScore ? a : b),
        wordData.phonemes[0],
      ) ?? null;
    return {
      word: sw.word,
      score: sw.score,
      phoneme: worstPhoneme && worstPhoneme.accuracyScore < 70 ? worstPhoneme.phoneme : null,
      phonemeTip: sw.phonemeTip,
    };
  });

  // Extract pace segments from words
  const timed = result.words.filter((w) => w.offsetMs != null && w.durationMs != null);
  let paceSegments: { startWpm: number; endWpm: number; averageWpm: number } | null = null;
  if (timed.length >= 6) {
    const third = Math.ceil(timed.length / 3);
    const firstSeg = timed.slice(0, third);
    const lastSeg = timed.slice(third * 2);

    const segWpm = (seg: typeof timed) => {
      const dur =
        seg[seg.length - 1].offsetMs! + seg[seg.length - 1].durationMs! - seg[0].offsetMs!;
      return dur > 0 ? Math.round((seg.length / dur) * 60_000) : 0;
    };

    paceSegments = {
      startWpm: segWpm(firstSeg),
      endWpm: segWpm(lastSeg),
      averageWpm: result.wpm,
    };
  }

  return {
    referenceText,
    overallScore: result.overallScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    prosodyScore: result.prosodyScore,
    wpm: result.wpm,
    durationMs: result.durationMs,
    hesitations,
    struggleWords,
    skippedWords: result.detailedFeedback?.skippedWords ?? [],
    paceSegments,
  };
}

// ── Main Results component ───────────────────────────────────────────────────

export function Results({ result, referenceText }: ResultsProps) {
  const grade = computeGrade(result.overallScore);
  const gradeColor = GRADE_COLORS[grade];

  // Async coach notes
  const [coachNotes, setCoachNotes] = useState<CoachNotes | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const fetchedRef = useRef<number | null>(null);

  const fetchCoachNotes = useCallback(async () => {
    setCoachLoading(true);
    try {
      const payload = buildCoachPayload(result, referenceText);
      const res = await fetch("/api/grind/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("[coach] API error:", res.status);
        return;
      }
      const data = (await res.json()) as CoachNotes;
      setCoachNotes(data);
    } catch (err) {
      console.error("[coach] failed:", err);
    } finally {
      setCoachLoading(false);
    }
  }, [result, referenceText]);

  useEffect(() => {
    // Only fetch once per result (use overallScore + durationMs as identity)
    const identity = result.overallScore * 10000 + result.durationMs;
    if (fetchedRef.current === identity) return;
    fetchedRef.current = identity;
    setCoachNotes(null);
    void fetchCoachNotes();
  }, [result.overallScore, result.durationMs, fetchCoachNotes]);

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

      {/* Async coach notes (Claude-powered) */}
      {coachLoading && <CoachNotesLoading />}
      {coachNotes && <CoachNotesPanel notes={coachNotes} />}
    </div>
  );
}
