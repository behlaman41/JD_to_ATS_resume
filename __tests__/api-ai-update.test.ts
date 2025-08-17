import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { Readable } from 'stream';

function ensureBuilt() {
  const r = spawnSync('npm', ['--workspace', '@resume/web', 'run', 'build'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error('Failed to build @resume/web');
  }
}

function installFetchStub() {
  const origFetch = globalThis.fetch;
  const fakeResult = {
    plan: {
      objective: 'Make resume align to JD',
      constraints: [],
      riskChecks: [],
      jdHighlights: ['example'],
      actions: [],
    },
    updatedResume: 'Updated resume text for test',
    model: 'test-local',
  };
  globalThis.fetch = async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/chat/completions')) {
      const payload = {
        id: 'cmpl-test',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(fakeResult) },
          },
        ],
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return origFetch(input);
  };
  return () => {
    globalThis.fetch = origFetch;
  };
}

function makeMultipartRequest(fileName: string, fileContent: string | Buffer, contentType = 'text/plain') {
  const boundary = '----testboundary' + Math.random().toString(16).slice(2);
  const head = `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(head, 'utf8'),
    Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(String(fileContent), 'utf8'),
    Buffer.from(tail, 'utf8'),
  ]);

  const req = Readable.from(body) as any;
  req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };
  req.method = 'POST';
  return req;
}

function makeMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any;
  let ended = false;
  let resolve: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const res = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(obj: any) {
      body = obj;
      ended = true;
      resolve();
      return this;
    },
    end() {
      ended = true;
      resolve();
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get ended() {
      return ended;
    },
  };
  return { res, done };
}

test('POST /api/ai-update returns a PDF result', async () => {
  ensureBuilt();
  const builtApiPath = path.join(process.cwd(), 'apps/web/.next/server/pages/api/ai-update.js');
  const mod = await import('file://' + builtApiPath);
  const loaded: any = await mod.default;
  const handler = loaded?.default || loaded;
  const restoreFetch = installFetchStub();
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_BASE_URL = 'http://test.local/v1';
  const req = makeMultipartRequest('jd.txt', 'This is a minimal JD for integration test.');
  const { res, done } = makeMockRes();
  handler(req, res);
  await done;
  restoreFetch();
  expect(res.statusCode).toBe(200);
  expect(res.body?.success).toBe(true);
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.results[0]).toHaveProperty('pdfData');
});
