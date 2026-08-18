import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class AdminTerminal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newSubjectCode: 'MATH-201',
      newPaperText:
        'CONFIDENTIAL CENTRAL UNIVERSITY EXAMINATION 2026\nSubject: Mathematics (MATH-201)\nMax Marks: 100 | Time Allowed: 3 Hours\n\nQ1. Evaluate the definite integral of sin^2(x) from 0 to pi.\nQ2. Solve the linear differential equation dy/dx + P(x)y = Q(x).\nQ3. State and prove Cayley-Hamilton Theorem.',
      newDelaySeconds: 15,
      pdfFile: null,
      pdfFileName: '',
      pdfFileSize: '',
      pdfPreviewUrl: '',
      uploading: false,
      uploadSuccess: null,
      uploadError: '',
      registeredPapers: [],
      auditLogs: [],
      auditLoading: false,
      auditError: '',
    };
  }

  componentDidMount() {
    this.loadRegisteredPapers();
    this.loadAuditLogs();
  }

  handlePdfFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      this.setState({ uploadError: 'Invalid file format. Please upload a .pdf document.' });
      return;
    }

    const fileSizeKb = (file.size / 1024).toFixed(1) + ' KB';

    try {
      let rawText = '';
      if (typeof file.arrayBuffer === 'function') {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder('latin1');
        rawText = decoder.decode(bytes);
      } else if (typeof file.text === 'function') {
        rawText = await file.text();
      } else {
        rawText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result || '');
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      const textMatches = [];
      const regex = /\(([^()]{2,})\)\s*(?:Tj|TJ|\n|\[)/g;
      let match;
      while ((match = regex.exec(rawText)) !== null) {
        const cleaned = match[1].replace(/\\([()\\])/g, '$1').trim();
        if (cleaned && !cleaned.startsWith('/') && !cleaned.startsWith('%') && cleaned.length > 1) {
          textMatches.push(cleaned);
        }
      }

      let extracted = textMatches.join('\n');
      if (!extracted.trim()) {
        const strings = rawText.match(/[\x20-\x7E\s]{4,}/g) || [];
        const filtered = strings.filter(
          (s) =>
            !s.includes('/Type') &&
            !s.includes('/Filter') &&
            !s.includes('/Font') &&
            !s.includes('/Catalog') &&
            !s.includes('endobj') &&
            !s.includes('stream') &&
            s.trim().length > 3
        );
        extracted = filtered.join(' ').trim();
      }

      if (!extracted.trim()) {
        extracted = `[CONFIDENTIAL QUESTION PAPER DOCUMENT: ${file.name}]\nFile size: ${fileSizeKb}\nUploaded PDF binary stream ready for secure 2-stage encryption.`;
      }

      let previewUrl = '';
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (err) {
          console.error('URL.createObjectURL failed', err);
        }
      }

      this.setState({
        pdfFile: file,
        pdfFileName: file.name,
        pdfFileSize: fileSizeKb,
        pdfPreviewUrl: previewUrl,
        newPaperText: extracted,
        uploadError: '',
      });
    } catch (err) {
      this.setState({ uploadError: 'Failed to read uploaded PDF file.' });
    }
  };

  handleRemovePdf = () => {
    if (this.state.pdfPreviewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(this.state.pdfPreviewUrl);
      } catch (err) {
        console.error('URL.revokeObjectURL failed', err);
      }
    }
    this.setState({
      pdfFile: null,
      pdfFileName: '',
      pdfFileSize: '',
      pdfPreviewUrl: '',
      newPaperText: '',
    });
  };

  loadRegisteredPapers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/papers`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.papers)) {
        this.setState({ registeredPapers: data.papers });
      }
    } catch (e) {
      console.error('Failed to fetch registered papers', e);
    }
  };

  loadAuditLogs = async () => {
    this.setState({ auditLoading: true, auditError: '' });

    try {
      const response = await fetch(`${API_BASE}/api/audit-logs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load audit logs.');
      }

      this.setState({ auditLogs: Array.isArray(data.audit_logs) ? data.audit_logs : [] });
    } catch (err) {
      const isConnectionError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      const friendlyMsg = isConnectionError
        ? 'Cannot connect to Python backend server. Please verify python server.py is running on http://localhost:8000'
        : err.message;
      this.setState({ auditError: friendlyMsg });
    } finally {
      this.setState({ auditLoading: false });
    }
  };

  handleUploadPaper = async (e) => {
    e.preventDefault();
    const { newSubjectCode, newPaperText, newDelaySeconds } = this.state;

    if (!newSubjectCode.trim() || !newPaperText.trim()) {
      this.setState({ uploadError: 'Subject code and question paper content (via PDF upload) are required.' });
      return;
    }

    this.setState({ uploading: true, uploadError: '', uploadSuccess: null });

    try {
      const response = await fetch(`${API_BASE}/api/admin/upload-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_code: newSubjectCode,
          paper_text: newPaperText,
          delay_seconds: parseInt(newDelaySeconds, 10) || 10,
          uploader_username: 'controller_verma',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Paper upload and encryption failed.');
      }

      this.setState({
        uploadSuccess: data,
      });

      this.loadRegisteredPapers();
      this.loadAuditLogs();
    } catch (err) {
      this.setState({ uploadError: err.message });
    } finally {
      this.setState({ uploading: false });
    }
  };

  render() {
    const {
      newSubjectCode,
      newPaperText,
      newDelaySeconds,
      pdfFileName,
      pdfFileSize,
      pdfPreviewUrl,
      uploading,
      uploadSuccess,
      uploadError,
      registeredPapers,
      auditLogs,
      auditLoading,
      auditError,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
        {/* Header Bar */}
        <div className="max-w-6xl mx-auto mb-6 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                🏛️
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  CENTRAL ADMIN TERMINAL
                  <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-mono">
                    STANDALONE APP
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Paper Encryption Engine & Split Authority Cryptographic Enclave</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
              🔒 Question Paper Upload & 2-Stage Encryption Engine
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Upload PDF question papers to encrypt at creation with 2-stage split authority locks.
            </p>
          </div>

          {uploadError && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm font-mono flex items-center justify-between">
              <span>[UPLOAD ERROR] {uploadError}</span>
              <button onClick={() => this.setState({ uploadError: '' })} className="text-red-400 hover:text-red-200 font-bold">×</button>
            </div>
          )}

          {uploadSuccess && (
            <div className="bg-emerald-950/90 border border-emerald-800 text-emerald-200 p-5 rounded-xl space-y-3 font-mono text-sm shadow-lg">
              <div className="font-bold text-emerald-400 flex items-center gap-2 text-base">
                ✅ {uploadSuccess.message}
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-emerald-900/80 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Subject Code:</span> <strong className="text-slate-100">{uploadSuccess.subject_code}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Scheduled Unlock Time:</span> <strong className="text-amber-400">{uploadSuccess.scheduled_unlock_time}</strong>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-cyan-400 font-bold">🔑 Key A (Admin Controller Token):</span>
                  <code className="block bg-slate-900 text-cyan-300 p-2.5 rounded-lg mt-1 select-all break-all border border-cyan-800/60 font-bold">{uploadSuccess.admin_key}</code>
                </div>
                <div>
                  <span className="text-amber-400 font-bold">🔑 Key B (Supervisor Cryptographic PIN):</span>
                  <code className="block bg-slate-900 text-amber-300 p-2.5 rounded-lg mt-1 select-all break-all border border-amber-800/60 font-bold">{uploadSuccess.supervisor_key}</code>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={this.handleUploadPaper} className="space-y-5 bg-slate-950 p-6 rounded-xl border border-slate-800 font-sans shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-subject-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Subject Code
                </label>
                <input
                  id="new-subject-code"
                  type="text"
                  value={newSubjectCode}
                  onChange={(e) => this.setState({ newSubjectCode: e.target.value })}
                  placeholder="e.g. MATH-201, PHY-101"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label htmlFor="new-delay-seconds" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Time-Lock Delay (Seconds)
                </label>
                <input
                  id="new-delay-seconds"
                  type="number"
                  min="5"
                  max="3600"
                  value={newDelaySeconds}
                  onChange={(e) => this.setState({ newDelaySeconds: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* PDF Upload Field */}
            <div>
              <label htmlFor="pdf-upload-input" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                Upload Question Paper (PDF Format)
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-5 bg-slate-900/60 transition-colors text-center group cursor-pointer">
                <input
                  id="pdf-upload-input"
                  aria-label="Upload Question Paper PDF"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={this.handlePdfFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📄
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {pdfFileName ? (
                        <span className="text-emerald-400 font-mono">Uploaded PDF: {pdfFileName} ({pdfFileSize})</span>
                      ) : (
                        <>Click or drag & drop a <span className="text-amber-400 font-mono">PDF file</span> to upload</>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">Supports .pdf format documents</p>
                  </div>
                  {pdfFileName && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        this.handleRemovePdf();
                      }}
                      className="relative z-20 text-xs bg-red-950/80 text-red-300 border border-red-800 px-3 py-1 rounded hover:bg-red-900 transition-colors font-mono mt-1"
                    >
                      ✕ Remove PDF & Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Uploaded PDF Content Picture / Visual Preview Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                  <span>📷 Uploaded PDF Document Preview</span>
                  <span className="text-amber-400 text-[10px] bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded font-mono">
                    VISUAL PREVIEW
                  </span>
                </label>
                {pdfFileName && (
                  <span className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    PDF Loaded
                  </span>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[200px] flex items-center justify-center relative overflow-hidden">
                {pdfPreviewUrl ? (
                  <div className="w-full flex flex-col md:flex-row items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
                    {/* PDF Embedded Page Frame / Thumbnail View */}
                    <div className="relative w-full md:w-52 h-44 bg-slate-950 rounded-lg overflow-hidden border border-amber-500/30 flex flex-col items-center justify-center">
                      <object
                        data={pdfPreviewUrl}
                        type="application/pdf"
                        aria-label="Uploaded PDF Preview"
                        className="w-full h-full object-cover pointer-events-none opacity-85"
                      >
                        <div className="flex flex-col items-center justify-center h-full p-3 text-center bg-slate-900">
                          <div className="text-4xl mb-1">📕</div>
                          <span className="text-[11px] text-slate-300 font-mono font-bold truncate max-w-[150px]">{pdfFileName}</span>
                          <span className="text-[10px] text-amber-400 font-mono mt-1">PDF DOCUMENT</span>
                        </div>
                      </object>
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow">
                        PDF
                      </div>
                    </div>

                    {/* PDF Metadata & Visual Representation Card */}
                    <div className="flex-1 space-y-2.5 font-mono text-xs text-slate-300 w-full">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-100 text-sm flex items-center gap-2 truncate">
                          📄 {pdfFileName}
                        </span>
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded shrink-0">
                          {pdfFileSize}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] uppercase">Format</span>
                          <span className="text-amber-400 font-bold">PDF Document (.pdf)</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] uppercase">Security Status</span>
                          <span className="text-emerald-400 font-bold">Ready for 2-Stage Lock</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Extracted Document Content Snapshot:
                        </span>
                        <p className="text-slate-300 line-clamp-3 italic text-[11px] leading-relaxed">
                          {newPaperText}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty State Picture Area */
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                      🖼️
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 font-mono">PDF Visual Preview Area</h4>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-sm font-mono leading-relaxed">
                        Upload a PDF file using the dropzone above to generate a visual document preview.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-950 disabled:text-slate-500 text-slate-950 font-bold py-3.5 rounded-lg transition-all duration-200 font-mono tracking-wide text-sm shadow-lg shadow-amber-950"
            >
              {uploading ? 'ENCRYPTING & REGISTERING...' : '🔒 ENCRYPT & REGISTER QUESTION PAPER'}
            </button>
          </form>

          {/* Registered Papers Repository */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
                Registered Question Papers Repository
              </h3>
              <button
                onClick={this.loadRegisteredPapers}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono"
              >
                🔄 REFRESH REPOSITORY
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Paper ID</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">File Path</th>
                    <th className="p-3">Scheduled Unlock</th>
                    <th className="p-3">Uploaded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {registeredPapers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-slate-500 italic">
                        No encrypted question papers registered yet.
                      </td>
                    </tr>
                  ) : (
                    registeredPapers.map((paper) => (
                      <tr key={paper.paper_id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-cyan-400">#{paper.paper_id}</td>
                        <td className="p-3 font-bold text-amber-300">{paper.subject_code}</td>
                        <td className="p-3 text-slate-400">{paper.encrypted_file_path}</td>
                        <td className="p-3 text-emerald-400">{paper.scheduled_unlock_time}</td>
                        <td className="p-3 text-slate-500">{paper.created_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
