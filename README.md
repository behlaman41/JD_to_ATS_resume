# JD to ATS Resume Converter

A powerful tool that converts job descriptions into ATS-friendly resumes using AI-powered analysis.

## Features

- **CLI Tool**: Command-line interface for batch processing
- **Web Interface**: User-friendly web UI for file uploads
- **Multiple Formats**: Supports PDF, DOCX, and TXT job descriptions
- **ATS Optimization**: Generates resumes optimized for Applicant Tracking Systems
- **Analysis Reports**: Provides detailed analysis of job requirements

## Project Structure

```
├── api/
│   └── upload.js          # Vercel serverless function
├── lib/
│   ├── pdf-resume-generator.js
│   ├── simple-jd-analyzer.js
│   └── simple-jd-parser.js
├── public/
│   └── index.html         # Web interface
├── jd-to-resume.js        # Main CLI tool
├── package.json
└── vercel.json            # Vercel deployment config
```

## Installation

```bash
npm install
```

## Usage

### CLI Tool

```bash
# Process a single job description
node jd-to-resume.js --input job-description.txt --output ./output

# Show help
node jd-to-resume.js --help
```

### Web Interface (Local Development)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Start local development server
vercel dev
```

## Deployment to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Production Deployment**:
   ```bash
   vercel --prod
   ```

## Environment Variables

No environment variables are required for basic functionality.

## File Support

- **PDF**: Job descriptions in PDF format
- **DOCX**: Microsoft Word documents
- **TXT**: Plain text files

## Output

- **Resume PDF**: ATS-optimized resume in PDF format
- **Analysis JSON**: Detailed analysis report with extracted skills, experience, and job requirements

## Dependencies

- `docx`: Word document processing
- `mammoth`: DOCX to HTML conversion
- `multiparty`: File upload handling for Vercel
- `pdf-parse`: PDF text extraction
- `pdfmake`: PDF generation
- `yargs`: CLI argument parsing

## License

MIT License