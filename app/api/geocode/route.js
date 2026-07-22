export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

// Cache identical queries briefly so repeated lookups don't re-hit LocationIQ
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // query -> { data, expiresAt }

// Per-IP throttle guards the upstream quota against direct/abusive calls
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimits = new Map(); // ip -> { count, windowStart }

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 3) {
    return NextResponse.json({ success: true, data: [] });
  }

  const cacheKey = q.trim().toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: "Too many location lookups, please slow down." },
      { status: 429 }
    );
  }

  try {
    const url = `https://api.locationiq.com/v1/autocomplete?key=${process.env.LOCATIONIQ_API_KEY}&q=${encodeURIComponent(q)}&limit=5&format=json`;
    const res = await fetch(url);

    if (!res.ok) {
      // LocationIQ returns 404 for "no results" — not a real error
      if (res.status === 404) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw new Error(`LocationIQ error: ${res.status}`);
    }

    const results = await res.json();
    const data = results.map((r) => ({ placeId: r.place_id, displayName: r.display_name }));
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/geocode]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
