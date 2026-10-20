import type { IncomingHttpHeaders } from 'node:http';

// Request guards for the public AI route. Every call to /api/ai-update spends the
// owner's AI API key, so we only accept browser requests from the site itself,
// rate-limit per IP and cap the request size before any AI work happens.

export const DEFAULT_PRODUCTION_ORIGINS = ['https://jd-to-ats-resume.vercel.app'];

// Limits. Each JD file becomes one AI call, so files-per-request matters as much as bytes.
export const MAX_BODY_BYTES = 2 * 1024 * 1024; // whole multipart body
export const MAX_FILES = 3;
export const MAX_JD_CHARS = 20_000; // extracted JD text per file

type Env = Record<string, string | undefined>;

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Origins allowed to call the AI route.
 * - ALLOWED_ORIGINS (comma-separated) adds custom domains.
 * - The production domain is always allowed.
 * - Vercel's own deployment URLs (VERCEL_URL etc.) are allowed so preview deploys work.
 * localhost (any port) is also allowed outside production, see isOriginAllowed.
 */
export function getAllowedOrigins(env: Env = process.env): Set<string> {
  const raw = [
    ...DEFAULT_PRODUCTION_ORIGINS,
    ...(env.ALLOWED_ORIGINS || '').split(','),
    env.VERCEL_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  const set = new Set<string>();
  for (const value of raw) {
    if (!value || !value.trim()) continue;
    const origin = normalizeOrigin(value.trim());
    if (origin) set.add(origin);
  }
  return set;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The calling origin, taken from Origin, or from Referer when Origin is missing.
 * Browsers always send Origin on POST, so the site's own UI passes this check.
 * This blocks other websites from using the route; it does not stop a script that
 * forges headers, which is why rate limiting and size caps exist as well.
 */
export function getRequestOrigin(headers: IncomingHttpHeaders): string | null {
  const origin = firstHeader(headers.origin);
  if (origin && origin !== 'null') return normalizeOrigin(origin);
  const referer = firstHeader(headers.referer);
  if (referer) return normalizeOrigin(referer);
  return null;
}

function isLocalDevOrigin(origin: string, env: Env): boolean {
  if (env.NODE_ENV === 'production' && env.VERCEL_ENV !== 'development') return false;
  const { protocol, hostname } = new URL(origin);
  return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
}

export function isOriginAllowed(headers: IncomingHttpHeaders, env: Env = process.env): boolean {
  const origin = getRequestOrigin(headers);
  if (origin === null) return false;
  return getAllowedOrigins(env).has(origin) || isLocalDevOrigin(origin, env);
}

export function getClientIp(headers: IncomingHttpHeaders, remoteAddress?: string): string {
  // On Vercel these headers are set by the platform, not the client.
  const candidates = [
    firstHeader(headers['x-vercel-forwarded-for']),
    firstHeader(headers['x-real-ip']),
    firstHeader(headers['x-forwarded-for']),
  ];
  for (const value of candidates) {
    const ip = value?.split(',')[0]?.trim();
    if (ip) return ip;
  }
  return remoteAddress || 'unknown';
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Best-effort fixed-window rate limiter kept in memory.
 *
 * On Vercel each serverless instance has its own memory and instances are recycled,
 * so this is only a first layer: a determined caller hitting many cold instances can
 * exceed the limit. A durable store (e.g. Upstash Redis with @upstash/ratelimit) would
 * give a real global limit.
 */
export function createRateLimiter(options: { max: number; windowMs: number; now?: () => number }) {
  const { max, windowMs } = options;
  const now = options.now || Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, cost = 1): RateLimitResult {
    const t = now();
    // Drop expired entries so the map can't grow without bound.
    if (hits.size > 5000) {
      hits.forEach((entry, k) => {
        if (entry.resetAt <= t) hits.delete(k);
      });
    }

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
    if (entry.count + cost > max) {
      return { allowed: false, remaining: Math.max(0, max - entry.count), retryAfterSeconds };
    }
    entry.count += cost;
    return { allowed: true, remaining: max - entry.count, retryAfterSeconds };
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Defaults: 10 requests per IP per hour. Override with RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS. */
export function rateLimitConfig(env: Env = process.env) {
  return {
    max: positiveInt(env.RATE_LIMIT_MAX, 10),
    windowMs: positiveInt(env.RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  };
}

/** Error whose message is safe to show to the client. */
export class ClientError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'ClientError';
  }
}
