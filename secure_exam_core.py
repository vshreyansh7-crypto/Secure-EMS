import os
import time
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

class SecureExamModule:
    def __init__(self):
        # In a production system, this key is managed securely via a Central Key Management Service (KMS)
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        self.audit_log_file = "system_audit.log"

    def log_event(self, event_message):
        """Appends an immutable audit event with a precise timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {event_message}\n"
        with open(self.audit_log_file, "a") as f:
            f.write(log_entry)
        print(f"AUDIT LOG: {log_entry.strip()}")

    def encrypt_question_paper(self, paper_content: str, output_filename: str):
        """Simulates Phase 1: Encrypting the question paper before cloud upload."""
        encrypted_data = self.cipher.encrypt(paper_content.encode('utf-8'))
        with open(output_filename, "wb") as f:
            f.write(encrypted_data)
        self.log_event(f"SUCCESS: Question paper encrypted and saved as '{output_filename}'.")
        return output_filename

    def time_locked_decrypt(self, encrypted_filename: str, scheduled_exam_time: datetime):
        """
        Simulates Phase 4: Time-locked decryption. 
        Blocks access if the current system time is earlier than the exam start time.
        """
        current_time = datetime.now()
        self.log_event(f"Access requested at {current_time}. Scheduled exam time: {scheduled_exam_time}")

        # Security check: Enforce time-lock
        if current_time < scheduled_exam_time:
            print("\n[SECURITY ALERT] Decryption Blocked!")
            print(f"Reason: Exam window has not opened yet. Scheduled for: {scheduled_exam_time}")
            self.log_event("SECURITY VIOLATION: Unauthorized early decryption attempt blocked.")
            return None

        # If time condition is met, release the plaintext document
        try:
            with open(encrypted_filename, "rb") as f:
                encrypted_data = f.read()
            
            decrypted_data = self.cipher.decrypt(encrypted_data)
            self.log_event("SUCCESS: Time-lock verified. Question paper decrypted for exam center.")
            return decrypted_data.decode('utf-8')
        except Exception as e:
            self.log_event(f"ERROR: Decryption failed due to {str(e)}")
            return None

# --- Execution & Simulation ---
if __name__ == "__main__":
    print("=== Secure Examination Management System (EMS) Prototype ===\n")
    
    ems = SecureExamModule()

    # 1. Mock Question Paper Content
    raw_paper = """
    CENTRAL UNIVERSITY EXAMINATION 2026
    Subject: Computer Science - Database Management Systems & Security
    Duration: 3 Hours | Max Marks: 100
    Instructions: All questions are compulsory. Do not distribute or copy.
    Q1. Explain the role of encryption in secure cloud architectures.
    Q2. Discuss Role-Based Access Control (RBAC) implementation models.
    """

    # 2. Encrypt the paper
    encrypted_file = ems.encrypt_question_paper(raw_paper, "exam_paper_encrypted.enc")

    # 3. Test Case A: Attempt to unlock BEFORE the exam time (Set 5 seconds in future)
    print("\n--- Test 1: Trying to unlock BEFORE exam time ---")
    future_exam_time = datetime.now() + timedelta(seconds=5)
    ems.time_locked_decrypt(encrypted_file, future_exam_time)

    # 4. Wait for the time window to open
    print("\n[Waiting 5 seconds for the scheduled exam start time to arrive...]")
    time.sleep(5)

    # 5. Test Case B: Attempt to unlock ON/AFTER the exam time
    print("\n--- Test 2: Trying to unlock ON exam time ---")
    unlocked_paper = ems.time_locked_decrypt(encrypted_file, future_exam_time)

    if unlocked_paper:
        print("\n[SUCCESS] Decrypted Question Paper Content Unlocked at Center:")
        print(unlocked_paper)
        
    print(f"\nAudit trail successfully recorded in: {ems.audit_log_file}")