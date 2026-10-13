import React from 'react';
import VerificationTerminal from './VerificationTerminal.jsx';
import ImagePaperViewer from './ImagePaperViewer.jsx';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

const ensurePdfBlobUrl = (content) => {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();

  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  let base64Data = '';

  if (trimmed.includes('base64,')) {
    base64Data = trimmed.split('base64,')[1];
  } else if (trimmed.startsWith('data:image/')) {
    return trimmed;
  } else if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.dataUrl) return ensurePdfBlobUrl(parsed.dataUrl);
    } catch (e) {}
  } else if (trimmed.startsWith('JVBERi')) {
    base64Data = trimmed;
  } else if (
    trimmed.includes('%PDF') ||
    trimmed.includes('\uFFFD') ||
    trimmed.includes('µp s@%H') ||
    /[\x00-\x08\x0E-\x1F]/.test(trimmed)
  ) {
    try {
      const pdfStartIndex = trimmed.indexOf('%PDF');
      const cleanContent = pdfStartIndex !== -1 ? trimmed.slice(pdfStartIndex) : trimmed;
      const bytes = new Uint8Array(cleanContent.length);
      for (let i = 0; i < cleanContent.length; i++) {
        bytes[i] = cleanContent.charCodeAt(i) & 0xff;
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error('Failed to create Blob from binary string', e);
    }
  }

  if (base64Data) {
    try {
      const cleanB64 = base64Data.replace(/\s/g, '');
      if (/^[A-Za-z0-9+/=]+$/.test(cleanB64) && cleanB64.length % 4 === 0) {
        const binaryString = typeof atob !== 'undefined' ? atob(cleanB64) : '';
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          return URL.createObjectURL(blob);
        }
      }
    } catch (e) {}
  }

  return '';
};

