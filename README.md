# JD → ATS Resume (AI Aligned)

A powerful tool that converts job descriptions into ATS-friendly resumes using AI-powered analysis.

## Features

- **Next.js UI**: Upload one or more JDs; download per-JD PDFs
- **Multiple Formats**: Supports TXT, PDF, DOCX (JD inputs)
- **Safe Edits**: No fabrication; only rephrase/reorder/tighten existing content
- **OpenAI-Compatible**: Works with OpenAI, Groq, Together, OpenRouter (baseURL + key)
- **ATS-Friendly**: Outputs plain text for your formatter; PDF keeps indentation/line breaks

## Project Structure

```
├── lib/
│   ├── plaintext-pdf.js   # Render plain-text resume to PDF
│   ├── simple-jd-analyzer.js
│   └── simple-jd-parser.js
├── packages/
│   └── ai-resume/         # TypeScript ESM AI module (OpenAI-compatible)
├── apps/
│   └── web/               # Next.js UI + API route
│       └── pages/
│           ├── index.tsx
│           └── api/
│               └── ai-update.ts
├── package.json
└── vercel.json            # Vercel deployment config
```

## Installation

```bash
npm install
```

## Usage

> Note: The legacy CLI has been removed. Use the Next.js UI and API.

### AI Resume Updater

Produces a structured edit plan and an updated plain-text resume (formatting is handled by your existing formatter).

1) Extract your current resume to plain text (if needed):

```bash
node extract-resume-text.js  # writes sample_resume_text.txt
```

2) Build the AI package (first time):

```bash
npm run ai:build
```

Outputs (if using CLI locally for testing only):
- `output/edit_plan.json`: Structured plan of safe edits (no fabrication)
- `output/updated_resume.txt`: Updated plain-text resume (ready for your formatter)

### Web UI (Next.js)

Upload single or multiple JD text files and download per-JD updated resume PDFs.

```bash
# From repo root
npm install
npm --workspace @resume/ai-resume run build
npm run web:dev
```

Open http://localhost:3000 and upload `.txt`, `.pdf`, or `.docx` JD files. The API returns:
- Per file: `{{company_name}}-amanbehl-resume.pdf` (download button)
- Optional: Export plans CSV (count of AI actions per JD)

Server route used: `POST /api/ai-update` with form-data field `jds` (multi).

## Deployment to Vercel

This repo is configured as a monorepo: Next.js UI + API routes in `apps/web`.

Option A — via CLI (root):
```bash
npm install -g vercel
vercel login
vercel --prod
```

Option B — Vercel Dashboard:
- Create a project from this repo
- Root Directory: repository root
- Build & Output Settings: use provided `vercel.json` (it builds `apps/web` with `@vercel/next` and deploys `api/*` functions)

## Environment Variables

- `AI_API_KEY`: API key for your OpenAI-compatible provider.
- `AI_BASE_URL`: Base URL for OpenAI-compatible APIs (e.g., Groq/Together/OpenRouter).
- `AI_MODEL`: Model name (defaults to `gpt-4o-mini`).

Note: An API key is required; no fallback is bundled. Set `AI_API_KEY` in `.env` or Vercel Project Settings.

See `.env.example` for the required variables. On Vercel, set these in Project Settings → Environment Variables.

## Notes on Formatting

- The AI only edits plain text. The PDF rendering keeps line breaks and indentation. Fonts and margins match the current template (Helvetica, A4 with 40pt margins). If you have a different in-house formatter, feed `updated_resume.txt` to it to fully preserve your exact style.

## File Support

- **PDF**: Job descriptions in PDF format
- **DOCX**: Microsoft Word documents
- **TXT**: Plain text files

## Output

- **Resume PDF**: ATS-optimized resume in PDF format
- **Analysis JSON**: Detailed analysis report with extracted skills, experience, and job requirements

## Dependencies

- `mammoth`: DOCX text extraction (JD input)
- `multiparty`: Multi-file upload parsing (API route)
- `pdf-parse`: PDF text extraction (JD input & root resume)
- `pdfmake`: PDF generation (render updated plain text)
- `yargs`: Used by internal tooling

## License

MIT License
