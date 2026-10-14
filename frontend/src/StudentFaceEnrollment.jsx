import React from 'react';
import * as faceapi from 'face-api.js';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';
const MODELS_URL = '/models';

export default class StudentFaceEnrollment extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rollNumber: '',
      studentName: '',
      modelsLoaded: false,
      modelsLoading: true,
      modelError: '',
      isCameraActive: false,
      cameraError: '',
      capturedImage: null,
      faceDetected: false,
      liveDetectionStatus: '', // 'FACE_FOUND' | 'NO_FACE'
      enrolling: false,
      enrollResult: null,
      errorMessage: '',
    };
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.mediaStream = null;
    this.detectionInterval = null;
  }

  componentDidMount() {
    this.loadModels();
  }

  componentWillUnmount() {
    this.stopCamera();
    if (this.detectionInterval) clearInterval(this.detectionInterval);
  }

  loadModels = async () => {
    this.setState({ modelsLoading: true, modelError: '' });
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      this.setState({ modelsLoaded: true, modelsLoading: false });
    } catch (err) {
      this.setState({ modelsLoading: false, modelError: `Failed to load models: ${err.message}` });
    }
  };

  startCamera = async () => {
    this.setState({ cameraError: '', capturedImage: null, faceDetected: false });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.mediaStream = stream;
      this.setState({ isCameraActive: true }, () => {
        if (this.videoRef.current) {
          this.videoRef.current.srcObject = stream;
          this.videoRef.current.play().catch(() => {});
          this.startLiveFaceDetection();
        }
      });
    } catch (err) {
      this.setState({ cameraError: `Camera Error: ${err.message}` });
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
    this.setState({ isCameraActive: false, liveDetectionStatus: '' });
  };

  startLiveFaceDetection = () => {
    this.detectionInterval = setInterval(async () => {
      if (!this.videoRef.current || !this.state.modelsLoaded) return;
      try {
        const detection = await faceapi
          .detectSingleFace(this.videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        this.setState({
          faceDetected: !!detection,
          liveDetectionStatus: detection ? 'FACE_FOUND' : 'NO_FACE',
        });
      } catch {}
    }, 600);
  };

  captureDescriptor = async () => {
    const video = this.videoRef.current;
    const canvas = this.canvasRef.current || document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, 320, 400);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      this.setState({ errorMessage: 'No face detected. Position face clearly in frame.' });
      return null;
    }

    this.setState({ capturedImage: imageDataUrl });
    this.stopCamera();
    return Array.from(detection.descriptor);
  };

  handleEnroll = async () => {
    const { rollNumber, studentName } = this.state;
    if (!rollNumber.trim()) {
      this.setState({ errorMessage: 'Roll Number is required.' });
      return;
    }

    this.setState({ enrolling: true, errorMessage: '', enrollResult: null });

    let descriptor;
    try {
      descriptor = await this.captureDescriptor();
    } catch (err) {
      this.setState({ enrolling: false, errorMessage: `Capture failed: ${err.message}` });
      return;
    }

    if (!descriptor) {
      this.setState({ enrolling: false });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/enroll-student-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: rollNumber.trim().toUpperCase(),
          student_name: studentName.trim(),
          face_descriptor: descriptor,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Enrollment failed.');

      this.setState({ enrollResult: data, enrolling: false });
    } catch (err) {
      this.setState({ errorMessage: err.message, enrolling: false });
    }
  };

  resetEnrollment = () => {
    this.setState({
      rollNumber: '',
      studentName: '',
      capturedImage: null,
      faceDetected: false,
      enrollResult: null,
      errorMessage: '',
    });
  };

  render() {
    const {
      rollNumber,
      studentName,
      modelsLoaded,
      modelsLoading,
      modelError,
      isCameraActive,
      cameraError,
      capturedImage,
      faceDetected,
      enrolling,
      enrollResult,
      errorMessage,
      liveDetectionStatus,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans">
        <canvas ref={this.canvasRef} className="hidden" />

        <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div>
              <h1 className="font-bold text-xl text-purple-400">
                🧠 STUDENT FACE ENROLLMENT TERMINAL
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Register student 128-point face descriptor into database linked to Roll Number
              </p>
            </div>
            {modelsLoaded && (
              <span className="bg-purple-950 border border-purple-800 text-purple-300 text-xs px-3 py-1 rounded font-mono font-bold">
                ● MODELS READY
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {modelsLoading && (
              <div className="bg-slate-950 border border-purple-900 rounded-lg p-4 text-center font-mono text-purple-300 text-sm animate-pulse">
                ⚙️ Loading face recognition AI models...
              </div>
            )}

            {modelError && (
              <div className="bg-red-950 border border-red-800 text-red-300 p-3 rounded-lg text-xs font-mono">
                ❌ {modelError}
              </div>
            )}

            {enrollResult ? (
              <div className="bg-slate-950 border-2 border-purple-500 rounded-xl p-6 space-y-4 font-mono">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <span className="text-3xl">✅</span>
                  <div>
                    <h2 className="text-purple-400 font-bold text-lg">FACE ENROLLED SUCCESSFULLY</h2>
                    <p className="text-slate-400 text-xs">128-point face descriptor saved to database</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Roll Number</span>
                    <span className="text-purple-400 font-bold text-sm">{enrollResult.roll_number}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Student Name</span>
                    <span className="text-slate-100 font-bold">{enrollResult.student_name || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800 col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase">Face Points Stored</span>
                    <span className="text-emerald-400 font-bold">
                      {enrollResult.descriptor_length} embedding points saved to DB ✅
                    </span>
                  </div>
                </div>

                {capturedImage && (
                  <div className="flex justify-center">
                    <div className="border-2 border-purple-500 rounded overflow-hidden" style={{ width: 100, height: 130 }}>
                      <img src={capturedImage} alt="Enrolled" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <button
                  onClick={this.resetEnrollment}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                >
                  🔄 ENROLL NEXT STUDENT
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Camera Section */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
                  <h3 className="text-purple-400 font-bold text-sm uppercase border-b border-slate-800 pb-2">
                    1. Live Face Capture
                  </h3>

                  {cameraError && (
                    <div className="bg-red-950 border border-red-800 text-red-300 p-2 rounded text-xs">
                      {cameraError}
                    </div>
                  )}

                  {isCameraActive && (
                    <div className={`text-xs font-bold px-3 py-1.5 rounded border font-mono text-center ${
                      liveDetectionStatus === 'FACE_FOUND' ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                      {liveDetectionStatus === 'FACE_FOUND'
                        ? '✅ FACE DETECTED — Ready to capture'
                        : '👁️ Searching for face...'}
                    </div>
                  )}

                  <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {capturedImage ? (
                      <img src={capturedImage} alt="Captured" className="h-full object-contain" />
                    ) : isCameraActive ? (
                      <>
                        <video
                          ref={this.videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        {liveDetectionStatus === 'FACE_FOUND' && (
                          <div
                            className="absolute inset-0 border-4 border-emerald-400 rounded-lg pointer-events-none"
                            style={{ boxShadow: '0 0 20px rgba(52,211,153,0.5)' }}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-center space-y-2 p-4">
                        <div className="text-4xl">🧠</div>
                        <p className="text-xs text-slate-400">Start camera to capture face</p>
                      </div>
                    )}
                  </div>

                  <div>
                    {!capturedImage ? (
                      isCameraActive ? (
                        <button
                          onClick={this.handleEnroll}
                          disabled={!faceDetected || enrolling || !modelsLoaded}
                          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 rounded text-xs transition-colors"
                        >
                          {enrolling
                            ? '⏳ EXTRACTING & SAVING...'
                            : faceDetected
                            ? '📸 CAPTURE & ENROLL FACE'
                            : '👁️ POSITION FACE IN FRAME'}
                        </button>
                      ) : (
                        <button
                          onClick={this.startCamera}
                          disabled={!modelsLoaded}
                          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-2.5 rounded text-xs transition-colors"
                        >
                          📹 START CAMERA
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() =>
                          this.setState({ capturedImage: null, faceDetected: false }, this.startCamera)
                        }
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-2 rounded text-xs"
                      >
                        🔄 RETAKE
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 font-mono">
                  <h3 className="text-emerald-400 font-bold text-sm uppercase border-b border-slate-800 pb-2">
                    2. Student Details
                  </h3>

                  {errorMessage && (
                    <div className="bg-red-950 border border-red-800 text-red-300 p-2.5 rounded text-xs">
                      ❌ {errorMessage}
                    </div>
                  )}

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[11px] uppercase mb-1">
                        Roll Number *
                      </label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => this.setState({ rollNumber: e.target.value })}
                        placeholder="e.g. 2026-CS-101"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 text-slate-100 font-bold uppercase focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] uppercase mb-1">
                        Student Name
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => this.setState({ studentName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-purple-900/60 rounded p-3 text-xs text-purple-300 space-y-1">
                    <p className="font-bold">ℹ️ HOW IT WORKS</p>
                    <ol className="text-slate-400 text-[10px] leading-relaxed space-y-1 list-decimal list-inside">
                      <li>Fill roll number + student name</li>
                      <li>Start camera — AI detects face live</li>
                      <li>Green border = face ready to capture</li>
                      <li>Click capture → 128 face points saved to DB</li>
                      <li>Used in pre-exam verification to match face</li>
                    </ol>
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
