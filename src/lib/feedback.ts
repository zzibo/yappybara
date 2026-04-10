import { computeGrade } from "@/lib/scoring";
import { PHONEME_TIPS, worstPhoneme } from "@/lib/suggestions";
import type { PracticeResult, WordScore } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type StruggleWord = {
  word: string;
  score: number;
  phonemeTip: string | null;
};

export type DetailedFeedback = {
  strengths: string[];
  improvements: string[];
  struggleWords: StruggleWord[];
  paceAnalysis: { averageWpm: number; summary: string };
  hesitationAnalysis: { count: number; nearWords: string[]; summary: string };
  skippedWords: string[];
  encouragement: string;
  takeaway: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const ENCOURAGEMENT: Record<string, string> = {
  S: "Outstanding! Near-native pronunciation.",
  A: "Excellent work! Very clear and natural.",
  B: "Good progress! A few sounds to polish.",
  C: "Keep at it! Focus on the tricky sounds below.",
  D: "Every attempt counts. Slow down and practice the basics.",
};

function findStreaks(words: WordScore[]): string[] {
  const streaks: string[] = [];
  let run = 0;
  let start = 0;

  for (let i = 0; i < words.length; i++) {
    if (words[i].accuracyScore >= 80 && words[i].errorType !== "omission") {
      if (run === 0) start = i;
      run++;
    } else {
      if (run >= 4) {
        const first = words[start].word;
        const last = words[start + run - 1].word;
        streaks.push(`"${first}" through "${last}" (${run} words perfect)`);
      }
      run = 0;
    }
  }
  if (run >= 4) {
    const first = words[start].word;
    const last = words[start + run - 1].word;
    streaks.push(`"${first}" through "${last}" (${run} words perfect)`);
  }

  return streaks;
}

function analyzePaceSegments(words: WordScore[]): {
  averageWpm: number;
  summary: string;
} {
  const timed = words.filter((w) => w.offsetMs != null && w.durationMs != null);
  if (timed.length < 3) return { averageWpm: 0, summary: "Not enough data to analyze pace." };

  const totalDuration =
    timed[timed.length - 1].offsetMs! + timed[timed.length - 1].durationMs! - timed[0].offsetMs!;
  const averageWpm = totalDuration > 0 ? Math.round((timed.length / totalDuration) * 60_000) : 0;

  // Split into thirds
  const third = Math.ceil(timed.length / 3);
  const segments = [
    timed.slice(0, third),
    timed.slice(third, third * 2),
    timed.slice(third * 2),
  ].filter((s) => s.length >= 2);

  const segmentWpms = segments.map((seg) => {
    const dur = seg[seg.length - 1].offsetMs! + seg[seg.length - 1].durationMs! - seg[0].offsetMs!;
    return dur > 0 ? Math.round((seg.length / dur) * 60_000) : 0;
  });

  if (segmentWpms.length < 2) {
    return { averageWpm, summary: `Average pace: ${averageWpm} WPM.` };
  }

  const first = segmentWpms[0];
  const last = segmentWpms[segmentWpms.length - 1];
  const diff = last - first;

  let summary: string;
  if (Math.abs(diff) < 15) {
    summary = `Steady pace at ${averageWpm} WPM throughout.`;
  } else if (diff > 0) {
    summary = `Started at ${first} WPM, sped up to ${last} WPM.`;
  } else {
    summary = `Started at ${first} WPM, slowed to ${last} WPM.`;
  }

  return { averageWpm, summary };
}

function findHesitations(words: WordScore[]): {
  count: number;
  nearWords: string[];
  summary: string;
} {
  let count = 0;
  const nearWords: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i];
    const next = words[i + 1];
    if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
      const gap = next.offsetMs - (curr.offsetMs + curr.durationMs);
      if (gap > 800) {
        count++;
        if (nearWords.length < 3) nearWords.push(next.word);
      }
    }
  }

  let summary: string;
  if (count === 0) {
    summary = "No hesitations detected. Nice flow!";
  } else if (count <= 2) {
    summary = `${count} brief pause${count > 1 ? "s" : ""}, near: ${nearWords.map((w) => `"${w}"`).join(", ")}.`;
  } else {
    summary = `${count} pauses detected. Practice reading ahead to maintain flow.`;
  }

  return { count, nearWords, summary };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function generateDetailedFeedback(
  result: PracticeResult,
  _referenceText: string,
): DetailedFeedback {
  const { words, overallScore } = result;
  const grade = computeGrade(overallScore);

  // Strengths
  const strengths: string[] = [];
  const streaks = findStreaks(words);
  if (streaks.length > 0) {
    strengths.push(`Great streaks: ${streaks[0]}`);
  }
  if (result.completenessScore >= 95) {
    strengths.push("You spoke every word — excellent completeness.");
  }
  if (result.prosodyScore !== null && result.prosodyScore >= 80) {
    strengths.push("Natural rhythm and intonation.");
  }
  if (result.fluencyScore >= 85) {
    strengths.push("Smooth, confident delivery.");
  }
  if (strengths.length === 0) {
    strengths.push("You completed the practice — keep building on that.");
  }

  // Struggle words
  const problematic = words
    .filter(
      (w) => w.accuracyScore < 80 && w.errorType !== "omission" && w.errorType !== "insertion",
    )
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 3);

  const struggleWords: StruggleWord[] = problematic.map((w) => {
    const phoneme = worstPhoneme(w);
    const phonemeTip = phoneme
      ? (PHONEME_TIPS[phoneme] ?? `Focus on the /${phoneme}/ sound.`)
      : null;
    return { word: w.word, score: w.accuracyScore, phonemeTip };
  });

  // Improvements
  const improvements: string[] = struggleWords.map((sw) => {
    const tip = sw.phonemeTip ? ` — ${sw.phonemeTip}` : "";
    return `"${sw.word}" (${Math.round(sw.score)})${tip}`;
  });

  // Pace
  const paceAnalysis = analyzePaceSegments(words);

  // Hesitations
  const hesitationAnalysis = findHesitations(words);

  // Skipped
  const skippedWords = words.filter((w) => w.errorType === "omission").map((w) => w.word);

  // Encouragement
  const encouragement = ENCOURAGEMENT[grade] ?? ENCOURAGEMENT.D;

  // Takeaway
  let takeaway: string;
  if (grade === "S" || grade === "A") {
    takeaway = "Keep it up! Try a harder paragraph or speak faster to challenge yourself.";
  } else if (struggleWords.length > 0) {
    takeaway = `Focus on "${struggleWords[0].word}" — practice that sound slowly, then speed up.`;
  } else if (hesitationAnalysis.count > 2) {
    takeaway = "Read the paragraph silently first, then speak with fewer pauses.";
  } else {
    takeaway = "Slow down and exaggerate each sound. Clarity beats speed.";
  }

  return {
    strengths,
    improvements,
    struggleWords,
    paceAnalysis,
    hesitationAnalysis,
    skippedWords,
    encouragement,
    takeaway,
  };
}
