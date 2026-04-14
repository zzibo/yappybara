import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { YapDimension, YapDimensionScore, YapResult } from "@/types";

// ── Structured output schema ────────────────────────────────────────────────

const YapEvalSchema = z.object({
  scores: z
    .array(
      z.object({
        dimension: z.enum(["accuracy", "depth", "clarity", "examples", "fluency"]),
        score: z.number().int().min(1).max(5),
        feedback: z.string().describe("One-sentence explanation for this dimension's score"),
      }),
    )
    .length(5),
  strengths: z.array(z.string()).min(2).max(4).describe("2-4 concrete things the speaker did well"),
  improvements: z.array(z.string()).min(2).max(4).describe("2-4 specific things to improve"),
  summary: z.string().describe("One-paragraph overall assessment, 2-3 sentences"),
});

// ── Rate limiter ─────────────────────────────────────────────────────────────
//
// Each yap is ≥2 min + processing, so a legitimate user can't realistically
// trigger more than ~2 evaluations per minute. We enforce TWO overlapping
// windows:
//   - per-minute burst cap (catches fast abuse)
//   - per-hour sustained cap (catches slow, paced abuse)
//
// Both buckets are in-memory — this is best-effort protection on a single
// serverless instance. For real throughput protection use Upstash Redis.

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

/** Max transcript length sent to Claude. 2 min of speech ≈ ~400 words / ~2500
 *  chars — 8KB is a generous ceiling that still caps worst-case token cost. */
const MAX_TRANSCRIPT_CHARS = 8000;

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

// ── Rubric & prompt ──────────────────────────────────────────────────────────

const DIMENSION_WEIGHTS: Record<YapDimension, number> = {
  accuracy: 0.25,
  depth: 0.25,
  clarity: 0.25,
  examples: 0.15,
  fluency: 0.1,
};

const INTERVIEW_SYSTEM_PROMPT = `You are an expert evaluator of verbal technical explanations. A user is given a topic and speaks about it for up to 2 minutes. Your job is to score their spoken explanation on a 5-dimension rubric.

Score each dimension from 1 to 5 (integer). Be honest and calibrated — 3 is an average explanation, 5 is exceptional. Do not inflate scores.

THE RUBRIC:

1. **Conceptual Accuracy** (weight 25%) — Are the claims factually correct? Any misconceptions or errors?
   - 5: All correct, nuanced, handles edge cases
   - 3: Mostly correct with one notable imprecision
   - 1: Fundamentally incorrect or shows no real understanding

2. **Depth & Completeness** (weight 25%) — Do they go beyond surface level? Cover why/how/when/tradeoffs?
   - 5: Covers all essential aspects, discusses tradeoffs and implications
   - 3: Covers basics but stays surface-level
   - 1: Extremely shallow or off-topic

3. **Clarity & Structure** (weight 25%) — Logical flow? Easy to follow? Good signposting?
   - 5: Clear progression, uses signposting, listener never gets lost
   - 3: Some flow but noticeable disorganization
   - 1: Incoherent stream-of-consciousness

4. **Examples & Analogies** (weight 15%) — Concrete illustrations that ground abstract ideas?
   - 5: Apt, well-chosen examples that illuminate the concept
   - 3: Generic or only partially relevant example
   - 1: No examples, pure jargon

5. **Fluency & Confidence** (weight 10%) — Smooth delivery? Minimal filler/hesitation? (Ignore grammar/accent — transcript is auto-generated.)
   - 5: Natural pace, minimal "um/uh", confident
   - 3: Noticeable hesitation or fillers but still gets through
   - 1: Cannot sustain connected speech

IMPORTANT:
- The transcript was auto-generated from speech. Ignore transcription errors, missing punctuation, and minor grammar issues — judge the IDEAS, not the typing.
- Do NOT penalize accent, pronunciation, or ESL patterns.
- Be specific in feedback. Reference actual things the speaker said.`;

