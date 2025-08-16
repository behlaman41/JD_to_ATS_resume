import React, { useState } from 'react';

type ApiResult = {
  originalName: string;
  company?: string;
  plan?: any;
  pdfFileName?: string;
  pdfData?: string; // base64
  error?: string;
};

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResult[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setLoading(true);
    setResults([]);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('jds', f));
    const res = await fetch('/api/ai-update', { method: 'POST', body: fd });
    const json = await res.json();
    setResults(json.results || []);
    setLoading(false);
  }

  function downloadBase64PDF(name: string, b64?: string) {
    if (!b64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${b64}`;
    link.download = name;
    link.click();
  }

  function exportPlansCSV(rs: ApiResult[]) {
    const rows = [['originalName', 'company', 'action_count']].concat(
      rs.map((r) => [r.originalName, r.company || '', String(r.plan?.actions?.length || 0)])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-edit-plans.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AI Resume Updater</h1>
      <p>Upload one or more JD text files (.txt, .pdf, .docx). You’ll receive updated resume PDFs aligned to each JD with no fabrication.</p>
      <form onSubmit={onSubmit} style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <input type="file" multiple accept=".txt,.pdf,.docx" onChange={(e) => setFiles(e.target.files)} />
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Processing…' : 'Generate Updated PDFs'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Results</h2>
          <button onClick={() => exportPlansCSV(results)} style={{ marginBottom: 12 }}>Export Plans CSV</button>
          <ul>
            {results.map((r, i) => (
              <li key={i} style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
                <div><strong>JD:</strong> {r.originalName}</div>
                {r.company && <div><strong>Company:</strong> {r.company}</div>}
                {r.error ? (
                  <div style={{ color: 'crimson' }}><strong>Error:</strong> {r.error}</div>
                ) : (
                  <div>
                    <button onClick={() => downloadBase64PDF(r.pdfFileName || 'resume.pdf', r.pdfData)}>
                      Download PDF ({r.pdfFileName})
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

