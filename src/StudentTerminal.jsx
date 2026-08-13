import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class StudentTerminal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
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
    };

    this.heartbeatTimer = null;
  }

  componentDidMount() {
    window.addEventListener('keydown', this.handleStudentKeyDown);
    window.addEventListener('blur', this.handleStudentFocusLoss);
    window.addEventListener('visibilitychange', this.handleStudentVisibilityChange);
    window.addEventListener('contextmenu', this.preventStudentContextMenu);
    window.addEventListener('copy', this.preventStudentClipboard);
    window.addEventListener('cut', this.preventStudentClipboard);
    window.addEventListener('paste', this.preventStudentClipboard);
  }

  componentWillUnmount() {
    this.stopHeartbeat();
    window.removeEventListener('keydown', this.handleStudentKeyDown);
    window.removeEventListener('blur', this.handleStudentFocusLoss);
    window.removeEventListener('visibilitychange', this.handleStudentVisibilityChange);
    window.removeEventListener('contextmenu', this.preventStudentContextMenu);
    window.removeEventListener('copy', this.preventStudentClipboard);
    window.removeEventListener('cut', this.preventStudentClipboard);
    window.removeEventListener('paste', this.preventStudentClipboard);
  }

  startHeartbeat = () => {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(this.sendHeartbeat, 3000);
  };

  stopHeartbeat = () => {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  };

  sendHeartbeat = async () => {
    if (!this.state.studentUnlocked) return;
    const { studentRoll, studentSeat, studentCenterCode, studentSubjectCode, studentViolationsCount, focusLostModal } = this.state;
    try {
      await fetch(`${API_BASE}/api/student/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: studentRoll,
          seat_id: studentSeat,
          center_code: studentCenterCode,
          subject_code: studentSubjectCode,
          status: focusLostModal ? 'FOCUS_LOSS' : 'ACTIVE',
          violations_count: studentViolationsCount,
        }),
      });
    } catch (e) {
      console.error('Heartbeat ping failed', e);
    }
  };

  preventStudentContextMenu = (e) => {
    if (this.state.studentUnlocked) {
      e.preventDefault();
      this.reportStudentAlert('RIGHT_CLICK_ATTEMPT', 'Right-click context menu attempt blocked on standalone student terminal');
    }
  };

  preventStudentClipboard = (e) => {
    if (this.state.studentUnlocked) {
      e.preventDefault();
      this.reportStudentAlert('CLIPBOARD_TAMPER_ATTEMPT', 'Copy/Cut/Paste operation blocked on standalone student terminal');
    }
  };

  handleStudentFocusLoss = () => {
    if (this.state.studentUnlocked) {
      this.setState((prev) => ({
        studentViolationsCount: prev.studentViolationsCount + 1,
        focusLostModal: true,
        studentSecurityAlert: 'SECURITY WARNING: Window focus lost or external app switch detected!',
      }));
      this.reportStudentAlert('FOCUS_LOSS', 'Student navigated away or blurred browser window');
    }
  };

  handleStudentVisibilityChange = () => {
    if (this.state.studentUnlocked && document.hidden) {
      this.setState((prev) => ({
        studentViolationsCount: prev.studentViolationsCount + 1,
        focusLostModal: true,
        studentSecurityAlert: 'SECURITY VIOLATION: Tab switch or window minimization detected!',
      }));
      this.reportStudentAlert('TAB_SWITCH', 'Document hidden or tab switch detected on student terminal');
    }
  };

  handleStudentKeyDown = (e) => {
    if (this.state.studentUnlocked) {
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
      }, () => {
        this.startHeartbeat();
      });

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      this.setState({ studentError: err.message, studentLoading: false });
    }
  };

  handleExitStudentKiosk = () => {
    if (window.confirm('Exit Student Secure Kiosk mode? This will lock the terminal.')) {
      this.stopHeartbeat();
      this.setState({ studentUnlocked: false, studentPaperContent: '', focusLostModal: false });
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  render() {
    const {
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
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 flex flex-wrap justify-between items-center border-b border-slate-700 gap-4">
            <div>
              <h1 className="font-bold text-lg tracking-wide text-emerald-400">STUDENT SECURE KIOSK TERMINAL</h1>
              <p className="text-xs text-slate-400 font-mono">Standalone Client Examination Reader Terminal</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-emerald-400 font-bold">
              <span>● CLIENT CLIENT ONLINE</span>
            </div>
          </div>

          <div className="p-8">
            {!studentUnlocked ? (
              <div className="max-w-lg mx-auto bg-slate-950 p-6 rounded-lg border border-emerald-800/80 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                    👨‍🎓 Student Terminal Authorization
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter Roll Number and Desk ID to load your question paper in locked kiosk mode.
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
                    <p className="font-bold flex items-center gap-1">🔒 STANDALONE KIOSK LOCKDOWN NOTICE</p>
                    <p className="text-slate-400">
                      System enters locked mode. Text selection, right-click, clipboard operations, and tab-switching are strictly disabled and logged to central server audit trail.
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
        </div>
      </div>
    );
  }
}
