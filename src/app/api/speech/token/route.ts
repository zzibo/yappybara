import { type NextRequest, NextResponse } from "next/server";

// ── Token cache ──────────────────────────────────────────────────────────────

interface CachedToken {
  token: string;
  region: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

// 9-minute TTL (tokens expire at 10 min; give 1 min buffer)
const TOKEN_TTL_MS = 9 * 60 * 1000;

// ── Rate limiter ─────────────────────────────────────────────────────────────

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

// Tokens are cached for 9 minutes and auto-refreshed, so 5/min per IP is
// plenty for any legitimate client. Anything higher signals scraping.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(ip);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return true;
  }

  bucket.count += 1;
  return false;
}

// ── Azure fetch ───────────────────────────────────────────────────────────────

async function fetchAzureToken(key: string, region: string): Promise<string> {
  const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Length": "0",
    },
  });

  if (!response.ok) {
    throw new Error(`Azure Speech token request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Validate env vars
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure Speech credentials not configured" }, { status: 500 });
  }

  // Serve from cache if still valid
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return NextResponse.json({
      token: tokenCache.token,
      region: tokenCache.region,
      expiresAt: tokenCache.expiresAt,
    });
  }

  // Fetch fresh token
  try {
    const token = await fetchAzureToken(key, region);
    const expiresAt = now + TOKEN_TTL_MS;

    tokenCache = { token, region, expiresAt };

    return NextResponse.json({ token, region, expiresAt });
  } catch (err) {
    console.error("[speech/token] Azure fetch failed:", err);
    return NextResponse.json({ error: "Failed to obtain speech token" }, { status: 500 });
  }
}
