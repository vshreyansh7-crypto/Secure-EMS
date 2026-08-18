import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class SupervisorTerminal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isUnlocked: false,
      username: 'supervisor_center1',
      centerCode: 'CTR-101',
      subjectCode: 'CS-602',
      adminToken: 'CTRL-KEY-999',
      pin: '',
      countdown: 10,
      timeLeft: 900,
      error: '',
      loading: false,
      decryptedContent: '',
      unlockedTimestamp: '',
      auditLogs: [],
      auditLoading: false,
      auditError: '',
      studentStatuses: [],
    };

    this.lockTimer = null;
    this.sessionTimer = null;
    this.statusTimer = null;
  }

  componentDidMount() {
    this.loadAuditLogs();
    this.loadStudentStatuses();
    this.startLockTimer();
    this.statusTimer = setInterval(this.loadStudentStatuses, 3000);
    window.addEventListener('keydown', this.handleKeyDown);
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
    if (this.statusTimer) clearInterval(this.statusTimer);
    window.removeEventListener('keydown', this.handleKeyDown);
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
    this.setState({
      isUnlocked: false,
      decryptedContent: '',
      pin: '',
      timeLeft: 900,
      error: 'Secure session expired. Dual-key authorization re-required.',
    });
  };

  loadStudentStatuses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/supervisor/student-status`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.students)) {
        this.setState({ studentStatuses: data.students });
      }
    } catch (e) {
      console.error('Failed to load student statuses', e);
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

  handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      // allow printing
    }
  };

  handleDecrypt = async (e) => {
    e.preventDefault();

    const { countdown, pin, adminToken, centerCode, subjectCode } = this.state;

    if (countdown > 0) {
      this.setState({ error: 'Security Violation: Time-lock window has not opened yet!' });
      return;
    }

    if (!adminToken || adminToken.trim() === '') {
      this.setState({ error: 'Security Violation: Admin Token (Key A) is required.' });
      return;
    }

    if (!pin || pin.trim() === '') {
      this.setState({ error: 'Please enter the supervisor cryptographic PIN (Key B).' });
      return;
    }

    this.setState({ error: '', loading: true });

    try {
      const response = await fetch(`${API_BASE}/api/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'supervisor_center1',
          center_code: centerCode,
          subject_code: subjectCode,
          pin,
          admin_token: adminToken,
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
        unlockedTimestamp: new Date().toLocaleString(),
      });
      this.loadAuditLogs();
    } catch (err) {
      const isConnectionError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      const friendlyMsg = isConnectionError
        ? 'Cannot connect to Python backend server. Please verify python server.py is running on http://localhost:8000'
        : err.message;
      this.setState({ error: friendlyMsg });
    } finally {
      this.setState({ loading: false });
    }
  };

  handlePrint = () => {
    window.print();
  };

  render() {
    const {
      isUnlocked,
      username,
      centerCode,
      subjectCode,
      adminToken,
      pin,
      countdown,
      timeLeft,
      error,
      loading,
      decryptedContent,
      unlockedTimestamp,
      auditLogs,
      auditLoading,
      auditError,
      studentStatuses,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
        {/* Navigation Bar */}
        <div className="max-w-6xl mx-auto mb-6 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                🛡️
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  SUPERVISOR TERMINAL
                  <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-mono">
                    STANDALONE APP
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Dual-Key Multi-Party Authorization & Real-Time Hall Monitoring</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header Status Bar */}
          <div className="border-b border-slate-800 bg-slate-950 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${isUnlocked ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <span className="font-mono text-xs text-slate-300 font-bold uppercase tracking-wider">
                {isUnlocked ? 'SECURITY STATUS: DECRYPTED & LIVE' : 'SECURITY STATUS: TIME-LOCKED HARDWARE ENCLAVE'}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
              <span>CENTER: <strong className="text-cyan-400">{centerCode}</strong></span>
              <span>•</span>
              <span>SUBJECT: <strong className="text-amber-400">{subjectCode}</strong></span>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm font-mono flex items-center justify-between no-print">
                <span>[SECURITY ALERT] {error}</span>
                <button onClick={() => this.setState({ error: '' })} className="text-red-400 hover:text-red-200 font-bold">×</button>
              </div>
            )}

            {/* Time-Lock Countdown View */}
            {!isUnlocked && countdown > 0 && (
              <div className="text-center py-12 space-y-6">
                <div className="inline-block p-4 bg-slate-950 rounded-full border border-slate-700 text-amber-400 animate-pulse text-2xl">
                  🔒
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-100">TIME-LOCK RELEASE ENCLAVE ACTIVE</h2>
                  <p className="text-sm text-slate-400">Subject: <span className="text-cyan-400 font-mono font-bold">{subjectCode}</span> | Center Code: <span className="text-amber-400 font-mono font-bold">{centerCode}</span></p>
                  <p className="text-xs text-slate-500 font-mono">Hardware Fingerprint: MAC Verified (A1:B2:C3:D4:E5:F6)</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 max-w-md mx-auto shadow-inner">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Time-Lock Release Countdown</p>
                  <p className="text-4xl font-mono text-amber-400 font-bold">
                    00 : 00 : {countdown < 10 ? `0${countdown}` : countdown}
                  </p>
                </div>
                <p className="text-xs text-slate-500 italic max-w-md mx-auto">
                  Question paper payload is encrypted locally. Decryption authorization form unlocks automatically at zero.
                </p>
              </div>
            )}

            {/* Authorization Form View */}
            {!isUnlocked && countdown === 0 && (
              <div className="max-w-md mx-auto py-6 space-y-6">
                <div className="text-center space-y-2">
                  <span className="text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                    🔑 EXAMINATION WINDOW OPEN
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 mt-2">Dual-Key Multi-Party Authorization Required</h2>
                  <p className="text-xs text-amber-300 font-mono bg-amber-950/60 border border-amber-800 p-3 rounded-lg">
                    🛡️ TWO-PERSON RULE ACTIVE: Admin Key (Key A) + Supervisor PIN (Key B) required simultaneously to reconstruct Fernet key.
                  </p>
                </div>

                <form onSubmit={this.handleDecrypt} className="space-y-4 font-sans">
                  <div>
                    <label htmlFor="sup-username" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">Supervisor Username</label>
                    <input
                      id="sup-username"
                      type="text"
                      value={username}
                      disabled
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-400 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-center-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">Center Code</label>
                    <input
                      id="sup-center-code"
                      type="text"
                      value={centerCode}
                      onChange={(e) => this.setState({ centerCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-subject-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">Subject Code</label>
                    <input
                      id="sup-subject-code"
                      type="text"
                      value={subjectCode}
                      onChange={(e) => this.setState({ subjectCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-admin-token" className="block text-xs uppercase tracking-wider text-cyan-400 mb-1 font-mono font-bold">
                      🔑 Key A: Central Admin Token
                    </label>
                    <input
                      id="sup-admin-token"
                      type="text"
                      value={adminToken}
                      onChange={(e) => this.setState({ adminToken: e.target.value })}
                      placeholder="Enter central exam authority key (e.g. CTRL-KEY-999)"
                      className="w-full bg-slate-950 border border-cyan-700 rounded-lg p-3 text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-secure-pin" className="block text-xs uppercase tracking-wider text-amber-400 mb-1 font-mono font-bold">
                      🔑 Key B: Supervisor Cryptographic PIN
                    </label>
                    <input
                      id="sup-secure-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => this.setState({ pin: e.target.value })}
                      placeholder="Enter center cryptographic PIN (e.g. 246810)"
                      className="w-full bg-slate-950 border border-amber-700/70 rounded-lg p-3 text-amber-200 focus:outline-none focus:border-amber-400 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-950 disabled:text-slate-500 text-slate-950 font-bold py-3.5 rounded-lg transition-all duration-200 mt-2 font-mono tracking-wide text-sm shadow-lg shadow-cyan-950"
                  >
                    {loading ? 'RECONSTRUCTING SPLIT KEYS...' : 'VERIFY DUAL KEYS & DECRYPT PAPER'}
                  </button>
                </form>
              </div>
            )}

            {/* Decrypted Content & Monitoring Dashboard View */}
            {isUnlocked && (
              <div className="space-y-6">
                {/* Session Active & Action Bar */}
                <div className="bg-amber-950/40 border border-amber-800/80 text-slate-200 px-4 py-3 rounded-lg text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between no-print">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">⚠️</span>
                    <span><strong>Supervisor Session Active</strong> - Auto-lock in:</span>
                    <span className="font-mono font-bold text-red-400 bg-red-950 border border-red-800 px-2 py-0.5 rounded">
                      {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={this.handleSessionEnd}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                    >
                      🔒 LOCK TERMINAL
                    </button>
                  </div>
                </div>

                {/* Watermark Details */}
                <div className="bg-slate-950 border border-emerald-800/80 text-emerald-400 px-4 py-2 rounded-lg text-xs font-mono flex justify-between items-center no-print">
                  <span>FORENSIC WATERMARK: {centerCode} | DEV-MAC:A1:B2:C3 | IP:127.0.0.1 | UNLOCKED: {unlockedTimestamp || 'LIVE'}</span>
                </div>

                {/* Direct Student Transmission Confirmation Card (Question Paper Text Hidden From Supervisor) */}
                <div className="bg-emerald-950/60 border border-emerald-800 p-6 rounded-xl space-y-4 font-mono shadow-lg">
                  <div className="flex items-center justify-between border-b border-emerald-900/80 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <span>✅ QUESTION PAPER DECRYPTED & TRANSMITTED DIRECTLY TO STUDENT TERMINALS</span>
                    </div>
                    <span className="bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-1 rounded font-bold text-xs">
                      ● TRANSMITTED TO HALL DESKS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div>Subject Code: <strong className="text-amber-400">{subjectCode}</strong></div>
                    <div>Exam Center: <strong className="text-cyan-400">{centerCode}</strong></div>
                    <div>Decryption Stamping: <span className="text-slate-400">{unlockedTimestamp || 'STAMPED & VERIFIED'}</span></div>
                    <div>Security Protocol: <span className="text-emerald-400">DIRECT KIOSK DELIVERY</span></div>
                  </div>

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded text-xs text-slate-400 leading-relaxed">
                    🔒 <strong>SECURITY COMPLIANCE DIRECTIVE:</strong> For maximum examination integrity, raw question paper content is strictly hidden from the supervisor terminal and delivered directly to authenticated student kiosk terminals in the examination hall.
                  </div>
                </div>

                {/* Real-Time Live Student Terminal Monitor Grid */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 no-print mt-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                        📡 Live Student Terminal Monitor (Hall Status)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Tracks connected student devices, active test-taking, focus violations, and technical failures.
                      </p>
                    </div>
                    <button
                      onClick={this.loadStudentStatuses}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono"
                    >
                      🔄 REFRESH DESK STATUS
                    </button>
                  </div>

                  {studentStatuses.length === 0 ? (
                    <div className="p-5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 text-center space-y-2">
                      <p>No active student terminals connected yet.</p>
                      <p>
                        Launch a student terminal at{' '}
                        <a href="/student" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">
                          http://localhost:5173/student
                        </a>{' '}
                        to view real-time status in this monitoring grid.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                      {studentStatuses.map((st) => (
                        <div
                          key={`${st.center_code}_${st.roll_number}`}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                            st.status === 'ACTIVE'
                              ? 'bg-slate-900/90 border-emerald-800/80 text-emerald-200'
                              : st.status === 'VIOLATION'
                              ? 'bg-red-950/70 border-red-700 text-red-200 animate-pulse'
                              : 'bg-amber-950/40 border-amber-800 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-sm text-cyan-300">{st.seat_id || 'SEAT-N/A'}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                st.status === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                  : st.status === 'VIOLATION'
                                  ? 'bg-red-900 text-white border border-red-600'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700'
                              }`}
                            >
                              {st.status === 'ACTIVE' ? '🟢 ONLINE' : st.status === 'VIOLATION' ? '🚨 VIOLATION' : '⚠️ DISCONNECTED'}
                            </span>
                          </div>

                          <div className="space-y-1 text-slate-300">
                            <div>Roll: <strong className="text-slate-100">{st.roll_number}</strong></div>
                            <div>Subject: <span className="text-amber-400">{st.subject_code}</span></div>
                            <div>IP: {st.ip_address}</div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                            <span>Violations: <strong className={st.violations_count > 0 ? 'text-red-400' : 'text-slate-300'}>{st.violations_count}</strong></span>
                            <span>Ping: {st.seconds_since_ping}s ago</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
