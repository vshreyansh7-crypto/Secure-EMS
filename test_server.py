from fastapi.testclient import TestClient

import server

client = TestClient(server.app)


def test_decrypt_rejects_missing_admin_token():
    response = client.post(
        "/api/decrypt",
        json={
            "username": "supervisor_center1",
            "center_code": "CTR-101",
            "subject_code": "CS-602",
            "pin": "246810",
            "admin_token": "",
        },
    )
    assert response.status_code == 403
    assert "Admin Token (Key A) missing" in response.json()["detail"]


def test_decrypt_rejects_invalid_pin():
    response = client.post(
        "/api/decrypt",
        json={
            "username": "supervisor_center1",
            "center_code": "CTR-101",
            "subject_code": "CS-602",
            "pin": "wrong-pin",
            "admin_token": "CTRL-KEY-999",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Incorrect supervisor cryptographic PIN."


def test_audit_logs_route_returns_json():
    response = client.get("/api/audit-logs")

    assert response.status_code == 200
    assert "audit_logs" in response.json()


def test_student_paper_rejects_missing_roll():
    response = client.post(
        "/api/student/paper",
        json={
            "roll_number": "",
            "seat_id": "DESK-42",
            "center_code": "CTR-101",
            "subject_code": "CS-602",
        },
    )
    assert response.status_code == 403
    assert "Student Roll Number is required" in response.json()["detail"]


def test_student_security_alert_logging():
    response = client.post(
        "/api/student/security-alert",
        json={
            "roll_number": "2026-CS-042",
            "seat_id": "DESK-42",
            "center_code": "CTR-101",
            "subject_code": "CS-602",
            "violation_type": "TAB_SWITCH_DETECTED",
            "details": "Student switched away from active kiosk window",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "recorded"

