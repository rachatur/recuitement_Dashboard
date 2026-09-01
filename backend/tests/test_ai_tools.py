import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(email: str = "alex.recruiter@recruitflow.com", password: str = "Password123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def test_ats_checker_with_raw_text():
    token = get_token()
    sample_cv = """
    John Doe
    Email: john.doe@example.com
    Phone: +1 (555) 234-5678
    Location: San Francisco, CA
    LinkedIn: https://linkedin.com/in/johndoe

    Professional Summary:
    Senior Software Engineer with 6+ years of experience in Python, FastAPI, React, Docker, and AWS.
    Proven track record of architecting scalable microservices and leading engineering teams.

    Work Experience:
    Senior Software Engineer - Tech Innovators Inc. (2021 - Present)
    - Architected and deployed 15+ microservices handling 2M+ daily requests, improving system throughput by 40%.
    - Spearheaded migration of on-prem services to AWS and Kubernetes, reducing infrastructure costs by 25%.
    - Optimized PostgreSQL query performance, decreasing average latency from 250ms to 45ms.
    - Led a team of 6 engineers and streamlined CI/CD pipelines using GitHub Actions.

    Education:
    Bachelor of Science in Computer Science - University of California, Berkeley

    Technical Skills:
    Python, FastAPI, TypeScript, React, PostgreSQL, Docker, Kubernetes, AWS, Redis, Git, CI/CD
    """

    resp = client.post(
        "/api/v1/ai-tools/ats-checker",
        data={"resume_text": sample_cv},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] >= 80
    assert "A+" in data["grade"] or "B" in data["grade"]
    assert data["contact_info_check"]["email_detected"] is True
    assert data["contact_info_check"]["phone_detected"] is True
    assert data["sections_detected"]["work_experience"] is True
    assert data["sections_detected"]["education"] is True
    assert data["sections_detected"]["skills"] is True
    assert data["content_metrics"]["action_verbs_count"] >= 3
    assert len(data["skills_analysis"]["extracted_skills"]) >= 5
    assert len(data["recommendations"]) > 0

def test_ats_checker_with_file_upload():
    token = get_token()
    cv_content = b"Jane Smith\nEmail: jane.smith@example.com\nPhone: +1 (555) 888-9999\nSkills: Python, FastAPI, Docker, React, AWS\nExperience: Software Engineer at CloudCorp\n- Engineered high-throughput REST APIs and reduced response time by 30%.\nEducation: B.Tech Computer Science\n"
    
    file_payload = {"file": ("jane_smith_resume.txt", io.BytesIO(cv_content), "text/plain")}
    
    resp = client.post(
        "/api/v1/ai-tools/ats-checker",
        files=file_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_name"] == "jane_smith_resume.txt"
    assert data["overall_score"] > 50
    assert data["candidate_details"]["first_name"] == "Jane"
    assert data["temp_file_id"] is not None

def test_ats_create_candidate_endpoint():
    import time
    token = get_token()
    unique_email = f"ats.cand.{int(time.time() * 1000)}@example.com"
    payload = {
        "first_name": "David",
        "last_name": "Miller",
        "email": unique_email,
        "phone": "+1 (555) 345-6789",
        "location": "Austin, TX",
        "total_experience": 4.0,
        "current_company": "Tech Corp",
        "current_designation": "Backend Engineer",
        "education": "B.S. Software Engineering",
        "skills": ["Python", "FastAPI", "PostgreSQL"],
        "source": "ATS_CV_Studio"
    }
    resp = client.post(
        "/api/v1/ai-tools/ats-create-candidate",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["candidate_code"].startswith("CAN-")
    assert res_data["email"] == unique_email

