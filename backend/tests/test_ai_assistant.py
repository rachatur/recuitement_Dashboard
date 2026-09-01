import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

def get_token(email: str = "alex.recruiter@recruitflow.com", password: str = "Password123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

@pytest.fixture
def auth_headers():
    token = get_token()
    return {"Authorization": f"Bearer {token}"}

def test_get_quick_prompts(auth_headers):
    response = client.get("/api/v1/ai-assistant/quick-prompts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    assert any(cat["category"] == "Talent Sourcing" for cat in data)

def test_ai_assistant_candidate_search(auth_headers):
    response = client.post(
        "/api/v1/ai-assistant/chat",
        headers=auth_headers,
        json={
            "message": "Find Python developers with 3+ years experience",
            "mode": "general"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert data["intent"] in ["candidate_search", "general"]
    assert isinstance(data["suggested_prompts"], list)

def test_ai_assistant_pipeline_summary(auth_headers):
    response = client.post(
        "/api/v1/ai-assistant/chat",
        headers=auth_headers,
        json={
            "message": "Give me a recruitment pipeline summary",
            "mode": "analytics"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Talent Pool" in data["reply"] or "Pipeline" in data["reply"]
    assert data["intent"] == "pipeline_summary"

def test_ai_assistant_outreach_draft(auth_headers):
    response = client.post(
        "/api/v1/ai-assistant/chat",
        headers=auth_headers,
        json={
            "message": "Draft a WhatsApp outreach message for Alex for Senior Full Stack Engineer",
            "mode": "general"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "WhatsApp" in data["reply"]
    assert data["intent"] == "outreach_draft"
