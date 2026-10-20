import path from 'path';
import { spawnSync } from 'child_process';

const webDir = path.join(process.cwd(), 'apps/web');
const runner = path.join(__dirname, 'helpers/run-built-handler.mjs');

type HandlerResult = { status: number; headers: Record<string, string>; body: any };

function runHandler(spec: Record<string, unknown> = {}): HandlerResult[] {
  const r = spawnSync(process.execPath, [runner], {
    input: JSON.stringify(spec),
    cwd: webDir, // the route resolves the resume PDF relative to apps/web
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      AI_API_KEY: 'sk-test-key',
    },
  });
  if (r.status !== 0) throw new Error(`handler runner failed:\n${r.error || r.stderr}`);
  const lines = r.stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

beforeAll(() => {
  const r = spawnSync('npm', ['--workspace', '@resume/web', 'run', 'build'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw new Error('Failed to build @resume/web');
}, 300_000);

const SITE = 'https://jd-to-ats-resume.vercel.app';

test('POST /api/ai-update returns a PDF result for the site itself', () => {
  const [res] = runHandler({ headers: { origin: SITE } });
  expect(res.status).toBe(200);
  expect(res.headers['access-control-allow-origin']).toBe(SITE);
  expect(res.body?.success).toBe(true);
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.results[0]).toHaveProperty('pdfData');
});

describe('guards', () => {
  test('rejects requests from other origins, or with no origin, before any AI call', () => {
    const [evil] = runHandler({ headers: { origin: 'https://evil.example' } });
    expect(evil.status).toBe(403);
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();

    const [none] = runHandler();
    expect(none.status).toBe(403);
  });

  test('answers CORS preflight only for allowed origins', () => {
    const [ok] = runHandler({ method: 'OPTIONS', headers: { origin: SITE } });
    expect(ok.status).toBe(204);
    expect(ok.headers['access-control-allow-origin']).toBe(SITE);

    const [bad] = runHandler({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    expect(bad.status).toBe(403);
  });

  test('returns 413 for oversized bodies', () => {
    const [byHeader] = runHandler({ headers: { origin: SITE, 'content-length': String(10 * 1024 * 1024) } });
    expect(byHeader.status).toBe(413);

    // No Content-Length (chunked): multiparty's limit still applies.
    const [byStream] = runHandler({ headers: { origin: SITE }, files: [{ name: 'jd.txt', content: 'x'.repeat(3 * 1024 * 1024) }] });
    expect(byStream.status).toBe(413);
  });

  test('rejects too many files and over-long job descriptions', () => {
    const files = Array.from({ length: 4 }, (_, i) => ({ name: `jd${i}.txt`, content: 'A job description.' }));
    const [many] = runHandler({ headers: { origin: SITE }, files });
    expect(many.status).toBe(400);

    const [long] = runHandler({ headers: { origin: SITE }, files: [{ name: 'jd.txt', content: 'word '.repeat(5000) }] });
    expect(long.status).toBe(200);
    expect(long.body.results[0].error).toMatch(/too long/);
    expect(long.body.results[0].pdfData).toBeUndefined();
  });

  test('returns 429 once the per-IP limit is used up', () => {
    const results = runHandler({
      headers: { origin: SITE, 'x-forwarded-for': '203.0.113.7' },
      calls: 3,
      env: { RATE_LIMIT_MAX: '2' },
    });
    expect(results.map((r) => r.status)).toEqual([200, 200, 429]);
    expect(Number(results[2].headers['retry-after'])).toBeGreaterThan(0);
  });

  test('does not leak upstream AI errors or the key', () => {
    const [res] = runHandler({ headers: { origin: SITE }, env: { STUB_UPSTREAM_FAIL: '1' } });
    expect(res.status).toBe(200);
    expect(res.body.results[0].error).toBe('Failed to process this file');
    expect(JSON.stringify(res.body)).not.toMatch(/sk-test-key|secret/);
  });
});
