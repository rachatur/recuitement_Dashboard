import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.services.notification_service import create_notification
from app.models import (
    Interview, InterviewFeedback, Candidate, JobRequirement, Client,
    CVSubmission, CandidateStatusHistory, User, InterviewStatusEnum,
    CandidateStatusEnum, SubmissionStatusEnum, NotificationTypeEnum
)
from app.schemas import (
    InterviewCreate, InterviewUpdate, InterviewResponse,
    InterviewFeedbackCreate, InterviewFeedbackResponse
)

router = APIRouter(prefix="/interviews", tags=["Interview Management"])

@router.get("", response_model=List[InterviewResponse])
def get_interviews(
    client_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Interview)

    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        query = query.filter(Interview.client_id == current_user.client_id)
    elif client_id:
        query = query.filter(Interview.client_id == client_id)

    if requirement_id:
        query = query.filter(Interview.requirement_id == requirement_id)
    if candidate_id:
        query = query.filter(Interview.candidate_id == candidate_id)
    if status:
        query = query.filter(Interview.status == status)

    interviews = query.order_by(Interview.interview_date.desc()).all()
    results = []
    for i in interviews:
        feedbacks = [
            InterviewFeedbackResponse(
                id=str(f.id),
                interview_id=str(f.interview_id),
                submitted_by_id=str(f.submitted_by_id) if f.submitted_by_id else None,
                submitted_by_name=f.submitted_by.full_name if f.submitted_by else "Interviewer",
                rating=f.rating,
                technical_score=f.technical_score,
                communication_score=f.communication_score,
                cultural_fit_score=f.cultural_fit_score,
                recommendation=f.recommendation,
                detailed_feedback=f.detailed_feedback,
                created_at=f.created_at
            ) for f in i.feedbacks
        ]

        results.append(InterviewResponse(
            id=str(i.id),
            interview_code=i.interview_code,
            candidate_id=str(i.candidate_id),
            candidate_name=f"{i.candidate.first_name} {i.candidate.last_name}" if i.candidate else None,
            requirement_id=str(i.requirement_id),
            requirement_title=i.requirement.job_title if i.requirement else None,
            client_id=str(i.client_id),
            client_name=i.client.name if i.client else None,
            submission_id=str(i.submission_id) if i.submission_id else None,
            round_number=i.round_number,
            round_name=i.round_name,
            interview_type=i.interview_type,
            interview_date=i.interview_date,
            duration_minutes=i.duration_minutes,
            interviewer_name=i.interviewer_name,
            interviewer_email=i.interviewer_email,
            meeting_link=i.meeting_link,
            status=i.status,
            notes=i.notes,
            feedbacks=feedbacks,
            created_at=i.created_at,
            updated_at=i.updated_at
        ))
    return results

