import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.services.notification_service import create_notification, broadcast_role_notification
from app.models import (
    CVSubmission, Candidate, JobRequirement, Client, CandidateDocument,
    CandidateStatusHistory, RecruiterActivity, User, SubmissionStatusEnum,
    CandidateStatusEnum, NotificationTypeEnum
)
from app.schemas import CVSubmissionCreate, CVSubmissionStatusUpdate, CVSubmissionResponse

router = APIRouter(prefix="/submissions", tags=["CV Submissions Pipeline"])

# Valid state transitions matrix
VALID_TRANSITIONS = {
    SubmissionStatusEnum.DRAFT: [SubmissionStatusEnum.SUBMITTED],
    SubmissionStatusEnum.SUBMITTED: [SubmissionStatusEnum.CLIENT_VIEWED, SubmissionStatusEnum.SHORTLISTED, SubmissionStatusEnum.REJECTED, SubmissionStatusEnum.ON_HOLD],
    SubmissionStatusEnum.CLIENT_VIEWED: [SubmissionStatusEnum.SHORTLISTED, SubmissionStatusEnum.REJECTED, SubmissionStatusEnum.ON_HOLD, SubmissionStatusEnum.INTERVIEW],
    SubmissionStatusEnum.SHORTLISTED: [SubmissionStatusEnum.INTERVIEW, SubmissionStatusEnum.ON_HOLD, SubmissionStatusEnum.REJECTED],
    SubmissionStatusEnum.INTERVIEW: [SubmissionStatusEnum.SELECTED, SubmissionStatusEnum.REJECTED, SubmissionStatusEnum.ON_HOLD],
    SubmissionStatusEnum.SELECTED: [SubmissionStatusEnum.OFFER, SubmissionStatusEnum.REJECTED],
    SubmissionStatusEnum.OFFER: [SubmissionStatusEnum.JOINED, SubmissionStatusEnum.REJECTED, SubmissionStatusEnum.ON_HOLD],
    SubmissionStatusEnum.ON_HOLD: [SubmissionStatusEnum.SHORTLISTED, SubmissionStatusEnum.INTERVIEW, SubmissionStatusEnum.REJECTED, SubmissionStatusEnum.SUBMITTED],
    SubmissionStatusEnum.REJECTED: [SubmissionStatusEnum.SUBMITTED],  # Can be re-evaluated
    SubmissionStatusEnum.JOINED: []  # Final state
}

@router.get("", response_model=List[CVSubmissionResponse])
def get_submissions(
    client_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CVSubmission)

    # Scoping for CLIENT / HIRING_MANAGER
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        query = query.filter(CVSubmission.client_id == current_user.client_id)
    elif client_id:
        query = query.filter(CVSubmission.client_id == client_id)

    if requirement_id:
        query = query.filter(CVSubmission.requirement_id == requirement_id)
    if candidate_id:
        query = query.filter(CVSubmission.candidate_id == candidate_id)
    if recruiter_id:
        query = query.filter(CVSubmission.recruiter_id == recruiter_id)
    if status:
        query = query.filter(CVSubmission.status == status)

    subs = query.order_by(CVSubmission.created_at.desc()).all()
    results = []
    for s in subs:
        s_dict = {
            "id": str(s.id),
            "submission_code": s.submission_code,
            "client_id": str(s.client_id),
            "client_name": s.client.name if s.client else None,
            "requirement_id": str(s.requirement_id),
            "requirement_title": s.requirement.job_title if s.requirement else None,
            "candidate_id": str(s.candidate_id),
            "candidate_name": f"{s.candidate.first_name} {s.candidate.last_name}" if s.candidate else None,
            "candidate_email": s.candidate.email if s.candidate else None,
            "document_id": str(s.document_id),
            "document_version": s.document.version_number if s.document else 1,
            "document_url": s.document.file_url if s.document else None,
            "recruiter_id": str(s.recruiter_id) if s.recruiter_id else None,
            "recruiter_name": s.recruiter.full_name if s.recruiter else None,
            "submission_date": s.submission_date,
            "remarks": s.remarks,
            "status": s.status,
            "client_viewed_at": s.client_viewed_at,
            "feedback_requested_at": s.feedback_requested_at,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        }
        results.append(CVSubmissionResponse(**s_dict))
    return results

