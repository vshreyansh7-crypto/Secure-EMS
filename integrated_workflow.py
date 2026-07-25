import sqlite3
import time
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

DB_NAME = "exam_system.db"

class IntegratedExamSystem:
    def __init__(self):
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)

    def log_to_database(self, username, center_code, action_type, details):
        """Records an immutable security event directly into the SQLite audit_logs table."""
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Retrieve user_id and center_id for relational mapping
        cursor.execute("SELECT user_id FROM users WHERE username = ?;", (username,))
        user_row = cursor.fetchone()
        user_id = user_row[0] if user_row else None

        cursor.execute("SELECT center_id FROM exam_centers WHERE center_code = ?;", (center_code,))
        center_row = cursor.fetchone()
        center_id = center_row[0] if center_row else None

        # Insert audit log record
        cursor.execute("""
        INSERT INTO audit_logs (user_id, center_id, action_type, details, ip_address)
        VALUES (?, ?, ?, ?, ?);
        """, (user_id, center_id, action_type, details, "192.168.1.105"))

        conn.commit()
        conn.close()
        print(f"[DB AUDIT RECORDED] Action: {action_type} | User: {username} | Center: {center_code}")

    def encrypt_and_register_paper(self, subject_code, raw_paper, uploader_username):
        """Encrypts question paper and simulates cloud registration."""
        encrypted_data = self.cipher.encrypt(raw_paper.encode('utf-8'))
        filename = f"{subject_code.lower()}_encrypted.enc"
        
        with open(filename, "wb") as f:
            f.write(encrypted_data)

        # Register metadata in the database
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE username = ?;", (uploader_username,))
        row = cursor.fetchone()
        uploader_id = row[0] if row else 1

        scheduled_time = (datetime.now() + timedelta(seconds=5)).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT INTO question_papers (subject_code, encrypted_file_path, scheduled_unlock_time, uploaded_by)
        VALUES (?, ?, ?, ?);
        """, (subject_code, filename, scheduled_time, uploader_id))
        
        conn.commit()
        conn.close()
        
        print(f"Question paper for {subject_code} encrypted and registered. Scheduled unlock: {scheduled_time}")
        return filename, scheduled_time

    def center_request_decryption(self, filename, scheduled_unlock_str, supervisor_username, center_code):
        """Attempts to decrypt the paper at the exam center, enforcing time-locks and logging compliance."""
        scheduled_unlock = datetime.strptime(scheduled_unlock_str, "%Y-%m-%d %H:%M:%S")
        current_time = datetime.now()

        print(f"\nCenter '{center_code}' requesting decryption at {current_time.strftime('%H:%M:%S')}...")

        # Enforce Time-Lock Security Check
        if current_time < scheduled_unlock:
            print("[SECURITY BLOCK] Exam time window has not arrived yet!")
            self.log_to_database(
                username=supervisor_username,
                center_code=center_code,
                action_type="UNAUTHORIZED_EARLY_ACCESS_BLOCK",
                details="Attempted decryption before scheduled start time."
            )
            return None

        # Time condition met: Decrypt paper
        try:
            with open(filename, "rb") as f:
                encrypted_data = f.read()
            
            decrypted_text = self.cipher.decrypt(encrypted_data).decode('utf-8')
            
            self.log_to_database(
                username=supervisor_username,
                center_code=center_code,
                action_type="DECRYPTION_SUCCESS",
                details="Successfully decrypted question paper for distribution."
            )
            return decrypted_text
        except Exception as e:
            self.log_to_database(
                username=supervisor_username,
                center_code=center_code,
                action_type="DECRYPTION_ERROR",
                details=str(e)
            )
            return None

# --- Full System Simulation ---
if __name__ == "__main__":
    print("=== Secure EMS: Integrated Workflow Simulation ===\n")
    
    system = IntegratedExamSystem()

    # 1. Controller uploads/encrypts paper
    paper_text = "COMPUTER SCIENCE EXAM 2026\n1. Explain AES-256.\n2. Discuss database schema normalization."
    enc_file, unlock_time = system.encrypt_and_register_paper("CS-602", paper_text, "controller_verma")

    # 2. Supervisor at Center CTR-101 attempts early decryption (should fail)
    system.center_request_decryption(enc_file, unlock_time, "supervisor_center1", "CTR-101")

    # 3. Wait for time lock to expire
    print("\n[Waiting 6 seconds for the exam start time window...]")
    time.sleep(6)

    # 4. Supervisor attempts decryption again (should succeed and log to SQLite)
    unlocked_content = system.center_request_decryption(enc_file, unlock_time, "supervisor_center1", "CTR-101")

    if unlocked_content:
        print("\n[EXAM CENTER PRINT READY] Unlocked Content:")
        print(unlocked_content)
        
    print("\nSimulation complete! Check your SQLite database 'audit_logs' table to inspect the compliance trail.")