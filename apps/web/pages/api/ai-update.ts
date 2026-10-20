import type { NextApiRequest, NextApiResponse } from 'next';
import multiparty from 'multiparty';
import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { analyzeAndUpdateResume } from '@resume/ai-resume';
import {
  ClientError,
  MAX_BODY_BYTES,
  MAX_FILES,
  MAX_JD_CHARS,
  createRateLimiter,
  getClientIp,
  getRequestOrigin,
  isOriginAllowed,
  rateLimitConfig,
} from '../../lib/api-guard';

const JobDescriptionParser = require('../../../../lib/simple-jd-parser');
const JobDescriptionAnalyzer = require('../../../../lib/simple-jd-analyzer');
const PlaintextPDFGenerator = require('../../../../lib/plaintext-pdf');

const parser = new JobDescriptionParser();
const analyzer = new JobDescriptionAnalyzer();
const pdfGen = new PlaintextPDFGenerator();
const checkRateLimit = createRateLimiter(rateLimitConfig());

export const config = {
  api: {
    bodyParser: false,
  },
};

// Directly import from workspace package to avoid dynamic import warnings

async function readRootResumeText() {
  // Try multiple possible paths for the resume PDF
  const possiblePaths = [
    path.join(process.cwd(), '../../Aman_Behl_ATS_Resume.pdf'),
    path.join(process.cwd(), '../../../Aman_Behl_ATS_Resume.pdf'),
    path.join(__dirname, '../../../../../Aman_Behl_ATS_Resume.pdf'),
    '/Users/amanbehl/Documents/resume_transformer/Aman_Behl_ATS_Resume.pdf'
  ];
  
  let resumePath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      resumePath = testPath;
      break;
    }
  }
  
  if (!resumePath) {
    throw new Error(`Root resume PDF not found. Tried paths: ${possiblePaths.join(', ')}`);
  }
  
  const buf = fs.readFileSync(resumePath);
  const parsed = await pdfParse(buf);
  return parsed.text;
}

function inferCompanyName(jdText: string, fallbacks: string[] = []) {
  try {
    const company = analyzer.extractCompany(jdText);
    if (company && company.trim().length > 0) return company.trim().replace(/\s+/g, '-');
  } catch {}
  for (const f of fallbacks) {
    if (f && f.trim()) return f.trim().replace(/\s+/g, '-');
  }
  return 'company';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Vary', 'Origin');
  if (!isOriginAllowed(req.headers)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Only echo back an origin that passed the allowlist; never '*'.
  res.setHeader('Access-Control-Allow-Origin', getRequestOrigin(req.headers) as string);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return res.status(415).json({ error: 'Expected multipart/form-data' });
  }
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: `Upload too large (max ${MAX_BODY_BYTES / (1024 * 1024)} MB)` });
  }

  const limit = checkRateLimit(getClientIp(req.headers, req.socket?.remoteAddress));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Covers chunked bodies with no Content-Length too: multiparty stops at these limits.
  const form = new multiparty.Form({
    maxFilesSize: MAX_BODY_BYTES,
    maxFields: 10,
    maxFieldsSize: 64 * 1024,
    uploadDir: '/tmp',
  });

  form.parse(req, async (err, fields, files) => {
    try {
      const jdFiles = (files?.files as multiparty.File[]) || [];
      const allFiles = Object.values(files || {}).flat() as multiparty.File[];
      const cleanup = () => allFiles.forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });

      if (err) {
        cleanup();
        const status = (err as any).statusCode === 413 ? 413 : 400;
        return res.status(status).json({ error: status === 413 ? 'Upload too large' : 'Invalid upload' });
      }
      if (!jdFiles.length) {
        cleanup();
        return res.status(400).json({ error: 'No JD files uploaded (field name: files)' });
      }
      if (jdFiles.length > MAX_FILES) {
        cleanup();
        return res.status(400).json({ error: `Too many files (max ${MAX_FILES} per request)` });
      }

      if (!process.env.AI_API_KEY) {
        cleanup();
        console.error('AI_API_KEY is not set');
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      const resumeText = await readRootResumeText();

      const outputDir = '/tmp/output-ai';
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const results: any[] = [];
      for (const file of jdFiles) {
        try {
          const ext = path.extname(file.originalFilename || '').toLowerCase();
          let jdText = '';
          if (ext === '.txt') {
            jdText = fs.readFileSync(file.path, 'utf8');
          } else if (['.pdf', '.docx'].includes(ext)) {
            jdText = await parser.parseFile(file.path);
          } else {
            throw new ClientError('Only .txt, .pdf, .docx are supported');
          }
          if (!jdText.trim()) throw new ClientError('Job description is empty');
          if (jdText.length > MAX_JD_CHARS) {
            throw new ClientError(`Job description is too long (max ${MAX_JD_CHARS.toLocaleString('en-US')} characters)`);
          }

          const ai = process.env.AI_FAKE
            ? {
                plan: {
                  objective: 'Test objective',
                  constraints: [],
                  riskChecks: [],
                  jdHighlights: [],
                  actions: [],
                },
                updatedResume: 'Updated resume text (fake) for test',
                model: 'test-local',
              }
            : await analyzeAndUpdateResume(jdText, resumeText, {
                apiKey: process.env.AI_API_KEY,
                baseURL: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL,
                model: process.env.AI_MODEL || 'gpt-4o-mini',
                conservative: false,
              });

          const company = inferCompanyName(jdText, [path.basename(file.originalFilename || 'jd', ext)]);
          const outPdf = path.join(outputDir, `${company}-amanbehl-resume.pdf`);

          await pdfGen.generateFromText(ai.updatedResume, outPdf, 'Aman Behl');
          const pdfBuffer = fs.readFileSync(outPdf);

          results.push({
            originalName: file.originalFilename,
            company,
            plan: ai.plan,
            pdfFileName: path.basename(outPdf),
            pdfData: pdfBuffer.toString('base64'),
          });
        } catch (e: any) {
          console.error(`Error processing file ${file.originalFilename}:`, e);
          // Only validation messages go back to the client; upstream/AI errors stay in the logs.
          const message = e instanceof ClientError ? e.message : 'Failed to process this file';
          results.push({ originalName: file.originalFilename, error: message });
        } finally {
          try { fs.unlinkSync(file.path); } catch {}
        }
      }

      return res.json({ success: true, results });
    } catch (e: any) {
      console.error('API Handler Error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
