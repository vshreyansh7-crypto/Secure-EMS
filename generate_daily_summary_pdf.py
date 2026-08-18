import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf(filename="Secure_EMS_Daily_Work_Summary.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Professional Color Palette
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#0284c7")  # Cyan 600
    emerald_color = colors.HexColor("#059669") # Emerald 600
    text_dark = colors.HexColor("#1e293b")     # Slate 800
    bg_light = colors.HexColor("#f8fafc")      # Slate 50
    
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
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_dark,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=text_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=primary_color
    )

    story = []

    # Title & Header
    story.append(Paragraph("SECURE EMS — DAILY DEVELOPMENT WORK SUMMARY", title_style))
    story.append(Paragraph("Comprehensive Technical & Architectural Summary | Date: August 18, 2026", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=10))

    # Executive Overview
    story.append(Paragraph("Executive Overview", section_heading))
    story.append(Paragraph(
        "Today's development focused on modularizing and scaling the <b>Secure Examination Management System (Secure-EMS)</b> "
        "into a unified ecosystem of five standalone terminals: Central Admin Controller, Candidate Verification Terminal, "
        "Center Registration Terminal, Exam Hall Supervisor Enclave, and Student Kiosk Reader. "
        "This architecture enforces strict separation of concerns, multi-factor verification, and zero-trust cryptographic security.",
        body_style
    ))

    # Architectural Breakdown Table
    story.append(Paragraph("1. Terminal Architecture & Component Breakdown", section_heading))
    
    table_data = [
        [
            Paragraph("Terminal / Module", table_header_style),
            Paragraph("Route", table_header_style),
            Paragraph("Core Source File", table_header_style),
            Paragraph("Key Responsibilities & Functionality Implemented", table_header_style)
        ],
        [
            Paragraph("Verification Terminal", table_cell_bold),
            Paragraph("/verification", table_cell_style),
            Paragraph("VerificationTerminal.jsx", table_cell_style),
            Paragraph("Candidate biometric and ID verification prior to exam entry. Photo/passport image validation & live status sync.", table_cell_style)
        ],
        [
            Paragraph("Center Registration Terminal", table_cell_bold),
            Paragraph("/center-registration", table_cell_style),
            Paragraph("CenterRegistrationTerminal.jsx", table_cell_style),
            Paragraph("Exam center onboarding & management. IP range restriction, capacity management, and center code allocation.", table_cell_style)
        ],
        [
            Paragraph("Central Exam Dashboard", table_cell_bold),
            Paragraph("/", table_cell_style),
            Paragraph("ExamDashboard.jsx", table_cell_style),
            Paragraph("Unified command hub connecting all 5 terminals with live terminal status monitoring, route switching & health badges.", table_cell_style)
        ],
        [
            Paragraph("Central Admin Terminal", table_cell_bold),
            Paragraph("/admin", table_cell_style),
            Paragraph("AdminTerminal.jsx", table_cell_style),
            Paragraph("Question paper creation, 2-Stage Fernet encryption engine, split-key generation (Admin Token + Supervisor PIN), and audit trail.", table_cell_style)
        ],
        [
            Paragraph("Supervisor Terminal", table_cell_bold),
            Paragraph("/supervisor", table_cell_style),
            Paragraph("SupervisorTerminal.jsx", table_cell_style),
            Paragraph("10s time-lock countdown enclave, dual-key verification form, forensic watermarking, live student status grid & override controls.", table_cell_style)
        ],
        [
            Paragraph("Student Kiosk Terminal", table_cell_bold),
            Paragraph("/student", table_cell_style),
            Paragraph("StudentTerminal.jsx", table_cell_style),
            Paragraph("Client-server locked exam terminal, encrypted paper loader, anti-cheating tab-switch detection, and automatic response autosave.", table_cell_style)
        ],
        [
            Paragraph("Backend API & Database", table_cell_bold),
            Paragraph("REST / SQL", table_cell_style),
            Paragraph("server.py / exam_system.db", table_cell_style),
            Paragraph("Expanded FastAPI/Flask endpoints for verification, center management, key distribution, supervisor overrides, and DB schema updates.", table_cell_style)
        ]
    ]

    arch_table = Table(table_data, colWidths=[110, 85, 120, 225])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 8))

    # Core Features
    story.append(Paragraph("2. Technical Achievements & Implementation Highlights", section_heading))
    
    story.append(Paragraph(
        "• <b>Candidate Biometric & ID Verification:</b> Created dedicated verification flow with candidate passport photo validation and database verification status updates.<br/>"
        "• <b>Center Registration & Network Security:</b> Added exam center registration terminal with IP range boundaries, capacity controls, and center status tracking.<br/>"
        "• <b>Unified Dashboard Navigation:</b> Redesigned main dashboard into a multi-terminal launchpad with real-time health indicators across all 5 applications.<br/>"
        "• <b>Cryptographic Key Management & Time-Lock:</b> Implemented 2-stage Fernet paper encryption with split-key release (Key A: Admin Token, Key B: Supervisor PIN) and 10s enclave time-lock.<br/>"
        "• <b>Forensic Watermarking & Anti-Tampering:</b> Added dynamic background watermark stamping (Center/MAC/IP/Time) and right-click/copy protection on examinee interfaces.",
        body_style
    ))

    # Quality Assurance & Testing
    story.append(Paragraph("3. Quality Assurance & Automated Testing Verification", section_heading))
    story.append(Paragraph(
        "Full unit test coverage established across all core components using <b>Vitest</b> and <b>React Testing Library</b>:<br/>"
        "• <b>VerificationTerminal.test.jsx:</b> Validates candidate lookup, photo verification, and status updates.<br/>"
        "• <b>CenterRegistrationTerminal.test.jsx:</b> Validates center creation forms, IP validation, and registration submission.<br/>"
        "• <b>ExamDashboard.test.jsx:</b> Tests unified dashboard rendering, tab navigation, and terminal connectivity badges.<br/>"
        "• <b>AdminTerminal.test.jsx & SupervisorTerminal.test.jsx:</b> Validates time-lock countdowns, dual-key decryption, and audit logging.<br/>"
        "<b>Status:</b> All test suites executed with 100% pass rate and clean build status.",
        body_style
    ))

    # Summary Footer
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))
    story.append(Paragraph(
        "Secure-EMS Daily Development Summary | Generated automatically | Workspace: Secure-EMS",
        ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#64748b"), alignment=1)
    ))

    doc.build(story)
    print(f"Daily Summary PDF successfully generated: {filename}")

if __name__ == "__main__":
    generate_pdf()
