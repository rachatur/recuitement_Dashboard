import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.services.notification_service import broadcast_role_notification
from app.models import JobRequirement, Client, User, CVSubmission, RequirementStatusEnum, PriorityEnum, WorkModeEnum
from app.schemas import RequirementCreate, RequirementUpdate, RequirementResponse

router = APIRouter(prefix="/requirements", tags=["Requirements & Job Management"])

@router.get("", response_model=List[RequirementResponse])
def get_requirements(
    search: Optional[str] = None,
    client_id: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(JobRequirement)

    # Scoping for CLIENT / HIRING_MANAGER
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        query = query.filter(JobRequirement.client_id == current_user.client_id)
    elif client_id:
        query = query.filter(JobRequirement.client_id == client_id)

    if recruiter_id:
        query = query.filter(JobRequirement.assigned_recruiter_id == recruiter_id)
    if status:
        query = query.filter(JobRequirement.status == status)
    if priority:
        query = query.filter(JobRequirement.priority == priority)
    if search:
        query = query.filter(
            JobRequirement.job_title.ilike(f"%{search}%") | 
            JobRequirement.req_code.ilike(f"%{search}%") |
            JobRequirement.department.ilike(f"%{search}%")
        )

    reqs = query.order_by(JobRequirement.created_at.desc()).all()
    results = []
    for r in reqs:
        cands_count = db.query(CVSubmission).filter(CVSubmission.requirement_id == r.id).count()
        r_dict = {
            "id": str(r.id),
            "req_code": r.req_code,
            "client_id": str(r.client_id),
            "client_name": r.client.name if r.client else None,
            "job_title": r.job_title,
            "department": r.department,
            "required_skills": r.required_skills or [],
            "experience_min": r.experience_min,
            "experience_max": r.experience_max,
            "education": r.education,
            "location": r.location,
            "work_mode": r.work_mode,
            "salary_min": r.salary_min,
            "salary_max": r.salary_max,
            "salary_currency": r.salary_currency,
            "openings_count": r.openings_count,
            "filled_count": r.filled_count,
            "priority": r.priority,
            "open_date": r.open_date,
            "target_closing_date": r.target_closing_date,
            "assigned_recruiter_id": str(r.assigned_recruiter_id) if r.assigned_recruiter_id else None,
            "recruiter_name": r.assigned_recruiter.full_name if r.assigned_recruiter else None,
            "status": r.status,
            "job_description": r.job_description,
            "candidates_count": cands_count,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        }
        results.append(RequirementResponse(**r_dict))
    return results

@router.get("/{req_id}", response_model=RequirementResponse)
def get_requirement(
    req_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    verify_client_access(current_user, str(req.client_id))

    cands_count = db.query(CVSubmission).filter(CVSubmission.requirement_id == req.id).count()

    return RequirementResponse(
        id=str(req.id),
        req_code=req.req_code,
        client_id=str(req.client_id),
        client_name=req.client.name if req.client else None,
        job_title=req.job_title,
        department=req.department,
        required_skills=req.required_skills or [],
        experience_min=req.experience_min,
        experience_max=req.experience_max,
        education=req.education,
        location=req.location,
        work_mode=req.work_mode,
        salary_min=req.salary_min,
        salary_max=req.salary_max,
        salary_currency=req.salary_currency,
        openings_count=req.openings_count,
        filled_count=req.filled_count,
        priority=req.priority,
        open_date=req.open_date,
        target_closing_date=req.target_closing_date,
        assigned_recruiter_id=str(req.assigned_recruiter_id) if req.assigned_recruiter_id else None,
        recruiter_name=req.assigned_recruiter.full_name if req.assigned_recruiter else None,
        status=req.status,
        job_description=req.job_description,
        candidates_count=cands_count,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

@router.post("", response_model=RequirementResponse)
def create_requirement(
    req_in: RequirementCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    req_code = f"REQ-{random.randint(1000, 9999)}"
    
    new_req = JobRequirement(
        req_code=req_code,
        client_id=req_in.client_id,
        job_title=req_in.job_title,
        department=req_in.department,
        required_skills=req_in.required_skills,
        experience_min=req_in.experience_min,
        experience_max=req_in.experience_max,
        education=req_in.education,
        location=req_in.location,
        work_mode=req_in.work_mode,
        salary_min=req_in.salary_min,
        salary_max=req_in.salary_max,
        salary_currency=req_in.salary_currency,
        openings_count=req_in.openings_count,
        filled_count=0,
        priority=req_in.priority,
        target_closing_date=req_in.target_closing_date,
        assigned_recruiter_id=req_in.assigned_recruiter_id or current_user.id,
        status=req_in.status,
        job_description=req_in.job_description
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    log_audit_event(
        db=db,
        action="REQUIREMENT_CREATED",
        entity="JOB_REQUIREMENT",
        entity_id=new_req.id,
        user=current_user,
        request=request,
        new_value={"code": new_req.req_code, "title": new_req.job_title, "client_id": new_req.client_id}
    )

    # Broadcast notification to recruiters
    broadcast_role_notification(
        db=db,
        roles=[RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD],
        title="New Requirement Published",
        message=f"New requirement '{new_req.job_title}' ({new_req.req_code}) has been opened.",
        reference_entity="REQUIREMENT",
        reference_id=new_req.id
    )

    return RequirementResponse(
        id=str(new_req.id),
        req_code=new_req.req_code,
        client_id=str(new_req.client_id),
        client_name=new_req.client.name if new_req.client else None,
        job_title=new_req.job_title,
        department=new_req.department,
        required_skills=new_req.required_skills or [],
        experience_min=new_req.experience_min,
        experience_max=new_req.experience_max,
        education=new_req.education,
        location=new_req.location,
        work_mode=new_req.work_mode,
        salary_min=new_req.salary_min,
        salary_max=new_req.salary_max,
        salary_currency=new_req.salary_currency,
        openings_count=new_req.openings_count,
        filled_count=new_req.filled_count,
        priority=new_req.priority,
        open_date=new_req.open_date,
        target_closing_date=new_req.target_closing_date,
        assigned_recruiter_id=str(new_req.assigned_recruiter_id) if new_req.assigned_recruiter_id else None,
        recruiter_name=new_req.assigned_recruiter.full_name if new_req.assigned_recruiter else None,
        status=new_req.status,
        job_description=new_req.job_description,
        candidates_count=0,
        created_at=new_req.created_at,
        updated_at=new_req.updated_at
    )

@router.put("/{req_id}", response_model=RequirementResponse)
def update_requirement(
    req_id: str,
    req_in: RequirementUpdate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    old_state = {"status": str(req.status), "openings": req.openings_count, "filled": req.filled_count}

    for attr, val in req_in.dict(exclude_unset=True).items():
        setattr(req, attr, val)

    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        action="REQUIREMENT_UPDATED",
        entity="JOB_REQUIREMENT",
        entity_id=req.id,
        user=current_user,
        request=request,
        old_value=old_state,
        new_value={"status": str(req.status), "openings": req.openings_count, "filled": req.filled_count}
    )

    cands_count = db.query(CVSubmission).filter(CVSubmission.requirement_id == req.id).count()

    return RequirementResponse(
        id=str(req.id),
        req_code=req.req_code,
        client_id=str(req.client_id),
        client_name=req.client.name if req.client else None,
        job_title=req.job_title,
        department=req.department,
        required_skills=req.required_skills or [],
        experience_min=req.experience_min,
        experience_max=req.experience_max,
        education=req.education,
        location=req.location,
        work_mode=req.work_mode,
        salary_min=req.salary_min,
        salary_max=req.salary_max,
        salary_currency=req.salary_currency,
        openings_count=req.openings_count,
        filled_count=req.filled_count,
        priority=req.priority,
        open_date=req.open_date,
        target_closing_date=req.target_closing_date,
        assigned_recruiter_id=str(req.assigned_recruiter_id) if req.assigned_recruiter_id else None,
        recruiter_name=req.assigned_recruiter.full_name if req.assigned_recruiter else None,
        status=req.status,
        job_description=req.job_description,
        candidates_count=cands_count,
        created_at=req.created_at,
        updated_at=req.updated_at
    )
