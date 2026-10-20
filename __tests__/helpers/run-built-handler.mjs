// Runs the built /api/ai-update handler once in plain Node and prints the response as JSON.
// Jest can't load the Next build output itself (it uses dynamic import()), so tests spawn this.
//
// Input (JSON on stdin):
//   { headers?, files?: [{ name, content }], rawBody?, calls?: number, env? }
// Output (stdout, last line): [{ status, headers, body }, ...] — one entry per call.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const spec = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
Object.assign(process.env, spec.env || {});

const builtApiPath = path.join(process.cwd(), '.next/server/pages/api/ai-update.js');

// Minimal OpenAI-compatible server, so no real AI key or network is needed.
function startMockAi() {
  const fakeResult = {
    plan: { objective: 'Make resume align to JD', constraints: [], riskChecks: [], jdHighlights: ['example'], actions: [] },
    updatedResume: 'Updated resume text for test',
    model: 'test-local',
  };
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (process.env.STUB_UPSTREAM_FAIL) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: { message: 'upstream secret detail sk-test-key' } }));
      }
      res.end(JSON.stringify({
        id: 'cmpl-test',
        object: 'chat.completion',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(fakeResult) } }],
      }));
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      process.env.AI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
      resolve(server);
    }),
  );
}

function makeRequest() {
  const boundary = '----testboundary' + Math.random().toString(16).slice(2);
  let body;
  if (spec.rawBody !== undefined) {
    body = Buffer.from(spec.rawBody, 'utf8');
  } else {
    const parts = (spec.files || [{ name: 'jd.txt', content: 'This is a minimal JD for integration test.' }]).map((f) =>
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f.name}"\r\n` +
          `Content-Type: text/plain\r\n\r\n${f.content}\r\n`,
        'utf8',
      ),
    );
    body = Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`, 'utf8')]);
  }
  const req = Readable.from(body);
  req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, ...(spec.headers || {}) };
  req.method = spec.method || 'POST';
  req.socket = { remoteAddress: '10.0.0.1' };
  return req;
}

function makeMockRes() {
  const headers = {};
  let statusCode = 200;
  let body;
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
      resolve();
      return this;
    },
    end() {
      resolve();
    },
  };
  return { res, done, result: () => ({ status: statusCode, headers, body }) };
}

async function main() {
  const server = await startMockAi();
  // The build output is an async webpack module: its default export is a promise.
  const mod = await import('file://' + builtApiPath);
  const loaded = await mod.default;
  const handler = loaded?.default || loaded;
  if (typeof handler !== 'function') throw new Error('API handler not a function');

  const out = [];
  for (let i = 0; i < (spec.calls || 1); i++) {
    const { res, done, result } = makeMockRes();
    handler(makeRequest(), res);
    await done;
    out.push(result());
  }
  server.close();
  console.log(JSON.stringify(out));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
