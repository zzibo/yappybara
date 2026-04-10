import type { PracticeResult, WordScore } from "@/types";

// ── Stricter curve ───────────────────────────────────────────────────────────
//
// Azure's HundredMark is lenient — scores cluster 80-100 even for imperfect
// pronunciation. This curve stretches the range so differences are visible:
//   100 → 100,  90 → ~73,  80 → ~51,  70 → ~34,  60 → ~22,  ≤50 → ~13
//
// Formula: power curve that punishes scores below 90 more aggressively.

export function applyStricterCurve(azureScore: number): number {
  const clamped = Math.max(0, Math.min(100, azureScore));
  // Normalize to 0-1, apply power curve, scale back
  const normalized = clamped / 100;
  const curved = normalized ** 3.0; // exponent > 1 = stricter
  return Math.round(curved * 100);
}

// ── Phoneme strictness ───────────────────────────────────────────────────────

export function applyPhonemeStrictness(word: WordScore): number {
  if (word.phonemes.length === 0) return word.accuracyScore;

  const minPhoneme = Math.min(...word.phonemes.map((p) => p.accuracyScore));

  let cap = Infinity;
  if (minPhoneme < 30) cap = 40;
  else if (minPhoneme < 50) cap = 60;

  return Math.min(word.accuracyScore, cap);
}

// ── Hesitation penalty ───────────────────────────────────────────────────────

export function applyHesitationPenalty(words: WordScore[]): number {
  let hesitationCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i];
    const next = words[i + 1];

    if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
      const gap = next.offsetMs - (curr.offsetMs + curr.durationMs);
      if (gap > 800) hesitationCount++;
    }
  }

  return Math.max(0.5, 1 - hesitationCount * 0.08);
}

// ── Score ─────────────────────────────────────────────────────────────────────

export function computeOverallScore(result: PracticeResult, words: WordScore[]): number {
  const { accuracyScore, fluencyScore, completenessScore, prosodyScore } = result;

  const hesitationMultiplier = applyHesitationPenalty(words);
  const adjustedFluency = fluencyScore * hesitationMultiplier;

  if (prosodyScore !== null) {
    return (
      accuracyScore * 0.4 + adjustedFluency * 0.3 + completenessScore * 0.2 + prosodyScore * 0.1
    );
  }

  return accuracyScore * 0.45 + adjustedFluency * 0.35 + completenessScore * 0.2;
}

// ── Grade ─────────────────────────────────────────────────────────────────────

export function computeGrade(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}
