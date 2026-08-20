import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(email: str = "admin@recruitflow.com", password: str = "AdminPassword123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def test_get_submissions_list():
    token = get_token()
    resp = client.get("/api/v1/submissions", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_submission_lifecycle_and_transition():
    token = get_token()
    ts = int(time.time() * 1000)

    # 1. Create Client
    cli_resp = client.post(
        "/api/v1/clients",
        json={"name": f"Lifecycle Corp {ts}", "status": "ACTIVE"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert cli_resp.status_code == 200
    client_id = cli_resp.json()["id"]

    # 2. Create Requirement
    req_resp = client.post(
        "/api/v1/requirements",
        json={
            "client_id": client_id,
            "job_title": "Backend Architect",
            "required_skills": ["Python", "FastAPI"],
            "openings_count": 2,
            "priority": "HIGH",
            "status": "OPEN"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert req_resp.status_code == 200
    req_id = req_resp.json()["id"]

    # 3. Create Candidate
    cand_resp = client.post(
        "/api/v1/candidates",
        json={
            "first_name": "Test",
            "last_name": f"Candidate {ts}",
            "email": f"cand.{ts}@example.com",
            "skills": ["Python", "FastAPI"],
            "status": "RECEIVED"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert cand_resp.status_code == 200
    cand_id = cand_resp.json()["id"]

    # 4. Upload Candidate Resume to /candidates/{candidate_id}/documents
    file_content = b"%PDF-1.4 dummy test cv content"
    doc_resp = client.post(
        f"/api/v1/candidates/{cand_id}/documents",
        files={"file": ("resume_v1.pdf", file_content, "application/pdf")},
        data={"document_type": "Resume"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert doc_resp.status_code == 200
    doc_id = doc_resp.json()["id"]

    # 5. Submit CV to Requirement
    sub_resp = client.post(
        "/api/v1/submissions",
        json={
            "client_id": client_id,
            "requirement_id": req_id,
            "candidate_id": cand_id,
            "document_id": doc_id,
            "remarks": "Submitting qualified profile"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["status"] == "SUBMITTED"

    # 6. Advance Status
    adv_resp = client.put(
        f"/api/v1/submissions/{sub_data['id']}/status",
        json={"status": "SHORTLISTED", "remarks": "Client reviewed and shortlisted"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert adv_resp.status_code == 200
    assert adv_resp.json()["status"] == "SHORTLISTED"
