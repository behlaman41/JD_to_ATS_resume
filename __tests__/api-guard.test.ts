import {
  createRateLimiter,
  getAllowedOrigins,
  getClientIp,
  isOriginAllowed,
  rateLimitConfig,
} from '../apps/web/lib/api-guard';

const prod = { NODE_ENV: 'production' };

describe('origin allowlist', () => {
  it('allows the production site by default', () => {
    expect(isOriginAllowed({ origin: 'https://jd-to-ats-resume.vercel.app' }, prod)).toBe(true);
  });

  it('rejects other sites, missing headers and the opaque "null" origin', () => {
    expect(isOriginAllowed({ origin: 'https://evil.example' }, prod)).toBe(false);
    expect(isOriginAllowed({}, prod)).toBe(false);
    expect(isOriginAllowed({ origin: 'null' }, prod)).toBe(false);
    expect(isOriginAllowed({ origin: 'https://jd-to-ats-resume.vercel.app.evil.example' }, prod)).toBe(false);
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(isOriginAllowed({ referer: 'https://jd-to-ats-resume.vercel.app/some/page' }, prod)).toBe(true);
    expect(isOriginAllowed({ referer: 'https://evil.example/jd-to-ats-resume.vercel.app' }, prod)).toBe(false);
  });

  it('allows localhost only outside production', () => {
    expect(isOriginAllowed({ origin: 'http://localhost:3000' }, prod)).toBe(false);
    expect(isOriginAllowed({ origin: 'http://localhost:3000' }, { NODE_ENV: 'development' })).toBe(true);
    expect(isOriginAllowed({ origin: 'http://127.0.0.1:3100' }, { NODE_ENV: 'development' })).toBe(true);
    expect(isOriginAllowed({ origin: 'http://localhost.evil.example' }, { NODE_ENV: 'development' })).toBe(false);
  });

  it('adds ALLOWED_ORIGINS and Vercel deployment URLs', () => {
    const origins = getAllowedOrigins({
      ...prod,
      ALLOWED_ORIGINS: 'https://resume.example.com, https://other.example ',
      VERCEL_URL: 'jd-to-ats-resume-abc123.vercel.app',
    });
    expect(origins.has('https://resume.example.com')).toBe(true);
    expect(origins.has('https://other.example')).toBe(true);
    expect(origins.has('https://jd-to-ats-resume-abc123.vercel.app')).toBe(true);
  });
});

describe('client IP', () => {
  it('prefers platform headers and takes the first forwarded hop', () => {
    expect(getClientIp({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' })).toBe('1.1.1.1');
    expect(getClientIp({ 'x-forwarded-for': '3.3.3.3, 10.0.0.1' })).toBe('3.3.3.3');
    expect(getClientIp({}, '127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('rate limiter', () => {
  it('blocks after max requests in a window and resets afterwards', () => {
    let t = 0;
    const check = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(check('a').allowed).toBe(true);
    expect(check('a').allowed).toBe(true);
    const blocked = check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(check('b').allowed).toBe(true); // separate key
    t = 1000;
    expect(check('a').allowed).toBe(true);
  });

  it('reads limits from env with safe fallbacks', () => {
    expect(rateLimitConfig({ RATE_LIMIT_MAX: '3', RATE_LIMIT_WINDOW_MS: '5000' })).toEqual({ max: 3, windowMs: 5000 });
    expect(rateLimitConfig({ RATE_LIMIT_MAX: 'abc', RATE_LIMIT_WINDOW_MS: '-1' })).toEqual({ max: 10, windowMs: 3600000 });
  });
});
