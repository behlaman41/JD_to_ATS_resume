#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzeAndUpdateResume } from './index.js';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('jd', { type: 'string', demandOption: true, describe: 'Path to JD text file (pdf/docx pre-parsed to text)' })
    .option('resume', { type: 'string', demandOption: true, describe: 'Path to current resume plain text' })
    .option('out', { type: 'string', default: 'output', describe: 'Output directory' })
    .option('apiKey', { type: 'string', describe: 'API key override' })
    .option('baseURL', { type: 'string', describe: 'OpenAI-compatible base URL (Groq/Together/OpenRouter)' })
    .option('model', { type: 'string', default: 'gpt-4o-mini', describe: 'Model name' })
    .option('conservative', { type: 'boolean', default: false, describe: 'Prefer fewer, safer edits' })
    .strict()
    .help()
    .argv;

  const jdPath = path.resolve(String(argv.jd));
  const resumePath = path.resolve(String(argv.resume));
  const outDir = path.resolve(String(argv.out));

  if (!fs.existsSync(jdPath)) throw new Error(`JD file not found: ${jdPath}`);
  if (!fs.existsSync(resumePath)) throw new Error(`Resume file not found: ${resumePath}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jdText = fs.readFileSync(jdPath, 'utf8');
  const resumeText = fs.readFileSync(resumePath, 'utf8');

  const result = await analyzeAndUpdateResume(jdText, resumeText, {
    apiKey: argv.apiKey as string | undefined,
    baseURL: argv.baseURL as string | undefined,
    model: argv.model as string | undefined,
    conservative: Boolean(argv.conservative),
  });

  const planPath = path.join(outDir, 'edit_plan.json');
  const updatedPath = path.join(outDir, 'updated_resume.txt');

  fs.writeFileSync(planPath, JSON.stringify(result.plan, null, 2), 'utf8');
  fs.writeFileSync(updatedPath, result.updatedResume, 'utf8');

  console.log('✅ AI edit plan saved:', planPath);
  console.log('✅ Updated resume (plain text) saved:', updatedPath);
  if (result.model) console.log('🔎 Model:', result.model);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});