@router.post("", response_model=InterviewResponse)
def schedule_interview(
    int_in: InterviewCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD, RoleEnum.CLIENT, RoleEnum.HIRING_MANAGER])),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == int_in.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    requirement = db.query(JobRequirement).filter(JobRequirement.id == int_in.requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    client = db.query(Client).filter(Client.id == int_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    interview_code = f"INT-{random.randint(1000, 9999)}"
    now = datetime.now(timezone.utc)

    interview = Interview(
        interview_code=interview_code,
        candidate_id=int_in.candidate_id,
        requirement_id=int_in.requirement_id,
        client_id=int_in.client_id,
        submission_id=int_in.submission_id,
        round_number=int_in.round_number,
        round_name=int_in.round_name,
        interview_type=int_in.interview_type,
        interview_date=int_in.interview_date,
        duration_minutes=int_in.duration_minutes,
        interviewer_name=int_in.interviewer_name,
        interviewer_email=int_in.interviewer_email,
        meeting_link=int_in.meeting_link,
        status=int_in.status,
        notes=int_in.notes,
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now
    )
    db.add(interview)

    # Update candidate & submission status to INTERVIEW
    candidate.status = CandidateStatusEnum.INTERVIEW
    if int_in.submission_id:
        sub = db.query(CVSubmission).filter(CVSubmission.id == int_in.submission_id).first()
        if sub:
            sub.status = SubmissionStatusEnum.INTERVIEW
            sub.updated_at = now

    # CRITICAL: Record timeline entry
    db.add(CandidateStatusHistory(
        candidate_id=candidate.id,
        submission_id=int_in.submission_id,
        requirement_id=requirement.id,
        old_status=None,
        new_status=CandidateStatusEnum.INTERVIEW.value,
        changed_by_id=current_user.id,
        remarks=f"Scheduled {interview.round_name} with {interview.interviewer_name or 'Hiring Team'} on {interview.interview_date.strftime('%Y-%m-%d %H:%M')}.",
        created_at=now
    ))

    db.commit()
    db.refresh(interview)

    # Notify Recruiter
    if candidate.recruiter_id:
        create_notification(
            db=db,
            recipient_id=candidate.recruiter_id,
            title="Interview Scheduled",
            message=f"Interview '{interview.round_name}' for {candidate.first_name} {candidate.last_name} has been scheduled for {interview.interview_date.strftime('%b %d, %Y')}.",
            notification_type=NotificationTypeEnum.INTERVIEW_SCHEDULED,
            reference_entity="INTERVIEW",
            reference_id=interview.id
        )

    log_audit_event(
        db=db,
        action="INTERVIEW_SCHEDULED",
        entity="INTERVIEW",
        entity_id=interview.id,
        user=current_user,
        request=request,
        new_value={"code": interview.interview_code, "candidate": f"{candidate.first_name} {candidate.last_name}", "round": interview.round_name, "date": str(interview.interview_date)}
    )

    return InterviewResponse(
        id=str(interview.id),
        interview_code=interview.interview_code,
        candidate_id=str(interview.candidate_id),
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        requirement_id=str(interview.requirement_id),
        requirement_title=requirement.job_title,
        client_id=str(interview.client_id),
        client_name=client.name,
        submission_id=str(interview.submission_id) if interview.submission_id else None,
        round_number=interview.round_number,
        round_name=interview.round_name,
        interview_type=interview.interview_type,
        interview_date=interview.interview_date,
        duration_minutes=interview.duration_minutes,
        interviewer_name=interview.interviewer_name,
        interviewer_email=interview.interviewer_email,
        meeting_link=interview.meeting_link,
        status=interview.status,
        notes=interview.notes,
        feedbacks=[],
        created_at=interview.created_at,
        updated_at=interview.updated_at
    )

@router.post("/{interview_id}/feedback", response_model=InterviewFeedbackResponse)
def add_interview_feedback(
    interview_id: str,
    fb_in: InterviewFeedbackCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    verify_client_access(current_user, str(interview.client_id))

    feedback = InterviewFeedback(
        interview_id=interview.id,
        submitted_by_id=current_user.id,
        rating=fb_in.rating,
        technical_score=fb_in.technical_score,
        communication_score=fb_in.communication_score,
        cultural_fit_score=fb_in.cultural_fit_score,
        recommendation=fb_in.recommendation,
        detailed_feedback=fb_in.detailed_feedback,
        created_at=datetime.now(timezone.utc)
    )
    db.add(feedback)

    interview.status = InterviewStatusEnum.COMPLETED
    interview.updated_at = datetime.now(timezone.utc)

    # CRITICAL: Record timeline entry
    db.add(CandidateStatusHistory(
        candidate_id=interview.candidate_id,
        submission_id=interview.submission_id,
        requirement_id=interview.requirement_id,
        old_status=CandidateStatusEnum.INTERVIEW.value,
        new_status=CandidateStatusEnum.INTERVIEW.value,
        changed_by_id=current_user.id,
        remarks=f"Interview Feedback Submitted by {current_user.full_name}. Recommendation: {fb_in.recommendation}, Rating: {fb_in.rating}/5.0",
        created_at=datetime.now(timezone.utc)
    ))

    db.commit()
    db.refresh(feedback)

    log_audit_event(
        db=db,
        action="INTERVIEW_FEEDBACK_SUBMITTED",
        entity="INTERVIEW_FEEDBACK",
        entity_id=feedback.id,
        user=current_user,
        request=request,
        new_value={"interview_id": interview.id, "rating": fb_in.rating, "recommendation": fb_in.recommendation}
    )

    return InterviewFeedbackResponse(
        id=str(feedback.id),
        interview_id=str(feedback.interview_id),
        submitted_by_id=str(current_user.id),
        submitted_by_name=current_user.full_name,
        rating=feedback.rating,
        technical_score=feedback.technical_score,
        communication_score=feedback.communication_score,
        cultural_fit_score=feedback.cultural_fit_score,
        recommendation=feedback.recommendation,
        detailed_feedback=feedback.detailed_feedback,
        created_at=feedback.created_at
    )
