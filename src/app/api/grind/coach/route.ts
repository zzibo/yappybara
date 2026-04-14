import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CoachNotes } from "@/types";

// ── Structured output schema ────────────────────────────────────────────────

const CoachNotesSchema = z.object({
  tips: z
    .array(
      z.object({
        focus: z.string().describe("2-4 word label, e.g. 'Pace Control', 'The /θ/ Sound'"),
        advice: z
          .string()
          .describe("2-3 sentences: observation + specific reference + physical drill"),
      }),
    )
    .min(1)
    .max(3),
  drill: z
    .string()
    .describe(
      "One specific exercise to do RIGHT NOW with this same paragraph. Concrete: what to do, how many reps, what to focus on.",
    ),
});

// ── Rate limiter (same pattern as yap/evaluate) ────────────────────────────

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const minuteMap = new Map<string, RateLimitBucket>();
const hourMap = new Map<string, RateLimitBucket>();

const MINUTE_MAX = 2;
const MINUTE_WINDOW_MS = 60 * 1000;
const HOUR_MAX = 20;
const HOUR_WINDOW_MS = 60 * 60 * 1000;

function tickBucket(
  map: Map<string, RateLimitBucket>,
  ip: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = map.get(ip);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    map.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (bucket.count >= max) return true;
  bucket.count += 1;
  return false;
}

function isRateLimited(ip: string): boolean {
  return (
    tickBucket(minuteMap, ip, MINUTE_MAX, MINUTE_WINDOW_MS) ||
    tickBucket(hourMap, ip, HOUR_MAX, HOUR_WINDOW_MS)
  );
}

// ── System prompt with baked-in speech coaching knowledge ───────────────────

const SYSTEM_PROMPT = `You are an expert speech coach specializing in pronunciation and reading fluency. A user just finished reading a paragraph aloud and you have their detailed performance data. Your job is to give 2-3 highly specific, actionable coaching tips.

COACHING KNOWLEDGE:

**Pace:**
- Optimal reading-aloud pace: 140-160 WPM for clarity. TED speakers average ~158 WPM.
- Below 120 WPM: the speaker's eye-voice span is too narrow — eyes aren't scanning far enough ahead of the mouth. Fix: preview text silently, then read looking 2-3 words ahead.
- Above 180 WPM: listener comprehension drops 17-25%. Fix: breathe at every period (1 full second), open jaw wider on stressed syllables (physically slows speech without feeling forced), exaggerate consonants at word endings.
- Pace variation matters more than any single number. Slow for complex words, faster for familiar phrases.
- Deceleration toward the end often signals fatigue or encountering unfamiliar words.
- Acceleration toward the end often signals rushing to finish — consciously slow the last third.

**Hesitations & Pauses:**
- Pauses >800ms while reading aloud signal word-recognition difficulty or phonological planning overload.
- The #1 cause: insufficient eye-voice span — the eyes haven't pre-decoded the upcoming word.
- Fix for 1-2 pauses: repeat the specific sentence containing the pause 3 times in a row.
- Fix for 3-5 pauses: read the entire paragraph silently first, then speak. The brain needs to see words before the mouth says them.
- Fix for 6+ pauses: start at 70% speed. It's easier to speed up smooth speech than smooth out choppy fast speech.
- Nose breathing during pauses prevents filler sounds ("um") from leaking in.
- Repeated reading is the single most evidence-backed technique for reading fluency — each rep reduces cognitive load on decoding, freeing resources for prosody.

**Pronunciation & Phonemes:**
- When a specific phoneme is weak, the physical drill matters: tongue position, lip shape, airflow direction.
- Connected speech rules make English sound natural: linking (consonant→vowel bridges: "an apple" → "a-napple"), elision (/t/ and /d/ dropped between consonants: "next day" → "nex day"), assimilation (sounds change to match neighbors: "don't you" → "donchu").
- Without connected speech, even perfect individual sounds can sound robotic.
- Word stress patterns: nouns/adjectives stress first syllable (TAble, HAPpy), verbs stress second (reLAX, beCOME). Compound nouns stress first element (AIRport, FOOTball).

**Prosody & Intonation:**
- Prosody = the music of speech: stress, rhythm, intonation, tempo.
- English is stress-timed: stressed syllables occur at regular intervals regardless of unstressed syllables between them.
- Content words (nouns, main verbs, adjectives, adverbs, negatives) get stressed. Function words (articles, prepositions, pronouns, auxiliaries) get reduced.
- Monotone delivery (prosody score <60): the speaker isn't varying pitch on stressed words. Fix: contrastive stress drill — say the same sentence 5 times, emphasizing a different word each time. Then the exaggeration-to-natural cycle: read flat, then wildly dramatic, then naturally.
- Falling intonation at sentence ends signals confidence. Rising intonation on statements (uptalk) signals uncertainty.

**Coaching Philosophy:**
- Max 2-3 tips per session. Humans can't work on more than that.
- Every tip MUST have: a specific metric or observation + a reference to something they actually did + a concrete physical action or drill.
- BAD: "Slow down and speak more clearly."
- GOOD: "You hit 185 WPM in the last third — try breathing for one full second at each period. Open your jaw wider on stressed syllables to physically slow down."
- Reference the actual words they struggled with, the actual WPM, the actual pause durations.
- If someone did well, tell them specifically what to work on next to keep improving — never give empty praise.

Provide 2-3 coaching tips and one drill based on the data provided.`;

