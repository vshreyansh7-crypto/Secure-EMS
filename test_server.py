from fastapi.testclient import TestClient

import server

client = TestClient(server.app)


def test_decrypt_rejects_invalid_pin():
    response = client.post(
        "/api/decrypt",
        json={
            "username": "supervisor_center1",
            "center_code": "CTR-101",
            "subject_code": "CS-602",
            "pin": "wrong-pin",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Incorrect supervisor PIN."


def test_audit_logs_route_returns_json():
    response = client.get("/api/audit-logs")

    assert response.status_code == 200
    assert "audit_logs" in response.json()
