// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenResponse {
  token: string;
  region: string;
  expiresAt: number;
}

interface CachedToken {
  token: string;
  region: string;
  expiresAt: number;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

// Refresh 60 seconds before the server-side token expires to avoid races
const REFRESH_AHEAD_MS = 60 * 1000;

let cache: CachedToken | null = null;

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchToken(): Promise<CachedToken> {
  const response = await fetch("/api/speech/token", { method: "POST" });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Speech token fetch failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TokenResponse;

  if (!data.token || !data.region || !data.expiresAt) {
    throw new Error("Invalid token response from /api/speech/token");
  }

  return { token: data.token, region: data.region, expiresAt: data.expiresAt };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a valid Azure Speech token and region.
 * Caches the token client-side and auto-refreshes before expiry.
 */
export async function getAzureSpeechToken(): Promise<{
  token: string;
  region: string;
}> {
  const now = Date.now();

  if (cache && cache.expiresAt - REFRESH_AHEAD_MS > now) {
    return { token: cache.token, region: cache.region };
  }

  cache = await fetchToken();
  return { token: cache.token, region: cache.region };
}
