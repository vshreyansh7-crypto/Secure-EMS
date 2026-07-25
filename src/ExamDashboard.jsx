import React from 'react';

export default class ExamDashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isUnlocked: false,
      username: 'supervisor_center1',
      centerCode: 'CTR-101',
      subjectCode: 'CS-602',
      pin: '',
      countdown: 10,
      timeLeft: 900,
      error: '',
      loading: false,
      decryptedContent: '',
      auditLogs: [],
      auditLoading: false,
      auditError: '',
    };

    this.lockTimer = null;
    this.sessionTimer = null;
  }

  componentDidMount() {
    this.loadAuditLogs();
    this.startLockTimer();
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.isUnlocked && this.state.isUnlocked) {
      this.clearSessionTimer();
      this.startSessionTimer();
    }

    if (prevState.timeLeft !== this.state.timeLeft && this.state.isUnlocked && this.state.timeLeft <= 0) {
      this.handleSessionEnd();
    }
  }

  componentWillUnmount() {
    this.clearLockTimer();
    this.clearSessionTimer();
  }

  startLockTimer = () => {
    this.clearLockTimer();

    this.lockTimer = setInterval(() => {
      this.setState((prevState) => {
        if (prevState.isUnlocked || prevState.countdown <= 0) {
          return null;
        }

        return { countdown: prevState.countdown - 1 };
      }, () => {
        if (this.state.countdown <= 0) {
          this.clearLockTimer();
        }
      });
    }, 1000);
  };

  startSessionTimer = () => {
    this.clearSessionTimer();

    this.sessionTimer = setInterval(() => {
      this.setState((prevState) => {
        if (!prevState.isUnlocked) {
          return null;
        }

        return { timeLeft: prevState.timeLeft - 1 };
      });
    }, 1000);
  };

  clearLockTimer = () => {
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  };

  clearSessionTimer = () => {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  };

  handleSessionEnd = () => {
    this.clearSessionTimer();

    if (typeof this.props.onLogout === 'function') {
      this.props.onLogout();
    }

    this.setState({
      isUnlocked: false,
      decryptedContent: '',
      pin: '',
      timeLeft: 900,
      error: 'Secure session expired. Please authorize again.',
    });
  };

  loadAuditLogs = async () => {
    this.setState({ auditLoading: true, auditError: '' });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/audit-logs');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load audit logs.');
      }

      this.setState({ auditLogs: Array.isArray(data.audit_logs) ? data.audit_logs : [] });
    } catch (err) {
      this.setState({ auditError: err.message });
    } finally {
      this.setState({ auditLoading: false });
    }
  };

  handleDecrypt = async (e) => {
    e.preventDefault();

    const { countdown, pin, centerCode, subjectCode } = this.state;

    if (countdown > 0) {
      this.setState({ error: 'Security Violation: Time-lock window has not opened yet!' });
      return;
    }

    if (pin.trim() === '') {
      this.setState({ error: 'Please enter the supervisor cryptographic token.' });
      return;
    }

    this.setState({ error: '', loading: true });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'supervisor_center1',
          center_code: centerCode,
          subject_code: subjectCode,
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Cryptographic decryption failed.');
      }

      this.setState({
        decryptedContent: data.content,
        isUnlocked: true,
        timeLeft: 900,
      });
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const {
      isUnlocked,
      username,
      centerCode,
      subjectCode,
      pin,
      countdown,
      timeLeft,
      error,
      loading,
      decryptedContent,
      auditLogs,
      auditLoading,
      auditError,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans">
        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-700">
            <h1 className="font-bold text-lg tracking-wide text-cyan-400">SECURE EMS — EXAM CENTER TERMINAL</h1>
            <span className="bg-cyan-950 text-cyan-300 px-3 py-1 rounded text-xs font-mono border border-cyan-800">
              CENTER: CTR-101
            </span>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded text-sm font-mono">
                [ALERT] {error}
              </div>
            )}

            {!isUnlocked && countdown > 0 && (
              <div className="text-center py-10 space-y-6">
                <div className="inline-block p-4 bg-slate-900 rounded-full border border-slate-700 text-amber-400 animate-pulse">
                  🔒 SYSTEM STATUS: SECURE & LOCKED
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Subject: CS-602 (Database Management Systems)</p>
                  <p className="text-sm text-slate-400">Hardware Fingerprint: MAC Verified (A1:B2:C3:D4:E5:F6)</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 max-w-md mx-auto">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Time-Lock Countdown</p>
                  <p className="text-3xl font-mono text-amber-400 font-bold">
                    00 : 00 : {countdown < 10 ? `0${countdown}` : countdown}
                  </p>
                </div>
                <p className="text-xs text-slate-500 italic">
                  Question paper is encrypted locally. Decryption keys release automatically at zero.
                </p>
              </div>
            )}

            {!isUnlocked && countdown === 0 && (
              <div className="max-w-md mx-auto py-6 space-y-6">
                <div className="text-center space-y-2">
                  <span className="text-emerald-400 font-mono text-sm">[🔑 EXAMINATION WINDOW OPEN]</span>
                  <h2 className="text-xl font-semibold">Supervisor Authorization Required</h2>
                </div>

                <form onSubmit={this.handleDecrypt} className="space-y-4">
                  <div>
                    <label htmlFor="supervisor-username" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Supervisor Username</label>
                    <input
                      id="supervisor-username"
                      type="text"
                      value={username}
                      disabled
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-400 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="center-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Center Code</label>
                    <input
                      id="center-code"
                      type="text"
                      value={centerCode}
                      onChange={(e) => this.setState({ centerCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Subject Code</label>
                    <input
                      id="subject-code"
                      type="text"
                      value={subjectCode}
                      onChange={(e) => this.setState({ subjectCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="secure-pin" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Secure Token / PIN</label>
                    <input
                      id="secure-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => this.setState({ pin: e.target.value })}
                      placeholder="Enter center cryptographic PIN"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 disabled:text-slate-400 text-slate-950 font-bold py-3 rounded transition-colors duration-200 mt-2"
                  >
                    {loading ? 'VERIFYING PIN...' : 'AUTHORIZE & DECRYPT PAPER'}
                  </button>
                </form>
              </div>
            )}

            {isUnlocked && (
              <div className="space-y-6">
                <div className="session-banner bg-amber-50 border border-amber-200 text-slate-800 px-4 py-3 rounded text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    ⚠️ <strong>Secure Session Active</strong> - Auto-lock in:
                  </span>
                  <span className="font-mono font-bold text-red-700">
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>

                <div className="bg-slate-950 border border-emerald-800 text-emerald-400 px-4 py-2 rounded text-xs font-mono flex justify-between items-center">
                  <span>WATERMARK ACTIVE: CTR-101 | DEV-MAC:A1:B2:C3 | 2026-07-23</span>
                  <span className="text-emerald-500 font-bold">SECURE PRINT READY</span>
                </div>

                <div className="bg-slate-950 p-6 rounded border border-slate-800 font-mono text-sm space-y-4">
                  <h3 className="font-bold text-cyan-400 border-b border-slate-800 pb-2">
                    CENTRAL UNIVERSITY EXAMINATION 2026 — SUBJECT: CS-602
                  </h3>
                  <p>Instructions: All questions are compulsory. Total marks: 100.</p>
                  <div className="space-y-2 text-slate-300 py-2">
                    {decryptedContent.split('\n').map((line, index) => (line.trim() ? <p key={index}>{line}</p> : null))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-500">Audit Status: Logged to Database</span>
                  <button
                    onClick={() => alert('Secure print job dispatched to local terminal node.')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-6 py-2.5 rounded text-sm transition-colors"
                  >
                    EXECUTE SECURE PRINT (120 COPIES)
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Live Audit Trail</h4>
                      <p className="text-xs text-slate-500">Fetched directly from the FastAPI backend.</p>
                    </div>
                    <button
                      onClick={this.loadAuditLogs}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-2 rounded text-xs font-semibold transition-colors"
                    >
                      {auditLoading ? 'REFRESHING...' : 'REFRESH LOGS'}
                    </button>
                  </div>

                  {auditError && (
                    <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded text-sm font-mono">
                      [LOG ERROR] {auditError}
                    </div>
                  )}

                  {!auditError && auditLogs.length === 0 && !auditLoading && (
                    <p className="text-sm text-slate-500 font-mono">No audit events were returned by the backend yet.</p>
                  )}

                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {auditLogs.map((log) => (
                      <div key={log.log_id ?? `${log.timestamp}-${log.action_type}`} className="border border-slate-800 rounded-md bg-slate-900/60 p-4 text-sm font-mono space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-slate-300">
                          <span className="text-emerald-400">{log.action_type}</span>
                          <span className="text-slate-600">|</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <div className="text-slate-400">
                          User: {log.user_id ?? 'n/a'} | Center: {log.center_id ?? 'n/a'} | IP: {log.ip_address ?? 'n/a'}
                        </div>
                        {log.details && <div className="text-slate-500">{log.details}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
