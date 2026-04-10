import { type NextRequest, NextResponse } from "next/server";

/**
 * Origin guard for /api/* routes.
 *
 * Enforces that requests come from a browser context whose Origin (or Referer)
 * matches the server's own host. This blocks casual abuse vectors like:
 *   - raw curl / automated scraping without Origin headers
 *   - cross-origin fetches from other sites trying to burn your quota
 *
 * It does NOT block a determined attacker who knows your domain and forges
 * the Origin header. That's Cloudflare Turnstile's job (Tier 2). This is
 * the cheap first line of defense.
 *
 * NOTE: This is not CSRF protection. Yappybara has no auth state — there are
 * no cookies, sessions, or user IDs to ride on — so CSRF isn't applicable.
 * This middleware is purely cost/abuse mitigation for the two API routes
 * that call paid services (Azure Speech, Anthropic).
 */
export function middleware(req: NextRequest) {
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");

  // Derive the origin: prefer Origin header, fall back to Referer.
  let originHost: string | null = null;
  try {
    if (originHeader) {
      originHost = new URL(originHeader).host;
    } else if (refererHeader) {
      originHost = new URL(refererHeader).host;
    }
  } catch {
    originHost = null;
  }

  if (!originHost) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Same-host check — works automatically for localhost, Vercel previews,
  // and production without any env config.
  if (originHost !== req.nextUrl.host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
