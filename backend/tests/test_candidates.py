import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(email: str = "alex.recruiter@recruitflow.com", password: str = "Password123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

import time

def test_create_and_query_candidate():
    token = get_token()
    unique_email = f"test.candidate.{int(time.time() * 1000)}@example.com"
    cand_data = {
        "first_name": "Marcus",
        "last_name": "Brody",
        "email": unique_email,
        "phone": "+1 (555) 998-1122",
        "location": "Denver, CO",
        "total_experience": 5.0,
        "relevant_experience": 4.5,
        "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
        "source": "Direct",
        "status": "RECEIVED"
    }
    create_resp = client.post(
        "/api/v1/candidates",
        json=cand_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_resp.status_code == 200
    candidate = create_resp.json()
    assert candidate["candidate_code"].startswith("CAN-")
    assert candidate["first_name"] == "Marcus"

    # Detail check: should have initial timeline record
    detail_resp = client.get(
        f"/api/v1/candidates/{candidate['id']}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["status_history"]) >= 1
    assert detail["status_history"][0]["new_status"] == "RECEIVED"

def test_candidate_status_update_creates_timeline():
    token = get_token()
    # Query candidates list
    cands_resp = client.get("/api/v1/candidates", headers={"Authorization": f"Bearer {token}"})
    assert cands_resp.status_code == 200
    cands = cands_resp.json()
    assert len(cands) > 0
    candidate_id = cands[0]["id"]

    # Update candidate status
    update_resp = client.put(
        f"/api/v1/candidates/{candidate_id}",
        json={"status": "SHORTLISTED", "remarks": "Automated test screening passed"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_resp.status_code == 200

    # Verify timeline updated
    detail_resp = client.get(
        f"/api/v1/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_resp.status_code == 200
    history = detail_resp.json()["status_history"]
    latest_hist = history[0]
    assert latest_hist["new_status"] == "SHORTLISTED"
    assert "Automated test screening passed" in latest_hist["remarks"]

def test_delete_candidate_and_document():
    token = get_token()
    ts = int(time.time() * 1000)

    # 1. Create candidate
    c_resp = client.post(
        "/api/v1/candidates",
        json={"first_name": "Delete", "last_name": f"Test {ts}", "email": f"delete.{ts}@example.com"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert c_resp.status_code == 200
    cand_id = c_resp.json()["id"]

    # 2. Upload a test document
    doc_resp = client.post(
        f"/api/v1/candidates/{cand_id}/documents",
        files={"file": ("wrong_resume.pdf", b"%PDF-1.4 wrong resume", "application/pdf")},
        data={"document_type": "Resume"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert doc_resp.status_code == 200
    doc_id = doc_resp.json()["id"]

    # 3. Delete specific document
    del_doc_resp = client.delete(
        f"/api/v1/candidates/{cand_id}/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_doc_resp.status_code == 200

    # 4. Delete candidate
    del_cand_resp = client.delete(
        f"/api/v1/candidates/{cand_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_cand_resp.status_code == 200

    # 5. Confirm candidate 404s
    assert client.get(f"/api/v1/candidates/{cand_id}", headers={"Authorization": f"Bearer {token}"}).status_code == 404

def test_employment_history_and_job_stability_analysis():
    token = get_token()
    ts = int(time.time() * 1000)

    # 1. Create a candidate with 4 companies in 4 years (HR-20 Example Scenario)
    cand_data = {
        "first_name": "Job",
        "last_name": f"Changer {ts}",
        "email": f"frequent.changer.{ts}@example.com",
        "total_experience": 4.0,
        "current_company": "Fourth Company Ltd",
        "current_designation": "Staff Engineer",
        "employment_history": [
            {
                "company_name": "Fourth Company Ltd",
                "designation": "Staff Engineer",
                "start_date": "2023-01",
                "end_date": "Present",
                "duration_years": 1.0,
                "duration_months": 12,
                "is_current": True,
                "reason_for_leaving": None
            },
            {
                "company_name": "Third Company Inc",
                "designation": "Senior Engineer",
                "start_date": "2022-01",
                "end_date": "2022-12",
                "duration_years": 1.0,
                "duration_months": 12,
                "is_current": False,
                "reason_for_leaving": "Career Advancement & Scope Expansion"
            },
            {
                "company_name": "Second Startup Corp",
                "designation": "Developer",
                "start_date": "2021-01",
                "end_date": "2021-12",
                "duration_years": 1.0,
                "duration_months": 12,
                "is_current": False,
                "reason_for_leaving": "Contract Completed / Startup Pivoted"
            },
            {
                "company_name": "First Venture LLC",
                "designation": "Junior Developer",
                "start_date": "2020-01",
                "end_date": "2020-12",
                "duration_years": 1.0,
                "duration_months": 12,
                "is_current": False,
                "reason_for_leaving": "Completed Initial Graduate Role"
            }
        ]
    }

    create_resp = client.post(
        "/api/v1/candidates",
        json=cand_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_resp.status_code == 200
    candidate = create_resp.json()

    # Verify Computed HR-20 Stability & Retention Metrics
    assert candidate["companies_count"] == 4
    assert candidate["average_tenure_years"] == 1.0
    assert candidate["stability_metrics"]["average_tenure_months"] == 12
    assert candidate["stability_metrics"]["job_changes_recent_years"] == 3
    assert "3 job changes in 4 years" in candidate["stability_metrics"]["job_changes_summary"]
    assert "4.0 years of experience | 4 companies | Average tenure: 12 months | 3 job changes in 4 years" in candidate["stability_metrics"]["summary_headline"]
    assert candidate["stability_metrics"]["hr_review_required"] is True
    assert candidate["stability_rating"] == "FREQUENT_CHANGER"
    assert len(candidate["employment_history"]) == 4
    assert candidate["employment_history"][1]["reason_for_leaving"] == "Career Advancement & Scope Expansion"

    # 2. Update employment history to include an employment gap
    updated_history_with_gap = [
        {
            "company_name": "High Retention Corp",
            "designation": "Principal Architect",
            "start_date": "2022-06",
            "end_date": "Present",
            "duration_years": 2.0,
            "duration_months": 24,
            "is_current": True,
            "reason_for_leaving": None
        },
        {
            "company_name": "Past Enterprise",
            "designation": "Senior Engineer",
            "start_date": "2019-01",
            "end_date": "2021-12",
            "duration_years": 3.0,
            "duration_months": 36,
            "is_current": False,
            "reason_for_leaving": "Career Break for Certification & Relocation"
        }
    ]

    put_hist_resp = client.put(
        f"/api/v1/candidates/{candidate['id']}/employment-history",
        json=updated_history_with_gap,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert put_hist_resp.status_code == 200
    updated_cand = put_hist_resp.json()
    assert len(updated_cand["employment_history"]) == 2
    assert updated_cand["companies_count"] == 2
    # Verify Gap calculation: 2021-12 to 2022-06 is 6 months gap
    assert updated_cand["stability_metrics"]["total_gaps_count"] == 1
    assert updated_cand["stability_metrics"]["total_gap_months"] == 6
    assert len(updated_cand["stability_metrics"]["employment_gaps"]) == 1
    assert updated_cand["stability_metrics"]["employment_gaps"][0]["gap_months"] == 6

    # 3. Test filtering by stability_rating
    filter_resp = client.get(
        "/api/v1/candidates?stability_rating=HIGH_RETENTION",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert filter_resp.status_code == 200

def test_candidate_status_history_feed_analytics():
    token = get_token()
    ts = int(time.time() * 1000)

    # Create candidate
    cand_resp = client.post(
        "/api/v1/candidates",
        json={
            "first_name": "History",
            "last_name": f"Tracker {ts}",
            "email": f"history.tracker.{ts}@example.com",
            "total_experience": 3.0,
            "status": "RECEIVED"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert cand_resp.status_code == 200
    candidate = cand_resp.json()

    # Update candidate status to INTERVIEW
    upd_resp = client.put(
        f"/api/v1/candidates/{candidate['id']}/status",
        json={"status": "INTERVIEW", "remarks": "Shortlisted and scheduled for interview round 1"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upd_resp.status_code == 200

    # Call history-feed analytics endpoint
    feed_resp = client.get(
        "/api/v1/candidates/history-feed",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert feed_resp.status_code == 200
    feed_data = feed_resp.json()

    assert "summary" in feed_data
    assert "feed" in feed_data
    assert "candidates" in feed_data
    assert feed_data["summary"]["total_candidates"] >= 1
    assert feed_data["summary"]["in_interview"] >= 1

    # Check that our candidate's status change event appears in the feed
    matching_events = [e for e in feed_data["feed"] if e["candidate_id"] == candidate["id"]]
    assert len(matching_events) >= 1
    latest_ev = matching_events[0]
    assert latest_ev["new_status"] == "INTERVIEW"
    assert "interview round 1" in latest_ev["remarks"]



