import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_admin_token():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@recruitflow.com", "password": "AdminPassword123!"})
    return resp.json()["access_token"]

def test_dashboard_summary():
    token = get_admin_token()
    resp = client.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert "pipeline_funnel" in data
    assert "timeseries" in data
    assert "client_performance" in data
    assert "recruiter_performance" in data
    assert "time_metrics" in data
    assert data["kpis"]["total_candidates"] >= 0
    assert len(data["pipeline_funnel"]) >= 7

def test_time_series_endpoint():
    token = get_admin_token()
    resp = client.get("/api/v1/analytics/time-series?granularity=daily&days=14", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) >= 10
    assert "candidates_added" in points[0]
    assert "cvs_submitted" in points[0]

def test_audit_logs_endpoint():
    token = get_admin_token()
    resp = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)
