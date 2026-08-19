# 🛡️ Secure EMS — Secure Examination Management System

> An automated, end-to-end secure examination paper distribution, venue accreditation, candidate biometric verification, and locked-down anti-cheat candidate kiosk platform.

[![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-6E9F18?logo=vitest)](https://vitest.dev/)
[![Oxlint](https://img.shields.io/badge/Oxlint-1.71-orange)](https://oxc.rs/)

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [Key Security Features ("Technics")](#-key-security-features-technics)
- [System Architecture & Terminals](#-system-architecture--terminals)
- [Technology Stack](#-technology-stack)
- [REST API Reference](#-rest-api-reference)
- [Database Schema](#-database-schema)
- [Getting Started & Running Locally](#-getting-started--running-locally)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 📖 Executive Overview

**Secure-EMS** is engineered to solve critical security vulnerabilities in central university and recruitment examination workflows. Traditional paper distribution methods are vulnerable to early leaks, venue impersonation, unauthorized early decryption, and exam hall cheating.

Secure-EMS mitigates these risks through:
- **Two-Stage Double Cryptographic Encryption**
- **Split-Key Authority (Two-Person Rule)**
- **Server-Enforced Time-Lock Release Windows**
- **Dynamic Forensic Watermarking**
- **Student Kiosk Browser Lockdown & Anti-Cheat Pings**
- **Biometric Candidate Hall Verification**

---

## 🔐 Key Security Features ("Technics")

| Security Mechanism | Description & Technical Implementation |
| :--- | :--- |
| **🔐 Two-Stage Double Encryption** | Plaintext question papers are encrypted sequentially using **Admin Key A** (`Fernet`), followed by **Supervisor Key B** (`Fernet`). Cipher files are stored as binary `.enc` payloads. |
| **🔑 Split-Key Authority (Two-Person Rule)** | Paper decryption requires both **Admin Token (Key A)** AND **Supervisor Cryptographic PIN (Key B)** simultaneously. Neither party can unlock papers alone. |
| **⏱️ Server Time-Lock Engine** | Automated server clock validation checks `scheduled_unlock_time`. Access attempts prior to the scheduled window are blocked with an HTTP 403 `TIME_LOCK_SECURITY_BLOCK`. |
| **🌊 Dynamic Forensic Watermarking** | Print dispatches embed dynamic watermarks (`CTR-101 \| Timestamp \| Client IP`) on every page to prevent leaks and trace distribution sources. |
| **🚫 Student Kiosk Browser Lockdown** | Disables context menus (right-click), copy-paste (`Ctrl+C/V`), print screen, and developer tools (`F12`). Window blur & tab switching instantly send security violation alerts (`FOCUS_LOSS`) to supervisors. |
| **📡 Live Kiosk Heartbeat Gateway** | Student kiosks stream periodic pings every 5s to `/api/student/heartbeat`. Supervisors monitor active terminal status (`ACTIVE`, `VIOLATION`, `OFFLINE`). |
| **📸 Biometric Candidate Verification** | Captures candidate webcam snapshots at hall entrance, calculates facial match confidence scores, and issues single-use clearance tokens (`PASS-ROLL-TIMESTAMP`). |
| **🏛️ Venue Accreditation & MAC Binding** | Registers exam venues with authorized MAC addresses and issues digital accreditation certificates (`CERT-CODE-TIMESTAMP`). |
| **📝 Immutable Compliance Audit Trail** | All actions (uploads, decryptions, failed PINs, early access blocks, print dispatches, focus loss events) are logged into an append-only SQLite `audit_logs` table. |

---

## 🏛️ System Architecture & Terminals

The application features a multi-terminal routing architecture in `src/App.jsx`:

1. **`ExamDashboard.jsx` (Master Command Hub):** Central dashboard displaying system metrics, active countdowns, cryptographic status, and streaming audit logs.
2. **`AdminTerminal.jsx` (Exam Controller Portal):** Double-encrypts question papers, manages split keys, sets automated time-lock schedules, and dispatches AI Agent schedulers.
3. **`SupervisorTerminal.jsx` (Center Supervisor Portal):** Dual-key decryption gateway, dynamic watermarked printing dispatch, and live student kiosk monitoring console.
4. **`StudentTerminal.jsx` (Locked Candidate Kiosk):** Anti-cheat examination interface with enforced browser restrictions and live heartbeat streaming.
5. **`VerificationTerminal.jsx` (Candidate Biometric Portal):** Hall entrance verification terminal capturing candidate snapshots and issuing clearance tokens.
6. **`CenterRegistrationTerminal.jsx` (Venue Accreditation Portal):** Registers center details and MAC hardware credentials to issue accreditation certificates.

---

## 💻 Technology Stack

- **Frontend:** React 19, Vite 8, Vanilla CSS3 (Slate/Cyan/Emerald glassmorphism theme)
- **Backend:** FastAPI, Uvicorn, Python `http.server` zero-dependency fallback engine
- **Database:** SQLite 3 (`exam_system.db`) with Foreign Key constraints enabled
- **Security:** Cryptography (`Fernet` AES-128-CBC) with SHA-256 XOR/Base64 fallback
- **Testing & Quality:** Vitest, React Testing Library, Oxlint (Rust-based linter)
- **Reporting:** ReportLab (PDF document generation)
- **Deployment:** Vercel SPA rewrite rules (`vercel.json`)

---

## 🚀 Getting Started & Running Locally

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)

### 2. Backend Setup & Startup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Initialize database
python database_setup.py

# Seed initial test data
python insert_sample_data.py

# Start FastAPI server (runs on http://localhost:8000)
python server.py
```

### 3. Frontend Setup & Startup
```bash
# Install Node dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

---

## 🧪 Testing & Quality Assurance

```bash
# Run unit tests with Vitest
npm test

# Run Oxlint static analysis
npm run lint

# Build production bundle
npm run build
```

---

## 📄 Repository Information
- **GitHub Repository:** [vshreyansh7-crypto/Secure-EMS](https://github.com/vshreyansh7-crypto/Secure-EMS)
