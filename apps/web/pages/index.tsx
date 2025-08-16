import React, { useState, useCallback } from 'react';

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
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFiles(e.target.files);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setLoading(true);
    setResults([]);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/ai-update', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadBase64PDF(filename: string, base64Data: string) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPlansCSV(results: ApiResult[]) {
    const csvContent = results.map(r => `"${r.originalName}","${r.company || ''}","${JSON.stringify(r.plan || {}).replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([`"JD File","Company","Plan"\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-edit-plans.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 20px',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            margin: '0 0 20px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>🤖 AI Resume Updater</h1>
          <p style={{
            fontSize: '1.2rem',
            opacity: 0.9,
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>Upload job description files and get ATS-optimized resumes tailored to each position with zero fabrication.</p>
        </div>

        {/* Upload Area */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: 40,
          marginBottom: 40,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <form onSubmit={onSubmit}>
            <div
              style={{
                border: dragActive ? '3px dashed #667eea' : '3px dashed #ddd',
                borderRadius: 16,
                padding: 60,
                textAlign: 'center',
                background: dragActive ? 'rgba(102, 126, 234, 0.05)' : '#fafafa',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <div style={{ fontSize: '4rem', marginBottom: 20 }}>📁</div>
              <h3 style={{ color: '#333', marginBottom: 10, fontSize: '1.5rem' }}>
                {dragActive ? 'Drop files here!' : 'Drag & Drop Files'}
              </h3>
              <p style={{ color: '#666', marginBottom: 20 }}>
                or click to browse • Supports .txt, .pdf, .docx
              </p>
              {files && files.length > 0 && (
                <div style={{
                  background: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: 8,
                  padding: 15,
                  marginTop: 20,
                  color: '#2e7d32'
                }}>
                  ✅ {files.length} file{files.length > 1 ? 's' : ''} selected
                  <div style={{ fontSize: '0.9rem', marginTop: 5 }}>
                    {Array.from(files).map(f => f.name).join(', ')}
                  </div>
                </div>
              )}
              <input
                id="fileInput"
                type="file"
                multiple
                accept=".txt,.pdf,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <button
                type="submit"
                disabled={loading || !files || files.length === 0}
                style={{
                  background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 40px',
                  borderRadius: 50,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transform: loading ? 'none' : 'translateY(0)',
                  minWidth: 200
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {loading ? '🔄 Processing...' : '🚀 Generate Resumes'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 40,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <h2 style={{ color: '#333', margin: 0, fontSize: '2rem' }}>📊 Results</h2>
              <button
                onClick={() => exportPlansCSV(results)}
                style={{
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 25,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                📥 Export CSV
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: 20 }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 12,
                  padding: 25,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease'
                }}>
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ color: '#333', fontWeight: '600', fontSize: '1.1rem', marginBottom: 5 }}>
                      📄 {r.originalName}
                    </div>
                    {r.company && (
                      <div style={{ color: '#666', fontSize: '0.95rem' }}>
                        🏢 {r.company}
                      </div>
                    )}
                  </div>
                  
                  {r.error ? (
                    <div style={{
                      background: '#ffebee',
                      border: '1px solid #f44336',
                      borderRadius: 8,
                      padding: 15,
                      color: '#c62828'
                    }}>
                      ❌ <strong>Error:</strong> {r.error}
                    </div>
                  ) : (
                    <button
                       onClick={() => r.pdfData && downloadBase64PDF(r.pdfFileName || 'resume.pdf', r.pdfData)}
                       style={{
                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: 25,
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      📥 Download PDF ({r.pdfFileName})
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

