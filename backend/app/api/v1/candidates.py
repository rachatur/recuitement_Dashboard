import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.core.audit import log_audit_event
from app.core.storage import storage_service
from app.models import (
    Candidate, CandidateSkill, CandidateDocument, CandidateStatusHistory,
    CVSubmission, User, CandidateStatusEnum, RecruiterActivity
)
from app.schemas import (
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateDetailResponse,
    CandidateDocumentResponse, CandidateStatusHistoryResponse
)

router = APIRouter(prefix="/candidates", tags=["Candidate Management"])

@router.get("", response_model=List[CandidateResponse])
def get_candidates(
    search: Optional[str] = None,
    skill: Optional[str] = None,
    min_experience: Optional[float] = None,
    max_experience: Optional[float] = None,
    notice_days: Optional[int] = None,
    status: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)

    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        # Clients can only see candidates submitted to them
        if not current_user.client_id:
            return []
        sub_candidate_ids = db.query(CVSubmission.candidate_id).filter(CVSubmission.client_id == current_user.client_id).all()
        cand_ids = [c[0] for c in sub_candidate_ids]
        query = query.filter(Candidate.id.in_(cand_ids))

    if recruiter_id:
        query = query.filter(Candidate.recruiter_id == recruiter_id)
    if status:
        query = query.filter(Candidate.status == status)
    if min_experience is not None:
        query = query.filter(Candidate.total_experience >= min_experience)
    if max_experience is not None:
        query = query.filter(Candidate.total_experience <= max_experience)
    if notice_days is not None:
        query = query.filter(Candidate.notice_period_days <= notice_days)
    if search:
        query = query.filter(
            Candidate.first_name.ilike(f"%{search}%") |
            Candidate.last_name.ilike(f"%{search}%") |
            Candidate.email.ilike(f"%{search}%") |
            Candidate.phone.ilike(f"%{search}%") |
            Candidate.candidate_code.ilike(f"%{search}%") |
            Candidate.current_company.ilike(f"%{search}%")
        )

    candidates = query.order_by(Candidate.created_at.desc()).all()
    results = []
    for c in candidates:
        if skill:
            cand_skills_lower = [s.lower() for s in (c.skills or [])]
            if skill.lower() not in cand_skills_lower:
                continue

        active_subs = db.query(CVSubmission).filter(CVSubmission.candidate_id == c.id).count()
        latest_doc = db.query(CandidateDocument).filter(
            CandidateDocument.candidate_id == c.id
        ).order_by(CandidateDocument.version_number.desc()).first()

        doc_resp = None
        if latest_doc:
            doc_resp = CandidateDocumentResponse(
                id=str(latest_doc.id),
                candidate_id=str(latest_doc.candidate_id),
                version_number=latest_doc.version_number,
                document_type=latest_doc.document_type,
                file_name=latest_doc.file_name,
                file_size=latest_doc.file_size,
                mime_type=latest_doc.mime_type,
                file_url=latest_doc.file_url,
                uploaded_by_id=str(latest_doc.uploaded_by_id) if latest_doc.uploaded_by_id else None,
                uploaded_by_name=latest_doc.uploaded_by.full_name if latest_doc.uploaded_by else None,
                created_at=latest_doc.created_at
            )

        c_dict = {
            "id": str(c.id),
            "candidate_code": c.candidate_code,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "location": c.location,
            "preferred_location": c.preferred_location,
            "total_experience": c.total_experience,
            "relevant_experience": c.relevant_experience,
            "current_company": c.current_company,
            "current_ctc": c.current_ctc,
            "expected_ctc": c.expected_ctc,
            "notice_period_days": c.notice_period_days,
            "skills": c.skills or [],
            "education": c.education,
            "source": c.source,
            "recruiter_id": str(c.recruiter_id) if c.recruiter_id else None,
            "recruiter_name": c.recruiter.full_name if c.recruiter else None,
            "status": c.status,
            "active_submission_count": active_subs,
            "latest_document": doc_resp,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }
        results.append(CandidateResponse(**c_dict))
    return results