@router.post("", response_model=CVSubmissionResponse)
def create_submission(
    sub_in: CVSubmissionCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == sub_in.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    requirement = db.query(JobRequirement).filter(JobRequirement.id == sub_in.requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    client = db.query(Client).filter(Client.id == sub_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    document = db.query(CandidateDocument).filter(CandidateDocument.id == sub_in.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Selected CV document version not found")

    # Check duplicate active submission
    existing_sub = db.query(CVSubmission).filter(
        CVSubmission.candidate_id == sub_in.candidate_id,
        CVSubmission.requirement_id == sub_in.requirement_id
    ).first()
    if existing_sub:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate is already submitted to this requirement ({existing_sub.submission_code}) with status '{existing_sub.status.value}'."
        )

    now = datetime.now(timezone.utc)
    submission_code = f"SUB-{random.randint(1000, 9999)}"

    new_sub = CVSubmission(
        submission_code=submission_code,
        client_id=sub_in.client_id,
        requirement_id=sub_in.requirement_id,
        candidate_id=sub_in.candidate_id,
        document_id=sub_in.document_id,
        recruiter_id=sub_in.recruiter_id or current_user.id,
        submission_date=now,
        remarks=sub_in.remarks,
        status=SubmissionStatusEnum.SUBMITTED,
        feedback_requested_at=now,
        created_at=now,
        updated_at=now
    )
    db.add(new_sub)
    db.flush()

    # Update candidate status
    old_cand_status = str(candidate.status.value if hasattr(candidate.status, 'value') else candidate.status)
    candidate.status = CandidateStatusEnum.SUBMITTED
    candidate.updated_at = now

    # CRITICAL: Record new immutable candidate history timeline entry
    history_entry = CandidateStatusHistory(
        candidate_id=candidate.id,
        submission_id=new_sub.id,
        requirement_id=requirement.id,
        old_status=old_cand_status,
        new_status=CandidateStatusEnum.SUBMITTED.value,
        changed_by_id=current_user.id,
        remarks=f"CV (v{document.version_number}) submitted to {client.name} for position '{requirement.job_title}'. Remarks: {sub_in.remarks or 'N/A'}",
        created_at=now
    )
    db.add(history_entry)

    # Record recruiter activity
    db.add(RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type="CV Submitted",
        entity_type="CVSubmission",
        entity_id=new_sub.id,
        description=f"Submitted candidate {candidate.first_name} {candidate.last_name} to {client.name} for '{requirement.job_title}'."
    ))

    db.commit()
    db.refresh(new_sub)

    # Notify Client Users
    client_users = db.query(User).filter(User.client_id == client.id, User.is_active == True).all()
    for cu in client_users:
        create_notification(
            db=db,
            recipient_id=cu.id,
            title="New Candidate CV Submitted",
            message=f"A new candidate profile ({candidate.first_name} {candidate.last_name}) has been submitted for '{requirement.job_title}'.",
            notification_type=NotificationTypeEnum.CV_SUBMITTED,
            reference_entity="SUBMISSION",
            reference_id=new_sub.id
        )

    log_audit_event(
        db=db,
        action="CV_SUBMITTED",
        entity="CV_SUBMISSION",
        entity_id=new_sub.id,
        user=current_user,
        request=request,
        new_value={"code": new_sub.submission_code, "candidate": f"{candidate.first_name} {candidate.last_name}", "client": client.name, "doc_version": document.version_number}
    )

    return CVSubmissionResponse(
        id=str(new_sub.id),
        submission_code=new_sub.submission_code,
        client_id=str(new_sub.client_id),
        client_name=client.name,
        requirement_id=str(new_sub.requirement_id),
        requirement_title=requirement.job_title,
        candidate_id=str(new_sub.candidate_id),
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        candidate_email=candidate.email,
        document_id=str(new_sub.document_id),
        document_version=document.version_number,
        document_url=document.file_url,
        recruiter_id=str(new_sub.recruiter_id),
        recruiter_name=current_user.full_name,
        submission_date=new_sub.submission_date,
        remarks=new_sub.remarks,
        status=new_sub.status,
        client_viewed_at=new_sub.client_viewed_at,
        feedback_requested_at=new_sub.feedback_requested_at,
        created_at=new_sub.created_at,
        updated_at=new_sub.updated_at
    )

@router.put("/{submission_id}/status", response_model=CVSubmissionResponse)
def update_submission_status(
    submission_id: str,
    update_in: CVSubmissionStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sub = db.query(CVSubmission).filter(CVSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    verify_client_access(current_user, str(sub.client_id))

    old_status = sub.status
    new_status = update_in.status

    # Validate transition
    allowed_transitions = VALID_TRANSITIONS.get(old_status, [])
    # Allow Super Admin / Admin to override if necessary, otherwise enforce
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role not in [RoleEnum.SUPER_ADMIN.value, RoleEnum.ADMIN.value] and new_status not in allowed_transitions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from '{old_status.value}' to '{new_status.value}'. Allowed next states: {[s.value for s in allowed_transitions]}"
        )

    now = datetime.now(timezone.utc)
    sub.status = new_status
    sub.updated_at = now

    if new_status == SubmissionStatusEnum.CLIENT_VIEWED and not sub.client_viewed_at:
        sub.client_viewed_at = now

    # Map submission status to candidate status
    status_mapping = {
        SubmissionStatusEnum.SUBMITTED: CandidateStatusEnum.SUBMITTED,
        SubmissionStatusEnum.CLIENT_VIEWED: CandidateStatusEnum.CLIENT_REVIEW,
        SubmissionStatusEnum.SHORTLISTED: CandidateStatusEnum.SHORTLISTED,
        SubmissionStatusEnum.INTERVIEW: CandidateStatusEnum.INTERVIEW,
        SubmissionStatusEnum.SELECTED: CandidateStatusEnum.SELECTED,
        SubmissionStatusEnum.OFFER: CandidateStatusEnum.OFFER,
        SubmissionStatusEnum.JOINED: CandidateStatusEnum.JOINED,
        SubmissionStatusEnum.REJECTED: CandidateStatusEnum.REJECTED,
        SubmissionStatusEnum.ON_HOLD: CandidateStatusEnum.ON_HOLD,
    }

    if new_status in status_mapping:
        sub.candidate.status = status_mapping[new_status]
        sub.candidate.updated_at = now

    # CRITICAL: Always create new immutable history record
    db.add(CandidateStatusHistory(
        candidate_id=sub.candidate_id,
        submission_id=sub.id,
        requirement_id=sub.requirement_id,
        old_status=old_status.value,
        new_status=new_status.value,
        changed_by_id=current_user.id,
        remarks=update_in.remarks or f"Submission status changed to {new_status.value} by {current_user.full_name}.",
        created_at=now
    ))

    # Log recruiter activity
    db.add(RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type=f"Submission {new_status.value}",
        entity_type="CVSubmission",
        entity_id=sub.id,
        description=f"Updated submission {sub.submission_code} to {new_status.value}."
    ))

    db.commit()
    db.refresh(sub)

    log_audit_event(
        db=db,
        action="STATUS_CHANGED",
        entity="CV_SUBMISSION",
        entity_id=sub.id,
        user=current_user,
        request=request,
        old_value={"status": old_status.value},
        new_value={"status": new_status.value, "remarks": update_in.remarks}
    )

    return CVSubmissionResponse(
        id=str(sub.id),
        submission_code=sub.submission_code,
        client_id=str(sub.client_id),
        client_name=sub.client.name if sub.client else None,
        requirement_id=str(sub.requirement_id),
        requirement_title=sub.requirement.job_title if sub.requirement else None,
        candidate_id=str(sub.candidate_id),
        candidate_name=f"{sub.candidate.first_name} {sub.candidate.last_name}" if sub.candidate else None,
        candidate_email=sub.candidate.email if sub.candidate else None,
        document_id=str(sub.document_id),
        document_version=sub.document.version_number if sub.document else 1,
        document_url=sub.document.file_url if sub.document else None,
        recruiter_id=str(sub.recruiter_id) if sub.recruiter_id else None,
        recruiter_name=sub.recruiter.full_name if sub.recruiter else None,
        submission_date=sub.submission_date,
        remarks=sub.remarks,
        status=sub.status,
        client_viewed_at=sub.client_viewed_at,
        feedback_requested_at=sub.feedback_requested_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at
    )
