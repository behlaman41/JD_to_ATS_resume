// Simple smoke test to ensure the AI module can be resolved
import path from 'node:path';
import fs from 'node:fs';

const candidates = [
  path.join(process.cwd(), 'packages/ai-resume/dist/index.js'),
  path.join(process.cwd(), 'apps/web/../../packages/ai-resume/dist/index.js'),
];

const found = candidates.find((p) => fs.existsSync(p));
if (!found) {
  console.error('AI module dist not found. Tried:', candidates);
  process.exit(2);
}

const mod = await import(found);
if (typeof mod.analyzeAndUpdateResume !== 'function') {
  console.error('analyzeAndUpdateResume not exported correctly');
  console.log('Module keys:', Object.keys(mod));
  process.exit(3);
}

console.log('OK: Module loaded from', found);
console.log('Export typeof analyzeAndUpdateResume:', typeof mod.analyzeAndUpdateResume);

