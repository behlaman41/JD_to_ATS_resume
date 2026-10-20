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

1) Provide your base resume. It is never committed (see `.gitignore`):
   - put the PDF at the repo root as `Aman_Behl_ATS_Resume.pdf`, or point `RESUME_PDF_PATH` at it, or
   - set `RESUME_TEXT` to the plain-text resume (simplest on Vercel).

   To get plain text from a PDF:

```bash
node extract-resume-text.js path/to/resume.pdf  # writes sample_resume_text.txt
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

Server route used: `POST /api/ai-update` with multipart form-data field `files` (up to 3 files, 2 MB total).

The route only accepts requests from the site's own origin (403 otherwise), is rate-limited per IP (429), and caps upload and job-description size (413/400). See `.env.example` for the settings.

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
- Build & Output Settings: use provided `vercel.json` (it builds `apps/web` with `@vercel/next`)

## Environment Variables

All variables are listed with comments in `.env.example`. Copy it to `apps/web/.env.local` for local development; on Vercel, set them in Project Settings → Environment Variables.

- `AI_API_KEY` (required): API key for your OpenAI-compatible provider.
- `AI_BASE_URL`: Base URL for OpenAI-compatible APIs (e.g., Groq/Together/OpenRouter).
- `AI_MODEL`: Model name (defaults to `gpt-4o-mini`).
- `RESUME_TEXT` or `RESUME_PDF_PATH` (one is required): the base resume.
- `CANDIDATE_NAME`: name on generated PDFs.
- `ALLOWED_ORIGINS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (optional): route protection.

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
