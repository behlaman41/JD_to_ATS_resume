// Minimal integration test for /api/ai-update using the built handler
// - Spins up a mock OpenAI-compatible server
// - Serves the Next API handler under a tiny HTTP server
// - Sends a multipart request with a simple JD text file

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';

const root = process.cwd();
const builtApiPath = path.join(root, 'apps/web/.next/server/pages/api/ai-update.js');

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
  globalThis.fetch = async (input, init) => {
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
    return origFetch(input, init);
  };
  return () => {
    globalThis.fetch = origFetch;
  };
}

function makeMultipartRequest(fileName, fileContent, contentType = 'text/plain') {
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

  const req = Readable.from(body);
  req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };
  req.method = 'POST';
  return req;
}

function makeMockRes() {
  const headers = {};
  let statusCode = 200;
  let body;
  let ended = false;
  let resolve;
  const done = new Promise((r) => (resolve = r));
  const res = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
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

async function main() {
  ensureBuilt();

  // Import the built API module and extract default handler
  const mod = await import('file://' + builtApiPath);
  const loaded = await mod.default;
  const handler = loaded?.default;
  if (typeof handler !== 'function') throw new Error('API handler not a function');

  // Stub fetch to avoid outbound network
  const restoreFetch = installFetchStub();
  process.env.AI_API_KEY = process.env.AI_API_KEY || 'test-key';
  process.env.AI_BASE_URL = `http://test.local/v1`;

  // Invoke handler directly with a mocked multipart upload
  const req = makeMultipartRequest('jd.txt', 'This is a minimal JD for integration test.');
  const { res, done } = makeMockRes();
  const maybePromise = handler(req, res);
  await done;
  restoreFetch();

  // Basic assertions
  if (res.statusCode !== 200) {
    console.error('Non-200 response:', res.statusCode, res.body);
    process.exit(1);
  }
  if (!res.body?.success) {
    console.error('Response not success:', res.body);
    process.exit(1);
  }
  if (!Array.isArray(res.body.results) || res.body.results.length !== 1) {
    console.error('Unexpected results array:', res.body.results);
    process.exit(1);
  }
  const r0 = res.body.results[0];
  if (!r0.pdfData || typeof r0.pdfData !== 'string') {
    console.error('pdfData missing or invalid');
    process.exit(1);
  }

  console.log('PASS: /api/ai-update minimal integration test');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
