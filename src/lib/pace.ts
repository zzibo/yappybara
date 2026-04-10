import type { WordScore } from "@/types";

export type PaceLevel = "slow" | "normal" | "fast";

export type PaceInfo = {
  wpm: number;
  level: PaceLevel;
};

// WPM thresholds with hysteresis dead zones
const SLOW_ENTER = 80;
const SLOW_EXIT = 90;
const FAST_ENTER = 180;
const FAST_EXIT = 170;

const MIN_WORDS = 3;

/**
 * Compute rolling WPM from scored words with timing data.
 * Uses only words from the last `windowMs` (default 10s).
 */
export function computeRollingWpm(
  words: WordScore[],
  elapsedMs: number,
  previousLevel?: PaceLevel,
): PaceInfo | null {
  // Filter to words with valid timing
  const timed = words.filter((w) => w.offsetMs != null && w.durationMs != null);
  if (timed.length < MIN_WORDS || elapsedMs <= 0) return null;

  // Use a 10s rolling window from the end
  const windowMs = 10_000;
  const latestEnd = Math.max(...timed.map((w) => w.offsetMs! + w.durationMs!));
  const windowStart = Math.max(0, latestEnd - windowMs);

  const windowWords = timed.filter((w) => w.offsetMs! >= windowStart);
  if (windowWords.length < MIN_WORDS) return null;

  const windowDuration = latestEnd - windowWords[0].offsetMs!;
  if (windowDuration <= 0) return null;

  const wpm = Math.round((windowWords.length / windowDuration) * 60_000);

  // Hysteresis: use different thresholds to enter vs exit a state
  let level: PaceLevel;
  if (previousLevel === "slow") {
    level = wpm >= SLOW_EXIT ? "normal" : "slow";
  } else if (previousLevel === "fast") {
    level = wpm <= FAST_EXIT ? "normal" : "fast";
  } else {
    if (wpm < SLOW_ENTER) level = "slow";
    else if (wpm > FAST_ENTER) level = "fast";
    else level = "normal";
  }

  return { wpm, level };
}
