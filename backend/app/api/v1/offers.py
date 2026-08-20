from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.services.notification_service import create_notification, broadcast_role_notification
from app.models import (
    Offer, JoiningDetail, Candidate, JobRequirement, Client, CVSubmission,
    CandidateStatusHistory, RecruiterActivity, User, OfferStatusEnum,
    JoiningStatusEnum, CandidateStatusEnum, SubmissionStatusEnum,
    RequirementStatusEnum, NotificationTypeEnum
)
from app.schemas import (
    OfferCreate, OfferUpdate, OfferResponse, JoiningDetailCreate, JoiningDetailResponse
)

router = APIRouter(prefix="/offers", tags=["Offer & Joining Management"])

@router.get("", response_model=List[OfferResponse])
def get_offers(
    client_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Offer)

    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        query = query.filter(Offer.client_id == current_user.client_id)
    elif client_id:
        query = query.filter(Offer.client_id == client_id)

    if requirement_id:
        query = query.filter(Offer.requirement_id == requirement_id)
    if candidate_id:
        query = query.filter(Offer.candidate_id == candidate_id)
    if status:
        query = query.filter(Offer.status == status)

    offers = query.order_by(Offer.created_at.desc()).all()
    results = []
    for o in offers:
        jd_resp = None
        if o.joining_detail:
            jd_resp = JoiningDetailResponse(
                id=str(o.joining_detail.id),
                offer_id=str(o.joining_detail.offer_id),
                candidate_id=str(o.joining_detail.candidate_id),
                actual_joining_date=o.joining_detail.actual_joining_date,
                status=o.joining_detail.status,
                employee_code=o.joining_detail.employee_code,
                remarks=o.joining_detail.remarks,
                verified_by_name=o.joining_detail.verified_by.full_name if o.joining_detail.verified_by else None,
                created_at=o.joining_detail.created_at,
                updated_at=o.joining_detail.updated_at
            )

        results.append(OfferResponse(
            id=str(o.id),
            candidate_id=str(o.candidate_id),
            candidate_name=f"{o.candidate.first_name} {o.candidate.last_name}" if o.candidate else None,
            requirement_id=str(o.requirement_id),
            requirement_title=o.requirement.job_title if o.requirement else None,
            client_id=str(o.client_id),
            client_name=o.client.name if o.client else None,
            submission_id=str(o.submission_id),
            offered_ctc=o.offered_ctc,
            joining_bonus=o.joining_bonus,
            currency=o.currency,
            offer_date=o.offer_date,
            target_joining_date=o.target_joining_date,
            validity_date=o.validity_date,
            status=o.status,
            decline_reason=o.decline_reason,
            document_url=o.document_url,
            joining_detail=jd_resp,
            created_at=o.created_at,
            updated_at=o.updated_at
        ))
    return results

