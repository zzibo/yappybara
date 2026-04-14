export type WordScore = {
  word: string;
  accuracyScore: number;
  errorType: "none" | "omission" | "insertion" | "mispronunciation";
  phonemes: PhonemeScore[];
  offsetMs?: number;
  durationMs?: number;
};

export type PhonemeScore = {
  phoneme: string;
  accuracyScore: number;
  expected?: string;
};

export type PracticeResult = {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  words: WordScore[];
  hesitationCount: number;
  durationMs: number;
  wpm: number;
  audioBlob: Blob | null;
  suggestion: string;
  detailedFeedback: import("@/lib/feedback").DetailedFeedback | null;
};

export type PracticeState = "idle" | "recording" | "processing" | "results";

export type ParagraphCategory =
  | "everyday"
  | "facts"
  | "professional"
  | "descriptive"
  | "twisters"
  | "stories";

export type Paragraph = {
  id: string;
  text: string;
  category: ParagraphCategory;
};

// ── Realtime recognition types ───────────────────────────────────────────────

/** Phrase-level scores from a single `recognized` event (no overall/suggestion). */
export type PhraseResult = {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  words: WordScore[];
  durationMs: number;
};

/** Callbacks for real-time recorder events. */
export type RealtimeCallbacks = {
  /** Fired on each `recognizing` event with the cursor word index. */
  onCursorMove: (activeWordIndex: number) => void;
  /** Fired on each `recognized` event with scored words and their ref indices. */
  onPhraseScored: (words: WordScore[], startRefIndex: number) => void;
};

// ── Yap mode types ───────────────────────────────────────────────────────────

/** App-level mode switch. */
export type AppMode = "grind" | "yap";

/** A single coaching tip from Claude. */
export type CoachTip = { focus: string; advice: string };

/** Claude-generated coaching notes (async, loaded after instant feedback). */
export type CoachNotes = { tips: CoachTip[]; drill: string };

/** The 5 rubric dimensions scored for a yap session. */
export type YapDimension = "accuracy" | "depth" | "clarity" | "examples" | "fluency";

/** A single dimension's score (1-5) with qualitative feedback. */
export type YapDimensionScore = {
  dimension: YapDimension;
  /** 1-5 integer score on the rubric. */
  score: number;
  /** One-sentence explanation for this dimension's score. */
  feedback: string;
};

/** Final evaluated result of a yap session. */
export type YapResult = {
  /** Weighted 0-100 overall score. */
  overallScore: number;
  /** Per-dimension scores (5 entries). */
  scores: YapDimensionScore[];
  /** 2-4 concrete things the speaker did well. */
  strengths: string[];
  /** 2-4 specific things to improve. */
  improvements: string[];
  /** One-paragraph overall assessment. */
  summary: string;
  /** Full transcript of what the user said. */
  transcript: string;
  /** Total duration of the yap in ms. */
  durationMs: number;
  /** Words per minute over the session. */
  wpm: number;
};
