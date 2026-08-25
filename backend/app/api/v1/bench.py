from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.core.audit import log_audit_event
from app.models import Candidate, BenchResource, JobRequirement, User, AuditLog, BenchStatusEnum
from app.schemas import (
    BenchCandidateResponse, BenchStatusUpdateRequest,
    RequirementMatchResultResponse
)
from app.services.bench_service import (
    query_bench_candidates, match_candidates_to_job_requirement,
    build_bench_candidate_response
)

router = APIRouter(prefix="/bench", tags=["Bench Management"])

@router.get("", response_model=List[BenchCandidateResponse])
def get_bench_candidates(
    search: Optional[str] = None,
    skill: Optional[str] = None,
    min_exp: Optional[float] = None,
    max_exp: Optional[float] = None,
    location: Optional[str] = None,
    designation: Optional[str] = None,
    bench_status: Optional[str] = None,
    notice_period: Optional[str] = None,
    whatsapp_eligible_only: bool = False,
    consent_status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Lists candidates currently on the Bench with rich filtering options:
    - Skills, Experience, Location, Designation, Bench Status, Notice Period, WhatsApp Eligibility.
    """
    return query_bench_candidates(
        db=db,
        search=search,
        skill=skill,
        min_exp=min_exp,
        max_exp=max_exp,
        location=location,
        designation=designation,
        bench_status=bench_status,
        notice_period=notice_period,
        whatsapp_eligible_only=whatsapp_eligible_only,
        consent_status=consent_status
    )

@router.put("/{candidate_id}/status", response_model=BenchCandidateResponse)
def update_bench_status(
    candidate_id: str,
    status_in: BenchStatusUpdateRequest,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_status = str(cand.bench_status.value if hasattr(cand.bench_status, 'value') else cand.bench_status)
    cand.bench_status = status_in.bench_status
    cand.updated_at = datetime.now(timezone.utc)

    bench_rec = cand.bench_resource
    if status_in.bench_status == BenchStatusEnum.NOT_ON_BENCH:
        if bench_rec:
            db.delete(bench_rec)
    else:
        if not bench_rec:
            bench_rec = BenchResource(
                candidate_id=cand.id,
                bench_status=status_in.bench_status,
                primary_skills=cand.bench_primary_skills or (cand.skills[:5] if cand.skills else []),
                secondary_skills=cand.bench_secondary_skills or (cand.skills[5:] if cand.skills and len(c.skills) > 5 else []),
                availability_date=status_in.availability_date or datetime.now(timezone.utc),
                assigned_requirement_id=status_in.assigned_requirement_id,
                recruiter_id=current_user.id,
                notes=status_in.notes
            )
            db.add(bench_rec)
        else:
            bench_rec.bench_status = status_in.bench_status
            if status_in.availability_date:
                bench_rec.availability_date = status_in.availability_date
            bench_rec.assigned_requirement_id = status_in.assigned_requirement_id
            if status_in.notes:
                bench_rec.notes = status_in.notes
            bench_rec.updated_at = datetime.now(timezone.utc)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="BENCH_STATUS_CHANGED",
        entity="BENCH",
        entity_id=cand.id,
        old_value={"bench_status": old_status},
        new_value={"bench_status": status_in.bench_status.value, "notes": status_in.notes},
        remarks=f"Candidate {cand.first_name} {cand.last_name} bench status changed from {old_status} to {status_in.bench_status.value}."
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)

    return build_bench_candidate_response(cand, db)

@router.post("/match-requirement", response_model=RequirementMatchResultResponse)
def match_bench_to_requirement(
    requirement_id: str = Query(...),
    bench_only: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Calculates match percentages and scores candidates against a Job Requirement:
    - Analyzes required skills, experience fit, location, availability.
    - Shows match %, matched skills, missing skills, and WhatsApp outreach eligibility.
    """
    try:
        return match_candidates_to_job_requirement(db, requirement_id, bench_only=bench_only)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