@router.post("", response_model=OfferResponse)
def create_offer(
    offer_in: OfferCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == offer_in.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    requirement = db.query(JobRequirement).filter(JobRequirement.id == offer_in.requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    client = db.query(Client).filter(Client.id == offer_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    submission = db.query(CVSubmission).filter(CVSubmission.id == offer_in.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    now = datetime.now(timezone.utc)

    offer = Offer(
        candidate_id=offer_in.candidate_id,
        requirement_id=offer_in.requirement_id,
        client_id=offer_in.client_id,
        submission_id=offer_in.submission_id,
        offered_ctc=offer_in.offered_ctc,
        joining_bonus=offer_in.joining_bonus,
        currency=offer_in.currency,
        offer_date=offer_in.offer_date or now,
        target_joining_date=offer_in.target_joining_date,
        validity_date=offer_in.validity_date,
        status=offer_in.status,
        decline_reason=offer_in.decline_reason,
        document_url=offer_in.document_url,
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now
    )
    db.add(offer)

    # Automatically create initial planned JoiningDetail
    joining_detail = JoiningDetail(
        offer_id=offer.id,
        candidate_id=offer.candidate_id,
        status=JoiningStatusEnum.PLANNED,
        remarks="Offer released. Awaiting candidate joining."
    )
    db.add(joining_detail)

    # Update candidate & submission status to OFFER
    candidate.status = CandidateStatusEnum.OFFER
    candidate.updated_at = now
    submission.status = SubmissionStatusEnum.OFFER
    submission.updated_at = now

    # CRITICAL: Record timeline entry
    db.add(CandidateStatusHistory(
        candidate_id=candidate.id,
        submission_id=submission.id,
        requirement_id=requirement.id,
        old_status=None,
        new_status=CandidateStatusEnum.OFFER.value,
        changed_by_id=current_user.id,
        remarks=f"Offer released: {offer.currency} {offer.offered_ctc:,.2f} + bonus {offer.currency} {offer.joining_bonus:,.2f}. Target Joining Date: {offer.target_joining_date.strftime('%Y-%m-%d')}.",
        created_at=now
    ))

    # Log recruiter activity
    db.add(RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type="Offer Released",
        entity_type="Offer",
        entity_id=offer.id,
        description=f"Released offer of {offer.currency} {offer.offered_ctc:,.2f} for {candidate.first_name} {candidate.last_name}."
    ))

    db.commit()
    db.refresh(offer)

    # Broadcast notification to Team Leads and Admins
    broadcast_role_notification(
        db=db,
        roles=[RoleEnum.ADMIN, RoleEnum.TEAM_LEAD],
        title="Offer Letter Released",
        message=f"Offer of ${offer.offered_ctc:,.0f} released for {candidate.first_name} {candidate.last_name} ({client.name}).",
        notification_type=NotificationTypeEnum.OFFER_RELEASED,
        reference_entity="OFFER",
        reference_id=offer.id
    )

    log_audit_event(
        db=db,
        action="OFFER_RELEASED",
        entity="OFFER",
        entity_id=offer.id,
        user=current_user,
        request=request,
        new_value={"candidate": f"{candidate.first_name} {candidate.last_name}", "client": client.name, "offered_ctc": offer.offered_ctc}
    )

    return OfferResponse(
        id=str(offer.id),
        candidate_id=str(offer.candidate_id),
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        requirement_id=str(offer.requirement_id),
        requirement_title=requirement.job_title,
        client_id=str(offer.client_id),
        client_name=client.name,
        submission_id=str(offer.submission_id),
        offered_ctc=offer.offered_ctc,
        joining_bonus=offer.joining_bonus,
        currency=offer.currency,
        offer_date=offer.offer_date,
        target_joining_date=offer.target_joining_date,
        validity_date=offer.validity_date,
        status=offer.status,
        decline_reason=offer.decline_reason,
        document_url=offer.document_url,
        joining_detail=JoiningDetailResponse(
            id=str(joining_detail.id),
            offer_id=str(joining_detail.offer_id),
            candidate_id=str(joining_detail.candidate_id),
            actual_joining_date=None,
            status=joining_detail.status,
            employee_code=None,
            remarks=joining_detail.remarks,
            verified_by_name=None,
            created_at=joining_detail.created_at,
            updated_at=joining_detail.updated_at
        ),
        created_at=offer.created_at,
        updated_at=offer.updated_at
    )

@router.put("/{offer_id}/joining", response_model=OfferResponse)
def record_joining(
    offer_id: str,
    joining_in: JoiningDetailCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    now = datetime.now(timezone.utc)
    jd = db.query(JoiningDetail).filter(JoiningDetail.offer_id == offer.id).first()
    if not jd:
        jd = JoiningDetail(offer_id=offer.id, candidate_id=offer.candidate_id)
        db.add(jd)

    jd.actual_joining_date = joining_in.actual_joining_date or now
    jd.status = joining_in.status
    jd.employee_code = joining_in.employee_code
    jd.remarks = joining_in.remarks
    jd.verified_by_id = current_user.id
    jd.updated_at = now

    if joining_in.status == JoiningStatusEnum.JOINED:
        offer.status = OfferStatusEnum.ACCEPTED
        offer.candidate.status = CandidateStatusEnum.JOINED
        offer.submission.status = SubmissionStatusEnum.JOINED
        
        # Increment filled count on requirement
        if offer.requirement:
            offer.requirement.filled_count = (offer.requirement.filled_count or 0) + 1
            if offer.requirement.filled_count >= offer.requirement.openings_count:
                offer.requirement.status = RequirementStatusEnum.CLOSED
            else:
                offer.requirement.status = RequirementStatusEnum.PARTIALLY_FILLED

        # CRITICAL: Record timeline entry
        db.add(CandidateStatusHistory(
            candidate_id=offer.candidate_id,
            submission_id=offer.submission_id,
            requirement_id=offer.requirement_id,
            old_status=CandidateStatusEnum.OFFER.value,
            new_status=CandidateStatusEnum.JOINED.value,
            changed_by_id=current_user.id,
            remarks=f"Candidate successfully joined {offer.client.name} as Employee #{jd.employee_code or 'N/A'}. Onboarding verified by {current_user.full_name}.",
            created_at=now
        ))

        # Log recruiter activity
        db.add(RecruiterActivity(
            recruiter_id=current_user.id,
            activity_type="Candidate Joined",
            entity_type="JoiningDetail",
            entity_id=jd.id,
            description=f"Verified joining of {offer.candidate.first_name} {offer.candidate.last_name} at {offer.client.name} (Emp #{jd.employee_code})."
        ))

    db.commit()
    db.refresh(offer)

    log_audit_event(
        db=db,
        action="CANDIDATE_JOINED" if joining_in.status == JoiningStatusEnum.JOINED else "JOINING_STATUS_UPDATED",
        entity="JOINING_DETAIL",
        entity_id=jd.id,
        user=current_user,
        request=request,
        new_value={"status": jd.status.value, "employee_code": jd.employee_code, "candidate": f"{offer.candidate.first_name} {offer.candidate.last_name}"}
    )

    jd_resp = JoiningDetailResponse(
        id=str(jd.id),
        offer_id=str(jd.offer_id),
        candidate_id=str(jd.candidate_id),
        actual_joining_date=jd.actual_joining_date,
        status=jd.status,
        employee_code=jd.employee_code,
        remarks=jd.remarks,
        verified_by_name=current_user.full_name,
        created_at=jd.created_at,
        updated_at=jd.updated_at
    )

    return OfferResponse(
        id=str(offer.id),
        candidate_id=str(offer.candidate_id),
        candidate_name=f"{offer.candidate.first_name} {offer.candidate.last_name}",
        requirement_id=str(offer.requirement_id),
        requirement_title=offer.requirement.job_title,
        client_id=str(offer.client_id),
        client_name=offer.client.name,
        submission_id=str(offer.submission_id),
        offered_ctc=offer.offered_ctc,
        joining_bonus=offer.joining_bonus,
        currency=offer.currency,
        offer_date=offer.offer_date,
        target_joining_date=offer.target_joining_date,
        validity_date=offer.validity_date,
        status=offer.status,
        decline_reason=offer.decline_reason,
        document_url=offer.document_url,
        joining_detail=jd_resp,
        created_at=offer.created_at,
        updated_at=offer.updated_at
    )
