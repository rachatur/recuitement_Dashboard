from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user
from app.models import Candidate, JobRequirement, User
from app.schemas import (
    AIParseResumeRequest, AIParseResumeResponse,
    AIMatchScoreRequest, AIMatchScoreResponse
)
from app.services.ai_service import simulate_resume_parsing, calculate_candidate_match

router = APIRouter(prefix="/ai-tools", tags=["AI Module & Matching Tools"])

@router.post("/parse-resume", response_model=AIParseResumeResponse)
def parse_resume(
    req: AIParseResumeRequest,
    current_user: User = Depends(get_current_active_user)
):
    parsed = simulate_resume_parsing(req.document_text)
    return AIParseResumeResponse(**parsed)

@router.post("/match-score", response_model=AIMatchScoreResponse)
def compute_match_score(
    req: AIMatchScoreRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    requirement = db.query(JobRequirement).filter(JobRequirement.id == req.requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Job requirement not found")

    match_result = calculate_candidate_match(candidate, requirement)
    return AIMatchScoreResponse(**match_result)

@router.get("/duplicate-check/{candidate_id}")
def check_duplicates(
    candidate_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    duplicates = db.query(Candidate).filter(
        Candidate.id != candidate.id,
        (
            Candidate.email == candidate.email |
            Candidate.phone == candidate.phone |
            (Candidate.first_name == candidate.first_name and Candidate.last_name == candidate.last_name)
        )
    ).all()

    return {
        "candidate_id": candidate.id,
        "is_duplicate_likely": len(duplicates) > 0,
        "potential_matches": [
            {
                "id": str(d.id),
                "code": d.candidate_code,
                "name": f"{d.first_name} {d.last_name}",
                "email": d.email,
                "phone": d.phone,
                "current_company": d.current_company
            } for d in duplicates
        ]
    }
