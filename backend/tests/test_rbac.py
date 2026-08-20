import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(email: str, password: str = "Password123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def test_admin_can_access_users_list():
    admin_token = get_token("sarah.admin@recruitflow.com")
    resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_client_cannot_access_users_list():
    client_token = get_token("david.client@novatech.com")
    resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {client_token}"})
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]

def test_client_scoped_requirements():
    admin_token = get_token("admin@recruitflow.com", "AdminPassword123!")
    client_token = get_token("david.client@novatech.com")
    ts = int(time.time() * 1000)

    # Admin creates client A and client B
    c1 = client.post("/api/v1/clients", json={"name": f"NovaTech {ts}", "status": "ACTIVE"}, headers={"Authorization": f"Bearer {admin_token}"}).json()
    c2 = client.post("/api/v1/clients", json={"name": f"OtherCorp {ts}", "status": "ACTIVE"}, headers={"Authorization": f"Bearer {admin_token}"}).json()

    # Create reqs for both
    client.post("/api/v1/requirements", json={"client_id": c1["id"], "job_title": "Req 1", "required_skills": ["Go"]}, headers={"Authorization": f"Bearer {admin_token}"})
    client.post("/api/v1/requirements", json={"client_id": c2["id"], "job_title": "Req 2", "required_skills": ["Rust"]}, headers={"Authorization": f"Bearer {admin_token}"})

    # Recruiter can access requirements
    rec_token = get_token("alex.recruiter@recruitflow.com")
    rec_resp = client.get("/api/v1/requirements", headers={"Authorization": f"Bearer {rec_token}"})
    assert rec_resp.status_code == 200
    assert len(rec_resp.json()) >= 2
