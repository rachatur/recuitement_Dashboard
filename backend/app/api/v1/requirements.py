import os
import uuid
import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.core.storage import storage_service, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from app.services.notification_service import broadcast_role_notification
from app.models import (
    JobRequirement, Client, User, CVSubmission, RequirementDocument,
    WhatsAppCampaign, AuditLog, RequirementStatusEnum, PositionStatusEnum,
    PriorityEnum, WorkModeEnum
)
from app.schemas import (
    RequirementCreate, RequirementUpdate, RequirementResponse,
    PositionStatusUpdateRequest, RequirementDocumentResponse
)

router = APIRouter(prefix="/requirements", tags=["Requirements & Job Management"])

def build_requirement_response_obj(r: JobRequirement, db: Session) -> RequirementResponse:
    cands_count = db.query(CVSubmission).filter(CVSubmission.requirement_id == r.id).count()
    campaigns_count = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.requirement_id == r.id).count()

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
        "hold_date": r.hold_date,
        "closed_date": r.closed_date,
        "target_closing_date": r.target_closing_date,
        "status_updated_at": r.status_updated_at or r.updated_at,
        "assigned_recruiter_id": str(r.assigned_recruiter_id) if r.assigned_recruiter_id else None,
        "recruiter_name": r.assigned_recruiter.full_name if r.assigned_recruiter else None,
        "status": r.status,
        "position_status": r.position_status or PositionStatusEnum.OPEN,
        "job_description": r.job_description,
        "jd_attachment_name": r.jd_attachment_name,
        "jd_attachment_url": r.jd_attachment_url,
        "jd_attachment_size": r.jd_attachment_size or 0,
        "jd_attachment_mime": r.jd_attachment_mime or "application/pdf",
        "candidates_count": cands_count,
        "related_campaigns_count": campaigns_count,
        "created_at": r.created_at,
        "updated_at": r.updated_at
    }
    return RequirementResponse(**r_dict)

