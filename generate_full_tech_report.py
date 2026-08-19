import os
import sys
from datetime import datetime

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
except ImportError:
    print("ReportLab library not found. Installing or raising error.")
    sys.exit(1)

def generate_pdf(filename="Secure_EMS_Complete_Technology_And_Architecture_Report.pdf"):
    pdf_path = os.path.join(os.getcwd(), filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Color Palette
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#0284c7")  # Cyan 600
    amber_color = colors.HexColor("#d97706")   # Amber 600
    emerald_color = colors.HexColor("#059669") # Emerald 600
    text_dark = colors.HexColor("#1e293b")     # Slate 800
    bg_light = colors.HexColor("#f8fafc")      # Slate 50
    border_color = colors.HexColor("#cbd5e1")  # Slate 300
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=accent_color,
        spaceAfter=12
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6
    )

    subsection_heading = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=text_dark,
        spaceAfter=6
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=text_dark
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=primary_color
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=accent_color
    )

    story = []
    
    # --- Title & Header ---
    story.append(Paragraph("SECURE EMS — COMPLETE TECHNOLOGY & ARCHITECTURE REPORT", title_style))
    story.append(Paragraph(f"Repository: vshreyansh7-crypto/Secure-EMS (GitHub) | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=10))
    
    # --- Executive Summary ---
    story.append(Paragraph("1. Executive Overview & System Purpose", section_heading))
    story.append(Paragraph(
        "<b>Secure Examination Management System (Secure-EMS)</b> is a high-security, automated examination "
        "paper distribution, venue accreditation, candidate verification, and anti-cheat kiosk management platform. "
        "The system is engineered to eliminate question paper leaks, unauthorized early decryption, venue impersonation, "
        "and examination hall malpractice through multi-layered cryptographic enforcement and real-time monitoring.",
        body_style
    ))
    
    # --- Technology Mapping Table ---
    story.append(Paragraph("2. Complete Technology Stack & File Implementation Mapping", section_heading))
    story.append(Paragraph(
        "The table below details every technology, library, framework, and tool used across the codebase and specifies exact file locations.",
        body_style
    ))

    tech_table_data = [
        [
            Paragraph("Technology / Library", table_header_style),
            Paragraph("Category", table_header_style),
            Paragraph("Exact File Locations & Implementation", table_header_style),
            Paragraph("Technical Purpose & Functionality", table_header_style)
        ],
        [
            Paragraph("React 19", table_cell_bold),
            Paragraph("Frontend UI", table_cell_style),
            Paragraph("src/App.jsx<br/>src/ExamDashboard.jsx<br/>src/AdminTerminal.jsx<br/>src/SupervisorTerminal.jsx<br/>src/StudentTerminal.jsx<br/>src/VerificationTerminal.jsx<br/>src/CenterRegistrationTerminal.jsx", table_cell_code),
            Paragraph("Core UI framework. Handles state management, terminal switching, live UI rendering, timer countdowns, and webcam video capture.", table_cell_style)
        ],
        [
            Paragraph("Vite 8", table_cell_bold),
            Paragraph("Build & Dev", table_cell_style),
            Paragraph("vite.config.js<br/>package.json", table_cell_code),
            Paragraph("Lightning-fast local development server with Hot Module Replacement (HMR) and production ES module bundler.", table_cell_style)
        ],
        [
            Paragraph("Vanilla CSS3", table_cell_bold),
            Paragraph("Styling System", table_cell_style),
            Paragraph("src/index.css<br/>src/App.css", table_cell_code),
            Paragraph("Custom slate/cyan/emerald glassmorphism dark mode, CSS grid/flexbox responsive layouts, status badges, and pulse keyframes.", table_cell_style)
        ],
        [
            Paragraph("FastAPI & Uvicorn", table_cell_bold),
            Paragraph("Backend Web API", table_cell_style),
            Paragraph("server.py<br/>requirements.txt", table_cell_code),
            Paragraph("Asynchronous REST API framework handling CORS middleware, Pydantic request validation, status codes, and HTTP routing.", table_cell_style)
        ],
        [
            Paragraph("Python http.server", table_cell_bold),
            Paragraph("Zero-Dep Fallback", table_cell_style),
            Paragraph("server.py (SimpleServer class)", table_cell_code),
            Paragraph("Built-in HTTPServer fallback engine ensuring the backend runs seamlessly without external pip dependencies.", table_cell_style)
        ],
        [
            Paragraph("SQLite 3", table_cell_bold),
            Paragraph("Database", table_cell_style),
            Paragraph("database_setup.py<br/>server.py<br/>integrated_workflow.py<br/>exam_system.db", table_cell_code),
            Paragraph("Embedded relational database enforcing PRAGMA foreign keys for users, roles, exam centers, paper keys, and audit logs.", table_cell_style)
        ],
        [
            Paragraph("Cryptography (Fernet / AES-128)", table_cell_bold),
            Paragraph("Security & Encryption", table_cell_style),
            Paragraph("secure_exam_core.py<br/>integrated_workflow.py<br/>server.py", table_cell_code),
            Paragraph("2-stage nested Fernet symmetric encryption. Includes SHA-256 XOR/Base64 fallback implementation if cryptography library is absent.", table_cell_style)
        ],
        [
            Paragraph("Vitest & Testing Library", table_cell_bold),
            Paragraph("Unit Testing", table_cell_style),
            Paragraph("tests/*.test.jsx<br/>vite.config.js<br/>package.json", table_cell_code),
            Paragraph("Automated unit test runner and DOM assertion suite verifying React terminal rendering, user events, and state mutations.", table_cell_style)
        ],
        [
            Paragraph("Oxlint (Oxc)", table_cell_bold),
            Paragraph("Code Quality", table_cell_style),
            Paragraph(".oxlintrc.json<br/>package.json", table_cell_code),
            Paragraph("Ultra-fast Rust-based linter enforcing clean React code syntax, preventing unused variables, and optimizing bundle size.", table_cell_style)
        ],
        [
            Paragraph("ReportLab", table_cell_bold),
            Paragraph("PDF Engine", table_cell_style),
            Paragraph("generate_pdf_report.py<br/>generate_daily_summary_pdf.py<br/>generate_full_tech_report.py", table_cell_code),
            Paragraph("Programmatic PDF document generation engine creating formatted executive summaries, audit logs, and technical reports.", table_cell_style)
        ],
        [
            Paragraph("Vercel Gateway", table_cell_bold),
            Paragraph("Deployment", table_cell_style),
            Paragraph("vercel.json", table_cell_code),
            Paragraph("Production deployment rewrite rules routing all SPA requests (/*) to index.html.", table_cell_style)
        ]
    ]

    t_tech = Table(tech_table_data, colWidths=[90, 65, 170, 215])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # --- Security Techniques Section ---
    story.append(Paragraph("3. Security Techniques & Architectural Mechanisms ('Technics')", section_heading))

    security_points = [
        ("🔐 Two-Stage Nested Double Encryption", "Plaintext question papers are encrypted first with Admin Controller Key A (Fernet), and the resulting cipher text is encrypted again with Supervisor Key B (Fernet). Cipher files are stored as binary .enc files."),
        ("🔑 Split-Key Authority (Two-Person Rule)", "Paper decryption requires both Admin Token (Key A) AND Supervisor Cryptographic PIN (Key B) simultaneously. Neither party can decrypt the paper independently."),
        ("⏱️ Server-Enforced Time-Lock Release Window", "Automated timestamp validation blocks decryption attempts prior to the scheduled exam window, returning HTTP 403 Forbidden and logging a TIME_LOCK_SECURITY_BLOCK audit event."),
        ("🌊 Dynamic Forensic Watermarking & Secure Print", "Decrypted copies printed or transmitted to venues append dynamic watermarks (CTR-101 | Timestamp | Client IP) to prevent leaks and trace unauthorized distribution."),
        ("🚫 Student Kiosk Browser Lockdown & Anti-Cheat", "Disables right-click menus, copy-paste, print screen, developer tools, and listens for window blur / tab switching (visibilitychange). Focus loss instantly sends security alerts to supervisors."),
        ("📡 Real-Time Student Heartbeat Gateway", "Candidate kiosks stream periodic pings every 5s to /api/student/heartbeat. Supervisors monitor active kiosk health (ACTIVE, VIOLATION, OFFLINE) on live dashboards."),
        ("📸 Biometric Candidate Verification", "Hall entry verification captures candidate webcam snapshots, calculates facial match confidence scores, and issues single-use clearance tokens (PASS-ROLL-TIMESTAMP)."),
        ("🏛️ Center Accreditation & Hardware MAC Binding", "Accredits exam venues by registering center details and MAC addresses, issuing digital accreditation certificates (CERT-CODE-TIMESTAMP)."),
        ("📝 Append-Only Immutable Compliance Audit Trail", "Every upload, decryption, failed PIN, time-lock block, print dispatch, and kiosk alert is recorded in an immutable SQLite audit_logs table and written to system_audit.log.")
    ]

    for title, desc in security_points:
        story.append(Paragraph(f"<b>{title}</b>: {desc}", body_style))

    story.append(Spacer(1, 10))

    # --- API Endpoint Reference ---
    story.append(Paragraph("4. Backend REST API Endpoints & Security Checks", section_heading))

    api_table_data = [
        [
            Paragraph("API Endpoint", table_header_style),
            Paragraph("Method", table_header_style),
            Paragraph("Payload / Query", table_header_style),
            Paragraph("Security Logic & Action", table_header_style)
        ],
        [
            Paragraph("/api/admin/upload-paper", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("PaperUploadRequest", table_cell_style),
            Paragraph("Generates Key A & B, performs 2-stage double encryption, schedules unlock time, stores paper in DB.", table_cell_style)
        ],
        [
            Paragraph("/api/admin/papers", table_cell_code),
            Paragraph("GET", table_cell_bold),
            Paragraph("None", table_cell_style),
            Paragraph("Returns list of registered encrypted question papers and metadata.", table_cell_style)
        ],
        [
            Paragraph("/api/decrypt", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("DecryptRequest", table_cell_style),
            Paragraph("Validates Admin Token + Supervisor PIN, checks time-lock release window, performs 2-stage Fernet decryption.", table_cell_style)
        ],
        [
            Paragraph("/api/print", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("PrintRequest", table_cell_style),
            Paragraph("Logs secure print dispatch with dynamic forensic watermark (Center Code + IP + Timestamp).", table_cell_style)
        ],
        [
            Paragraph("/api/student/paper", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("StudentPaperRequest", table_cell_style),
            Paragraph("Validates candidate roll number, center code, and time-lock before delivering paper content to kiosk.", table_cell_style)
        ],
        [
            Paragraph("/api/student/security-alert", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("StudentAlertRequest", table_cell_style),
            Paragraph("Logs kiosk right-click, focus loss, or cheating attempt into audit trail.", table_cell_style)
        ],
        [
            Paragraph("/api/student/heartbeat", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("StudentHeartbeatRequest", table_cell_style),
            Paragraph("Receives candidate kiosk ping every 5s, updating active terminal session status.", table_cell_style)
        ],
        [
            Paragraph("/api/supervisor/student-status", table_cell_code),
            Paragraph("GET", table_cell_bold),
            Paragraph("None", table_cell_style),
            Paragraph("Returns live status (ACTIVE, VIOLATION, OFFLINE) of all student kiosk terminals.", table_cell_style)
        ],
        [
            Paragraph("/api/verify-student", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("StudentVerificationRequest", table_cell_style),
            Paragraph("Processes webcam image & roll number, returning facial match confidence & hall clearance token.", table_cell_style)
        ],
        [
            Paragraph("/api/register-center", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("ExamCenterRegistrationRequest", table_cell_style),
            Paragraph("Accredits venue, validates MAC address, and issues digital accreditation certificate.", table_cell_style)
        ],
        [
            Paragraph("/api/schedule-exam", table_cell_code),
            Paragraph("POST", table_cell_bold),
            Paragraph("ScheduleExamRequest", table_cell_style),
            Paragraph("Schedules automated exam timetables via AI Agent scheduler.", table_cell_style)
        ],
        [
            Paragraph("/api/audit-logs", table_cell_code),
            Paragraph("GET", table_cell_bold),
            Paragraph("None", table_cell_style),
            Paragraph("Retrieves recent 50 immutable system audit events.", table_cell_style)
        ]
    ]

    t_api = Table(api_table_data, colWidths=[120, 45, 115, 260])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 10))

    # --- Complete File Mapping ---
    story.append(Paragraph("5. Full Repository Codebase File Directory Structure", section_heading))

    file_table_data = [
        [
            Paragraph("File Path", table_header_style),
            Paragraph("Category", table_header_style),
            Paragraph("Description & Technical Role", table_header_style)
        ],
        [Paragraph("server.py", table_cell_code), Paragraph("Backend Engine", table_cell_style), Paragraph("Main FastAPI server & fallback HTTP server containing all REST APIs, split-key logic, and audit handlers.", table_cell_style)],
        [Paragraph("database_setup.py", table_cell_code), Paragraph("Database Init", table_cell_style), Paragraph("Creates SQLite tables (users, roles, exam_centers, question_papers, audit_logs, scheduled_exams).", table_cell_style)],
        [Paragraph("secure_exam_core.py", table_cell_code), Paragraph("Crypto Core", table_cell_style), Paragraph("Core prototype module implementing Fernet encryption, audit logging, and time-lock verification.", table_cell_style)],
        [Paragraph("integrated_workflow.py", table_cell_code), Paragraph("Simulation", table_cell_style), Paragraph("End-to-end integration workflow simulator testing upload, early access block, and decryption.", table_cell_style)],
        [Paragraph("insert_sample_data.py", table_cell_code), Paragraph("Data Seeder", table_cell_style), Paragraph("Populates database with sample test papers, centers, users, and audit log entries.", table_cell_style)],
        [Paragraph("src/App.jsx", table_cell_code), Paragraph("Frontend Router", table_cell_style), Paragraph("Main React root component routing URL pathnames and query parameters to specific terminals.", table_cell_style)],
        [Paragraph("src/ExamDashboard.jsx", table_cell_code), Paragraph("Frontend Dashboard", table_cell_style), Paragraph("Master command dashboard showing live system metrics, audit stream, and portal navigation.", table_cell_style)],
        [Paragraph("src/AdminTerminal.jsx", table_cell_code), Paragraph("Frontend Terminal", table_cell_style), Paragraph("Exam Controller terminal for double-encrypting papers, managing split keys, and scheduling exams.", table_cell_style)],
        [Paragraph("src/SupervisorTerminal.jsx", table_cell_code), Paragraph("Frontend Terminal", table_cell_style), Paragraph("Venue supervisor terminal for dual-key unlocking, watermarked printing, and candidate status monitoring.", table_cell_style)],
        [Paragraph("src/StudentTerminal.jsx", table_cell_code), Paragraph("Frontend Terminal", table_cell_style), Paragraph("Locked anti-cheat candidate kiosk disabling right-click/copy-paste and streaming pings.", table_cell_style)],
        [Paragraph("src/VerificationTerminal.jsx", table_cell_code), Paragraph("Frontend Terminal", table_cell_style), Paragraph("Biometric webcam entry verification terminal generating candidate clearance tokens.", table_cell_style)],
        [Paragraph("src/CenterRegistrationTerminal.jsx", table_cell_code), Paragraph("Frontend Terminal", table_cell_style), Paragraph("Venue accreditation portal registering center credentials and issuing accreditation certificates.", table_cell_style)],
        [Paragraph("tests/*.test.jsx", table_cell_code), Paragraph("Testing Suite", table_cell_style), Paragraph("Vitest unit test suite covering all 5 React terminal UI components.", table_cell_style)],
        [Paragraph("package.json", table_cell_code), Paragraph("Configuration", table_cell_style), Paragraph("Node package manifest listing React 19, Vite, Vitest, and Oxlint dependencies.", table_cell_style)],
        [Paragraph("vite.config.js", table_cell_code), Paragraph("Configuration", table_cell_style), Paragraph("Vite build settings and Vitest test environment configuration.", table_cell_style)],
        [Paragraph("requirements.txt", table_cell_code), Paragraph("Configuration", table_cell_style), Paragraph("Python dependencies (fastapi, uvicorn, pydantic, cryptography, httpx).", table_cell_style)],
        [Paragraph("vercel.json", table_cell_code), Paragraph("Deployment", table_cell_style), Paragraph("Vercel deployment manifest configuring Single Page Application rewrite rules.", table_cell_style)]
    ]

    t_file = Table(file_table_data, colWidths=[150, 90, 300])
    t_file.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_file)
    story.append(Spacer(1, 15))

    # --- Footer Note ---
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=8))
    story.append(Paragraph("<b>Report Generated Automatically for Secure-EMS Repository</b> | All architecture rights reserved.", ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, textColor=colors.HexColor("#64748b"), alignment=1)))

    doc.build(story)
    print(f"PDF generated successfully at: {pdf_path}")
    return pdf_path

if __name__ == "__main__":
    generate_pdf()
