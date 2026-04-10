import type { WordScore } from "@/types";

// ── Phoneme tips lookup ────────────────────────────────────────────────────────

export const PHONEME_TIPS: Record<string, string> = {
  θ: 'Place your tongue lightly between your teeth and blow air through (as in "think").',
  ð: 'Same as /θ/ but add voice — tongue between teeth, vibrate vocal cords (as in "this").',
  r: "Curl your tongue tip back slightly without touching the roof of your mouth.",
  l: "Touch the tip of your tongue to the ridge just behind your upper front teeth.",
  æ: 'Drop your jaw and push your tongue low and forward (short "a" as in "cat").',
  ɪ: 'Keep it short and relaxed — don\'t tense your jaw (as in "bit", not "beat").',
  iː: 'Spread your lips into a slight smile and hold the sound longer (as in "beat").',
  ʃ: 'Round your lips slightly and bring your tongue close to the roof without touching (as in "she").',
  tʃ: 'Start with your tongue on the ridge behind upper teeth, then release with a rush of air (as in "chip").',
  dʒ: 'Same tongue position as /tʃ/ but add voice (as in "judge").',
  ŋ: 'Raise the back of your tongue to touch your soft palate — no air through the mouth (as in "sing").',
  v: 'Lightly rest your upper teeth on your lower lip and vibrate (as in "van") — not like /w/.',
  w: 'Round both lips tightly before the vowel, then release (as in "win") — no teeth.',
  z: 'Same tongue position as /s/ but add vocal cord vibration (as in "zoo").',
  s: 'Keep tongue near the ridge behind upper teeth; airflow stays along the center (as in "sun").',
  ʌ: 'Short, relaxed, central — mouth halfway open, tongue neutral (as in "cup").',
  ɜː: 'Tongue in the middle of your mouth, lips slightly rounded — hold it (as in "bird").',
  eɪ: 'Start mid-mouth, then glide upward toward /ɪ/ (as in "say").',
  p: "Build air pressure behind closed lips, then release with a pop — don't let air leak.",
  b: "Same as /p/ but add voice through your vocal cords.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function worstPhoneme(word: WordScore): string | null {
  if (!word.phonemes.length) return null;
  const worst = word.phonemes.reduce((a, b) => (a.accuracyScore <= b.accuracyScore ? a : b));
  return worst.accuracyScore < 70 ? worst.phoneme : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateSuggestion(words: WordScore[]): string {
  const problematic = words
    .filter(
      (w) => w.accuracyScore < 80 && (w.errorType === "mispronunciation" || w.errorType === "none"),
    )
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 3);

  if (!problematic.length) {
    return "Great job! Your pronunciation was clear and natural.";
  }

  const tips: string[] = [];

  for (const word of problematic) {
    const phoneme = worstPhoneme(word);
    if (!phoneme) continue;

    const tip = PHONEME_TIPS[phoneme];
    if (tip) {
      tips.push(`The /${phoneme}/ in "${word.word}": ${tip}`);
    } else {
      tips.push(
        `Focus on the /${phoneme}/ sound in "${word.word}" (scored ${word.accuracyScore.toFixed(0)}).`,
      );
    }
  }

  if (!tips.length) {
    const worst = problematic[0];
    return `Work on "${worst.word}" — scored ${worst.accuracyScore.toFixed(0)}. Slow down and exaggerate the sounds.`;
  }

  return tips.join(" ");
}
