import sqlite3
import os
import hashlib

import db_config
DB_NAME = db_config.get_db_path("exam_system.db")
DEFAULT_CENTER_PIN = "246810"


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()


def ensure_exam_center_pin_column(cursor):
    cursor.execute("PRAGMA table_info(exam_centers);")
    columns = {row[1] for row in cursor.fetchall()}
    if "pin_hash" not in columns:
        cursor.execute("ALTER TABLE exam_centers ADD COLUMN pin_hash TEXT;")


def ensure_question_papers_encryption_key_column(cursor):
    cursor.execute("PRAGMA table_info(question_papers);")
    columns = {row[1] for row in cursor.fetchall()}
    if "encryption_key" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN encryption_key TEXT;")
    if "admin_key" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN admin_key TEXT;")
    if "supervisor_key" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN supervisor_key TEXT;")
    if "blockchain_tx_hash" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN blockchain_tx_hash TEXT;")
    if "paper_hash" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN paper_hash TEXT;")
    if "on_chain_status" not in columns:
        cursor.execute("ALTER TABLE question_papers ADD COLUMN on_chain_status TEXT;")

def ensure_audit_logs_blockchain_columns(cursor):
    cursor.execute("PRAGMA table_info(audit_logs);")
    columns = {row[1] for row in cursor.fetchall()}
    if "blockchain_tx_hash" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN blockchain_tx_hash TEXT;")
    if "on_chain_status" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN on_chain_status TEXT;")


def ensure_scheduled_exams_columns(cursor):
    cursor.execute("PRAGMA table_info(scheduled_exams);")
    columns = {row[1] for row in cursor.fetchall()}
    if "supervisor_unlocked_at" not in columns:
        cursor.execute("ALTER TABLE scheduled_exams ADD COLUMN supervisor_unlocked_at TIMESTAMP;")
    if "unlocked_by_user" not in columns:
        cursor.execute("ALTER TABLE scheduled_exams ADD COLUMN unlocked_by_user TEXT;")
    if "hall_publish_token" not in columns:
        cursor.execute("ALTER TABLE scheduled_exams ADD COLUMN hall_publish_token TEXT;")

def ensure_audit_logs_hash_columns(cursor):
    cursor.execute("PRAGMA table_info(audit_logs);")
    columns = {row[1] for row in cursor.fetchall()}
    if "previous_hash" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN previous_hash TEXT;")
    if "current_hash" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN current_hash TEXT;")

def initialize_database():
    # Check if database already exists
    db_exists = os.path.exists(DB_NAME)
    
    # Connect to SQLite database (creates it if it doesn't exist)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Enable foreign key support in SQLite
    cursor.execute("PRAGMA foreign_keys = ON;")

    print("Initializing database tables for Secure Examination Management System...")

    # 1. Roles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS roles (
        role_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT UNIQUE NOT NULL,
        description TEXT
    );
    """)

    # 2. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
    );
    """)

    # 3. Exam Centers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exam_centers (
        center_id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_code TEXT UNIQUE NOT NULL,
        center_name TEXT NOT NULL,
        authorized_device_mac TEXT UNIQUE NOT NULL,
        is_locked_down BOOLEAN DEFAULT 1,
        pin_hash TEXT
    );
    """)
    ensure_exam_center_pin_column(cursor)

    # 4. Question Papers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS question_papers (
        paper_id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_code TEXT NOT NULL,
        encrypted_file_path TEXT NOT NULL,
        scheduled_unlock_time TIMESTAMP NOT NULL,
        encryption_key TEXT,
        admin_key TEXT,
        supervisor_key TEXT,
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
    );
    """)
    ensure_question_papers_encryption_key_column(cursor)

    # 5. Audit Logs Table (Append-Only Cryptographic Ledger)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        center_id INTEGER,
        action_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        previous_hash TEXT,
        current_hash TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (center_id) REFERENCES exam_centers(center_id)
    );
    """)
    ensure_audit_logs_hash_columns(cursor)
    ensure_audit_logs_blockchain_columns(cursor)

    # 6. Student Verifications Table (Biometric Candidate Photo Storage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_verifications (
        verification_id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        seat_id TEXT,
        center_code TEXT,
        captured_image_base64 TEXT,
        clearance_token TEXT,
        facial_match_confidence REAL,
        status TEXT DEFAULT 'VERIFIED',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. Scheduled Exams Table (AI Agent Scheduling Integration)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scheduled_exams (
        schedule_id TEXT PRIMARY KEY,
        center_code TEXT NOT NULL,
        exam_date TEXT NOT NULL,
        exam_time TEXT DEFAULT '10:00 AM',
        subject_code TEXT NOT NULL,
        duration_mins INTEGER DEFAULT 180,
        scheduled_by TEXT DEFAULT 'AI_AGENT_SCHEDULER',
        status TEXT DEFAULT 'SCHEDULED',
        supervisor_unlocked_at TIMESTAMP,
        unlocked_by_user TEXT,
        hall_publish_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    ensure_scheduled_exams_columns(cursor)

    # 8. Student Faces Table (Biometric 128-point Face Descriptor)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_faces (
        face_id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        student_name TEXT,
        face_descriptor TEXT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ENROLLED'
    );
    """)

    # Insert default baseline roles if they don't exist
    default_roles = [
        ('ADMIN', 'System Administrator with full management privileges'),
        ('CONTROLLER', 'Examination Controller responsible for paper upload and scheduling'),
        ('SUPERVISOR', 'Center Supervisor responsible for unlocking and printing at exam venues')
    ]
    
    cursor.executemany("""
    INSERT OR IGNORE INTO roles (role_name, description) VALUES (?, ?);
    """, default_roles)

    conn.commit()
    conn.close()
    
    print(f"Database setup complete! File saved as '{DB_NAME}'.")

if __name__ == "__main__":
    initialize_database()