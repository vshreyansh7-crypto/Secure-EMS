import sqlite3
import hashlib
from datetime import datetime, timedelta

DB_NAME = "exam_system.db"
DEFAULT_CENTER_PIN = "246810"


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()


def ensure_exam_center_pin_column(cursor):
    cursor.execute("PRAGMA table_info(exam_centers);")
    columns = {row[1] for row in cursor.fetchall()}
    if "pin_hash" not in columns:
        cursor.execute("ALTER TABLE exam_centers ADD COLUMN pin_hash TEXT;")

def insert_sample_data():
    # Connect to the SQLite database
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Enable foreign key enforcement
    cursor.execute("PRAGMA foreign_keys = ON;")
    ensure_exam_center_pin_column(cursor)

    print("Inserting sample test records into the database...")

    # 1. Fetch existing role IDs to map users accurately
    cursor.execute("SELECT role_id, role_name FROM roles;")
    roles = {row[1]: row[0] for row in cursor.fetchall()}

    # 2. Insert Sample Users
    # (In production, password_hash would store hashed passwords via bcrypt/argon2)
    sample_users = [
        ("admin_shrey", "hashed_pwd_admin123", roles.get('ADMIN')),
        ("controller_verma", "hashed_pwd_ctrl456", roles.get('CONTROLLER')),
        ("supervisor_center1", "hashed_pwd_sup789", roles.get('SUPERVISOR'))
    ]
    
    cursor.executemany("""
    INSERT OR IGNORE INTO users (username, password_hash, role_id) 
    VALUES (?, ?, ?);
    """, sample_users)

    # 3. Insert Sample Exam Center with a hardware MAC address binding
    cursor.execute("""
    INSERT OR IGNORE INTO exam_centers (center_code, center_name, authorized_device_mac, is_locked_down, pin_hash)
    VALUES (?, ?, ?, 1, ?);
    """, ('CTR-101', 'Varanasi Public Examination Hub', 'A1:B2:C3:D4:E5:F6', hash_pin(DEFAULT_CENTER_PIN)))

    cursor.execute(
        """
        UPDATE exam_centers
        SET pin_hash = ?
        WHERE center_code = ?;
        """,
        (hash_pin(DEFAULT_CENTER_PIN), 'CTR-101')
    )

    # Retrieve the user ID of the controller for question paper ownership
    cursor.execute("SELECT user_id FROM users WHERE username = 'controller_verma';")
    controller_row = cursor.fetchone()
    controller_id = controller_row[0] if controller_row else 1

    # 4. Insert Sample Question Paper Metadata
    cursor.execute("DELETE FROM question_papers WHERE subject_code = ?;", ('CS-602',))

    # Schedule unlock time 10 seconds from now for the demo verification flow
    scheduled_unlock = (datetime.now() + timedelta(seconds=10)).strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
    INSERT OR IGNORE INTO question_papers (subject_code, encrypted_file_path, scheduled_unlock_time, uploaded_by)
    VALUES (?, ?, ?, ?);
    """, ('CS-602', 'exam_paper_encrypted.enc', scheduled_unlock, controller_id))

    conn.commit()
    conn.close()
    
    print("Sample test records successfully populated!")

if __name__ == "__main__":
    insert_sample_data()