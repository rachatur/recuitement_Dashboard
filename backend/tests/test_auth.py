import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@recruitflow.com", "password": "AdminPassword123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "admin@recruitflow.com"
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@recruitflow.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_token_refresh():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sarah.admin@recruitflow.com", "password": "Password123!"}
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah.admin@recruitflow.com"

def test_get_me():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.recruiter@recruitflow.com", "password": "Password123!"}
    )
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alex.recruiter@recruitflow.com"
    assert me_resp.json()["role"] == "RECRUITER"
