/**
 * Word matching for real-time cursor tracking.
 *
 * Given interim speech text and the reference paragraph, determines
 * which word in the reference the user is currently speaking.
 */

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Simple edit distance (Levenshtein) for short words.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;
  // Single-row DP
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Check if spoken word matches a reference word.
 * Uses edit distance for fuzzy matching.
 */
function fuzzyMatch(spoken: string, reference: string): boolean {
  const s = normalize(spoken);
  const r = normalize(reference);

  if (!s || !r) return false;

  // Exact match
  if (s === r) return true;

  // Prefix match (user mid-word, e.g. "beau" → "beautiful")
  if (r.startsWith(s) && s.length >= 2) return true;
  if (s.startsWith(r)) return true;

  // Edit distance: allow ~30% character errors for short words
  const maxLen = Math.max(s.length, r.length);
  const threshold = maxLen <= 3 ? 1 : Math.ceil(maxLen * 0.3);
  if (editDistance(s, r) <= threshold) return true;

  return false;
}

/**
 * Given interim recognized text and an array of reference words,
 * returns the index of the last confirmed reference word the user has spoken.
 *
 * Returns startFrom - 1 if no words matched yet.
 *
 * `startFrom` allows resuming matching after previously scored words.
 *
 * Uses a greedy approach that can skip unmatched reference words (up to 2)
 * to handle cases where Azure mishears or the user skips a word.
 */
export function matchCursorPosition(
  interimText: string,
  referenceWords: string[],
  startFrom: number = 0,
): number {
  const interimTokens = interimText.split(/\s+/).filter(Boolean);

  if (!interimTokens.length) return startFrom - 1;

  let refIdx = startFrom;
  let lastConfirmed = startFrom - 1;
  const maxSkip = 2; // allow skipping up to 2 reference words to find a match

  for (const token of interimTokens) {
    if (refIdx >= referenceWords.length) break;

    // Try matching at current refIdx, or skip up to maxSkip reference words ahead
    let matched = false;
    for (let skip = 0; skip <= maxSkip && refIdx + skip < referenceWords.length; skip++) {
      if (fuzzyMatch(token, referenceWords[refIdx + skip])) {
        // Mark everything up to the matched position as confirmed
        lastConfirmed = refIdx + skip;
        refIdx = refIdx + skip + 1;
        matched = true;
        break;
      }
    }

    // If no match found even with skipping, just skip this spoken token
    // (user said an extra word or Azure hallucinated)
    if (!matched) continue;
  }

  return lastConfirmed;
}

/**
 * Returns the index of the word the user is currently speaking (for cursor display).
 * This is the word the cursor/underline should be on.
 */
export function getActiveWordIndex(
  interimText: string,
  referenceWords: string[],
  startFrom: number = 0,
): number {
  const interimTokens = interimText.split(/\s+/).filter(Boolean);

  if (!interimTokens.length) return startFrom;

  const confirmedIdx = matchCursorPosition(interimText, referenceWords, startFrom);

  // Check if the last spoken token is a partial/incomplete word
  // (i.e. user is mid-word and the match came from prefix matching)
  const lastToken = normalize(interimTokens[interimTokens.length - 1]);

  if (confirmedIdx >= startFrom) {
    const confirmedWord = normalize(referenceWords[confirmedIdx]);

    // Last token exactly matches the confirmed word → cursor on next word
    if (lastToken === confirmedWord) {
      const next = confirmedIdx + 1;
      return next < referenceWords.length ? next : confirmedIdx;
    }

    // Last token is a prefix of confirmed word → cursor stays on confirmed (mid-word)
    if (confirmedWord.startsWith(lastToken) && lastToken.length < confirmedWord.length) {
      return confirmedIdx;
    }

    // Last token was fuzzy-matched → cursor on next word
    const next = confirmedIdx + 1;
    return next < referenceWords.length ? next : confirmedIdx;
  }

  // Nothing matched at all — stay at startFrom
  return startFrom;
}
