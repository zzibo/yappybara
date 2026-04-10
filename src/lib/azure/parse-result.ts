import { applyPhonemeStrictness, applyStricterCurve } from "@/lib/scoring";
import { generateSuggestion } from "@/lib/suggestions";
import type { PhonemeScore, PhraseResult, PracticeResult, WordScore } from "@/types";

// ── Azure JSON shapes (NBest response) ───────────────────────────────────────

interface AzurePhoneme {
  Phoneme: string;
  PronunciationAssessment: {
    AccuracyScore: number;
  };
}

interface AzureWord {
  Word: string;
  Offset?: number;
  Duration?: number;
  PronunciationAssessment: {
    AccuracyScore: number;
    ErrorType: string;
  };
  Phonemes?: AzurePhoneme[];
}

interface AzureNBest {
  PronunciationAssessment: {
    AccuracyScore: number;
    FluencyScore: number;
    CompletenessScore: number;
    ProsodyScore?: number;
  };
  Words: AzureWord[];
  Duration?: number;
}

interface AzureJsonResult {
  Duration?: number;
  NBest?: AzureNBest[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeErrorType(raw: string): WordScore["errorType"] {
  switch (raw.toLowerCase()) {
    case "omission":
      return "omission";
    case "insertion":
      return "insertion";
    case "mispronunciation":
      return "mispronunciation";
    default:
      return "none";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parses the raw Azure SpeechRecognitionResult (passed as `any` because the
 * SDK ships its own ambient types that conflict with strict imports) into our
 * domain PracticeResult.
 */
export function parseAzureResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdkResult: any,
  audioBlob: Blob | null,
): PracticeResult {
  // PropertyId.SpeechServiceResponse_JsonResult = 23
  const PROP_JSON = 23;
  const raw: string | undefined = sdkResult?.properties?.getProperty(PROP_JSON);

  if (!raw) {
    throw new Error("Azure result missing JSON payload");
  }

  const json: AzureJsonResult = JSON.parse(raw);
  const best = json.NBest?.[0];

  if (!best) {
    throw new Error("Azure result has no NBest entries");
  }

  const assessment = best.PronunciationAssessment;

  // Duration is in 100-nanosecond ticks in the NBest or top-level field
  const durationTicks: number = best.Duration ?? json.Duration ?? 0;
  const durationMs = Math.round(durationTicks / 10_000);

  const wordCount = best.Words.filter(
    (w) => w.PronunciationAssessment.ErrorType.toLowerCase() !== "insertion",
  ).length;

  const wpm = durationMs > 0 ? Math.round((wordCount / durationMs) * 60_000) : 0;

  const words: WordScore[] = best.Words.map((w): WordScore => {
    const phonemes: PhonemeScore[] = (w.Phonemes ?? []).map(
      (p): PhonemeScore => ({
        phoneme: p.Phoneme,
        accuracyScore: applyStricterCurve(p.PronunciationAssessment.AccuracyScore),
      }),
    );

    const offsetMs = w.Offset != null ? Math.round(w.Offset / 10_000) : undefined;
    const wordDurationMs = w.Duration != null ? Math.round(w.Duration / 10_000) : undefined;

    const wordScore: WordScore = {
      word: w.Word,
      accuracyScore: applyStricterCurve(w.PronunciationAssessment.AccuracyScore),
      errorType: normalizeErrorType(w.PronunciationAssessment.ErrorType),
      phonemes,
      offsetMs,
      durationMs: wordDurationMs,
    };

    // Apply phoneme-level strictness cap
    wordScore.accuracyScore = applyPhonemeStrictness(wordScore);

    return wordScore;
  });

  const hesitationCount = words.filter((_w, i) => {
    if (i >= words.length - 1) return false;
    const curr = words[i];
    const next = words[i + 1];
    if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
      return next.offsetMs - (curr.offsetMs + curr.durationMs) > 800;
    }
    return false;
  }).length;

  const prosodyScore =
    typeof assessment.ProsodyScore === "number"
      ? applyStricterCurve(assessment.ProsodyScore)
      : null;

  const partialResult: Omit<PracticeResult, "overallScore" | "suggestion"> = {
    accuracyScore: applyStricterCurve(assessment.AccuracyScore),
    fluencyScore: applyStricterCurve(assessment.FluencyScore),
    completenessScore: assessment.CompletenessScore,
    prosodyScore,
    words,
    hesitationCount,
    durationMs,
    wpm,
    audioBlob,
    detailedFeedback: null,
  };

  const suggestion = generateSuggestion(words);

  // overallScore is computed by the caller (scoring.ts) — embed a placeholder
  // of 0 here; callers must call computeOverallScore and spread the result.
  return {
    ...partialResult,
    overallScore: 0,
    suggestion,
  };
}

/**
 * Parses a single `recognized` event from continuous recognition into
 * a PhraseResult (no overall score or suggestion — those are aggregated later).
 */
export function parsePhraseResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdkResult: any,
): PhraseResult | null {
  const PROP_JSON = 23;
  const raw: string | undefined = sdkResult?.properties?.getProperty(PROP_JSON);

  if (!raw) return null;

  let json: AzureJsonResult;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const best = json.NBest?.[0];
  if (!best?.Words?.length) return null;

  const assessment = best.PronunciationAssessment;
  const durationTicks: number = best.Duration ?? json.Duration ?? 0;
  const durationMs = Math.round(durationTicks / 10_000);

  const words: WordScore[] = best.Words.map((w): WordScore => {
    const phonemes: PhonemeScore[] = (w.Phonemes ?? []).map(
      (p): PhonemeScore => ({
        phoneme: p.Phoneme,
        accuracyScore: applyStricterCurve(p.PronunciationAssessment.AccuracyScore),
      }),
    );

    const offsetMs = w.Offset != null ? Math.round(w.Offset / 10_000) : undefined;
    const wordDurationMs = w.Duration != null ? Math.round(w.Duration / 10_000) : undefined;

    const wordScore: WordScore = {
      word: w.Word,
      accuracyScore: applyStricterCurve(w.PronunciationAssessment.AccuracyScore),
      errorType: normalizeErrorType(w.PronunciationAssessment.ErrorType),
      phonemes,
      offsetMs,
      durationMs: wordDurationMs,
    };

    // Apply phoneme-level strictness cap
    wordScore.accuracyScore = applyPhonemeStrictness(wordScore);

    return wordScore;
  });

  return {
    accuracyScore: applyStricterCurve(assessment.AccuracyScore),
    fluencyScore: applyStricterCurve(assessment.FluencyScore),
    completenessScore: assessment.CompletenessScore,
    prosodyScore:
      typeof assessment.ProsodyScore === "number"
        ? applyStricterCurve(assessment.ProsodyScore)
        : null,
    words,
    durationMs,
  };
}