@router.get("/{candidate_id}", response_model=CandidateDetailResponse)
def get_candidate(
    candidate_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    docs = db.query(CandidateDocument).filter(
        CandidateDocument.candidate_id == cand.id
    ).order_by(CandidateDocument.version_number.desc()).all()

    history = db.query(CandidateStatusHistory).filter(
        CandidateStatusHistory.candidate_id == cand.id
    ).order_by(CandidateStatusHistory.created_at.desc()).all()

    doc_responses = [
        CandidateDocumentResponse(
            id=str(d.id),
            candidate_id=str(d.candidate_id),
            version_number=d.version_number,
            document_type=d.document_type,
            file_name=d.file_name,
            file_size=d.file_size,
            mime_type=d.mime_type,
            file_url=d.file_url,
            uploaded_by_id=str(d.uploaded_by_id) if d.uploaded_by_id else None,
            uploaded_by_name=d.uploaded_by.full_name if d.uploaded_by else None,
            created_at=d.created_at
        ) for d in docs
    ]

    hist_responses = [
        CandidateStatusHistoryResponse(
            id=str(h.id),
            candidate_id=str(h.candidate_id),
            submission_id=str(h.submission_id) if h.submission_id else None,
            requirement_id=str(h.requirement_id) if h.requirement_id else None,
            old_status=h.old_status,
            new_status=h.new_status,
            changed_by_id=str(h.changed_by_id) if h.changed_by_id else None,
            changed_by_name=h.changed_by.full_name if h.changed_by else "System",
            stage_duration_hours=h.stage_duration_hours or 0.0,
            remarks=h.remarks,
            created_at=h.created_at
        ) for h in history
    ]

    return CandidateDetailResponse(
        id=str(cand.id),
        candidate_code=cand.candidate_code,
        first_name=cand.first_name,
        last_name=cand.last_name,
        email=cand.email,
        phone=cand.phone,
        location=cand.location,
        preferred_location=cand.preferred_location,
        total_experience=cand.total_experience,
        relevant_experience=cand.relevant_experience,
        current_company=cand.current_company,
        current_ctc=cand.current_ctc,
        expected_ctc=cand.expected_ctc,
        notice_period_days=cand.notice_period_days,
        skills=cand.skills or [],
        education=cand.education,
        source=cand.source,
        recruiter_id=str(cand.recruiter_id) if cand.recruiter_id else None,
        recruiter_name=cand.recruiter.full_name if cand.recruiter else None,
        status=cand.status,
        active_submission_count=len(cand.submissions),
        latest_document=doc_responses[0] if doc_responses else None,
        documents=doc_responses,
        status_history=hist_responses,
        created_at=cand.created_at,
        updated_at=cand.updated_at
    )

@router.post("", response_model=CandidateResponse)
def create_candidate(
    cand_in: CandidateCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    existing = db.query(Candidate).filter(Candidate.email == cand_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists in the talent pool.")

    candidate_code = f"CAN-{random.randint(1000, 9999)}"
    now = datetime.now(timezone.utc)

    new_cand = Candidate(
        candidate_code=candidate_code,
        first_name=cand_in.first_name,
        last_name=cand_in.last_name,
        email=cand_in.email.lower().strip(),
        phone=cand_in.phone,
        location=cand_in.location,
        preferred_location=cand_in.preferred_location,
        total_experience=cand_in.total_experience,
        relevant_experience=cand_in.relevant_experience,
        current_company=cand_in.current_company,
        current_ctc=cand_in.current_ctc,
        expected_ctc=cand_in.expected_ctc,
        notice_period_days=cand_in.notice_period_days,
        skills=cand_in.skills,
        education=cand_in.education,
        source=cand_in.source,
        recruiter_id=cand_in.recruiter_id or current_user.id,
        status=cand_in.status,
        created_at=now,
        updated_at=now
    )
    db.add(new_cand)
    db.commit()
    db.refresh(new_cand)

    # Add skills items
    for sk in cand_in.skills:
        db.add(CandidateSkill(
            candidate_id=new_cand.id,
            skill_name=sk,
            years_experience=round(cand_in.relevant_experience * 0.8, 1)
        ))

    # CRITICAL: Record initial timeline history record
    init_hist = CandidateStatusHistory(
        candidate_id=new_cand.id,
        old_status=None,
        new_status=new_cand.status.value if hasattr(new_cand.status, 'value') else str(new_cand.status),
        changed_by_id=current_user.id,
        remarks=f"Candidate profile created by {current_user.full_name} via {new_cand.source}.",
        created_at=now
    )
    db.add(init_hist)

    # Record recruiter activity
    db.add(RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type="Candidate Added",
        entity_type="Candidate",
        entity_id=new_cand.id,
        description=f"Added candidate {new_cand.first_name} {new_cand.last_name} ({new_cand.candidate_code})."
    ))

    db.commit()

    log_audit_event(
        db=db,
        action="CANDIDATE_CREATED",
        entity="CANDIDATE",
        entity_id=new_cand.id,
        user=current_user,
        request=request,
        new_value={"code": new_cand.candidate_code, "name": f"{new_cand.first_name} {new_cand.last_name}", "email": new_cand.email}
    )

    return CandidateResponse(
        id=str(new_cand.id),
        candidate_code=new_cand.candidate_code,
        first_name=new_cand.first_name,
        last_name=new_cand.last_name,
        email=new_cand.email,
        phone=new_cand.phone,
        location=new_cand.location,
        preferred_location=new_cand.preferred_location,
        total_experience=new_cand.total_experience,
        relevant_experience=new_cand.relevant_experience,
        current_company=new_cand.current_company,
        current_ctc=new_cand.current_ctc,
        expected_ctc=new_cand.expected_ctc,
        notice_period_days=new_cand.notice_period_days,
        skills=new_cand.skills or [],
        education=new_cand.education,
        source=new_cand.source,
        recruiter_id=str(new_cand.recruiter_id) if new_cand.recruiter_id else None,
        recruiter_name=current_user.full_name,
        status=new_cand.status,
        active_submission_count=0,
        latest_document=None,
        created_at=new_cand.created_at,
        updated_at=new_cand.updated_at
    )

@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: str,
    cand_in: CandidateUpdate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_status = str(cand.status.value if hasattr(cand.status, 'value') else cand.status)
    old_state = {"status": old_status, "company": cand.current_company, "location": cand.location}

    status_changed = cand_in.status is not None and str(cand_in.status.value if hasattr(cand_in.status, 'value') else cand_in.status) != old_status

    for attr, val in cand_in.dict(exclude_unset=True, exclude={"remarks"}).items():
        setattr(cand, attr, val)

    cand.updated_at = datetime.now(timezone.utc)

    # CRITICAL: If status changed, create a new immutable status history record
    if status_changed:
        new_status_str = str(cand_in.status.value if hasattr(cand_in.status, 'value') else cand_in.status)
        hist = CandidateStatusHistory(
            candidate_id=cand.id,
            old_status=old_status,
            new_status=new_status_str,
            changed_by_id=current_user.id,
            remarks=cand_in.remarks or f"Status updated from {old_status} to {new_status_str} by {current_user.full_name}.",
            created_at=datetime.now(timezone.utc)
        )
        db.add(hist)

        # Record activity
        db.add(RecruiterActivity(
            recruiter_id=current_user.id,
            activity_type=f"Status Changed ({new_status_str})",
            entity_type="Candidate",
            entity_id=cand.id,
            description=f"Changed {cand.first_name} {cand.last_name}'s status to {new_status_str}."
        ))

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        action="CANDIDATE_UPDATED",
        entity="CANDIDATE",
        entity_id=cand.id,
        user=current_user,
        request=request,
        old_value=old_state,
        new_value={"status": str(cand.status.value if hasattr(cand.status, 'value') else cand.status), "company": cand.current_company}
    )

    return CandidateResponse(
        id=str(cand.id),
        candidate_code=cand.candidate_code,
        first_name=cand.first_name,
        last_name=cand.last_name,
        email=cand.email,
        phone=cand.phone,
        location=cand.location,
        preferred_location=cand.preferred_location,
        total_experience=cand.total_experience,
        relevant_experience=cand.relevant_experience,
        current_company=cand.current_company,
        current_ctc=cand.current_ctc,
        expected_ctc=cand.expected_ctc,
        notice_period_days=cand.notice_period_days,
        skills=cand.skills or [],
        education=cand.education,
        source=cand.source,
        recruiter_id=str(cand.recruiter_id) if cand.recruiter_id else None,
        recruiter_name=cand.recruiter.full_name if cand.recruiter else None,
        status=cand.status,
        active_submission_count=len(cand.submissions),
        latest_document=None,
        created_at=cand.created_at,
        updated_at=cand.updated_at
    )

@router.post("/{candidate_id}/documents", response_model=CandidateDocumentResponse)
async def upload_candidate_document(
    candidate_id: str,
    request: Request,
    file: UploadFile = File(...),
    document_type: str = Form("Resume"),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Find next version number (Never overwrite previous versions!)
    latest_doc = db.query(CandidateDocument).filter(
        CandidateDocument.candidate_id == cand.id,
        CandidateDocument.document_type == document_type
    ).order_by(CandidateDocument.version_number.desc()).first()

    next_version = (latest_doc.version_number + 1) if latest_doc else 1

    # Save to storage (MinIO or local fallback)
    storage_path, file_url, file_size, mime_type = await storage_service.save_file(
        file=file,
        candidate_id=str(cand.id),
        version=next_version
    )

    doc = CandidateDocument(
        candidate_id=cand.id,
        version_number=next_version,
        document_type=document_type,
        file_name=file.filename or f"Document_v{next_version}.pdf",
        file_size=file_size,
        mime_type=mime_type,
        storage_path=storage_path,
        file_url=file_url,
        uploaded_by_id=current_user.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(doc)

    # Record activity & history
    db.add(CandidateStatusHistory(
        candidate_id=cand.id,
        old_status=None,
        new_status=str(cand.status.value if hasattr(cand.status, 'value') else cand.status),
        changed_by_id=current_user.id,
        remarks=f"Uploaded new document: {doc.file_name} (Version {next_version})",
        created_at=datetime.now(timezone.utc)
    ))

    db.add(RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type="CV Uploaded",
        entity_type="CandidateDocument",
        entity_id=doc.id,
        description=f"Uploaded {doc.file_name} (v{next_version}) for {cand.first_name} {cand.last_name}."
    ))

    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        action="CV_UPLOADED",
        entity="CANDIDATE_DOCUMENT",
        entity_id=doc.id,
        user=current_user,
        request=request,
        new_value={"version": next_version, "file_name": doc.file_name, "candidate_id": str(cand.id)}
    )

    return CandidateDocumentResponse(
        id=str(doc.id),
        candidate_id=str(doc.candidate_id),
        version_number=doc.version_number,
        document_type=doc.document_type,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_url=doc.file_url,
        uploaded_by_id=str(current_user.id),
        uploaded_by_name=current_user.full_name,
        created_at=doc.created_at
    )

@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: str,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cand_name = f"{cand.first_name} {cand.last_name}"
    cand_code = cand.candidate_code

    # Remove storage files associated with this candidate
    for d in cand.documents:
        try:
            if d.storage_path and os.path.exists(d.storage_path):
                os.remove(d.storage_path)
        except Exception:
            pass

    log_audit_event(
        db=db,
        action="CANDIDATE_DELETED",
        entity="CANDIDATE",
        entity_id=candidate_id,
        user=current_user,
        request=request,
        old_value={"code": cand_code, "name": cand_name, "email": cand.email}
    )

    db.delete(cand)
    db.commit()

    return {"message": f"Candidate {cand_name} ({cand_code}) deleted successfully", "id": candidate_id}

@router.delete("/{candidate_id}/documents/{document_id}")
def delete_candidate_document(
    candidate_id: str,
    document_id: str,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    doc = db.query(CandidateDocument).filter(
        CandidateDocument.id == document_id,
        CandidateDocument.candidate_id == candidate_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found for this candidate")

    file_name = doc.file_name
    version = doc.version_number

    # Remove physical file if local
    try:
        if doc.storage_path and os.path.exists(doc.storage_path):
            os.remove(doc.storage_path)
    except Exception:
        pass

    log_audit_event(
        db=db,
        action="DOCUMENT_DELETED",
        entity="CANDIDATE_DOCUMENT",
        entity_id=document_id,
        user=current_user,
        request=request,
        old_value={"file_name": file_name, "version": version, "candidate_id": candidate_id}
    )

    db.delete(doc)
    db.commit()

    return {"message": f"Document {file_name} (v{version}) deleted successfully", "id": document_id}

