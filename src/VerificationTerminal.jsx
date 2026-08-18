import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class VerificationTerminal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      rollNumber: '2026-CS-101',
      seatId: 'DESK-42',
      centerCode: 'CTR-101',
      capturedImage: null,
      isCameraActive: false,
      cameraError: '',
      verifying: false,
      verificationResult: null,
      errorMessage: '',
    };

    this.videoElement = null;
    this.canvasRef = React.createRef();
    this.mediaStream = null;
  }

  componentWillUnmount() {
    this.stopCamera();
  }

  setVideoRef = (el) => {
    this.videoElement = el;
    if (el && this.mediaStream) {
      el.srcObject = this.mediaStream;
      el.play().catch((err) => console.warn('Video play error:', err));
    }
  };

  startCamera = async () => {
    this.setState({ cameraError: '', errorMessage: '' });
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch (e1) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        this.mediaStream = stream;
        this.setState({ isCameraActive: true }, () => {
          if (this.videoElement) {
            this.videoElement.srcObject = stream;
            this.videoElement.play().catch(() => {});
          }
        });
      } else {
        throw new Error('Webcam media Devices API is not available in this browser environment.');
      }
    } catch (err) {
      console.error('Camera error:', err);
      this.setState({
        isCameraActive: false,
        cameraError: `Camera Error: ${err.message || 'Permission denied or webcam missing'}. Click 'SIMULATE CAPTURE' below to test runtime photo capture.`,
      });
    }
  };

  stopCamera = () => {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.setState({ isCameraActive: false });
  };

  captureRuntimePhoto = () => {
    const video = this.videoElement;
    const canvas = this.canvasRef.current;

    if (video && canvas && video.videoWidth > 0) {
      canvas.width = 300;
      canvas.height = 400; // 3:4 aspect ratio
      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      } catch (e) {}

      this.setState({ capturedImage: dataUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="%230f172a"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="14">🔴 WEBCAM CAPTURED</text></svg>' });
      this.stopCamera();
    } else {
      this.simulateCameraCapture();
    }
  };

  simulateCameraCapture = () => {
    let dataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="%230f172a"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="14">🔴 RUNTIME WEBCAM CAPTURE</text></svg>';
    try {
      const canvas = this.canvasRef.current || document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      let ctx = null;
      try {
        if (canvas.getContext) {
          ctx = canvas.getContext('2d');
        }
      } catch (e) {
        ctx = null;
      }

      if (ctx) {
        // Draw background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 300, 400);

        // Draw grid overlay
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 300; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 400);
          ctx.stroke();
        }
        for (let y = 0; y < 400; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(300, y);
          ctx.stroke();
        }

        // Draw simulated candidate portrait silhouette
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(150, 150, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(150, 340, 110, 0, Math.PI * 2);
        ctx.fill();

        // Draw camera watermark & timestamp
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('🔴 RUNTIME WEBCAM CAPTURE', 15, 30);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`TIMESTAMP: ${new Date().toLocaleTimeString()}`, 15, 380);

        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      }
    } catch (err) {
      console.warn('Canvas 2d context unavailable, using fallback data URL');
    }

    this.setState({ capturedImage: dataUrl, isCameraActive: false, cameraError: '' });
  };

  handleVerifySubmit = async (e) => {
    e.preventDefault();
    const { rollNumber, seatId, centerCode, capturedImage } = this.state;

    if (!rollNumber.trim()) {
      this.setState({ errorMessage: 'Student Roll Number / Enrollment ID is required.' });
      return;
    }

    this.setState({ verifying: true, errorMessage: '', verificationResult: null });

    try {
      const response = await fetch(`${API_BASE}/api/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: rollNumber,
          seat_id: seatId,
          center_code: centerCode,
          captured_image_base64: capturedImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Student verification failed.');
      }

      const data = await response.json();
      this.setState({ verificationResult: data, verifying: false });
    } catch (err) {
      this.setState({ errorMessage: err.message, verifying: false });
    }
  };

  resetVerification = () => {
    this.setState({
      capturedImage: null,
      verificationResult: null,
      errorMessage: '',
      cameraError: '',
    });
    this.stopCamera();
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
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center font-sans select-none">
        <canvas ref={this.canvasRef} className="hidden" />

        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header Bar */}
          <div className="bg-slate-950 px-6 py-4 flex flex-wrap justify-between items-center border-b border-slate-700 gap-4">
            <div>
              <h1 className="font-bold text-xl tracking-wide text-cyan-400 flex items-center gap-2">
                🛡️ STUDENT PRE-EXAM VERIFICATION TERMINAL
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Mandatory Candidate Gate Clearance System — Biometric Image & Enrollment Verification
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-cyan-400 font-bold">
              <span>● BIOMETRIC GATE ACTIVE</span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {verificationResult ? (
              /* Verified Clearance Pass Screen */
              <div className="bg-slate-950 p-6 rounded-lg border-2 border-emerald-500/80 space-y-6 font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                      <h2 className="text-lg font-bold text-emerald-400 tracking-wider">
                        CANDIDATE ENTRY CLEARED & VERIFIED
                      </h2>
                      <p className="text-xs text-slate-400">
                        Exam Hall Clearance Pass Issued — Verified via College DB & Runtime Image
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-3 py-1 rounded font-bold">
                    PASS VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Captured Photo Preview Frame */}
                  <div className="flex flex-col items-center justify-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">
                      Runtime Captured Photo (3:4)
                    </span>
                    <div
                      className="relative bg-slate-950 border-2 border-emerald-500 rounded-sm overflow-hidden shadow shrink-0"
                      style={{ width: '106px', height: '142px' }}
                    >
                      {capturedImage ? (
                        <img src={capturedImage} alt="Runtime Capture" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4ebd0] text-slate-800 text-center p-1">
                          <span className="text-[10px] font-bold">NO IMAGE</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Attributes Table */}
                  <div className="md:col-span-2 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Enrollment / Roll Number</span>
                        <span className="text-emerald-400 font-bold text-sm">{verificationResult.roll_number}</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Allocated Seat / Desk</span>
                        <span className="text-slate-100 font-bold text-sm">{verificationResult.seat_id}</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">College DB Status</span>
                        <span className="text-emerald-400 font-bold">{verificationResult.enrollment_db_status}</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase block">Image Match Confidence</span>
                        <span className="text-cyan-400 font-bold">{verificationResult.facial_match_confidence}%</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase block">Hall Entry Clearance Token</span>
                      <span className="text-amber-400 font-mono font-bold">{verificationResult.clearance_token}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      {verificationResult.message}
                    </p>
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
              /* Verification Input & Camera Section */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Web Camera Runtime Capture Section */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 font-mono">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase">
                      1. Runtime Photo Capture
                    </h3>
                    <span className="text-[10px] text-slate-400">Aspect Ratio 3:4</span>
                  </div>

                  {cameraError && (
                    <div className="bg-amber-950/80 border border-amber-800 text-amber-200 p-2.5 rounded text-xs">
                      ⚠️ {cameraError}
                    </div>
                  )}

                  {/* Camera Video / Preview Display Area */}
                  <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {capturedImage ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950">
                        <img src={capturedImage} alt="Captured Runtime Preview" className="h-full object-contain aspect-[3/4]" />
                        <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-bold">
                          SNAPSHOT CAPTURED
                        </div>
                      </div>
                    ) : isCameraActive ? (
                      <video
                        ref={this.setVideoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="text-center p-4 space-y-2">
                        <div className="text-4xl">📷</div>
                        <p className="text-xs text-slate-400">
                          Click below to start live webcam or simulate candidate photo capture.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Camera Control Buttons */}
                  <div className="space-y-2">
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
                            className="bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 text-cyan-300 font-bold py-2 rounded text-xs transition-colors"
                          >
                            ⚡ SIMULATE CAPTURE
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => this.setState({ capturedImage: null })}
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-2 rounded text-xs transition-colors"
                      >
                        🔄 RETAKE PHOTO
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Enrollment Verification Form */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 font-mono">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase">
                      2. Enrollment & Hall Verification
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verify Roll Number against central university database records.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-950 border border-red-800 text-red-200 p-2.5 rounded text-xs">
                      [ERROR] {errorMessage}
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
                        onChange={(e) => this.setState({ rollNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 font-bold uppercase focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. 2026-CS-101"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="verify-student-seat" className="block text-slate-400 text-[11px] mb-1">DESK / SEAT ID</label>
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
                        <label htmlFor="verify-student-center" className="block text-slate-400 text-[11px] mb-1">EXAM CENTER CODE</label>
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
                      <p className="font-bold flex items-center gap-1">ℹ️ DATABASE & FACIAL MATCH ENGINE</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Verifies captured runtime photo and enrollment ID against university records before granting hall entry clearance.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={verifying}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {verifying ? 'VERIFYING CANDIDATE...' : '🔍 RUN CANDIDATE VERIFICATION'}
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
