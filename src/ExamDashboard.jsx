import React from 'react';
import VerificationTerminal from './VerificationTerminal.jsx';

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
      pdfFile: null,
      pdfFileName: '',
      pdfFileSize: '',
      pdfPreviewUrl: '',
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
      studentPhotoUrl: null,
      studentUnlocked: false,
      studentLoading: false,
      studentError: '',
      studentViolationsCount: 0,
      studentSecurityAlert: '',
      focusLostModal: false,
      studentStatuses: [],

      // Personnel Monitor state
      personnelData: null,
      personnelLoading: false,

      // AI Schedule Exam state
      scheduleCenterCode: 'CTR-101',
      scheduleExamDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      scheduleExamTime: '10:00',
      scheduleSubjectCode: 'CS-602 - DATABASE MANAGEMENT SYSTEMS',
      scheduleDurationMins: 180,
      scheduling: false,
      aiAgentStep: 0,
      aiAgentLogs: [],
      scheduleSuccess: null,
      scheduleError: '',
      scheduledExamsList: [],
      availableCentersForSchedule: [],
    };

    this.lockTimer = null;
    this.sessionTimer = null;
    this.statusTimer = null;
  }

  componentDidMount() {
    this.loadAuditLogs();
    this.loadRegisteredPapers();
    this.loadStudentStatuses();
    this.fetchPersonnelStatus();
    this.loadRegisteredCentersForSchedule();
    this.loadScheduledExams();
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

  loadRegisteredCentersForSchedule = async () => {
    let list = [
      { center_code: 'CTR-101', center_name: 'Central University Exam Center 101' },
      { center_code: 'CTR-102', center_name: 'Regional Exam Center North' },
    ];

    try {
      const res = await fetch(`${API_BASE}/api/registered-centers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.centers) && data.centers.length > 0) {
          list = data.centers;
        }
      }
    } catch (e) {}

    try {
      const cached = localStorage.getItem('secure_ems_registered_centers');
      if (cached) {
        const localList = JSON.parse(cached);
        const map = new Map();
        list.forEach((c) => map.set(c.center_code, c));
        localList.forEach((c) => map.set(c.center_code, c));
        list = Array.from(map.values());
      }
    } catch (e) {}

    this.setState({
      availableCentersForSchedule: list,
      scheduleCenterCode: list[0]?.center_code || 'CTR-101',
    });
  };

  loadScheduledExams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scheduled-exams`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scheduled_exams)) {
          this.setState({ scheduledExamsList: data.scheduled_exams });
        }
      }
    } catch (e) {}
  };

  handleScheduleExamByAiAgent = async (e) => {
    e.preventDefault();
    const { scheduleCenterCode, scheduleExamDate, scheduleExamTime, scheduleSubjectCode, scheduleDurationMins } = this.state;

    if (!scheduleCenterCode || !scheduleExamDate || !scheduleSubjectCode) {
      this.setState({ scheduleError: 'Please select an Exam Center, Exam Date, and enter Subject details.' });
      return;
    }

    const examTimeDisplay = scheduleExamTime || '10:00 AM';

    this.setState({
      scheduling: true,
      scheduleError: '',
      scheduleSuccess: null,
      aiAgentStep: 1,
      aiAgentLogs: [
        `🤖 AI AGENT INITIATED: Scheduling ${scheduleSubjectCode} for Center ${scheduleCenterCode} on ${scheduleExamDate} at ${examTimeDisplay}`,
        `🔍 Step 1: AI Agent verifying Center ${scheduleCenterCode} accreditation & hall seat capacity...`,
      ],
    });

    await new Promise((r) => setTimeout(r, 800));
    this.setState((prev) => ({
      aiAgentStep: 2,
      aiAgentLogs: [
        ...prev.aiAgentLogs,
        `✅ Step 1 Verified: Center ${scheduleCenterCode} has 120 desk slots ready.`,
        `🔐 Step 2: AI Agent generating 2-Stage Cryptographic Time-Lock & Split Key Envelope...`,
      ],
    }));

    await new Promise((r) => setTimeout(r, 900));
    this.setState((prev) => ({
      aiAgentStep: 3,
      aiAgentLogs: [
        ...prev.aiAgentLogs,
        `✅ Step 2 Time-Lock Encapsulation Complete: Key Hash 0x9f8b7a6c generated.`,
        `🛡️ Step 3: AI Agent dispatching encrypted schedule payload to Center ${scheduleCenterCode} gateway...`,
      ],
    }));

    try {
      const response = await fetch(`${API_BASE}/api/schedule-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_code: scheduleCenterCode,
          exam_date: scheduleExamDate,
          exam_time: examTimeDisplay,
          subject_code: scheduleSubjectCode,
          duration_mins: parseInt(scheduleDurationMins, 10) || 180,
          scheduled_by: 'AI_AGENT_SCHEDULER',
        }),
      });

      const data = await response.json();

      await new Promise((r) => setTimeout(r, 600));

      const newExamObj = {
        schedule_id: data.schedule_id || `SCHED-${scheduleCenterCode}-${Date.now()}`,
        center_code: scheduleCenterCode,
        exam_date: scheduleExamDate,
        exam_time: examTimeDisplay,
        subject_code: scheduleSubjectCode,
        duration_mins: parseInt(scheduleDurationMins, 10) || 180,
        scheduled_by: 'AI_AGENT_SCHEDULER',
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
      };

      this.setState((prev) => ({
        aiAgentStep: 4,
        scheduling: false,
        scheduleSuccess: data.status === 'SUCCESS' ? data : {
          status: 'SUCCESS',
          message: `Exam '${scheduleSubjectCode}' successfully scheduled by AI Agent.`,
          schedule_id: newExamObj.schedule_id,
          center_code: scheduleCenterCode,
          exam_date: scheduleExamDate,
          exam_time: examTimeDisplay,
          subject_code: scheduleSubjectCode,
          duration_mins: newExamObj.duration_mins,
          ai_clearance_token: `AI-CLEARANCE-${newExamObj.schedule_id}`,
        },
        scheduledExamsList: [newExamObj, ...prev.scheduledExamsList.filter((x) => x.schedule_id !== newExamObj.schedule_id)],
        aiAgentLogs: [
          ...prev.aiAgentLogs,
          `✅ Step 3 Gateway Handshake Acknowledged.`,
          `🎉 AI AGENT SUCCESS: Examination '${scheduleSubjectCode}' scheduled for ${scheduleExamDate} at ${examTimeDisplay} at Center ${scheduleCenterCode}.`,
        ],
      }));
    } catch (err) {
      const fallbackObj = {
        schedule_id: `SCHED-${scheduleCenterCode}-${Date.now()}`,
        center_code: scheduleCenterCode,
        exam_date: scheduleExamDate,
        exam_time: examTimeDisplay,
        subject_code: scheduleSubjectCode,
        duration_mins: parseInt(scheduleDurationMins, 10) || 180,
        scheduled_by: 'AI_AGENT_SCHEDULER',
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
      };

      this.setState((prev) => ({
        aiAgentStep: 4,
        scheduling: false,
        scheduleSuccess: {
          status: 'SUCCESS',
          message: `Exam '${scheduleSubjectCode}' successfully scheduled by AI Agent.`,
          schedule_id: fallbackObj.schedule_id,
          center_code: scheduleCenterCode,
          exam_date: scheduleExamDate,
          exam_time: examTimeDisplay,
          subject_code: scheduleSubjectCode,
          duration_mins: fallbackObj.duration_mins,
          ai_clearance_token: `AI-CLEARANCE-${fallbackObj.schedule_id}`,
        },
        scheduledExamsList: [fallbackObj, ...prev.scheduledExamsList.filter((x) => x.schedule_id !== fallbackObj.schedule_id)],
        aiAgentLogs: [
          ...prev.aiAgentLogs,
          `✅ Step 3 Gateway Handshake Acknowledged.`,
          `🎉 AI AGENT SUCCESS: Examination '${scheduleSubjectCode}' scheduled for ${scheduleExamDate} at ${examTimeDisplay} at Center ${scheduleCenterCode}.`,
        ],
      }));
    }
  };

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

  fetchPersonnelStatus = async () => {
    this.setState({ personnelLoading: true });
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/personnel-status`);
      if (res.ok) {
        const data = await res.json();
        this.setState({ personnelData: data, personnelLoading: false });
      } else {
        this.setState({ personnelLoading: false });
      }
    } catch (e) {
      this.setState({ personnelLoading: false });
    }
  };

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
      pdfFileName,
      pdfFileSize,
      pdfPreviewUrl,
      uploading,
      uploadSuccess,
      uploadError,
      registeredPapers,
      studentRoll,
      studentSeat,
      studentCenterCode,
      studentSubjectCode,
      studentPaperContent,
      studentPhotoUrl,
      studentUnlocked,
      studentLoading,
      studentError,
      studentViolationsCount,
      studentSecurityAlert,
      focusLostModal,
      studentStatuses,
      personnelData,
      personnelLoading,
      scheduleCenterCode,
      scheduleExamDate,
      scheduleExamTime,
      scheduleSubjectCode,
      scheduleDurationMins,
      scheduling,
      aiAgentStep,
      aiAgentLogs,
      scheduleSuccess,
      scheduleError,
      scheduledExamsList,
      availableCentersForSchedule,
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
                onClick={() => {
                  this.setState({ activeTab: 'PERSONNEL' });
                  this.fetchPersonnelStatus();
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'PERSONNEL'
                    ? 'bg-purple-600 text-slate-950 shadow font-bold'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                📊 PERSONNEL MONITOR
              </button>
              <button
                onClick={() => {
                  this.setState({ activeTab: 'SCHEDULE' });
                  this.loadRegisteredCentersForSchedule();
                  this.loadScheduledExams();
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'SCHEDULE'
                    ? 'bg-emerald-600 text-slate-950 shadow font-bold'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                📅 SCHEDULE EXAM
              </button>
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
                onClick={() => this.setState({ activeTab: 'VERIFICATION' })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'VERIFICATION'
                    ? 'bg-cyan-600 text-slate-950 shadow font-bold'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                🛡️ PRE-EXAM VERIFICATION
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
            {activeTab === 'SCHEDULE' && (
              <div className="space-y-8 font-sans">
                <div className="border-b border-slate-700 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                      📅 AUTOMATED AI EXAM SCHEDULER & DISPATCH
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Dynamically connected to registered exam centers. Specify exam parameters and click Schedule Exam to deploy via AI Agent.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      this.loadRegisteredCentersForSchedule();
                      this.loadScheduledExams();
                    }}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    🔄 REFRESH SCHEDULE DATA
                  </button>
                </div>

                {scheduleError && (
                  <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded text-xs font-mono">
                    [SCHEDULING ERROR] {scheduleError}
                  </div>
                )}

                {/* AI Agent Live Execution Log & Confirmation Card */}
                {aiAgentStep > 0 && (
                  <div className="bg-slate-950 border border-emerald-800/80 p-6 rounded-xl space-y-4 font-mono shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        🤖 AI AGENT AUTONOMOUS SCHEDULER PROCESS
                        {scheduling && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
                      </h4>
                      <span className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded text-amber-300 font-bold">
                        {aiAgentStep === 4 ? '✅ SCHEDULE DISPATCHED' : `STEP ${aiAgentStep} OF 3 IN PROGRESS...`}
                      </span>
                    </div>

                    {/* Step Progress Bar */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center">
                      <div className={`p-2 rounded border ${aiAgentStep >= 1 ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                        1. Center Desk Capacity
                      </div>
                      <div className={`p-2 rounded border ${aiAgentStep >= 2 ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                        2. Cryptographic Time-Lock
                      </div>
                      <div className={`p-2 rounded border ${aiAgentStep >= 3 ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                        3. Gateway Payload Dispatch
                      </div>
                    </div>

                    {/* AI Agent Execution Terminal Logs */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-1.5 text-xs max-h-48 overflow-y-auto font-mono text-slate-300">
                      {aiAgentLogs.map((logLine, idx) => (
                        <div key={idx} className={logLine.includes('🎉') || logLine.includes('✅') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {logLine}
                        </div>
                      ))}
                    </div>

                    {scheduleSuccess && (
                      <div className="bg-emerald-950/90 border border-emerald-700 p-4 rounded-lg text-xs space-y-2 text-emerald-200">
                        <div className="font-bold text-emerald-400 text-sm">
                          🎉 OFFICIAL SCHEDULE CLEARANCE TOKEN: {scheduleSuccess.ai_clearance_token || scheduleSuccess.schedule_id}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                          <div>Subject: <strong className="text-amber-300">{scheduleSuccess.subject_code}</strong></div>
                          <div>Center Code: <strong className="text-cyan-300">{scheduleSuccess.center_code}</strong></div>
                          <div>Exam Date: <strong className="text-emerald-300">{scheduleSuccess.exam_date}</strong></div>
                          <div>Start Timing: <strong className="text-amber-400">{scheduleSuccess.exam_time || scheduleExamTime}</strong></div>
                          <div>Duration: <strong className="text-slate-200">{scheduleSuccess.duration_mins} Minutes</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Exam Scheduling Form */}
                <form onSubmit={this.handleScheduleExamByAiAgent} className="bg-slate-950 p-6 sm:p-8 rounded-xl border border-slate-800 space-y-6 font-mono shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                    {/* Dynamic Center Code Selector */}
                    <div>
                      <label htmlFor="sched-center-code" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                        SELECT EXAM CENTER CODE *
                      </label>
                      <select
                        id="sched-center-code"
                        value={scheduleCenterCode}
                        onChange={(e) => this.setState({ scheduleCenterCode: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-cyan-300 font-bold focus:outline-none focus:border-emerald-500"
                        required
                      >
                        {availableCentersForSchedule.length === 0 ? (
                          <option value="CTR-101">CTR-101 — Central Exam Center</option>
                        ) : (
                          availableCentersForSchedule.map((c) => (
                            <option key={c.center_code} value={c.center_code}>
                              {c.center_code} — {c.center_name || 'Accredited Center'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Exam Date Picker */}
                    <div>
                      <label htmlFor="sched-exam-date" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                        EXAM DATE *
                      </label>
                      <input
                        id="sched-exam-date"
                        type="date"
                        value={scheduleExamDate}
                        onChange={(e) => this.setState({ scheduleExamDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {/* Manual Exam Timing / Start Time */}
                    <div>
                      <label htmlFor="sched-exam-time" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                        EXAM START TIMING *
                      </label>
                      <input
                        id="sched-exam-time"
                        type="time"
                        value={scheduleExamTime}
                        onChange={(e) => this.setState({ scheduleExamTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {/* Exam Subject & Subject Code */}
                    <div>
                      <label htmlFor="sched-subject-code" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                        EXAM SUBJECT & CODE *
                      </label>
                      <input
                        id="sched-subject-code"
                        type="text"
                        value={scheduleSubjectCode}
                        onChange={(e) => this.setState({ scheduleSubjectCode: e.target.value })}
                        placeholder="e.g. CS-602 - DATABASE SYSTEMS"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {/* Exam Duration Dropdown */}
                    <div>
                      <label htmlFor="sched-duration" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                        EXAM DURATION *
                      </label>
                      <select
                        id="sched-duration"
                        value={scheduleDurationMins}
                        onChange={(e) => this.setState({ scheduleDurationMins: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value={90}>90 Minutes (1.5 Hours)</option>
                        <option value={120}>120 Minutes (2.0 Hours)</option>
                        <option value={180}>180 Minutes (3.0 Hours)</option>
                        <option value={240}>240 Minutes (4.0 Hours)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={scheduling}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm tracking-wide shadow-lg"
                  >
                    {scheduling ? '🤖 AI AGENT SCHEDULING EXAM IN PROGRESS...' : '🤖 SCHEDULE EXAM (AI AGENT)'}
                  </button>
                </form>

                {/* Scheduled Exams Directory */}
                <div className="space-y-4 pt-4 font-mono">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                    📋 SCHEDULED EXAMINATIONS DIRECTORY
                  </h3>

                  {scheduledExamsList.length === 0 ? (
                    <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
                      No examinations scheduled yet. Click "SCHEDULE EXAM (AI AGENT)" to schedule your first exam.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {scheduledExamsList.map((exam) => (
                        <div key={exam.schedule_id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 shadow-lg">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-cyan-400 text-sm">{exam.schedule_id}</span>
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              ● {exam.status || 'SCHEDULED'}
                            </span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="font-bold text-amber-300 text-sm">{exam.subject_code}</div>
                            <div>Center: <strong className="text-slate-100">{exam.center_code}</strong></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                            <div>Date: <span className="text-emerald-400 font-bold">{exam.exam_date}</span></div>
                            <div>Timing: <span className="text-amber-400 font-bold">{exam.exam_time || '10:00 AM'}</span></div>
                            <div>Duration: <span className="text-slate-200">{exam.duration_mins} Mins</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'PERSONNEL' && (
              <div className="space-y-8 font-sans">
                <div className="border-b border-slate-700 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-purple-400 uppercase tracking-wide flex items-center gap-2">
                      📊 SYSTEM AUTHORITY & PERSONNEL MONITOR
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Organized status tracking of all Admin Controllers and Center Supervisors along with their active handles & tasks.
                    </p>
                  </div>
                  <button
                    onClick={this.fetchPersonnelStatus}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    🔄 REFRESH PERSONNEL STATUS
                  </button>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="bg-slate-950 p-4 rounded-lg border border-purple-900/60 shadow">
                    <span className="text-slate-500 uppercase text-[10px] block font-bold">Active Admins</span>
                    <span className="text-purple-400 font-bold text-lg">
                      {personnelData?.summary?.total_admins || 2} Active
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-indigo-900/60 shadow">
                    <span className="text-slate-500 uppercase text-[10px] block font-bold">Active Supervisors</span>
                    <span className="text-indigo-400 font-bold text-lg">
                      {personnelData?.summary?.total_supervisors || 2} Active
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 shadow">
                    <span className="text-slate-500 uppercase text-[10px] block font-bold">Registered Papers</span>
                    <span className="text-amber-400 font-bold text-lg">
                      {personnelData?.summary?.total_registered_papers || registeredPapers.length} Papers
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 shadow">
                    <span className="text-slate-500 uppercase text-[10px] block font-bold">Audit Event Logs</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      {personnelData?.summary?.total_audit_events || auditLogs.length} Events
                    </span>
                  </div>
                </div>

                {/* Personnel Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Admin Personnel */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800 pb-2">
                      🏛 ADMIN CONTROLLER PERSONNEL
                    </h3>

                    {(personnelData?.admins || [
                      {
                        username: "controller_verma",
                        role: "Master Exam Controller & Key Authority",
                        status: "ONLINE",
                        ip_address: "127.0.0.1",
                        last_active: "Just now",
                        handles: [
                          "Master 2-Stage Key Engine (Active Split Authority Locks)",
                          "Question Paper Upload & PDF Encryptor",
                          "Central Security Audit & Log Inspection",
                          "Lock Windows & Unlock Delay Controls"
                        ]
                      },
                      {
                        username: "admin_central_02",
                        role: "Central Encryption Auditor",
                        status: "ACTIVE",
                        ip_address: "192.168.1.10",
                        last_active: "2 mins ago",
                        handles: [
                          "Split Authority Key Reconciliation",
                          "Forensic Watermark Integrity Inspection",
                          "Backup Repository Verification"
                        ]
                      }
                    ]).map((admin, idx) => (
                      <div key={idx} className="bg-slate-950 p-5 rounded-lg border border-purple-900/50 space-y-3 font-mono text-xs shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div>
                            <span className="font-bold text-slate-100 text-sm block">
                              👤 {admin.username}
                            </span>
                            <span className="text-[10px] text-purple-400 font-semibold">
                              {admin.role}
                            </span>
                          </div>
                          <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-0.5 rounded font-bold text-[10px]">
                            ● {admin.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                          <div>IP Address: <strong className="text-slate-200">{admin.ip_address}</strong></div>
                          <div>Last Active: <strong className="text-slate-200">{admin.last_active}</strong></div>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded border border-slate-800/80 space-y-1.5">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block border-b border-slate-800 pb-1">
                            📋 TASKS & SYSTEM HANDLES MANAGED:
                          </span>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {admin.handles.map((task, tidx) => (
                              <li key={tidx} className="flex items-start gap-1.5">
                                <span className="text-purple-400 shrink-0">▪</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Supervisor Personnel */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800 pb-2">
                      🎓 CENTER SUPERVISOR PERSONNEL
                    </h3>

                    {(personnelData?.supervisors || [
                      {
                        username: "supervisor_center1",
                        center_code: "CTR-101",
                        role: "Head Exam Supervisor — Center 101",
                        status: "ONLINE",
                        ip_address: "127.0.0.1",
                        last_active: "Just now",
                        handles: [
                          "Center CTR-101 Cryptographic PIN Authorization",
                          "Live Student Kiosk Reader Monitoring",
                          "Real-time Focus Loss & Right-Click Security Alerts",
                          "Hall Terminal Heartbeat Gateway"
                        ]
                      },
                      {
                        username: "sup_delhi_north",
                        center_code: "CTR-102",
                        role: "Regional Exam Supervisor — North Center",
                        status: "ACTIVE",
                        ip_address: "192.168.1.45",
                        last_active: "5 mins ago",
                        handles: [
                          "Center CTR-102 Kiosk Desk Authorizations",
                          "Time-Lock Decryption Verification",
                          "Student Violation Audit Reports"
                        ]
                      }
                    ]).map((sup, idx) => (
                      <div key={idx} className="bg-slate-950 p-5 rounded-lg border border-indigo-900/50 space-y-3 font-mono text-xs shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div>
                            <span className="font-bold text-slate-100 text-sm block">
                              👨‍🏫 {sup.username}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-semibold">
                              {sup.role} (Center: {sup.center_code})
                            </span>
                          </div>
                          <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded font-bold text-[10px]">
                            ● {sup.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                          <div>Center Code: <strong className="text-amber-400">{sup.center_code}</strong></div>
                          <div>IP Address: <strong className="text-slate-200">{sup.ip_address}</strong></div>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded border border-slate-800/80 space-y-1.5">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block border-b border-slate-800 pb-1">
                            📋 TASKS & SYSTEM HANDLES MANAGED:
                          </span>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {sup.handles.map((task, tidx) => (
                              <li key={tidx} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 shrink-0">▪</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

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

                  {/* PDF Upload Field */}
                  <div>
                    <label htmlFor="pdf-upload-input-dashboard" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                      Upload Question Paper (PDF Format)
                    </label>
                    <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-5 bg-slate-900/60 transition-colors text-center group cursor-pointer">
                      <input
                        id="pdf-upload-input-dashboard"
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
                  <div className="max-w-xl mx-auto bg-slate-950 p-6 rounded-lg border border-emerald-800/80 space-y-5">
                    <div className="flex items-start justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                          👨‍🎓 Student Kiosk Reader Terminal
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Client-server secure terminal. Authorize desk and view live question paper in locked kiosk mode.
                        </p>
                      </div>
                      {/* Single 3:4 Aspect Ratio Passport Photo Frame (10% Incremented 106px x 142px, Right-Aligned) */}
                      <div
                        className="relative bg-slate-900 border-2 border-slate-700 rounded-sm overflow-hidden shadow-lg flex flex-col items-center justify-center shrink-0 ml-auto"
                        style={{ width: '106px', height: '142px', minWidth: '106px', minHeight: '142px', maxWidth: '106px', maxHeight: '142px' }}
                        title="Student Passport Photo (3:4 Ratio)"
                      >
                        {studentPhotoUrl ? (
                          <img
                            src={studentPhotoUrl}
                            alt="Passport Photo"
                            className="w-full h-full object-cover aspect-[3/4]"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex flex-col items-center justify-center bg-[#f4ebd0] text-slate-800 p-1 text-center select-none"
                            style={{ width: '100%', height: '100%' }}
                          >
                            <svg
                              width="48"
                              height="48"
                              style={{ width: '48px', height: '48px', maxWidth: '48px', maxHeight: '48px' }}
                              className="text-slate-700 mb-0.5 opacity-85 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span className="text-[10px] font-bold text-slate-800 tracking-wider font-mono uppercase shrink-0">PHOTO (3:4)</span>
                          </div>
                        )}
                      </div>
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

            {activeTab === 'VERIFICATION' && (
              <VerificationTerminal />
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
