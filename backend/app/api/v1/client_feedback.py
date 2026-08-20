from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.services.notification_service import create_notification
from app.models import (
    ClientFeedback, CVSubmission, Candidate, CandidateStatusHistory,
    User, SubmissionStatusEnum, CandidateStatusEnum, NotificationTypeEnum,
    ClientFeedbackDecisionEnum
)
from app.schemas import ClientFeedbackCreate, ClientFeedbackResponse

router = APIRouter(prefix="/client-feedback", tags=["Client Feedback"])

@router.get("/submission/{submission_id}", response_model=List[ClientFeedbackResponse])
def get_submission_feedback(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sub = db.query(CVSubmission).filter(CVSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    verify_client_access(current_user, str(sub.client_id))

    feedbacks = db.query(ClientFeedback).filter(ClientFeedback.submission_id == submission_id).order_by(ClientFeedback.created_at.desc()).all()
    return [
        ClientFeedbackResponse(
            id=str(fb.id),
            submission_id=str(fb.submission_id),
            client_id=str(fb.client_id),
            user_id=str(fb.user_id) if fb.user_id else None,
            user_name=fb.user.full_name if fb.user else "Client Contact",
            decision=fb.decision,
            rating=fb.rating,
            comments=fb.comments,
            created_at=fb.created_at
        ) for fb in feedbacks
    ]

@router.post("", response_model=ClientFeedbackResponse)
def submit_client_feedback(
    fb_in: ClientFeedbackCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sub = db.query(CVSubmission).filter(CVSubmission.id == fb_in.submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    verify_client_access(current_user, str(sub.client_id))

    now = datetime.now(timezone.utc)

    feedback = ClientFeedback(
        submission_id=sub.id,
        client_id=sub.client_id,
        user_id=current_user.id,
        decision=fb_in.decision,
        rating=fb_in.rating,
        comments=fb_in.comments,
        created_at=now
    )
    db.add(feedback)

    # Transition submission status based on decision
    old_sub_status = sub.status.value
    if fb_in.decision == ClientFeedbackDecisionEnum.SHORTLISTED:
        sub.status = SubmissionStatusEnum.SHORTLISTED
        sub.candidate.status = CandidateStatusEnum.SHORTLISTED
    elif fb_in.decision == ClientFeedbackDecisionEnum.REJECTED:
        sub.status = SubmissionStatusEnum.REJECTED
        sub.candidate.status = CandidateStatusEnum.REJECTED
    elif fb_in.decision == ClientFeedbackDecisionEnum.ON_HOLD:
        sub.status = SubmissionStatusEnum.ON_HOLD
        sub.candidate.status = CandidateStatusEnum.ON_HOLD
    elif fb_in.decision == ClientFeedbackDecisionEnum.SCHEDULE_INTERVIEW:
        sub.status = SubmissionStatusEnum.INTERVIEW
        sub.candidate.status = CandidateStatusEnum.INTERVIEW

    sub.updated_at = now
    sub.candidate.updated_at = now

    # CRITICAL: Record new immutable candidate history timeline entry
    db.add(CandidateStatusHistory(
        candidate_id=sub.candidate_id,
        submission_id=sub.id,
        requirement_id=sub.requirement_id,
        old_status=old_sub_status,
        new_status=sub.status.value,
        changed_by_id=current_user.id,
        remarks=f"Client Feedback: {fb_in.decision.value} (Rating: {fb_in.rating}/5.0). Notes: {fb_in.comments or 'None'}",
        created_at=now
    ))

    db.commit()
    db.refresh(feedback)

    # Notify Assigned Recruiter
    if sub.recruiter_id:
        create_notification(
            db=db,
            recipient_id=sub.recruiter_id,
            title="Client Feedback Received",
            message=f"{sub.client.name} provided feedback ({fb_in.decision.value}) on candidate {sub.candidate.first_name} {sub.candidate.last_name}.",
            notification_type=NotificationTypeEnum.CLIENT_FEEDBACK,
            reference_entity="SUBMISSION",
            reference_id=sub.id
        )

    log_audit_event(
        db=db,
        action="CLIENT_FEEDBACK_ADDED",
        entity="CLIENT_FEEDBACK",
        entity_id=feedback.id,
        user=current_user,
        request=request,
        new_value={"decision": fb_in.decision.value, "rating": fb_in.rating, "comments": fb_in.comments}
    )

    return ClientFeedbackResponse(
        id=str(feedback.id),
        submission_id=str(feedback.submission_id),
        client_id=str(feedback.client_id),
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        decision=feedback.decision,
        rating=feedback.rating,
        comments=feedback.comments,
        created_at=feedback.created_at
    )
