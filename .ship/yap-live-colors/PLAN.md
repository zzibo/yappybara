# Plan — Real-time Pronunciation Coloring in Yap Mode

## Context

User wants each word in the yap transcript colored red/yellow/green **in real time, based on pronunciation quality** — exactly like grind mode does. Currently the yap transcript shows plain text.

## Key Insight

Azure Speech Service supports **pronunciation assessment with empty reference text** ("unscripted" mode). This gives us per-word `AccuracyScore` even when the user is speaking freely on a topic — no reference paragraph needed.

When `referenceText` is empty:
- `accuracyScore`, `fluencyScore`, `prosodyScore` → ✓ returned
- `completenessScore` → not meaningful (no reference to compare against)
- `Words[]` with per-word `PronunciationAssessment.AccuracyScore` → ✓ returned
- `errorType` per word → always "None" or "Mispronunciation" (no "Omission"/"Insertion" since there's no expected text)

This is exactly what we need.

## Architecture

### State shape

Add to `useYapRecorder` return:
```ts
scoredWords: WordScore[]  // append-only, in order of recognition
```

Each word has `{ word, accuracyScore, errorType, phonemes }` — same `WordScore` type grind mode uses. Reuse `parsePhraseResult` from `@/lib/azure/parse-result` verbatim.

### Data flow

```
[recognizing event] → interimText (plain string, shown dim)
[recognized event]  → parsePhraseResult() → append words to scoredWords
                    → also append text to transcript (unchanged)
```

Key point: `scoredWords` and `transcript` stay in sync because both update in the same `recognized` handler. The `transcript` string is still sent to Claude for evaluation — unchanged.

## Files to Change

### 1. `src/hooks/use-yap-recorder.ts`

- Import `parsePhraseResult` from `@/lib/azure/parse-result`
- Import `WordScore` type
- Add state: `const [scoredWords, setScoredWords] = useState<WordScore[]>([])`
- After `SpeechConfig` setup, create `PronunciationAssessmentConfig` with `""` reference:
  ```ts
  const pronunciationConfig = new SDK.PronunciationAssessmentConfig(
    "",  // empty = unscripted mode
    SDK.PronunciationAssessmentGradingSystem.HundredMark,
    SDK.PronunciationAssessmentGranularity.Phoneme,
    false,
  );
  pronunciationConfig.enableProsodyAssessment = true;
  pronunciationConfig.applyTo(recognizer);
  ```
- In `recognized` handler, after appending to transcript:
  ```ts
  const phrase = parsePhraseResult(event.result);
  if (phrase) {
    setScoredWords((prev) => [...prev, ...phrase.words]);
  }
  ```
- Reset `scoredWords` in `start()` and `reset()`
- Export `scoredWords` from the hook return

### 2. `src/components/yap-transcript.tsx`

Replace plain `<span>{transcript}</span>` with per-word rendering:

```tsx
{scoredWords.map((w, i) => (
  <span key={i} style={{ color: colorFor(w.accuracyScore) }}>
    {w.word}{" "}
  </span>
))}
```

Color thresholds (match grind mode):
- `>= 80` → `var(--yb-correct)` (green)
- `>= 50` → `var(--yb-partial)` (yellow)
- `< 50`  → `var(--yb-error)` (red)

Interim text (not yet scored) stays in default/dim color at the end.

New props:
```ts
type YapTranscriptProps = {
  scoredWords: WordScore[];
  interimText: string;
};
```

Remove `transcript` prop — it's derivable but actually we keep the raw `transcript` state for the API call, we just don't need to pass it to this component anymore.

### 3. `src/components/yap-mode.tsx`

- Pass `recorder.scoredWords` (not `recorder.transcript`) to `<YapTranscript>`
- The `recorder.transcript` is still what gets POSTed to `/api/yap/evaluate`

## Tradeoffs Considered

**Alt 1: Filler/hedge word classification** (what I started building earlier)
- ✗ Rejected: doesn't match "how good they are said" — that's about pronunciation quality, not word choice. Also subjective and error-prone.

**Alt 2: Azure STT word-level confidence** (via detailed output mode)
- ✗ Rejected: confidence ≠ pronunciation quality. Confidence just says "how sure am I I heard the right word" which is usually high. Pronunciation assessment is the right metric.

**Alt 3: Unscripted pronunciation assessment** (chosen)
- ✓ Real pronunciation quality per word
- ✓ Same data shape as grind mode — can reuse `parsePhraseResult` verbatim
- ✓ Matches user's mental model ("like grind mode")
- Cost: slightly higher Azure API usage (prosody + assessment vs plain STT), but same order of magnitude

## Verification

1. `npm run typecheck` passes
2. `npm run build` succeeds
3. Manual: switch to yap mode, press space, speak words clearly vs sloppily, verify colors appear in real-time as you speak
4. Check that the final `transcript` sent to Claude is still intact (not dependent on coloring)

## Estimated scope

3 files modified, ~40 LOC net change. No new files. No new dependencies.
