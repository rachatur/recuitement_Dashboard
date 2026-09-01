import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_admin_token():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@recruitflow.com", "password": "AdminPassword123!"})
    return resp.json()["access_token"]

def get_recruiter_token():
    resp = client.post("/api/v1/auth/login", json={"email": "alex.recruiter@recruitflow.com", "password": "Password123!"})
    return resp.json()["access_token"]

def test_extract_cv_endpoint():
    token = get_recruiter_token()
    sample_cv = b"""
    John Doe
    Email: john.doe.test@example.com
    Phone: +91 9876543210
    Location: Bangalore
    Experience: 6 years of experience in Software Engineering
    Skills: Python, FastAPI, React, PostgreSQL, Docker, AWS
    Education: B.Tech in Computer Science
    Notice Period: 30 Days
    Current Company: Tech Innovators Pvt Ltd
    """
    resp = client.post(
        "/api/v1/candidates/extract-cv",
        files={"file": ("John_Doe_Resume.txt", sample_cv, "text/plain")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_name"] == "John_Doe_Resume.txt"
    assert "john.doe.test@example.com" in data["email"]
    assert "9876543210" in data["phone"]
    assert "Python" in data["skills"]
    assert data["total_experience"] >= 5.0
    assert "whatsapp_eligibility" in data

def test_bulk_cv_upload_endpoint():
    token = get_recruiter_token()
    ts = int(time.time() * 1000)
    p1 = f"+9198{ts % 100000000:08d}"
    p2 = f"+9199{(ts + 1) % 100000000:08d}"
    cv1 = f"Alice Test_{ts}\nEmail: alice.{ts}@example.com\nPhone: {p1}\nSkills: Python, React\nExperience: 4 years".encode()
    cv2 = f"Bob Test_{ts}\nEmail: bob.{ts}@example.com\nPhone: {p2}\nSkills: Java, Spring Boot\nExperience: 5 years".encode()

    resp = client.post(
        "/api/v1/candidates/bulk-upload",
        files=[
            ("files", ("Alice_CV.txt", cv1, "text/plain")),
            ("files", ("Bob_CV.txt", cv2, "text/plain"))
        ],
        data={"duplicate_action": "skip"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_uploaded"] == 2
    assert data["successfully_processed"] >= 1
    assert len(data["items"]) == 2

def test_bench_and_requirement_matching():
    token = get_recruiter_token()
    # 1. Query Bench candidates
    bench_resp = client.get("/api/v1/bench", headers={"Authorization": f"Bearer {token}"})
    assert bench_resp.status_code == 200
    bench_list = bench_resp.json()
    assert isinstance(bench_list, list)

    # 2. Get a requirement ID
    reqs_resp = client.get("/api/v1/requirements", headers={"Authorization": f"Bearer {token}"})
    assert reqs_resp.status_code == 200
    reqs = reqs_resp.json()
    assert len(reqs) > 0
    req_id = reqs[0]["id"]

    # 3. Match requirement against candidates
    match_resp = client.post(
        f"/api/v1/bench/match-requirement?requirement_id={req_id}&bench_only=false",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert match_resp.status_code == 200
    match_data = match_resp.json()
    assert "matched_candidates" in match_data
    assert len(match_data["matched_candidates"]) > 0
    top_match = match_data["matched_candidates"][0]
    assert "match_percentage" in top_match
    assert "matched_skills" in top_match

def test_position_status_and_jd_attachment():
    token = get_admin_token()
    reqs_resp = client.get("/api/v1/requirements", headers={"Authorization": f"Bearer {token}"})
    req_id = reqs_resp.json()[0]["id"]

    # 1. Update position status to ON_HOLD
    pos_resp = client.put(
        f"/api/v1/requirements/{req_id}/position-status",
        json={"position_status": "ON_HOLD", "remarks": "Client budget temporarily on hold for Q3"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert pos_resp.status_code == 200
    assert pos_resp.json()["position_status"] == "ON_HOLD"

    # 2. Upload JD file
    jd_content = b"%PDF-1.4\nSample Job Description for Software Engineer"
    upload_jd_resp = client.post(
        f"/api/v1/requirements/{req_id}/jd/upload",
        files={"file": ("Backend_Architect_JD.pdf", jd_content, "application/pdf")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upload_jd_resp.status_code == 200
    assert upload_jd_resp.json()["jd_attachment_name"] == "Backend_Architect_JD.pdf"

    # 3. Download JD
    download_jd_resp = client.get(
        f"/api/v1/requirements/{req_id}/jd/download",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert download_jd_resp.status_code == 200

    # 4. Re-open position
    reopen_resp = client.put(
        f"/api/v1/requirements/{req_id}/position-status",
        json={"position_status": "OPEN", "remarks": "Position reopened"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["position_status"] == "OPEN"

def test_whatsapp_full_lifecycle():
    admin_tok = get_admin_token()
    rec_tok = get_recruiter_token()

    # 1. Settings
    settings_resp = client.get("/api/v1/whatsapp/settings", headers={"Authorization": f"Bearer {admin_tok}"})
    assert settings_resp.status_code == 200
    assert settings_resp.json()["provider"] in ["MOCK_SIMULATOR", "OFFICIAL_CLOUD_API", "TWILIO"]

    # 2. Test Connection
    test_conn = client.post("/api/v1/whatsapp/test-connection", headers={"Authorization": f"Bearer {admin_tok}"})
    assert test_conn.status_code == 200
    assert test_conn.json()["success"] is True

    # 3. Templates
    tmpls_resp = client.get("/api/v1/whatsapp/templates", headers={"Authorization": f"Bearer {rec_tok}"})
    assert tmpls_resp.status_code == 200
    tmpls = tmpls_resp.json()
    assert len(tmpls) > 0
    tmpl_id = tmpls[0]["id"]

    # 4. Template Preview
    preview_resp = client.post(f"/api/v1/whatsapp/templates/{tmpl_id}/preview", headers={"Authorization": f"Bearer {rec_tok}"})
    assert preview_resp.status_code == 200
    assert "rendered_body" in preview_resp.json()

    # 5. Candidates list & Simulator Reply
    cand_resp = client.get("/api/v1/candidates", headers={"Authorization": f"Bearer {rec_tok}"})
    assert cand_resp.status_code == 200
    cands = cand_resp.json()
    assert len(cands) > 0
    test_cand_id = cands[0]["id"]

    # Simulate Candidate sending "YES, Interested!"
    sim_resp = client.post(
        "/api/v1/whatsapp/conversations/simulate-reply",
        json={"candidate_id": test_cand_id, "message_text": "YES, I am definitely interested!"},
        headers={"Authorization": f"Bearer {rec_tok}"}
    )
    assert sim_resp.status_code == 200
    assert sim_resp.json()["status"] == "success"

    # Verify conversation is recorded
    convs_resp = client.get("/api/v1/whatsapp/conversations", headers={"Authorization": f"Bearer {rec_tok}"})
    assert convs_resp.status_code == 200
    convs = convs_resp.json()
    assert len(convs) > 0

    # 6. Dashboard Outreach metrics
    dash_resp = client.get("/api/v1/whatsapp/dashboard", headers={"Authorization": f"Bearer {rec_tok}"})
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "total_campaigns" in dash_data
    assert "delivery_rate_percent" in dash_data
    assert "response_categories" in dash_data

    # 7. History Audit Trail
    hist_resp = client.get("/api/v1/history", headers={"Authorization": f"Bearer {rec_tok}"})
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) > 0
