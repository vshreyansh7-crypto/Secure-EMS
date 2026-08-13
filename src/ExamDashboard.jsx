import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class ExamDashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'SUPERVISOR',
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
      // Controller Portal state
      newSubjectCode: 'MATH-201',
      newPaperText: 'CONFIDENTIAL CENTRAL UNIVERSITY EXAMINATION 2026\nSubject: Mathematics (MATH-201)\nMax Marks: 100 | Time Allowed: 3 Hours\n\nQ1. Evaluate the definite integral of sin^2(x) from 0 to pi.\nQ2. Solve the linear differential equation dy/dx + P(x)y = Q(x).\nQ3. State and prove Cayley-Hamilton Theorem.',
      newDelaySeconds: 15,
      uploading: false,
      uploadSuccess: null,
      uploadError: '',
      registeredPapers: [],

      // Student Secure Terminal state
      studentRoll: '2026-CS-101',
      studentSeat: 'DESK-42',
      studentCenterCode: 'CTR-101',
      studentSubjectCode: 'CS-602',
      studentPaperContent: '',
      studentUnlocked: false,
      studentLoading: false,
      studentError: '',
      studentViolationsCount: 0,
      studentSecurityAlert: '',
      focusLostModal: false,
      studentStatuses: [],
    };

    this.lockTimer = null;
    this.sessionTimer = null;
    this.statusTimer = null;
  }

  componentDidMount() {
    this.loadAuditLogs();
    this.loadRegisteredPapers();
    this.loadStudentStatuses();
    this.startLockTimer();
    this.statusTimer = setInterval(this.loadStudentStatuses, 3000);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keydown', this.handleStudentKeyDown);
    window.addEventListener('blur', this.handleStudentFocusLoss);
    window.addEventListener('visibilitychange', this.handleStudentVisibilityChange);
    window.addEventListener('contextmenu', this.preventStudentContextMenu);
    window.addEventListener('copy', this.preventStudentClipboard);
    window.addEventListener('cut', this.preventStudentClipboard);
    window.addEventListener('paste', this.preventStudentClipboard);
  }

  componentWillUnmount() {
    if (this.lockTimer) clearInterval(this.lockTimer);
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    if (this.statusTimer) clearInterval(this.statusTimer);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keydown', this.handleStudentKeyDown);
    window.removeEventListener('blur', this.handleStudentFocusLoss);
    window.removeEventListener('visibilitychange', this.handleStudentVisibilityChange);
    window.removeEventListener('contextmenu', this.preventStudentContextMenu);
    window.removeEventListener('copy', this.preventStudentClipboard);
    window.removeEventListener('cut', this.preventStudentClipboard);
    window.removeEventListener('paste', this.preventStudentClipboard);
  }

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
        subjectCode: data.subject_code,
        adminToken: data.admin_key,
        countdown: parseInt(newDelaySeconds, 10) || 10,
      });

      this.loadRegisteredPapers();
      this.loadAuditLogs();
      this.startLockTimer();
    } catch (err) {
      this.setState({ uploadError: err.message });
    } finally {
      this.setState({ uploading: false });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.isUnlocked && this.state.isUnlocked) {
      this.clearSessionTimer();
      this.startSessionTimer();
    }

    if (prevState.timeLeft !== this.state.timeLeft && this.state.isUnlocked && this.state.timeLeft <= 0) {
      this.handleSessionEnd();
    }
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
      const response = await fetch(`${API_BASE}/api/audit-logs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load audit logs.');
      }

      this.setState({ auditLogs: Array.isArray(data.audit_logs) ? data.audit_logs : [] });
    } catch (err) {
      const isConnectionError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      const friendlyMsg = isConnectionError
        ? 'Cannot connect to Python backend server. Please make sure "python server.py" is running in Terminal 1!'
        : err.message;
      this.setState({ auditError: friendlyMsg });
    } finally {
      this.setState({ auditLoading: false });
    }
  };

  handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      alert('SECURITY POLICY RESTRICTION: Physical paper printing is disabled.');
    }
  };

  preventStudentContextMenu = (e) => {
    if (this.state.activeTab === 'STUDENT' && this.state.studentUnlocked) {
      e.preventDefault();
      this.reportStudentAlert('RIGHT_CLICK_ATTEMPT', 'Right-click context menu attempt blocked on kiosk terminal');
    }
  };

  preventStudentClipboard = (e) => {
    if (this.state.activeTab === 'STUDENT' && this.state.studentUnlocked) {
      e.preventDefault();
      this.reportStudentAlert('CLIPBOARD_TAMPER_ATTEMPT', 'Copy/Cut/Paste operation blocked on kiosk terminal');
    }
  };

  handleStudentFocusLoss = () => {
    if (this.state.activeTab === 'STUDENT' && this.state.studentUnlocked) {
      this.setState((prev) => ({
        studentViolationsCount: prev.studentViolationsCount + 1,
        focusLostModal: true,
        studentSecurityAlert: 'SECURITY WARNING: Window focus lost or external app switch detected!',
      }));
      this.reportStudentAlert('FOCUS_LOSS', 'Student navigated away or blurred kiosk browser window');
    }
  };

  handleStudentVisibilityChange = () => {
    if (this.state.activeTab === 'STUDENT' && this.state.studentUnlocked && document.hidden) {
      this.setState((prev) => ({
        studentViolationsCount: prev.studentViolationsCount + 1,
        focusLostModal: true,
        studentSecurityAlert: 'SECURITY VIOLATION: Tab switch or window minimization detected!',
      }));
      this.reportStudentAlert('TAB_SWITCH', 'Document hidden or tab switch detected on kiosk terminal');
    }
  };

  handleStudentKeyDown = (e) => {
    if (this.state.activeTab === 'STUDENT' && this.state.studentUnlocked) {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        e.key === 'Escape'
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.reportStudentAlert('RESTRICTED_KEY_PRESS', `Forbidden key combination attempted: ${e.key}`);
      }
    }
  };

  reportStudentAlert = async (violationType, details) => {
    const { studentRoll, studentSeat, studentCenterCode, studentSubjectCode } = this.state;
    try {
      await fetch(`${API_BASE}/api/student/security-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: studentRoll,
          seat_id: studentSeat,
          center_code: studentCenterCode,
          subject_code: studentSubjectCode,
          violation_type: violationType,
          details,
        }),
      });
      this.loadAuditLogs();
    } catch (e) {
      console.error('Failed to report student security alert', e);
    }
  };

  handleStudentLogin = async (e) => {
    e.preventDefault();
    const { studentRoll, studentSeat, studentCenterCode, studentSubjectCode } = this.state;

    if (!studentRoll.trim() || !studentCenterCode.trim() || !studentSubjectCode.trim()) {
      this.setState({ studentError: 'Roll Number, Center Code, and Subject Code are required.' });
      return;
    }

    this.setState({ studentLoading: true, studentError: '' });

    try {
      const response = await fetch(`${API_BASE}/api/student/paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: studentRoll,
          seat_id: studentSeat,
          center_code: studentCenterCode,
          subject_code: studentSubjectCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Student terminal authorization failed.');
      }

      this.setState({
        studentPaperContent: data.content,
        studentUnlocked: true,
        studentLoading: false,
        studentViolationsCount: 0,
      });

      this.loadAuditLogs();

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      this.setState({ studentError: err.message, studentLoading: false });
    }
  };

  handleExitStudentKiosk = () => {
    if (window.confirm('Exit Student Secure Kiosk mode? This will lock the terminal.')) {
      this.setState({ studentUnlocked: false, studentPaperContent: '', focusLostModal: false });
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
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
        ? 'Cannot connect to Python backend server. Please start Terminal 1 by running: python server.py'
        : err.message;
      this.setState({ error: friendlyMsg });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const {
      activeTab,
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
      newSubjectCode,
      newPaperText,
      newDelaySeconds,
      uploading,
      uploadSuccess,
      uploadError,
      registeredPapers,
      studentRoll,
      studentSeat,
      studentCenterCode,
      studentSubjectCode,
      studentPaperContent,
      studentUnlocked,
      studentLoading,
      studentError,
      studentViolationsCount,
      studentSecurityAlert,
      focusLostModal,
      studentStatuses,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans">
        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-4 flex flex-wrap justify-between items-center border-b border-slate-700 gap-4 no-print">
            <div>
              <h1 className="font-bold text-lg tracking-wide text-cyan-400">SECURE EXAMINATION MANAGEMENT SYSTEM</h1>
              <p className="text-xs text-slate-400 font-mono">End-to-End Cryptographic Question Paper Protection</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-800">
              <button
                onClick={() => this.setState({ activeTab: 'SUPERVISOR' })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'SUPERVISOR'
                    ? 'bg-cyan-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎓 SUPERVISOR TERMINAL
              </button>
              <button
                onClick={() => this.setState({ activeTab: 'CONTROLLER' })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'CONTROLLER'
                    ? 'bg-amber-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏛 ADMIN PORTAL
              </button>
              <button
                onClick={() => this.setState({ activeTab: 'STUDENT' })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'STUDENT'
                    ? 'bg-emerald-600 text-slate-950 shadow font-bold'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                👨‍🎓 STUDENT TERMINAL PREVIEW
              </button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'CONTROLLER' && (
              <div className="space-y-8">
                <div className="border-b border-slate-700 pb-4">
                  <h2 className="text-xl font-bold text-amber-400 uppercase tracking-wide">
                    Question Paper Upload & 2-Stage Encryption Engine
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Upload raw question papers to encrypt at creation with 2-stage split authority locks.
                  </p>
                </div>

                {uploadError && (
                  <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded text-sm font-mono">
                    [UPLOAD ERROR] {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="bg-emerald-950 border border-emerald-800 text-emerald-200 p-5 rounded space-y-3 font-mono text-sm">
                    <div className="font-bold text-emerald-400">
                      ✅ {uploadSuccess.message}
                    </div>
                    <div className="bg-slate-950 p-4 rounded border border-emerald-900/60 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">Subject Code:</span> <strong className="text-slate-200">{uploadSuccess.subject_code}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Scheduled Unlock Time:</span> <strong className="text-amber-400">{uploadSuccess.scheduled_unlock_time}</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-cyan-400">🔑 Key A (Admin Controller Token):</span>
                        <code className="block bg-slate-900 text-cyan-300 p-2 rounded mt-1 select-all break-all">{uploadSuccess.admin_key}</code>
                      </div>
                      <div>
                        <span className="text-amber-400">🔑 Key B (Supervisor PIN / Key):</span>
                        <code className="block bg-slate-900 text-amber-300 p-2 rounded mt-1 select-all break-all">{uploadSuccess.supervisor_key}</code>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={this.handleUploadPaper} className="space-y-5 bg-slate-950 p-6 rounded-lg border border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="new-subject-code" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
                        Subject Code
                      </label>
                      <input
                        id="new-subject-code"
                        type="text"
                        value={newSubjectCode}
                        onChange={(e) => this.setState({ newSubjectCode: e.target.value })}
                        placeholder="e.g. MATH-201, PHY-101"
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-delay-seconds" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
                        Time-Lock Delay (Seconds)
                      </label>
                      <input
                        id="new-delay-seconds"
                        type="number"
                        min="5"
                        max="3600"
                        value={newDelaySeconds}
                        onChange={(e) => this.setState({ newDelaySeconds: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-paper-text" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
                      Raw Question Paper Content
                    </label>
                    <textarea
                      id="new-paper-text"
                      rows="7"
                      value={newPaperText}
                      onChange={(e) => this.setState({ newPaperText: e.target.value })}
                      placeholder="Paste confidential question paper content here..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:text-slate-400 text-slate-950 font-bold py-3 rounded transition-colors duration-200"
                  >
                    {uploading ? 'ENCRYPTING & REGISTERING...' : '🔒 ENCRYPT & REGISTER QUESTION PAPER'}
                  </button>
                </form>

                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Registered Question Papers Repository
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border border-slate-800 bg-slate-950 rounded-lg">
                      <thead className="bg-slate-900 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Paper ID</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3">File Path</th>
                          <th className="p-3">Scheduled Unlock</th>
                          <th className="p-3">Uploaded At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {registeredPapers.map((paper) => (
                          <tr key={paper.paper_id}>
                            <td className="p-3 font-bold text-cyan-400">#{paper.paper_id}</td>
                            <td className="p-3 font-bold text-amber-300">{paper.subject_code}</td>
                            <td className="p-3 text-slate-400">{paper.encrypted_file_path}</td>
                            <td className="p-3 text-emerald-400">{paper.scheduled_unlock_time}</td>
                            <td className="p-3 text-slate-500">{paper.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'STUDENT' && (
              <div className="space-y-6">
                {!studentUnlocked ? (
                  <div className="max-w-lg mx-auto bg-slate-950 p-6 rounded-lg border border-emerald-800/80 space-y-5">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                        👨‍🎓 Student Kiosk Reader Terminal
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Client-server secure terminal. Authorize desk and view live question paper in locked kiosk mode.
                      </p>
                    </div>

                    {studentError && (
                      <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded text-sm font-mono">
                        [AUTHORIZATION ERROR] {studentError}
                      </div>
                    )}

                    <form onSubmit={this.handleStudentLogin} className="space-y-4 text-sm font-mono">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">STUDENT ROLL NUMBER / ENROLLMENT ID</label>
                        <input
                          type="text"
                          value={studentRoll}
                          onChange={(e) => this.setState({ studentRoll: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                          placeholder="e.g. 2026-CS-101"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 text-xs mb-1">DESK / SEAT ID</label>
                          <input
                            type="text"
                            value={studentSeat}
                            onChange={(e) => this.setState({ studentSeat: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                            placeholder="DESK-42"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-xs mb-1">EXAM CENTER CODE</label>
                          <input
                            type="text"
                            value={studentCenterCode}
                            onChange={(e) => this.setState({ studentCenterCode: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                            placeholder="CTR-101"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs mb-1">SUBJECT CODE</label>
                        <input
                          type="text"
                          value={studentSubjectCode}
                          onChange={(e) => this.setState({ studentSubjectCode: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 uppercase font-bold focus:outline-none focus:border-emerald-500"
                          placeholder="CS-602"
                          required
                        />
                      </div>

                      <div className="p-3 bg-slate-900/80 border border-amber-900/60 rounded text-xs text-amber-300 space-y-1">
                        <p className="font-bold flex items-center gap-1">🔒 SECURE KIOSK LOCKDOWN NOTICE</p>
                        <p className="text-slate-400">
                          System enters locked mode. Text selection, right-click, clipboard operations, and tab-switching are strictly disabled and reported to the server.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={studentLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        {studentLoading ? 'CONNECTING TO SERVER...' : '🚀 START SECURE KIOSK READER'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Top Kiosk Header */}
                    <div className="bg-slate-950 border border-emerald-700 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 font-mono text-xs select-none">
                      <div>
                        <span className="text-emerald-400 font-bold uppercase tracking-wider block">
                          🔴 SECURE STUDENT KIOSK READER — ACTIVE
                        </span>
                        <div className="flex items-center gap-3 text-slate-300 mt-1">
                          <span>ROLL: <strong>{studentRoll}</strong></span>
                          <span>|</span>
                          <span>SEAT: <strong>{studentSeat}</strong></span>
                          <span>|</span>
                          <span>CENTER: <strong>{studentCenterCode}</strong></span>
                          <span>|</span>
                          <span>SUBJECT: <strong className="text-amber-400">{studentSubjectCode}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded font-bold ${
                            studentViolationsCount === 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                          }`}
                        >
                          SECURITY VIOLATIONS: {studentViolationsCount}
                        </span>

                        <button
                          onClick={this.handleExitStudentKiosk}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded font-bold transition-colors"
                        >
                          🔒 EXIT KIOSK
                        </button>
                      </div>
                    </div>

                    {/* Security Warning Toast */}
                    {studentSecurityAlert && (
                      <div className="bg-amber-950 border border-amber-700 text-amber-200 px-4 py-2 rounded text-xs font-mono flex items-center justify-between">
                        <span>⚠️ {studentSecurityAlert}</span>
                        <button
                          onClick={() => this.setState({ studentSecurityAlert: '' })}
                          className="text-amber-400 hover:text-white font-bold"
                        >
                          DISMISS
                        </button>
                      </div>
                    )}

                    {/* Read-Only Question Paper Card */}
                    <div
                      className="relative bg-slate-950 p-8 rounded-lg border-2 border-slate-800 font-mono space-y-6 max-h-[75vh] overflow-y-auto shadow-2xl select-none"
                      onContextMenu={this.preventStudentContextMenu}
                      onCopy={this.preventStudentClipboard}
                      onCut={this.preventStudentClipboard}
                      onPaste={this.preventStudentClipboard}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      {/* Sweeping Forensic Watermark Overlay */}
                      <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-around opacity-15 rotate-[-22deg] transform scale-125 z-10 text-[11px] text-cyan-400 font-bold tracking-widest leading-loose">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="whitespace-nowrap">
                            STRICTLY CONFIDENTIAL — STUDENT ROLL: {studentRoll} | SEAT: {studentSeat} | CENTER: {studentCenterCode} | IP: 127.0.0.1
                          </div>
                        ))}
                      </div>

                      <div className="border-b border-slate-800 pb-4 relative z-20">
                        <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">
                          CENTRAL UNIVERSITY EXAMINATION 2026 — SUBJECT: {studentSubjectCode}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Candidate Instructions: Scroll through the question paper. Read-only terminal mode active. System inputs and output capture are blocked.
                        </p>
                      </div>

                      <div className="space-y-4 text-slate-200 text-base leading-relaxed py-2 relative z-20">
                        {studentPaperContent.split('\n').map((line, index) => (
                          line.trim() ? (
                            <p key={index} className="p-3 bg-slate-900/60 rounded border border-slate-800/80">
                              {line}
                            </p>
                          ) : null
                        ))}
                      </div>
                    </div>

                    {/* Focus Lost Security Warning Modal */}
                    {focusLostModal && (
                      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-red-950 border-2 border-red-600 rounded-lg p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
                          <div className="text-4xl animate-bounce">⚠️</div>
                          <h3 className="text-lg font-extrabold text-red-300 uppercase tracking-wider">
                            SECURITY VIOLATION DETECTED
                          </h3>
                          <p className="text-sm text-red-200 font-mono">
                            Window focus was lost or tab switched! This security event has been logged to the central server audit trail.
                          </p>
                          <div className="bg-slate-950 p-3 rounded text-xs font-mono text-slate-400 text-left space-y-1">
                            <div>Roll No: {studentRoll}</div>
                            <div>Seat ID: {studentSeat}</div>
                            <div>Total Violations: {studentViolationsCount}</div>
                          </div>
                          <button
                            onClick={() => this.setState({ focusLostModal: false })}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded transition-colors text-sm"
                          >
                            RESUME SECURE SESSION & RE-VERIFY
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'SUPERVISOR' && (
              <>
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
                  <h2 className="text-xl font-semibold">Dual-Key Multi-Party Authorization Required</h2>
                  <p className="text-xs text-amber-400 font-mono bg-amber-950/60 border border-amber-800 p-2 rounded">
                    🛡️ TWO-PERSON RULE ACTIVE: Admin Key (Key A) + Supervisor PIN (Key B) required simultaneously.
                  </p>
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
                    <label htmlFor="admin-token" className="block text-xs uppercase tracking-wider text-cyan-400 mb-1">
                      🔑 Key A: Admin Token
                    </label>
                    <input
                      id="admin-token"
                      type="text"
                      value={adminToken}
                      onChange={(e) => this.setState({ adminToken: e.target.value })}
                      placeholder="Enter central exam authority key (e.g. CTRL-KEY-999)"
                      className="w-full bg-slate-950 border border-cyan-700 rounded p-3 text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="secure-pin" className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
                      🔑 Key B: Supervisor Secure PIN
                    </label>
                    <input
                      id="secure-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => this.setState({ pin: e.target.value })}
                      placeholder="Enter center cryptographic PIN"
                      className="w-full bg-slate-950 border border-amber-700/60 rounded p-3 text-amber-200 focus:outline-none focus:border-amber-400 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 disabled:text-slate-400 text-slate-950 font-bold py-3 rounded transition-colors duration-200 mt-2"
                  >
                    {loading ? 'RECONSTRUCTING SPLIT KEYS...' : 'VERIFY DUAL KEYS & DECRYPT PAPER'}
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
                  <span>FORENSIC WATERMARK: CTR-101 | DEV-MAC:A1:B2:C3 | IP:127.0.0.1 | UNLOCKED: {unlockedTimestamp || 'LIVE'}</span>
                </div>

                <div className="relative bg-slate-950 p-6 rounded border border-slate-800 font-mono text-sm space-y-4 overflow-hidden printable-paper select-none" onContextMenu={(e) => e.preventDefault()}>
                  {/* Dynamic Forensic Overlay */}
                  <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-around opacity-15 rotate-[-25deg] transform scale-125 z-10 text-[10px] text-cyan-400 font-bold tracking-widest leading-relaxed">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="whitespace-nowrap">
                        CONFIDENTIAL — CTR-101 | DEV-MAC:A1:B2:C3 | IP:127.0.0.1 | {unlockedTimestamp || 'STAMPED'} — CONFIDENTIAL
                      </div>
                    ))}
                  </div>

                  <h3 className="font-bold text-cyan-400 border-b border-slate-800 pb-2 relative z-20">
                    CENTRAL UNIVERSITY EXAMINATION 2026 — SUBJECT: {subjectCode}
                  </h3>
                  <p className="relative z-20">Instructions: All questions are compulsory. Total marks: 100.</p>
                  <div className="space-y-2 text-slate-300 py-2 relative z-20">
                    {decryptedContent.split('\n').map((line, index) => (line.trim() ? <p key={index}>{line}</p> : null))}
                  </div>
                </div>

                {/* Real-Time Student Terminal Monitor Grid */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 no-print mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                        📡 Live Student Terminal Monitor (Hall Status)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Tracks connected student devices, active test-taking, focus violations, and technical failures.
                      </p>
                    </div>
                    <button
                      onClick={this.loadStudentStatuses}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 rounded text-xs font-semibold font-mono"
                    >
                      🔄 REFRESH DESK STATUS
                    </button>
                  </div>

                  {studentStatuses.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 rounded border border-slate-800 text-xs font-mono text-slate-400 text-center">
                      No active student terminals connected yet. Launch a student terminal at{' '}
                      <a href="/student" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">
                        http://localhost:5173/student
                      </a>{' '}
                      to start live monitoring.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
                      {studentStatuses.map((st) => (
                        <div
                          key={`${st.center_code}_${st.roll_number}`}
                          className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 ${
                            st.status === 'ACTIVE'
                              ? 'bg-slate-900/80 border-emerald-800/80 text-emerald-200'
                              : st.status === 'VIOLATION'
                              ? 'bg-red-950/60 border-red-700 text-red-200 animate-pulse'
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
                            <div>Roll: <strong>{st.roll_number}</strong></div>
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

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 no-print">
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
          </>
        )}
          </div>
        </div>
      </div>
    );
  }
}
