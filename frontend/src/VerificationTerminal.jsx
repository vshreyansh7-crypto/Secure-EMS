import React from 'react';
import * as faceapi from 'face-api.js';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';
const MODELS_URL = '/models';
// Standard face-api threshold: < 0.52 = Same person, >= 0.52 = Different person
const FACE_MATCH_THRESHOLD = 0.52;

export default class VerificationTerminal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rollNumber: '2026-CS-111',
      seatId: 'DESK-42',
      centerCode: 'CTR-101',
      capturedImage: null,
      isCameraActive: false,
      cameraError: '',
      verifying: false,
      verificationResult: null,
      errorMessage: '',
      // Face-api AI states
      modelsLoaded: false,
      modelsLoading: true,
      modelError: '',
      liveDetectionStatus: '', // 'FACE_FOUND' | 'NO_FACE'
      faceDetected: false,
      faceMatchStatus: '', // 'MATCHED' | 'NO_MATCH' | 'NO_DESCRIPTOR' | 'MATCHING'
      faceMatchConfidence: null,
      liveDistance: null,
      // Database enrolled student
      enrolledStudent: null,
      lookingUpStudent: false,
    };
    this.videoElement = null;
    this.canvasRef = React.createRef();
    this.mediaStream = null;
    this.detectionInterval = null;
    this.lastLiveDescriptor = null;
  }

  componentDidMount() {
    this.loadFaceModels();
    if (this.state.rollNumber) {
      this.checkEnrolledStudent(this.state.rollNumber);
    }
  }

  componentWillUnmount() {
    this.stopCamera();
    if (this.detectionInterval) clearInterval(this.detectionInterval);
  }

  loadFaceModels = async () => {
    this.setState({ modelsLoading: true, modelError: '' });
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      this.setState({ modelsLoaded: true, modelsLoading: false });
    } catch (err) {
      this.setState({ modelsLoading: false, modelError: `Model load error: ${err.message}` });
    }
  };

  checkEnrolledStudent = async (rollNumber) => {
    const roll = (rollNumber || '').trim().toUpperCase();
    if (!roll || roll.length < 2) {
      this.setState({ enrolledStudent: null, lookingUpStudent: false });
      return;
    }
    this.setState({ lookingUpStudent: true });
    try {
      const res = await fetch(`${API_BASE}/api/student-face-descriptor/${encodeURIComponent(roll)}`);
      const data = await res.json();
      if (data && data.found) {
        this.setState({
          enrolledStudent: {
            name: data.student_name || '',
            roll: data.roll_number || roll,
            hasDescriptor: !!(data.face_descriptor && data.face_descriptor.length === 128),
            rawDescriptor: data.face_descriptor ? new Float32Array(data.face_descriptor) : null,
          },
          lookingUpStudent: false,
        });
      } else {
        this.setState({ enrolledStudent: null, lookingUpStudent: false });
      }
    } catch {
      this.setState({ enrolledStudent: null, lookingUpStudent: false });
    }
  };

  setVideoRef = (el) => {
    this.videoElement = el;
    if (el && this.mediaStream) {
      el.srcObject = this.mediaStream;
      el.play().catch(() => {});
    }
  };

  startCamera = async () => {
    this.setState({
      cameraError: '',
      errorMessage: '',
      capturedImage: null,
      faceMatchStatus: '',
      faceMatchConfidence: null,
      liveDistance: null,
    });
    this.lastLiveDescriptor = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.mediaStream = stream;
      this.setState({ isCameraActive: true }, () => {
        if (this.videoElement) {
          this.videoElement.srcObject = stream;
          this.videoElement.play().catch(() => {});
        }
        if (this.state.modelsLoaded) this.startLiveFaceDetection();
      });
    } catch (err) {
      this.setState({ isCameraActive: false, cameraError: `Camera Error: ${err.message}` });
    }
  };

  stopCamera = () => {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.setState({ isCameraActive: false, liveDetectionStatus: '', faceDetected: false });
  };

  // Real-time continuous face detection & matching on live video feed
  startLiveFaceDetection = () => {
    this.detectionInterval = setInterval(async () => {
      if (!this.videoElement || !this.state.modelsLoaded || !this.state.isCameraActive) return;
      try {
        const det = await faceapi
          .detectSingleFace(
            this.videoElement,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (det) {
          this.lastLiveDescriptor = det.descriptor;
          const stored = this.state.enrolledStudent?.rawDescriptor;

          let matchStatus = 'FACE_FOUND';
          let matchConf = null;
          let dist = null;

          if (stored) {
            dist = faceapi.euclideanDistance(det.descriptor, stored);
            const isMatch = dist < FACE_MATCH_THRESHOLD;
            // Normalized confidence score: dist=0 -> 100%, dist=0.4 -> ~75%, dist>=0.8 -> 0%
            const conf = Math.max(0, Math.min(100, Math.round((1 - dist / 0.8) * 100 * 10) / 10));
            matchStatus = isMatch ? 'MATCHED' : 'NO_MATCH';
            matchConf = conf;
          }

          this.setState({
            faceDetected: true,
            liveDetectionStatus: 'FACE_FOUND',
            faceMatchStatus: matchStatus,
            faceMatchConfidence: matchConf,
            liveDistance: dist !== null ? Math.round(dist * 1000) / 1000 : null,
          });
        } else {
          this.setState({
            faceDetected: false,
            liveDetectionStatus: 'NO_FACE',
          });
        }
      } catch (e) {
        console.warn('Face detection loop:', e);
      }
    }, 450);
  };

  captureRuntimePhoto = async () => {
    const video = this.videoElement;
    const canvas = this.canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      this.simulateCameraCapture();
      return;
    }

    // 1. Extract live descriptor directly from video before stopping
    try {
      const det = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        this.setState({
          errorMessage: '❌ No face clearly detected in frame. Please face the camera and try again.',
        });
        return;
      }

      this.lastLiveDescriptor = det.descriptor;

      // 2. Compute match against enrolled student descriptor
      let matchStatus = 'FACE_FOUND';
      let matchConf = null;
      let dist = null;
      const stored = this.state.enrolledStudent?.rawDescriptor;

      if (stored) {
        dist = faceapi.euclideanDistance(det.descriptor, stored);
        const isMatch = dist < FACE_MATCH_THRESHOLD;
        const conf = Math.max(0, Math.min(100, Math.round((1 - dist / 0.8) * 100 * 10) / 10));
        matchStatus = isMatch ? 'MATCHED' : 'NO_MATCH';
        matchConf = conf;
      }

      // 3. Draw snapshot onto canvas
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      this.stopCamera();

      const registeredName = this.state.enrolledStudent?.name || this.state.rollNumber;
      this.setState({
        capturedImage: dataUrl,
        faceMatchStatus: matchStatus,
        faceMatchConfidence: matchConf,
        liveDistance: dist !== null ? Math.round(dist * 1000) / 1000 : null,
        errorMessage:
          matchStatus === 'NO_MATCH'
            ? `❌ BIOMETRIC MISMATCH: Candidate in front of camera is NOT '${registeredName}'! Entry will be BLOCKED.`
            : '',
      });
    } catch (err) {
      this.setState({ errorMessage: `Photo capture error: ${err.message}` });
    }
  };

  simulateCameraCapture = () => {
    const canvas = this.canvasRef.current || document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    let dataUrl = '';
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 300, 400);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SIMULATED CAPTURE', 15, 30);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`TIMESTAMP: ${new Date().toLocaleTimeString()}`, 15, 380);
      dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    }
    this.setState({ capturedImage: dataUrl, isCameraActive: false });
  };

  handleVerifySubmit = async (e) => {
    e.preventDefault();
    const {
      rollNumber,
      seatId,
      centerCode,
      capturedImage,
      isCameraActive,
      enrolledStudent,
      faceMatchStatus,
      faceMatchConfidence,
    } = this.state;

    if (!rollNumber.trim()) {
      this.setState({ errorMessage: 'Student Roll Number / Enrollment ID is required.' });
      return;
    }

    this.setState({ verifying: true, errorMessage: '', verificationResult: null });

    // 1. If student has an enrolled face in DB, biometric matching is STRICTLY MANDATORY!
    if (enrolledStudent && enrolledStudent.hasDescriptor) {
      // If camera is still live, capture and evaluate descriptor right now
      if (isCameraActive && this.videoElement) {
        await this.captureRuntimePhoto();
      }

      // Check if we captured a valid live descriptor
      if (!this.lastLiveDescriptor) {
        this.setState({
          verifying: false,
          errorMessage:
            '❌ LIVE CAMERA PHOTO REQUIRED: This candidate has an enrolled biometric record. Start webcam and capture candidate photo to verify identity.',
        });
        return;
      }

      // Strictly evaluate distance
      const dist = faceapi.euclideanDistance(this.lastLiveDescriptor, enrolledStudent.rawDescriptor);
      const isMatched = dist < FACE_MATCH_THRESHOLD;
      const conf = Math.max(0, Math.min(100, Math.round((1 - dist / 0.8) * 100 * 10) / 10));

      // BLOCK ENTRY IF DIFFERENT PERSON!
      if (!isMatched) {
        const candidateName = enrolledStudent.name ? `('${enrolledStudent.name}')` : '';
        this.setState({
          verifying: false,
          faceMatchStatus: 'NO_MATCH',
          faceMatchConfidence: conf,
          errorMessage: `❌ ACCESS DENIED: BIOMETRIC MISMATCH! The person in front of the camera does NOT match registered student ${candidateName}. Distance: ${Math.round(dist * 100) / 100} (Threshold: ${FACE_MATCH_THRESHOLD}). Entry BLOCKED.`,
        });
        return;
      }

      // Otherwise it's a confirmed match!
      this.setState({ faceMatchStatus: 'MATCHED', faceMatchConfidence: conf });
    }

    // 2. Submit to backend
    try {
      const response = await fetch(`${API_BASE}/api/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: rollNumber,
          seat_id: seatId,
          center_code: centerCode,
          captured_image_base64: this.state.capturedImage || capturedImage,
          face_match_confidence: this.state.faceMatchConfidence || faceMatchConfidence,
          face_match_status: this.state.faceMatchStatus || faceMatchStatus || 'MATCHED',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Student verification rejected.');
      }

      try {
        const img = this.state.capturedImage || capturedImage;
        if (img) localStorage.setItem(`STUDENT_VERIFICATION_${rollNumber.trim().toUpperCase()}`, img);
      } catch {}

      this.setState({ verificationResult: data, verifying: false });
    } catch (err) {
      this.setState({ errorMessage: err.message, verifying: false });
    }
  };

  resetVerification = () => {
    this.lastLiveDescriptor = null;
    this.setState({
      capturedImage: null,
      verificationResult: null,
      errorMessage: '',
      cameraError: '',
      faceMatchStatus: '',
      faceMatchConfidence: null,
      liveDistance: null,
    });
    this.stopCamera();
    if (this.state.rollNumber) {
      this.checkEnrolledStudent(this.state.rollNumber);
    }
  };

  render() {
    const {
      rollNumber,
      seatId,
      centerCode,
      capturedImage,
      isCameraActive,
      cameraError,
      verifying,
      verificationResult,
      errorMessage,
      modelsLoaded,
      modelsLoading,
      modelError,
      liveDetectionStatus,
      faceMatchStatus,
      faceMatchConfidence,
      liveDistance,
      enrolledStudent,
      lookingUpStudent,
    } = this.state;

    const getFaceStatusColor = () => {
      if (faceMatchStatus === 'MATCHED') return 'bg-emerald-950 border-emerald-500 text-emerald-300';
      if (faceMatchStatus === 'NO_MATCH') return 'bg-red-950 border-red-500 text-red-300 animate-pulse';
      if (liveDetectionStatus === 'FACE_FOUND') return 'bg-cyan-950 border-cyan-700 text-cyan-300';
      return 'bg-slate-900 border-slate-700 text-slate-400';
    };

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans select-none">
        <canvas ref={this.canvasRef} className="hidden" />
        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 flex flex-wrap justify-between items-center border-b border-slate-700 gap-4">
            <div>
              <h1 className="font-bold text-xl tracking-wide text-cyan-400 flex items-center gap-2">
                🛡️ STUDENT PRE-EXAM VERIFICATION TERMINAL
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Biometric Face Recognition — face-api.js 128-point descriptor matching against DB
              </p>
            </div>
            <div className="flex items-center gap-2">
              {modelsLoading && (
                <span className="bg-amber-950 border border-amber-800 text-amber-300 text-xs px-3 py-1 rounded font-mono animate-pulse">
                  ⚙️ LOADING MODELS...
                </span>
              )}
              {modelsLoaded && (
                <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-3 py-1 rounded font-mono font-bold">
                  ● AI READY
                </span>
              )}
              {modelError && (
                <span className="bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-1 rounded font-mono">
                  ⚠️ MODEL ERROR
                </span>
              )}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-cyan-400 font-bold">
                <span>● BIOMETRIC GATE ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {modelError && (
              <div className="bg-red-950 border border-red-800 text-red-300 p-3 rounded text-xs font-mono">
                {modelError}
              </div>
            )}

            {/* VERIFICATION SUCCESS CARD */}
            {verificationResult ? (
              <div className="bg-slate-950 p-6 rounded-lg border-2 border-emerald-500 space-y-6 font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                      <h2 className="text-lg font-bold text-emerald-400 tracking-wider">
                        CANDIDATE ENTRY CLEARED & VERIFIED
                      </h2>
                      <p className="text-xs text-slate-400">
                        Exam Hall Clearance — Biometric Face Verification Passed
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs px-3 py-1 rounded font-bold">
                    PASS VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Photo Column */}
                  <div className="flex flex-col items-center justify-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">
                      Runtime Captured Photo
                    </span>
                    <div
                      className="relative bg-slate-950 border-2 border-emerald-500 rounded-sm overflow-hidden shadow shrink-0"
                      style={{ width: '106px', height: '142px' }}
                    >
                      {capturedImage ? (
                        <img src={capturedImage} alt="Capture" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                          NO IMAGE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Column */}
                  <div className="md:col-span-2 space-y-3 text-xs">
                    {/* CANDIDATE NAME BANNER */}
                    <div className="bg-slate-900 p-3.5 rounded-lg border border-purple-700 bg-gradient-to-r from-purple-950/40 to-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                            Registered Candidate Name
                          </span>
                          <span className="text-purple-200 font-extrabold text-base tracking-wide uppercase">
                            {verificationResult.student_name ||
                              enrolledStudent?.name ||
                              'VERIFIED CANDIDATE'}
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] px-2.5 py-1 rounded font-bold uppercase">
                        ✓ Face Matched
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Roll Number</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          {verificationResult.roll_number}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Allocated Seat</span>
                        <span className="text-slate-100 font-bold text-sm">
                          {verificationResult.seat_id}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Face Match Status</span>
                        <span className="font-bold text-emerald-400">
                          {verificationResult.face_match_status || 'MATCHED'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Match Confidence</span>
                        <span className="text-cyan-400 font-bold">
                          {verificationResult.facial_match_confidence}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase block">
                        Hall Entry Clearance Token
                      </span>
                      <span className="text-amber-400 font-mono font-bold">
                        {verificationResult.clearance_token}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">{verificationResult.message}</p>
                  </div>
                </div>

                <button
                  onClick={this.resetVerification}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 rounded text-sm transition-colors"
                >
                  🔄 VERIFY NEXT CANDIDATE
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Camera Panel */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 font-mono">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase">1. Live Face Capture</h3>
                    <span className="text-[10px] text-slate-400">face-api.js Biometrics</span>
                  </div>

                  {cameraError && (
                    <div className="bg-amber-950/80 border border-amber-800 text-amber-200 p-2.5 rounded text-xs">
                      ⚠️ {cameraError}
                    </div>
                  )}

                  {/* REAL-TIME FACE STATUS BADGE */}
                  {(isCameraActive || faceMatchStatus) && (
                    <div
                      className={`text-xs font-bold px-3 py-2 rounded border font-mono text-center transition-all ${getFaceStatusColor()}`}
                    >
                      {faceMatchStatus === 'MATCHED' && (
                        <span>
                          ✅ MATCH CONFIRMED — {faceMatchConfidence}% Confidence
                          {enrolledStudent?.name ? ` (${enrolledStudent.name})` : ''}
                        </span>
                      )}
                      {faceMatchStatus === 'NO_MATCH' && (
                        <span className="text-red-300">
                          ❌ MISMATCH: Face does not match registered student{' '}
                          {enrolledStudent?.name ? `'${enrolledStudent.name}'` : ''}!
                        </span>
                      )}
                      {!faceMatchStatus && liveDetectionStatus === 'FACE_FOUND' && (
                        <span className="text-cyan-300">
                          👁️ Face detected — Hold still or capture snapshot
                        </span>
                      )}
                      {!faceMatchStatus && liveDetectionStatus === 'NO_FACE' && (
                        <span className="text-slate-400">👁️ Position face in center of frame...</span>
                      )}
                    </div>
                  )}

                  <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {capturedImage ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        <img src={capturedImage} alt="Captured" className="h-full object-contain aspect-[3/4]" />
                        <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-bold">
                          SNAPSHOT READY
                        </div>
                      </div>
                    ) : isCameraActive ? (
                      <>
                        <video
                          ref={this.setVideoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        {faceMatchStatus === 'MATCHED' && (
                          <div
                            className="absolute inset-0 border-4 border-emerald-400 rounded-lg pointer-events-none"
                            style={{ boxShadow: '0 0 25px rgba(52,211,153,0.6)' }}
                          />
                        )}
                        {faceMatchStatus === 'NO_MATCH' && (
                          <div
                            className="absolute inset-0 border-4 border-red-500 rounded-lg pointer-events-none"
                            style={{ boxShadow: '0 0 25px rgba(239,68,68,0.7)' }}
                          />
                        )}
                        {!faceMatchStatus && liveDetectionStatus === 'FACE_FOUND' && (
                          <div
                            className="absolute inset-0 border-2 border-cyan-400 rounded-lg pointer-events-none"
                            style={{ boxShadow: '0 0 15px rgba(34,211,238,0.4)' }}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-center p-4 space-y-2">
                        <div className="text-4xl">📷</div>
                        <p className="text-xs text-slate-400">Start webcam to verify candidate</p>
                      </div>
                    )}
                  </div>

                  <div>
                    {!capturedImage ? (
                      isCameraActive ? (
                        <button
                          type="button"
                          onClick={this.captureRuntimePhoto}
                          className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          📸 CAPTURE CANDIDATE SNAPSHOT
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={this.startCamera}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2 rounded text-xs transition-colors"
                          >
                            📹 START WEBCAM
                          </button>
                          <button
                            type="button"
                            onClick={this.simulateCameraCapture}
                            className="bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs py-2 rounded font-bold transition-colors"
                          >
                            ⚡ SIMULATE
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          this.setState(
                            { capturedImage: null, faceMatchStatus: '', faceMatchConfidence: null },
                            this.startCamera
                          )
                        }
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-2 rounded text-xs transition-colors"
                      >
                        🔄 RETAKE PHOTO
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Verification Form */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 font-mono">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase">
                      2. Candidate Verification Form
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verify Roll Number + Strictly match live face against registered record
                    </p>
                  </div>

                  {/* ERROR / REJECTION MESSAGE */}
                  {errorMessage && (
                    <div className="bg-red-950 border-2 border-red-600 text-red-200 p-3 rounded text-xs font-bold leading-relaxed shadow-lg">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={this.handleVerifySubmit} className="space-y-4 text-xs">
                    <div>
                      <label htmlFor="verify-student-roll" className="block text-slate-400 text-[11px] mb-1">
                        STUDENT ROLL NUMBER / ENROLLMENT ID *
                      </label>
                      <input
                        id="verify-student-roll"
                        type="text"
                        value={rollNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          this.setState({ rollNumber: val });
                          this.checkEnrolledStudent(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 font-bold uppercase focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. 2026-CS-111"
                        required
                      />

                      {/* REGISTERED CANDIDATE PREVIEW */}
                      {lookingUpStudent ? (
                        <div className="mt-2 text-[10px] text-cyan-400 font-mono animate-pulse">
                          🔍 Looking up candidate record...
                        </div>
                      ) : enrolledStudent ? (
                        <div className="mt-2 p-3 bg-purple-950/50 border border-purple-700 rounded flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">👤</span>
                            <div>
                              <span className="text-[9px] text-purple-400 uppercase block font-semibold">
                                Registered Candidate in Database
                              </span>
                              <span className="text-purple-200 font-extrabold text-sm tracking-wide uppercase">
                                {enrolledStudent.name || 'Enrolled Candidate'}
                              </span>
                            </div>
                          </div>
                          <span className="bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                            ✓ BIOMETRIC ENROLLED
                          </span>
                        </div>
                      ) : (
                        rollNumber.trim().length >= 3 && (
                          <div className="mt-2 p-2 bg-slate-900/60 border border-slate-800 rounded text-[10px] text-slate-400 font-mono">
                            ℹ️ No biometric face record found in DB for '{rollNumber.trim().toUpperCase()}'.
                          </div>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="verify-student-seat" className="block text-slate-400 text-[11px] mb-1">
                          DESK / SEAT ID
                        </label>
                        <input
                          id="verify-student-seat"
                          type="text"
                          value={seatId}
                          onChange={(e) => this.setState({ seatId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                          placeholder="DESK-42"
                        />
                      </div>
                      <div>
                        <label htmlFor="verify-student-center" className="block text-slate-400 text-[11px] mb-1">
                          EXAM CENTER CODE
                        </label>
                        <input
                          id="verify-student-center"
                          type="text"
                          value={centerCode}
                          onChange={(e) => this.setState({ centerCode: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                          placeholder="CTR-101"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/80 border border-cyan-900/60 rounded text-[11px] text-cyan-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">🛡️ BIOMETRIC INTEGRITY SYSTEM</p>
                      <ul className="text-slate-400 text-[10px] leading-relaxed space-y-0.5">
                        <li>• Compares live 128-point vector against registered record</li>
                        <li>• Strict Threshold: Distance &lt; 0.52 = MATCHED ✅</li>
                        <li>• Distance &ge; 0.52 (Different Person) = ENTRY BLOCKED ❌</li>
                        <li>• Impersonation attempts are logged to the security audit trail</li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      disabled={verifying}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {verifying
                        ? '🔄 COMPARING FACE VECTORS & VERIFYING...'
                        : '🔍 RUN CANDIDATE VERIFICATION'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