@router.get("", response_model=List[RequirementResponse])
def get_requirements(
    search: Optional[str] = None,
    client_id: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    status: Optional[str] = None,
    position_status: Optional[str] = None,
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
    if position_status:
        query = query.filter(JobRequirement.position_status == position_status)
    if priority:
        query = query.filter(JobRequirement.priority == priority)
    if search:
        query = query.filter(
            JobRequirement.job_title.ilike(f"%{search}%") | 
            JobRequirement.req_code.ilike(f"%{search}%") |
            JobRequirement.department.ilike(f"%{search}%")
        )

    reqs = query.order_by(JobRequirement.created_at.desc()).all()
    return [build_requirement_response_obj(r, db) for r in reqs]

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
    return build_requirement_response_obj(req, db)

@router.post("", response_model=RequirementResponse, status_code=status.HTTP_200_OK)
def create_requirement(
    req_in: RequirementCreate,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    # Verify client exists
    client = db.query(Client).filter(Client.id == req_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client organization not found")

    req_code = f"REQ-{random.randint(1000, 9999)}"
    assigned_recruiter_id = req_in.assigned_recruiter_id or current_user.id
    now = datetime.now(timezone.utc)

    open_date = req_in.open_date or now
    hold_date = req_in.hold_date if req_in.status == RequirementStatusEnum.ON_HOLD else None
    if req_in.status == RequirementStatusEnum.ON_HOLD and not hold_date:
        hold_date = now
    closed_date = req_in.closed_date if req_in.status in [RequirementStatusEnum.CLOSED, RequirementStatusEnum.CANCELLED] else None
    if req_in.status in [RequirementStatusEnum.CLOSED, RequirementStatusEnum.CANCELLED] and not closed_date:
        closed_date = now

    req = JobRequirement(
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
        open_date=open_date,
        hold_date=hold_date,
        closed_date=closed_date,
        target_closing_date=req_in.target_closing_date,
        status_updated_at=now,
        assigned_recruiter_id=assigned_recruiter_id,
        status=req_in.status,
        position_status=req_in.position_status or PositionStatusEnum.OPEN,
        job_description=req_in.job_description
    )

    db.add(req)
    db.flush()

    # Log Audit history
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="REQUIREMENT_CREATED",
        entity="REQUIREMENT",
        entity_id=req.id,
        new_value={"req_code": req.req_code, "job_title": req.job_title, "client": client.name, "position_status": req.position_status.value},
        remarks=f"Position {req.req_code} ({req.job_title}) created for {client.name} with status OPEN (Opened on {open_date.strftime('%Y-%m-%d')})."
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return build_requirement_response_obj(req, db)

@router.put("/{req_id}", response_model=RequirementResponse)
def update_requirement(
    req_id: str,
    req_in: RequirementUpdate,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    now = datetime.now(timezone.utc)
    old_status = req.status
    old_dict = {
        "position_status": req.position_status.value if req.position_status else "OPEN",
        "status": req.status.value if hasattr(req.status, 'value') else str(req.status),
        "openings_count": req.openings_count,
        "filled_count": req.filled_count
    }

    update_data = req_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(req, field, val)

    # Date handling upon status transitions
    if "status" in update_data and update_data["status"] != old_status:
        req.status_updated_at = now
        if req.status == RequirementStatusEnum.ON_HOLD and not req.hold_date:
            req.hold_date = now
        elif req.status in [RequirementStatusEnum.CLOSED, RequirementStatusEnum.CANCELLED] and not req.closed_date:
            req.closed_date = now
        elif req.status == RequirementStatusEnum.OPEN:
            req.position_status = PositionStatusEnum.OPEN

    req.updated_at = now

    # Log Audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="REQUIREMENT_UPDATED",
        entity="REQUIREMENT",
        entity_id=req.id,
        old_value=old_dict,
        new_value={
            "position_status": req.position_status.value if req.position_status else "OPEN",
            "status": req.status.value if hasattr(req.status, 'value') else str(req.status)
        },
        remarks=f"Requirement {req.req_code} ({req.job_title}) updated (Status: {req.status})."
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return build_requirement_response_obj(req, db)

@router.put("/{req_id}/position-status", response_model=RequirementResponse)
def update_position_status(
    req_id: str,
    status_in: PositionStatusUpdateRequest,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Changes position status: Open <-> On Hold <-> Closed with immutable date-wise history tracking.
    """
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    now = datetime.now(timezone.utc)
    old_status = req.position_status.value if req.position_status else "OPEN"
    req.position_status = status_in.position_status
    req.status_updated_at = now

    if status_in.position_status == PositionStatusEnum.CLOSED:
        req.status = RequirementStatusEnum.CLOSED
        if not req.closed_date:
            req.closed_date = now
    elif status_in.position_status == PositionStatusEnum.ON_HOLD:
        req.status = RequirementStatusEnum.ON_HOLD
        if not req.hold_date:
            req.hold_date = now
    else:
        req.status = RequirementStatusEnum.OPEN

    req.updated_at = now

    remarks_text = status_in.remarks or f"Position {req.req_code} changed from {old_status} to {status_in.position_status.value} by {current_user.full_name} on {now.strftime('%Y-%m-%d')}."

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="POSITION_STATUS_CHANGED",
        entity="REQUIREMENT",
        entity_id=req.id,
        old_value={"position_status": old_status},
        new_value={"position_status": status_in.position_status.value, "remarks": status_in.remarks},
        remarks=remarks_text
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return build_requirement_response_obj(req, db)

@router.post("/{req_id}/jd/upload", response_model=RequirementResponse)
async def upload_job_description_file(
    req_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Uploads client's Job Description document (PDF, DOC, DOCX) and attaches to requirement.
    """
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    filename, ext = storage_service.validate_file(file)
    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB"
        )

    safe_name = f"requirement_{req.id}_{uuid.uuid4().hex[:6]}_{filename}"
    req_dir = os.path.join(storage_service.local_dir, "requirements", str(req.id))
    os.makedirs(req_dir, exist_ok=True)
    local_path = os.path.join(req_dir, safe_name)
    with open(local_path, "wb") as f_out:
        f_out.write(content)

    doc = RequirementDocument(
        requirement_id=req.id,
        file_name=filename,
        file_type="Job_Description",
        file_size=file_size,
        mime_type=file.content_type or "application/pdf",
        storage_path=os.path.relpath(local_path, storage_service.local_dir),
        file_url=f"/api/v1/requirements/{req.id}/jd/download",
        uploaded_by_id=current_user.id
    )
    db.add(doc)

    req.jd_attachment_name = filename
    req.jd_attachment_path = doc.storage_path
    req.jd_attachment_size = file_size
    req.jd_attachment_mime = file.content_type or "application/pdf"
    req.jd_attachment_url = f"/api/v1/requirements/{req.id}/jd/download"
    req.updated_at = datetime.now(timezone.utc)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="JD_DOCUMENT_ATTACHED",
        entity="REQUIREMENT",
        entity_id=req.id,
        new_value={"file_name": filename, "file_size": file_size},
        remarks=f"Job Description file '{filename}' attached to requirement {req.req_code}."
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return build_requirement_response_obj(req, db)

@router.get("/{req_id}/jd/download")
def download_job_description(
    req_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Downloads the attached Job Description file retaining the original filename.
    """
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if not req.jd_attachment_path:
        # Provide clean sample JD PDF
        sample_filename = f"{req.job_title.replace(' ', '_')}_JD.pdf"
        sample_pdf = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 200 >> stream
BT /F1 18 Tf 50 720 Td (RecruitFlow Job Description: {req.job_title}) Tj ET
BT /F1 12 Tf 50 680 Td (Code: {req.req_code} | Client: {req.client.name if req.client else 'Enterprise'}) Tj ET
BT /F1 12 Tf 50 650 Td (Required Skills: {', '.join(req.required_skills or [])}) Tj ET
BT /F1 12 Tf 50 620 Td (Experience: {req.experience_min} - {req.experience_max} Years | Location: {req.location}) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000201 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
450
%%EOF"""
        return Response(
            content=sample_pdf.encode("utf-8"),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{sample_filename}"'}
        )

    full_path = os.path.join(storage_service.local_dir, req.jd_attachment_path)
    if os.path.exists(full_path):
        return FileResponse(
            path=full_path,
            filename=req.jd_attachment_name or "Job_Description.pdf",
            media_type=req.jd_attachment_mime or "application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{req.jd_attachment_name or "Job_Description.pdf"}"'}
        )

    raise HTTPException(status_code=404, detail="JD Attachment file not found")

@router.delete("/{req_id}/jd", response_model=RequirementResponse)
def remove_job_description(
    req_id: str,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    req = db.query(JobRequirement).filter(JobRequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    old_file = req.jd_attachment_name
    req.jd_attachment_name = None
    req.jd_attachment_path = None
    req.jd_attachment_size = 0
    req.jd_attachment_url = None
    req.updated_at = datetime.now(timezone.utc)

    # Delete docs
    db.query(RequirementDocument).filter(RequirementDocument.requirement_id == req.id).delete()

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="JD_DOCUMENT_REMOVED",
        entity="REQUIREMENT",
        entity_id=req.id,
        remarks=f"Job Description file '{old_file}' removed from requirement {req.req_code}."
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return build_requirement_response_obj(req, db)
