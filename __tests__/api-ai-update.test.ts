import path from 'path';
import { spawnSync } from 'child_process';

const webDir = path.join(process.cwd(), 'apps/web');
const runner = path.join(__dirname, 'helpers/run-built-handler.mjs');

type HandlerResult = { status: number; headers: Record<string, string>; body: any };

function runHandler(spec: Record<string, unknown> = {}): HandlerResult[] {
  const r = spawnSync(process.execPath, [runner, JSON.stringify(spec)], {
    cwd: webDir, // the route resolves the resume PDF relative to apps/web
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      AI_API_KEY: 'sk-test-key',
    },
  });
  if (r.status !== 0) throw new Error(`handler runner failed:\n${r.stderr}`);
  const lines = r.stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

beforeAll(() => {
  const r = spawnSync('npm', ['--workspace', '@resume/web', 'run', 'build'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw new Error('Failed to build @resume/web');
}, 300_000);

test('POST /api/ai-update returns a PDF result', () => {
  const [res] = runHandler();
  expect(res.status).toBe(200);
  expect(res.body?.success).toBe(true);
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.results[0]).toHaveProperty('pdfData');
});
