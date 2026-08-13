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
      this.setState({ uploadError: 'Subject code and paper content are required.' });
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
              Upload raw question papers to encrypt at creation with 2-stage split authority locks.
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

            <div>
              <label htmlFor="new-paper-text" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                Raw Question Paper Content
              </label>
              <textarea
                id="new-paper-text"
                rows="7"
                value={newPaperText}
                onChange={(e) => this.setState({ newPaperText: e.target.value })}
                placeholder="Paste confidential question paper content here..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500 leading-relaxed"
              ></textarea>
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

          {/* Live Audit Log Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">Live System Audit Trail</h4>
                <p className="text-xs text-slate-400">Cryptographic paper registration and security events fetched from backend.</p>
              </div>
              <button
                onClick={this.loadAuditLogs}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors"
              >
                {auditLoading ? 'REFRESHING...' : 'REFRESH LOGS'}
              </button>
            </div>

            {auditError && (
              <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm font-mono">
                [LOG ERROR] {auditError}
              </div>
            )}

            {!auditError && auditLogs.length === 0 && !auditLoading && (
              <p className="text-sm text-slate-500 font-mono">No audit events were returned by the backend yet.</p>
            )}

            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.log_id ?? `${log.timestamp}-${log.action_type}`} className="border border-slate-800/80 rounded-lg bg-slate-900/70 p-3.5 text-sm font-mono space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-slate-300">
                    <span className="text-emerald-400 font-bold">{log.action_type}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400 text-xs">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    User: {log.user_id ?? 'n/a'} | Center: {log.center_id ?? 'n/a'} | IP: {log.ip_address ?? 'n/a'}
                  </div>
                  {log.details && <div className="text-slate-500 text-xs">{log.details}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
