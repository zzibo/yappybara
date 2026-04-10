/**
 * Real-time word classification for the Yap mode transcript.
 *
 * We can't score conceptual accuracy per word in real-time (that's the LLM's
 * job at the end), but we CAN cheaply flag speech patterns that map onto the
 * "Fluency" rubric dimension — filler words, hedging language, and substantive
 * content words. This gives the user instant visual feedback while they speak.
 */

export type YapWordCategory = "filler" | "hedge" | "content" | "default";

// ── Filler words (red) ──────────────────────────────────────────────────────
// Classic hesitation markers + verbal tics that signal "I'm thinking, not
// explaining." These are the ones interviewers count against you.
const FILLERS = new Set([
  "um",
  "umm",
  "uhm",
  "uh",
  "uhh",
  "er",
  "err",
  "erm",
  "ah",
  "ahh",
  "hmm",
  "hmmm",
  "mm",
  "mmm",
  "like",
  "basically",
  "literally",
  "actually",
  "obviously",
  "totally",
  "honestly",
]);

// ── Hedge / weak words (yellow) ─────────────────────────────────────────────
// Words that signal uncertainty or soften a claim. Not as bad as fillers, but
// a high density suggests the speaker is unsure of their own explanation.
const HEDGES = new Set([
  "maybe",
  "perhaps",
  "probably",
  "possibly",
  "kinda",
  "sorta",
  "somehow",
  "somewhat",
  "sometimes",
  "mostly",
  "guess",
  "suppose",
  "think",
  "believe",
  "dunno",
]);

// ── Stop words (default, not green) ─────────────────────────────────────────
// Common function words — length alone doesn't make something "content."
const STOP_WORDS = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "among",
  "around",
  "because",
  "before",
  "behind",
  "below",
  "between",
  "beyond",
  "could",
  "doing",
  "during",
  "either",
  "every",
  "going",
  "having",
  "hello",
  "itself",
  "might",
  "other",
  "ought",
  "shall",
  "should",
  "since",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "until",
  "using",
  "where",
  "which",
  "while",
  "would",
  "yours",
  "really",
  "something",
  "someone",
  "anything",
  "everything",
  "nothing",
]);

/** Normalize a raw token for classification: lowercase, strip non-alpha. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

/**
 * Classify a single token (word) from the transcript.
 *
 * Rules, in order:
 *   1. Filler — matches a known filler set
 *   2. Hedge — matches a known hedge set
 *   3. Content — ≥6 chars, alphabetic, not a stop word
 *   4. Default — everything else (short words, stop words, punctuation)
 */
export function classifyWord(word: string): YapWordCategory {
  const n = normalize(word);
  if (!n) return "default";
  if (FILLERS.has(n)) return "filler";
  if (HEDGES.has(n)) return "hedge";
  if (n.length >= 6 && !STOP_WORDS.has(n)) return "content";
  return "default";
}

/** Count how many tokens in a string fall into each category. */
export function countCategories(text: string): Record<YapWordCategory, number> {
  const counts: Record<YapWordCategory, number> = {
    filler: 0,
    hedge: 0,
    content: 0,
    default: 0,
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    counts[classifyWord(word)]++;
  }
  return counts;
}
