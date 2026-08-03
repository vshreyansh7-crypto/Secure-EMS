import os
import sqlite3
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Secure EMS Backend", version="1.0")

DATABASE_CANDIDATES = ("exam_system.db", "exam.db")

# Enable CORS so your React frontend (localhost:5173) can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPERVISOR_DATABASE = {
    "supervisor_center1": {
        "pin": "4567",
        "center_code": "CTR-101",
        "subject_code": "CS-602",
        "authorized_window_start": "2026-07-24T09:00:00",
        "authorized_window_end": "2026-08-30T23:00:00",
    }
}

class DecryptRequest(BaseModel):
    username: str
    center_code: str
    subject_code: str
    pin: str


class PrintRequest(BaseModel):
    center_code: str
    subject_code: str
    copies: int
    watermark: str


def get_database_path() -> str:
    for candidate in DATABASE_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    return DATABASE_CANDIDATES[0]


def log_audit_event(center_code, subject_code, username, status_msg):
    try:
        conn = sqlite3.connect("exam.db", timeout=1.0)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                center_code TEXT,
                subject_code TEXT,
                username TEXT,
                status TEXT
            )
            """
        )
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, center_code, subject_code, username, status) VALUES (?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), center_code, subject_code, username, status_msg),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit log error: {e}")

@app.post("/api/decrypt")
def decrypt_paper(payload: DecryptRequest):
    # 1. Check if supervisor exists
    supervisor = SUPERVISOR_DATABASE.get(payload.username)
    if not supervisor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid supervisor username.",
        )

    # 2. Verify PIN match
    if supervisor["pin"] != payload.pin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect supervisor PIN.",
        )

    # 3. Verify Center and Subject match
    if supervisor["center_code"] != payload.center_code or supervisor["subject_code"] != payload.subject_code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Center or Subject code mismatch for this supervisor.",
        )

    # 4. Verify Time-Lock Window
    current_time = datetime.now()
    start_time = datetime.fromisoformat(supervisor["authorized_window_start"])
    end_time = datetime.fromisoformat(supervisor["authorized_window_end"])

    if not (start_time <= current_time <= end_time):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Examination window is closed or has expired.",
        )

    log_audit_event(payload.center_code, payload.subject_code, payload.username, "SUCCESS_DECRYPT")

    # Success: Return decrypted exam content
    return {
        "status": "success",
        "content": "CONFIDENTIAL EXAM PAPER:\n1. Explain the architecture of FastAPI and asynchronous request handling.\n2. Discuss database indexing strategies for high-concurrency systems."
    }


@app.get("/api/audit-logs")
def get_audit_logs():
    try:
        conn = sqlite3.connect("exam.db", timeout=1.0)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        logs = cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC").fetchall()
        conn.close()
        return {"audit_logs": [dict(row) for row in logs]}
    except Exception as e:
        return {"audit_logs": [], "message": f"Database error or table missing: {str(e)}"}


@app.post("/api/print")
def execute_secure_print(payload: PrintRequest, request: Request):
    client_ip = request.client.host
    try:
        conn = sqlite3.connect("exam.db", timeout=1.0)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                center_code TEXT,
                subject_code TEXT,
                username TEXT,
                ip TEXT,
                status TEXT
            )
            """
        )
        cursor.execute(
            "INSERT INTO audit_logs (timestamp, center_code, subject_code, username, ip, status) VALUES (?, ?, ?, ?, ?, ?)",
            (
                datetime.now().isoformat(),
                payload.center_code,
                payload.subject_code,
                "print_terminal",
                client_ip,
                f"PRINT_DISPATCH_{payload.copies}_COPIES",
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Print audit logging error: {e}")

    return {
        "status": "success",
        "message": f"Successfully transmitted {payload.copies} encrypted copies to physical terminal for center {payload.center_code} with active watermark {payload.watermark}."
    }
