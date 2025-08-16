import type { NextApiRequest, NextApiResponse } from 'next';
import multiparty from 'multiparty';
import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';

const JobDescriptionParser = require('../../../../lib/simple-jd-parser');
const JobDescriptionAnalyzer = require('../../../../lib/simple-jd-analyzer');
const PlaintextPDFGenerator = require('../../../../lib/plaintext-pdf');

const parser = new JobDescriptionParser();
const analyzer = new JobDescriptionAnalyzer();
const pdfGen = new PlaintextPDFGenerator();

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getAiModule() {
  const mod = await import(path.join(process.cwd(), 'packages/ai-resume/dist/index.js'));
  return mod as any;
}

async function readRootResumeText() {
  const resumePath = path.join(process.cwd(), 'Aman_Behl_ATS_Resume.pdf');
  if (!fs.existsSync(resumePath)) throw new Error('Root resume PDF not found.');
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new multiparty.Form({ maxFilesSize: 10 * 1024 * 1024, uploadDir: '/tmp' });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const jdFiles = (files?.jds as multiparty.File[]) || [];
      if (!jdFiles.length) return res.status(400).json({ error: 'No JD files uploaded (field name: jds)' });

      const resumeText = await readRootResumeText();
      const { analyzeAndUpdateResume } = await getAiModule();

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
            throw new Error('Only .txt, .pdf, .docx are supported');
          }

          const ai = await analyzeAndUpdateResume(jdText, resumeText, {
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
          results.push({ originalName: file.originalFilename, error: e.message });
        } finally {
          try { fs.unlinkSync(file.path); } catch {}
        }
      }

      return res.json({ success: true, results });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}