function buildUserMessage(data: CoachRequestBody): string {
  const parts: string[] = [];

  parts.push(`REFERENCE TEXT:\n${data.referenceText}`);

  parts.push(`\nSCORES:
- Overall: ${data.overallScore}/100
- Accuracy: ${Math.round(data.accuracyScore)}/100
- Fluency: ${Math.round(data.fluencyScore)}/100
- Completeness: ${Math.round(data.completenessScore)}/100
- Prosody: ${data.prosodyScore !== null ? `${Math.round(data.prosodyScore)}/100` : "N/A"}
- Pace: ${data.wpm} WPM
- Duration: ${(data.durationMs / 1000).toFixed(1)}s`);

  if (data.paceSegments) {
    parts.push(`\nPACE SEGMENTS: Started at ${data.paceSegments.startWpm} WPM, ended at ${data.paceSegments.endWpm} WPM (average: ${data.paceSegments.averageWpm} WPM)`);
  }

  if (data.hesitations.length > 0) {
    const hList = data.hesitations
      .map((h) => `${(h.gapMs / 1000).toFixed(1)}s pause before "${h.word}"`)
      .join("; ");
    parts.push(`\nHESITATIONS (${data.hesitations.length}): ${hList}`);
  } else {
    parts.push("\nHESITATIONS: None");
  }

  if (data.struggleWords.length > 0) {
    const wList = data.struggleWords
      .map((w) => {
        let s = `"${w.word}" (accuracy: ${Math.round(w.score)})`;
        if (w.phoneme) s += ` — weak phoneme: /${w.phoneme}/`;
        return s;
      })
      .join("; ");
    parts.push(`\nSTRUGGLE WORDS: ${wList}`);
  } else {
    parts.push("\nSTRUGGLE WORDS: None");
  }

  if (data.skippedWords.length > 0) {
    parts.push(`\nSKIPPED WORDS: ${data.skippedWords.map((w) => `"${w}"`).join(", ")}`);
  }

  parts.push("\nProvide 2-3 coaching tips and one drill. Return only the JSON object.");

  return parts.join("\n");
}


// ── Route handler ───────────────────────────────────────────────────────────

type CoachRequestBody = {
  referenceText: string;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  wpm: number;
  durationMs: number;
  hesitations: { word: string; gapMs: number }[];
  struggleWords: { word: string; score: number; phoneme: string | null; phonemeTip: string | null }[];
  skippedWords: string[];
  paceSegments: { startWpm: number; endWpm: number; averageWpm: number } | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: CoachRequestBody;
  try {
    body = (await request.json()) as CoachRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.referenceText || body.overallScore == null) {
    return NextResponse.json({ error: "referenceText and overallScore are required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic credentials not configured" }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const format = zodOutputFormat(CoachNotesSchema);
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(body) }],
      output_config: { format },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text in Claude response");
    }

    // Constrained decoding guarantees valid JSON matching the schema.
    // format.parse() runs Zod validation as an extra safety net.
    const result: CoachNotes = format.parse(textBlock.text);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[grind/coach] failed:", err);
    return NextResponse.json({ error: "Failed to generate coaching tips" }, { status: 500 });
  }
}