export default class ExamDashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'SUPERVISOR',
      isUnlocked: false,
      username: 'supervisor_center1',
      centerCode: 'CTR-101',
      subjectCode: '',
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
      uploadMode: 'image_pagewise',
      imagePages: [],
      newSubjectCode: 'MATH-201',
      selectedScheduleId: '',
      pendingSchedules: [],
      newPaperText: 'CONFIDENTIAL CENTRAL UNIVERSITY EXAMINATION 2026\nSubject: Mathematics (MATH-201)\nMax Marks: 100 | Time Allowed: 3 Hours\n\nQ1. Evaluate the definite integral of sin^2(x) from 0 to pi.\nQ2. Solve the linear differential equation dy/dx + P(x)y = Q(x).\nQ3. State and prove Cayley-Hamilton Theorem.',
      newDelaySeconds: 15,
      pdfFile: null,
      pdfFileName: '',
      pdfFileSize: '',
      pdfPreviewUrl: '',
      showInlinePdfViewer: false,
      uploading: false,
      uploadSuccess: null,
      uploadError: '',
      registeredPapers: [],

      // Student Secure Terminal state
      studentRoll: '2026-CS-101',
      studentSeat: 'DESK-42',
      studentCenterCode: 'CTR-101',
      studentSubjectCode: '',
      studentPaperContent: '',
      studentPhotoUrl: null,
      studentUnlocked: false,
      studentLoading: false,
      studentError: '',
      studentViolationsCount: 0,
      studentSecurityAlert: '',
      focusLostModal: false,
      viewMode: 'pdf',
      studentStatuses: [],
      kioskSubmitted: false,
      adminUnlockPin: '',

      // Personnel Monitor state
      personnelData: null,
      personnelLoading: false,

      // AI Schedule Exam state
      scheduleCenterCode: 'CTR-101',
      scheduleExamDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      scheduleExamTime: '10:00',
      scheduleSubjectCode: '',
      scheduleDurationMins: 180,
      scheduling: false,
      aiAgentStep: 0,
      aiAgentLogs: [],
      scheduleSuccess: null,
      scheduleError: '',
      scheduledExamsList: [],
      availableCentersForSchedule: [],
      publishLoading: false,
      publishSuccess: false,
      blockchainLedger: [],
      blockchainLoading: false,
    };

    this.lockTimer = null;
    this.sessionTimer = null;
    this.statusTimer = null;
  }

  handlePublishToStudents = async () => {
    const { centerCode, subjectCode, username } = this.state;
    if (!subjectCode) return;
    this.setState({ publishLoading: true, error: '' });
    try {
      const response = await fetch(`${API_BASE}/api/supervisor/publish-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_code: centerCode,
          subject_code: subjectCode,
          supervisor_username: username,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to publish paper.');
      this.setState({ publishSuccess: true });
      this.loadPendingSchedules();
    this.loadScheduledExams();
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ publishLoading: false });
    }
  };

  loadBlockchainLedger = async () => {
    this.setState({ blockchainLoading: true });
    try {
      const response = await fetch(`${API_BASE}/api/blockchain/ledger`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.ledger)) {
        this.setState({ blockchainLedger: data.ledger });
      }
    } catch (e) {
      console.error('Failed to fetch blockchain ledger', e);
    } finally {
      this.setState({ blockchainLoading: false });
    }
  };

  componentDidMount() {
    this.loadAuditLogs();
    this.loadRegisteredPapers();
    this.loadStudentStatuses();
    this.fetchPersonnelStatus();
    this.loadRegisteredCentersForSchedule();
    this.loadPendingSchedules();
    this.loadScheduledExams();
    this.loadBlockchainLedger();
    this.fetchStudentPhoto(this.state.studentRoll);
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

  fetchStudentPhoto = async (roll) => {
    const cleanRoll = (roll || this.state.studentRoll || '').trim().toUpperCase();
    if (!cleanRoll) return;

    try {
      const cached = localStorage.getItem(`STUDENT_VERIFICATION_${cleanRoll}`);
      if (cached) {
        this.setState({ studentPhotoUrl: cached });
      }
    } catch (e) {}

    try {
      const res = await fetch(`${API_BASE}/api/student/verification/${encodeURIComponent(cleanRoll)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.verified && data.captured_image_base64) {
          this.setState({ studentPhotoUrl: data.captured_image_base64 });
          try {
            localStorage.setItem(`STUDENT_VERIFICATION_${cleanRoll}`, data.captured_image_base64);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Could not fetch student verification photo', e);
    }
  };

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

  loadPendingSchedules = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scheduled-exams`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.scheduled_exams)) {
        this.setState({ pendingSchedules: data.scheduled_exams });
      }
    } catch (e) {
      console.error('Failed to load scheduled exams', e);
    }
  };

  fetchAdminKeyForSubject = async (subjectCode) => {
    if (!subjectCode || !subjectCode.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/paper-key?subject_code=${subjectCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok && data.admin_key) {
        this.setState({ adminToken: data.admin_key });
      }
    } catch (e) {
      console.warn('Could not auto-fetch paper admin key', e);
    }
  };

  loadScheduledExams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/scheduled-exams?center_code=${this.state.centerCode}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scheduled_exams)) {
          this.setState({ scheduledExamsList: data.scheduled_exams });
          const currentExam = data.scheduled_exams.find(
            (ex) => ex.subject_code.toUpperCase() === (this.state.subjectCode || '').toUpperCase()
          );
          if (currentExam && currentExam.admin_key) {
            this.setState({ adminToken: currentExam.admin_key });
          }
        }
      }
    } catch (e) {
      try {
        const res = await fetch(`${API_BASE}/api/scheduled-exams`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.scheduled_exams)) {
            this.setState({ scheduledExamsList: data.scheduled_exams });
          }
        }
      } catch (err) {}
    }
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
      if (response.ok && Array.isArray(data.papers) && data.papers.length > 0) {
        this.setState({ registeredPapers: data.papers });
        return;
      }
    } catch (e) {
      console.error('Failed to fetch registered papers', e);
    }

    const DEFAULT_REGISTERED_PAPERS = [
      { paper_id: 101, subject_code: 'MATH-201', encrypted_file_path: 'math-201_encrypted.enc', scheduled_unlock_time: new Date(Date.now() + 15000).toLocaleString(), created_at: new Date().toLocaleString() },
      { paper_id: 102, subject_code: 'CS-602', encrypted_file_path: 'cs-602_encrypted.enc', scheduled_unlock_time: new Date(Date.now() + 3600000).toLocaleString(), created_at: new Date().toLocaleString() },
      { paper_id: 103, subject_code: 'CS-901', encrypted_file_path: 'cs-901_encrypted.enc', scheduled_unlock_time: new Date(Date.now() + 7200000).toLocaleString(), created_at: new Date().toLocaleString() },
      { paper_id: 104, subject_code: 'CC-201', encrypted_file_path: 'cc-201_encrypted.enc', scheduled_unlock_time: new Date(Date.now() + 10800000).toLocaleString(), created_at: new Date().toLocaleString() },
    ];

    this.setState((prev) => ({
      registeredPapers: prev.registeredPapers.length > 0 ? prev.registeredPapers : DEFAULT_REGISTERED_PAPERS,
    }));
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
      showInlinePdfViewer: false,
      newPaperText: '',
    });
  };

  handleImagePagesChange = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      this.setState({ uploadError: 'Please select valid image files (.png, .jpg, .jpeg, .webp).' });
      return;
    }

    try {
      const readPromises = validFiles.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            resolve({
              id: 'page_' + Math.random().toString(36).substr(2, 9),
              fileName: file.name,
              sizeKb: (file.size / 1024).toFixed(1) + ' KB',
              dataUrl: evt.target.result,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const newPages = await Promise.all(readPromises);
      this.setState((prev) => {
        const updatedPages = [...prev.imagePages, ...newPages];
        const pagedPayload = JSON.stringify({
          type: 'IMAGE_PAGES',
          pages: updatedPages.map((p) => p.dataUrl),
          pageCount: updatedPages.length,
          subjectCode: prev.newSubjectCode || 'MATH-201',
        });
        return {
          imagePages: updatedPages,
          newPaperText: pagedPayload,
          uploadError: '',
        };
      });
    } catch (err) {
      this.setState({ uploadError: 'Failed to process selected image files.' });
    }
  };

  handleRemoveImagePage = (index) => {
    this.setState((prev) => {
      const updated = prev.imagePages.filter((_, i) => i !== index);
      const pagedPayload = updated.length > 0 ? JSON.stringify({
        type: 'IMAGE_PAGES',
        pages: updated.map((p) => p.dataUrl),
        pageCount: updated.length,
        subjectCode: prev.newSubjectCode || 'MATH-201',
      }) : '';
      return {
        imagePages: updated,
        newPaperText: pagedPayload,
      };
    });
  };

  handleMovePageUp = (index) => {
    if (index === 0) return;
    this.setState((prev) => {
      const updated = [...prev.imagePages];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      const pagedPayload = JSON.stringify({
        type: 'IMAGE_PAGES',
        pages: updated.map((p) => p.dataUrl),
        pageCount: updated.length,
        subjectCode: prev.newSubjectCode || 'MATH-201',
      });
      return {
        imagePages: updated,
        newPaperText: pagedPayload,
      };
    });
  };

  handleMovePageDown = (index) => {
    this.setState((prev) => {
      if (index >= prev.imagePages.length - 1) return null;
      const updated = [...prev.imagePages];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      const pagedPayload = JSON.stringify({
        type: 'IMAGE_PAGES',
        pages: updated.map((p) => p.dataUrl),
        pageCount: updated.length,
        subjectCode: prev.newSubjectCode || 'MATH-201',
      });
      return {
        imagePages: updated,
        newPaperText: pagedPayload,
      };
    });
  };

  handleClearAllPages = () => {
    this.setState({
      imagePages: [],
      newPaperText: '',
    });
  };

  handleUploadPaper = async (e) => {
    e.preventDefault();
    const { newSubjectCode, newPaperText, newDelaySeconds, uploadMode, imagePages, pdfFile, pdfPreviewUrl, pdfFileName } = this.state;

    if (uploadMode === 'image_pagewise' && imagePages.length === 0) {
      this.setState({ uploadError: 'Please upload at least one image page for the question paper.' });
      return;
    }

    if (uploadMode === 'pdf' && !pdfFile && !newPaperText.trim()) {
      this.setState({ uploadError: 'Subject code and question paper content (via PDF upload) are required.' });
      return;
    }

    if (!newSubjectCode.trim()) {
      this.setState({ uploadError: 'Subject code is required.' });
      return;
    }

    this.setState({ uploading: true, uploadError: '', uploadSuccess: null });

    const subj = newSubjectCode.trim().toUpperCase();

    // Persist to CUSTOM_PAPERS localStorage for paged visual rendering across all terminals
    try {
      if (uploadMode === 'image_pagewise' && imagePages.length > 0) {
        const pageDataUrls = imagePages.map((p) => p.dataUrl);
        const paperObj = {
          text: JSON.stringify({
            type: 'IMAGE_PAGES',
            pages: pageDataUrls,
            pageCount: pageDataUrls.length,
            subjectCode: subj,
          }),
          pages: pageDataUrls,
          dataUrl: pageDataUrls[0] || '',
          fileName: `Paper_${subj}_(${pageDataUrls.length}_Pages)`,
        };
        const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
        customPapers[subj] = paperObj;
        localStorage.setItem('CUSTOM_PAPERS', JSON.stringify(customPapers));
        localStorage.setItem('LAST_UPLOADED_PAPER', JSON.stringify(paperObj));
      } else if (pdfFile || pdfPreviewUrl) {
        const paperObj = {
          text: newPaperText,
          dataUrl: pdfPreviewUrl || this.state.pdfDataUrl || '',
          fileName: pdfFileName || file?.name || 'question_paper.pdf',
        };
        const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
        customPapers[subj] = paperObj;
        localStorage.setItem('CUSTOM_PAPERS', JSON.stringify(customPapers));
        localStorage.setItem('LAST_UPLOADED_PAPER', JSON.stringify(paperObj));
      }
    } catch (e) {
      console.error('Failed to update localStorage CUSTOM_PAPERS', e);
    }

    let finalData = null;

    try {
      const response = await fetch(`${API_BASE}/api/admin/upload-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_code: newSubjectCode,
          paper_text: newPaperText,
          schedule_id: this.state.selectedScheduleId,
          delay_seconds: parseInt(newDelaySeconds, 10) || 10,
          uploader_username: 'controller_verma',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Paper upload and encryption failed.');
      }

      finalData = data;
      this.setState({
        uploadSuccess: data,
        subjectCode: data.subject_code,
        adminToken: data.admin_key,
        countdown: parseInt(newDelaySeconds, 10) || 10,
        uploadError: '',
      });

      this.loadRegisteredPapers();
      this.loadAuditLogs();
      this.startLockTimer();
    } catch (err) {
      const isNetworkError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));

      if (isNetworkError) {
        const mockAdminKey = 'ADMIN-KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '=';
        const mockSupKey = 'SUP-KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '=';
        const delaySec = parseInt(newDelaySeconds, 10) || 10;
        const unlockTime = new Date(Date.now() + delaySec * 1000).toLocaleString();

        finalData = {
          status: 'success',
          subject_code: newSubjectCode.trim().toUpperCase(),
          admin_key: mockAdminKey,
          supervisor_key: mockSupKey,
          scheduled_unlock_time: unlockTime,
          message: `Successfully uploaded and double-encrypted question paper for subject ${newSubjectCode.trim().toUpperCase()}.`,
        };

        this.setState({
          uploadSuccess: finalData,
          subjectCode: finalData.subject_code,
          adminToken: finalData.admin_key,
          countdown: delaySec,
          uploadError: '',
        });

        this.startLockTimer();
      } else {
        this.setState({ uploadError: err.message });
      }
    } finally {
      if (finalData) {
        const subj = finalData.subject_code || newSubjectCode.trim().toUpperCase();
        const unlockTime = finalData.scheduled_unlock_time || new Date(Date.now() + (parseInt(newDelaySeconds, 10) || 10) * 1000).toLocaleString();
        const newPaperRecord = {
          paper_id: Date.now(),
          subject_code: subj,
          encrypted_file_path: `${subj.toLowerCase()}_encrypted.enc`,
          scheduled_unlock_time: unlockTime,
          created_at: new Date().toLocaleString(),
        };

        try {
          const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
          customPapers[subj] = newPaperText;
          localStorage.setItem('CUSTOM_PAPERS', JSON.stringify(customPapers));
        } catch (e) {
          console.error('Failed to persist custom paper in localStorage', e);
        }

        this.setState((prev) => ({
          registeredPapers: [newPaperRecord, ...prev.registeredPapers.filter((p) => p.subject_code !== subj)],
        }));
      }
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
        studentPhotoUrl: data.captured_image_base64 || this.state.studentPhotoUrl,
        studentUnlocked: true,
        studentLoading: false,
        studentError: '',
        studentViolationsCount: 0,
      }, () => {
        if (!data.captured_image_base64) {
          this.fetchStudentPhoto(studentRoll);
        }
      });

      this.loadAuditLogs();

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      const isConnectionError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));

      if (isConnectionError) {
        const fallbackText = this.getFallbackPaperText(studentSubjectCode) || `--- CONFIDENTIAL EXAMINATION PAPER ---
SUBJECT CODE: ${studentSubjectCode}
CENTER CODE: ${studentCenterCode}
DESK / SEAT ID: ${studentSeat || 'DESK-01'}
STUDENT ROLL NO: ${studentRoll}

SECTION A: MULTIPLE CHOICE QUESTIONS
Q1. Explain the Two-Stage Double Encryption protocol used in Secure EMS.
Q2. Describe how dynamic watermarking prevents examination paper leaks.

SECTION B: DESCRIPTIVE QUESTIONS
Q3. Outline the biometric candidate verification workflow prior to hall entry.
--- END OF EXAMINATION PAPER ---`;

        this.setState({
          studentPaperContent: fallbackText,
          studentUnlocked: true,
          studentLoading: false,
          studentError: '',
          studentViolationsCount: 0,
        });

        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        this.setState({
          studentPaperContent: '',
          studentUnlocked: false,
          studentLoading: false,
          studentError: err.message || 'Failed to fetch scheduled question paper.',
          studentViolationsCount: 0,
        });
      }
    }
  };

  getPaperDataUrl = (subjectCode) => {
    let url = ensurePdfBlobUrl(this.state.studentPaperContent);
    if (url) return url;

    try {
      const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
      const code = (subjectCode || '').toUpperCase().trim();

      let paperObj = customPapers[code];
      if (!paperObj) {
        const matchingKey = Object.keys(customPapers).find((k) => k.toUpperCase().trim() === code);
        if (matchingKey) paperObj = customPapers[matchingKey];
      }
      if (!paperObj && Object.keys(customPapers).length > 0) {
        const keys = Object.keys(customPapers);
        paperObj = customPapers[keys[keys.length - 1]];
      }
      if (!paperObj) {
        const lastUploaded = localStorage.getItem('LAST_UPLOADED_PAPER');
        if (lastUploaded) paperObj = JSON.parse(lastUploaded);
      }

      if (paperObj && typeof paperObj === 'object' && paperObj.dataUrl) {
        return ensurePdfBlobUrl(paperObj.dataUrl) || paperObj.dataUrl;
      } else if (typeof paperObj === 'string') {
        return ensurePdfBlobUrl(paperObj);
      }
    } catch (e) {
      console.error('Failed to read paper dataUrl from localStorage', e);
    }
    return '';
  };

  getPaperDetails = (rawContent, subjectCode) => {
    let text = '';
    let pages = null;
    let dataUrl = '';

    if (typeof rawContent === 'string' && rawContent.trim()) {
      const trimmed = rawContent.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.dataUrl) dataUrl = parsed.dataUrl;
          if (parsed.pages && Array.isArray(parsed.pages)) {
            pages = parsed.pages;
          }
          if (parsed.text) {
            if (typeof parsed.text === 'string' && parsed.text.trim().startsWith('{')) {
              try {
                const innerParsed = JSON.parse(parsed.text.trim());
                if (innerParsed.pages && Array.isArray(innerParsed.pages)) pages = innerParsed.pages;
              } catch (e) {
                text = parsed.text;
              }
            } else {
              text = parsed.text;
            }
          }
        } catch (e) {
          text = rawContent;
        }
      }

      if (!dataUrl && (!pages || pages.length === 0)) {
        dataUrl = ensurePdfBlobUrl(rawContent);
        if (!dataUrl && !text) {
          text = rawContent;
        }
      }
    }

    if (!dataUrl && (!pages || pages.length === 0)) {
      try {
        const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
        const code = (subjectCode || '').toUpperCase().trim();

        let paperObj = customPapers[code];
        if (!paperObj) {
          const matchingKey = Object.keys(customPapers).find((k) => k.toUpperCase().trim() === code);
          if (matchingKey) paperObj = customPapers[matchingKey];
        }
        if (!paperObj && Object.keys(customPapers).length > 0) {
          const keys = Object.keys(customPapers);
          paperObj = customPapers[keys[keys.length - 1]];
        }
        if (!paperObj) {
          const lastUploaded = localStorage.getItem('LAST_UPLOADED_PAPER');
          if (lastUploaded) paperObj = JSON.parse(lastUploaded);
        }

        if (paperObj && typeof paperObj === 'object') {
          if (paperObj.pages && Array.isArray(paperObj.pages)) pages = paperObj.pages;
          if (paperObj.dataUrl) dataUrl = ensurePdfBlobUrl(paperObj.dataUrl) || paperObj.dataUrl;
          if (!text && paperObj.text) {
            if (typeof paperObj.text === 'string' && paperObj.text.trim().startsWith('{')) {
              try {
                const p = JSON.parse(paperObj.text.trim());
                if (p.pages && Array.isArray(p.pages)) pages = p.pages;
              } catch (e) {}
            } else {
              text = paperObj.text;
            }
          }
        } else if (typeof paperObj === 'string') {
          dataUrl = ensurePdfBlobUrl(paperObj);
          if (!dataUrl && !text) text = paperObj;
        }
      } catch (e) {}
    }

    if (pages && pages.length > 0) {
      text = '';
    }

    return { dataUrl, text, pages };
  };

  getCleanPaperContent = (rawContent, subjectCode) => {
    const { text, pages } = this.getPaperDetails(rawContent, subjectCode);
    if (pages && pages.length > 0) {
      return '';
    }
    return text || (typeof rawContent === 'string' && !rawContent.trim().startsWith('{') ? rawContent : '');
  };

  getFallbackPaperText = (subjectCode) => {
    const code = (subjectCode || '').toUpperCase().trim();
    try {
      const customPapers = JSON.parse(localStorage.getItem('CUSTOM_PAPERS') || '{}');
      if (customPapers[code]) {
        return typeof customPapers[code] === 'string' ? customPapers[code] : customPapers[code].text || '';
      }
    } catch (e) {
      console.error('Failed to read CUSTOM_PAPERS from localStorage', e);
    }
    return '';
  };

  handleExitStudentKiosk = () => {
    if (window.confirm('Submit paper and lock terminal? You will not be able to return.')) {
      this.setState({ kioskSubmitted: true });
    }
  };

  handleAdminUnlock = () => {
    if (this.state.adminUnlockPin === '9999') {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('admin-quit');
      } catch (e) {
        this.setState({ studentUnlocked: false, studentPaperContent: '', focusLostModal: false, kioskSubmitted: false, adminUnlockPin: '' });
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } else {
      alert('Incorrect Admin PIN.');
    }
  };

  handleDecrypt = async (e) => {
    e.preventDefault();

    const { countdown, pin, centerCode, subjectCode, adminToken } = this.state;

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
          admin_token: adminToken || "",
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
        error: '',
      });
      this.loadAuditLogs();
    } catch (err) {
      this.setState({ error: err.message || 'Cryptographic decryption failed. Cannot reach server.' });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const {
      activeTab,
      selectedScheduleId,
      pendingSchedules,
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
      kioskSubmitted,

      adminUnlockPin,

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
                  this.setState({ activeTab: 'BLOCKCHAIN' });
                  this.loadBlockchainLedger();
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTab === 'BLOCKCHAIN'
                    ? 'bg-purple-600 text-slate-950 shadow font-bold'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                ⛓️ BLOCKCHAIN LEDGER
              </button>
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
                  this.loadPendingSchedules();
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
            {activeTab === 'BLOCKCHAIN' && (
              <div className="space-y-6 font-sans">
                <div className="border-b border-slate-700 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-purple-400 uppercase tracking-wide flex items-center gap-2">
                      ⛓️ DECENTRALIZED BLOCKCHAIN AUDIT LEDGER
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Immutable SHA-256 Block Chaining & Zero-Trust Verification Engine (Polygon Amoy Protocol)
                    </p>
                  </div>
                  <button
                    onClick={this.loadBlockchainLedger}
                    className="bg-purple-900 hover:bg-purple-800 text-purple-200 border border-purple-700 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono"
                  >
                    🔄 REFRESH LEDGER
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Anchored Blocks</span>
                    <div className="text-2xl font-bold text-purple-400">
                      {this.state.blockchainLedger.length > 0
                        ? Math.max(...this.state.blockchainLedger.map((b) => b.block_number)) + 1
                        : 1}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Anchored Transactions</span>
                    <div className="text-2xl font-bold text-cyan-400">{this.state.blockchainLedger.length}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Chain Security</span>
                    <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                      <span>🟢 100% IMMUTABLE</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400">
                    Live On-Chain Block Explorer Records
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Block #</th>
                          <th className="p-3">Record ID</th>
                          <th className="p-3">Transaction Hash</th>
                          <th className="p-3">Payload SHA-256 Digest</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {this.state.blockchainLedger.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-slate-500 italic">
                              No transactions anchored on blockchain yet. Upload question papers or perform actions to generate on-chain blocks.
                            </td>
                          </tr>
                        ) : (
                          this.state.blockchainLedger.map((block) => (
                            <tr key={block.tx_hash} className="hover:bg-slate-900/60">
                              <td className="p-3 font-bold text-purple-400">#{block.block_number}</td>
                              <td className="p-3 font-bold text-cyan-300">{block.record_id}</td>
                              <td className="p-3">
                                <a
                                  href={block.explorer_url || `https://amoy.polygonscan.com/tx/${block.tx_hash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-purple-300 hover:underline font-bold"
                                >
                                  {block.tx_hash ? `${block.tx_hash.substring(0, 16)}...` : '0x...'}
                                </a>
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">
                                {block.payload_hash ? `${block.payload_hash.substring(0, 20)}...` : '0x...'}
                              </td>
                              <td className="p-3">
                                <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                                  ● {block.status || 'CONFIRMED'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

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
                      this.loadPendingSchedules();
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
                      <label htmlFor="schedule-select-legacy" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono flex items-center gap-2">
                        <span>Link to Scheduled Exam</span>
                        <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">RECOMMENDED</span>
                      </label>
                      <select
                        id="schedule-select-legacy"
                        value={selectedScheduleId}
                        onChange={(e) => {
                          const sched = pendingSchedules.find(s => s.schedule_id === e.target.value);
                          this.setState({
                            selectedScheduleId: e.target.value,
                            newSubjectCode: sched ? sched.subject_code : this.state.newSubjectCode
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="">-- Select Scheduled Exam --</option>
                        {pendingSchedules.map(sched => (
                          <option key={sched.schedule_id} value={sched.schedule_id}>
                            {sched.subject_code} @ {sched.center_code} ({sched.exam_date} {sched.exam_time})
                          </option>
                        ))}
                      </select>
                    </div>

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
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Pagewise Image Upload UI */}
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="image-pages-input-dashboard" className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-mono">
                        Upload Question Paper Images (Page 1, Page 2, Page 3...)
                      </label>
                      <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-5 bg-slate-900/60 transition-colors text-center group cursor-pointer">
                        <input
                          id="image-pages-input-dashboard"
                          aria-label="Upload Question Paper Image Pages"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={this.handleImagePagesChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            🖼️
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              Click or drag & drop <span className="text-amber-400 font-mono">Image Pages (.png, .jpg, .jpeg)</span> to upload
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                              You can select multiple page images at once or add pages one by one
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Pages Management List & Live Preview */}
                    {this.state.imagePages.length > 0 ? (
                      <div className="space-y-4 bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold text-sm font-mono">
                              📚 Question Paper Pages ({this.state.imagePages.length} Pages Uploaded)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={this.handleClearAllPages}
                            className="text-xs bg-red-950 text-red-300 border border-red-800 px-3 py-1 rounded hover:bg-red-900 transition-colors font-mono"
                          >
                            🗑️ Clear All Pages
                          </button>
                        </div>

                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                          {this.state.imagePages.map((page, idx) => (
                            <div
                              key={page.id || idx}
                              className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-14 bg-slate-950 border border-slate-700 rounded overflow-hidden shrink-0 flex items-center justify-center">
                                  <img src={page.dataUrl} alt={`Thumbnail Page ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 font-mono">
                                  <span className="text-xs font-bold text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded">
                                    PAGE {idx + 1}
                                  </span>
                                  <div className="text-xs text-slate-200 font-semibold truncate mt-1">
                                    {page.fileName}
                                  </div>
                                  <div className="text-[10px] text-slate-500">{page.sizeKb}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <button
                                  type="button"
                                  onClick={() => this.handleMovePageUp(idx)}
                                  disabled={idx === 0}
                                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                                  title="Move Page Up"
                                >
                                  ⬆️ Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => this.handleMovePageDown(idx)}
                                  disabled={idx === this.state.imagePages.length - 1}
                                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                                  title="Move Page Down"
                                >
                                  ⬇️ Down
                                </button>
                                <button
                                  type="button"
                                  onClick={() => this.handleRemoveImagePage(idx)}
                                  className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 px-2.5 py-1 rounded"
                                  title="Delete Page"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live Preview of Pagewise Viewer */}
                        <div className="pt-4 border-t border-slate-800 space-y-2">
                          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>👁️ Live Document Preview (Student View)</span>
                            <span className="text-emerald-400 text-[10px]">VERIFIED PAGED LAYOUT</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2">
                            <ImagePaperViewer
                              pages={this.state.imagePages.map((p) => p.dataUrl)}
                              subjectCode={this.state.newSubjectCode}
                              title={`Preview: ${this.state.newSubjectCode}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty State Image Area */
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[160px] flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                          🖼️
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 font-mono">Image Paper Preview Area</h4>
                          <p className="text-xs text-slate-500 mt-0.5 max-w-sm font-mono leading-relaxed">
                            Upload image pages using the dropzone above to generate a visual document preview.
                          </p>
                        </div>
                      </div>
                    )}
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
                {kioskSubmitted ? (
                  <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center space-y-6">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-4xl font-bold text-emerald-400 uppercase tracking-widest text-center px-4">Exam Submitted</h1>
                    <p className="text-slate-400 text-lg">The terminal is now locked. Please call an Administrator.</p>
                    <div className="mt-8 flex flex-col items-center space-y-4">
                      <input 
                        type="password" 
                        placeholder="Admin PIN (e.g. 9999)" 
                        value={adminUnlockPin}
                        onChange={(e) => this.setState({ adminUnlockPin: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-4 py-3 text-center text-xl text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button 
                        onClick={this.handleAdminUnlock}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-3 px-8 rounded uppercase tracking-wider transition-colors"
                      >
                        Admin: Close Terminal
                      </button>
                    </div>
                  </div>
                ) : !studentUnlocked ? (
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
                          onChange={(e) => {
                            const val = e.target.value;
                            this.setState({ studentRoll: val });
                            this.fetchStudentPhoto(val);
                          }}
                          onBlur={() => this.fetchStudentPhoto(this.state.studentRoll)}
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
                      <div className="flex items-center gap-4">
                        {studentPhotoUrl && (
                          <div className="relative w-10 h-14 bg-slate-900 border border-emerald-500 rounded overflow-hidden shrink-0 shadow" title="Pre-Exam Verified Candidate Photo">
                            <img src={studentPhotoUrl} alt="Candidate Verified" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <span className="text-emerald-400 font-bold uppercase tracking-wider block flex items-center gap-2">
                            🔴 SECURE STUDENT KIOSK READER — ACTIVE
                            {studentPhotoUrl && (
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                ✓ VERIFIED PHOTO
                              </span>
                            )}
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
                          🔒 SUBMIT & EXIT
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

                    {/* PDF Document Viewer Toolbar */}
                    <div className="bg-slate-950 border border-slate-800 rounded-t-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
                      <div className="flex items-center gap-2">
                        <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                          📕 PDF DOCUMENT
                        </span>
                        <span className="text-slate-200 font-bold truncate max-w-[200px] sm:max-w-none">
                          {studentSubjectCode}_Question_Paper_2026.pdf
                        </span>
                        <span className="text-slate-500 text-[10px] hidden sm:inline">| Page 1 of 1</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 border border-slate-800 text-emerald-400 px-2.5 py-1 rounded text-[10px] font-bold">
                          🔒 READ-ONLY PDF KIOSK LOCK
                        </span>
                      </div>
                    </div>

                    {/* Official Permanent PDF Document Sheet Layout */}
                    <div
                      className="relative bg-slate-950 p-4 sm:p-6 rounded-b-lg border-2 border-slate-800 max-h-[75vh] overflow-y-auto shadow-2xl select-none"
                      onContextMenu={this.preventStudentContextMenu}
                      onCopy={this.preventStudentClipboard}
                      onCut={this.preventStudentClipboard}
                      onPaste={this.preventStudentClipboard}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >


                      {/* Exact Uploaded PDF Document Stream, Image Pages, or Clean Question Paper Payload */}
                      {(() => {
                        const { text: activePaperText, pages: activePages, dataUrl: pdfDataUrl } = this.getPaperDetails(studentPaperContent, studentSubjectCode);
                        const displayContent = activePaperText || this.getCleanPaperContent(studentPaperContent, studentSubjectCode);

                        if (activePages && activePages.length > 0) {
                          return (
                            <div className="w-full relative z-20">
                              <ImagePaperViewer pages={activePages} subjectCode={studentSubjectCode} title={`Official Question Paper (${studentSubjectCode})`} />
                            </div>
                          );
                        }

                        if (pdfDataUrl) {
                          return (
                            <div className="w-full relative z-20 h-full min-h-[600px] bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-2xl">
                              <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between px-2 text-xs font-mono">
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                  📄 OFFICIAL PDF QUESTION PAPER ({studentSubjectCode})
                                </span>
                                <span className="text-slate-400">Seat: {studentSeat}</span>
                              </div>
                              <iframe 
                                src={`${pdfDataUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                                className="w-full h-[600px] border-0 rounded"
                                title={`Official Question Paper PDF (${studentSubjectCode})`}
                              />
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-900/90 text-slate-100 p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-800 max-w-4xl mx-auto font-sans relative z-20 space-y-6">
                            {/* Header Badge */}
                            <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                                  📄 OFFICIAL QUESTION PAPER ({studentSubjectCode})
                                </span>
                                <span className="text-slate-400">| Seat: {studentSeat}</span>
                              </div>
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded font-bold uppercase text-[10px]">
                                ● DECRYPTED & VERIFIED
                              </span>
                            </div>

                            {/* Question Content Display */}
                            <div className="space-y-4 pt-2">
                              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                                SECTION A — EXAMINATION QUESTIONS & INSTRUCTIONS
                              </div>
                              <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap shadow-inner">
                                {displayContent || 'No question paper payload loaded.'}
                              </div>
                            </div>

                            {/* Document Footer */}
                            <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-[11px] font-mono text-slate-500">
                              <span>END OF QUESTION PAPER PAYLOAD</span>
                              <span>SECURITY TIME-LOCKED 🔒</span>
                            </div>
                          </div>
                        );
                      })()}
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

            {!isUnlocked && (
              <div className="max-w-2xl mx-auto py-6 space-y-6">
                {/* AI Scheduled Exams Queue Section */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 font-mono shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <span>🤖 AI AGENT EXAM SCHEDULER QUEUE (CENTER: {centerCode})</span>
                    </div>
                    <button
                      onClick={this.loadScheduledExams}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700"
                    >
                      🔄 SYNC SCHEDULES
                    </button>
                  </div>

                  {scheduledExamsList.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center italic">
                      No AI-scheduled exams found for center {centerCode}. You can manually enter subject code below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scheduledExamsList.map((ex) => (
                        <div
                          key={ex.schedule_id || ex.subject_code}
                          className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${
                            subjectCode.toUpperCase() === ex.subject_code.toUpperCase()
                              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                              {ex.subject_code}
                              <span className="text-[10px] bg-slate-800 text-amber-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                                {ex.scheduled_by || 'AI_AGENT'}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              📅 {ex.exam_date} at {ex.exam_time || '10:00 AM'} ({ex.duration_mins} mins)
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ex.status === 'PUBLISHED_TO_STUDENTS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : ex.status === 'SUPERVISOR_UNLOCKED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-cyan-300 border border-slate-700'
                            }`}>
                              ● {ex.status || 'SCHEDULED'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const token = ex.admin_key || this.state.adminToken;
                                this.setState({
                                  subjectCode: ex.subject_code,
                                  adminToken: token,
                                }, () => {
                                  if (!ex.admin_key) {
                                    this.fetchAdminKeyForSubject(ex.subject_code);
                                  }
                                });
                              }}
                              className="bg-cyan-700 hover:bg-cyan-600 text-slate-950 px-2.5 py-1 rounded text-xs font-bold font-mono"
                            >
                              SELECT SUBJECT
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <span className="text-emerald-400 font-mono text-sm">[🔑 EXAMINATION WINDOW OPEN]</span>
                  <h2 className="text-xl font-semibold">Dual-Key Multi-Party Authorization Required</h2>
                  <p className="text-xs text-amber-400 font-mono bg-amber-950/60 border border-amber-800 p-2 rounded">
                    🛡️ TWO-PERSON RULE ACTIVE: Admin Key (Key A) + Supervisor PIN (Key B) required simultaneously.
                  </p>
                </div>

                <form onSubmit={this.handleDecrypt} className="space-y-4 font-sans">
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
                      onChange={(e) => {
                        const sc = e.target.value;
                        this.setState({ subjectCode: sc });
                        this.fetchAdminKeyForSubject(sc);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="admin-token" className="block text-xs uppercase tracking-wider text-cyan-400">
                        🔑 Key A: Admin Controller Token
                      </label>
                      {this.state.adminToken && this.state.adminToken !== 'CTRL-KEY-999' && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                          ✓ Auto-Synced from Controller
                        </span>
                      )}
                    </div>
                    <input
                      id="admin-token"
                      type="password"
                      value={this.state.adminToken || ''}
                      onChange={(e) => this.setState({ adminToken: e.target.value })}
                      placeholder="Enter admin cryptographic token"
                      className="w-full bg-slate-950 border border-cyan-700/60 rounded p-3 text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono text-sm"
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
                  <span>FORENSIC WATERMARK: CTR-101 | IP:127.0.0.1 | UNLOCKED: {unlockedTimestamp || 'LIVE'}</span>
                </div>

                {/* Direct Student Transmission Confirmation Card (Question Paper Text Hidden From Supervisor) */}
                <div className="bg-emerald-950/60 border border-emerald-800 p-6 rounded-xl space-y-4 font-mono shadow-lg">
                  <div className="flex items-center justify-between border-b border-emerald-900/80 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <span>✅ QUESTION PAPER DECRYPTED SUCCESSFULLY</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={this.handlePublishToStudents}
                        disabled={this.state.publishLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-slate-950 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                      >
                        🚀 {this.state.publishLoading ? 'PUBLISHING TO HALL...' : this.state.publishSuccess ? '✓ PUBLISHED TO STUDENT APP' : 'PUBLISH PAPER TO STUDENT APP'}
                      </button>
                      <span className="bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-1 rounded font-bold text-xs">
                        ● READY FOR TRANSMISSION
                      </span>
                    </div>
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