const CASUAL_SYSTEM_PROMPT = `You are an expert evaluator of spoken communication. A user is given a casual topic and speaks about it for up to 2 minutes. Your job is to score how well they communicate their thoughts on a 5-dimension rubric.

Score each dimension from 1 to 5 (integer). Be honest and calibrated — 3 is an average response, 5 is exceptional. Do not inflate scores.

THE RUBRIC:

1. **Substance & Insight** (weight 25%) — Do they say something meaningful? Is there a real point or perspective, or is it all surface?
   - 5: Thoughtful, has a clear point of view with genuine insight
   - 3: Makes a point but stays generic or predictable
   - 1: Rambling with no coherent takeaway

2. **Depth & Development** (weight 25%) — Do they develop their ideas? Go beyond the obvious?
   - 5: Explores the topic thoroughly, builds on initial thoughts, considers nuance
   - 3: Touches the surface but doesn't dig deeper
   - 1: Barely engages with the topic

3. **Clarity & Structure** (weight 25%) — Logical flow? Easy to follow? Good transitions?
   - 5: Clear progression, listener never gets lost, natural transitions
   - 3: Some flow but noticeable jumping between ideas
   - 1: Incoherent stream-of-consciousness

4. **Examples & Stories** (weight 15%) — Concrete details that make it vivid and relatable?
   - 5: Rich, specific details or stories that bring the topic to life
   - 3: Some specifics but mostly abstract or vague
   - 1: Entirely abstract, no concrete details

5. **Fluency & Confidence** (weight 10%) — Smooth delivery? Minimal filler/hesitation? (Ignore grammar/accent — transcript is auto-generated.)
   - 5: Natural pace, minimal "um/uh", confident
   - 3: Noticeable hesitation or fillers but still gets through
   - 1: Cannot sustain connected speech

IMPORTANT:
- The transcript was auto-generated from speech. Ignore transcription errors, missing punctuation, and minor grammar issues — judge the IDEAS, not the typing.
- Do NOT penalize accent, pronunciation, or ESL patterns.
- Be specific in feedback. Reference actual things the speaker said.`;

function getSystemPrompt(yapType: string): string {
  return yapType === "casual" ? CASUAL_SYSTEM_PROMPT : INTERVIEW_SYSTEM_PROMPT;
}

function buildUserMessage(topic: string, transcript: string): string {
  return `TOPIC:
${topic}

TRANSCRIPT (auto-generated from speech):
${transcript}

Score this explanation using the rubric.`;
}

// ── Score computation ────────────────────────────────────────────────────────

const VALID_DIMENSIONS: YapDimension[] = ["accuracy", "depth", "clarity", "examples", "fluency"];

function computeOverall(scores: YapDimensionScore[]): number {
  let sum = 0;
  for (const s of scores) {
    const weight = DIMENSION_WEIGHTS[s.dimension];
    const normalized = ((s.score - 1) / 4) * 100;
    sum += normalized * weight;
  }
  return Math.round(sum);
}

function normalizeScores(
  llmScores: Array<{ dimension: string; score: number; feedback: string }>,
): YapDimensionScore[] {
  return VALID_DIMENSIONS.map((dim) => {
    const found = llmScores.find((s) => s.dimension === dim);
    const rawScore = found?.score ?? 3;
    const clamped = Math.max(1, Math.min(5, Math.round(rawScore)));
    return {
      dimension: dim,
      score: clamped,
      feedback: found?.feedback ?? "",
    };
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

type RequestBody = {
  topic?: unknown;
  transcript?: unknown;
  durationMs?: unknown;
  yapType?: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Parse body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  const durationMs = typeof body.durationMs === "number" ? body.durationMs : 0;
  const yapType = body.yapType === "casual" ? "casual" : "interview";

  if (!topic || !transcript) {
    return NextResponse.json({ error: "topic and transcript are required" }, { status: 400 });
  }

  if (transcript.length < 20) {
    return NextResponse.json({ error: "Transcript too short to evaluate" }, { status: 400 });
  }

  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: "Transcript too long" }, { status: 413 });
  }

  // Validate env
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic credentials not configured" }, { status: 500 });
  }

  // Call Claude with structured output
  try {
    const client = new Anthropic({ apiKey });
    const format = zodOutputFormat(YapEvalSchema);
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: getSystemPrompt(yapType),
      messages: [{ role: "user", content: buildUserMessage(topic, transcript) }],
      output_config: { format },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text in Claude response");
    }

    // Constrained decoding guarantees valid JSON; Zod validates the shape.
    const parsed = format.parse(textBlock.text);
    const scores = normalizeScores(parsed.scores);
    const overallScore = computeOverall(scores);

    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const wpm = durationMs > 0 ? Math.round((wordCount / durationMs) * 60_000) : 0;

    const result: YapResult = {
      overallScore,
      scores,
      strengths: parsed.strengths.slice(0, 4),
      improvements: parsed.improvements.slice(0, 4),
      summary: parsed.summary,
      transcript,
      durationMs,
      wpm,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[yap/evaluate] failed:", err);
    return NextResponse.json({ error: "Failed to evaluate yap" }, { status: 500 });
  }
}
