import os
import re
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.core.audit import log_audit_event
from app.core.storage import storage_service
from app.models import (
    Candidate, CandidateSkill, CandidateDocument, CandidateStatusHistory,
    CVSubmission, User, CandidateStatusEnum, RecruiterActivity, AuditLog,
    BenchStatusEnum, WhatsAppConsentStatusEnum, WhatsAppOptOut, BenchResource
)
from app.schemas import (
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateDetailResponse,
    CandidateDocumentResponse, CandidateStatusHistoryResponse, CandidateStatusUpdateRequest,
    CVExtractionResponse, BulkCVProcessItem, BulkCVUploadSummaryResponse,
    WhatsAppEligibilityInfo, WhatsAppConsentRecordRequest, WhatsAppConsentRevokeRequest,
    WhatsAppConsentResponse, WhatsAppOptOutCreateRequest, WhatsAppOptOutResponse
)
from app.services.cv_extraction_service import (
    extract_text_from_file, parse_candidate_from_text,
    validate_whatsapp_eligibility, check_candidate_duplicate
)
from app.services.whatsapp_service import record_candidate_opt_out

router = APIRouter(prefix="/candidates", tags=["Candidate Management"])

def build_candidate_response_obj(c: Candidate, db: Session) -> CandidateResponse:
    recruiter_name = c.recruiter.full_name if c.recruiter else None
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

    eligibility = validate_whatsapp_eligibility(
        db=db,
        phone_or_whatsapp=c.whatsapp_number or c.phone,
        consent_status=c.whatsapp_consent_status,
        candidate_id=c.id
    )

    c_dict = {
        "id": str(c.id),
        "candidate_code": c.candidate_code,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "phone": c.phone,
        "alternate_phone": c.alternate_phone,
        "location": c.location,
        "preferred_location": c.preferred_location,
        "total_experience": c.total_experience or 0.0,
        "relevant_experience": c.relevant_experience or 0.0,
        "current_company": c.current_company,
        "current_designation": c.current_designation or "Software Engineer",
        "current_ctc": c.current_ctc,
        "expected_ctc": c.expected_ctc,
        "notice_period_days": c.notice_period_days or 30,
        "notice_period": c.notice_period or f"{c.notice_period_days or 30} Days",
        "skills": c.skills or [],
        "technical_skills": c.technical_skills or c.skills or [],
        "education": c.education,
        "highest_qualification": c.highest_qualification or c.education,
        "linkedin_url": c.linkedin_url,
        "github_url": c.github_url,
        "certifications": c.certifications or [],
        "date_of_birth": c.date_of_birth,
        "source": c.source or "Direct",
        "recruiter_id": str(c.recruiter_id) if c.recruiter_id else None,
        "recruiter_name": recruiter_name,
        "status": c.status,
        "whatsapp_number": c.whatsapp_number or c.phone,
        "country_code": c.country_code or "+91",
        "is_whatsapp_verified": c.is_whatsapp_verified or False,
        "whatsapp_consent_status": c.whatsapp_consent_status or WhatsAppConsentStatusEnum.NOT_COLLECTED,
        "whatsapp_consent_source": c.whatsapp_consent_source,
        "whatsapp_consent_date": c.whatsapp_consent_date,
        "whatsapp_consent_evidence": c.whatsapp_consent_evidence,
        "whatsapp_opt_out_status": c.whatsapp_opt_out_status or False,
        "preferred_language": c.preferred_language or "en",
        "preferred_contact_time": c.preferred_contact_time,
        "do_not_contact_reason": c.do_not_contact_reason,
        "bench_status": c.bench_status or BenchStatusEnum.NOT_ON_BENCH,
        "bench_availability_date": c.bench_availability_date,
        "bench_primary_skills": c.bench_primary_skills or (c.skills[:5] if c.skills else []),
        "bench_secondary_skills": c.bench_secondary_skills or (c.skills[5:] if c.skills and len(c.skills) > 5 else []),
        "active_submissions_count": active_subs,
        "latest_document": doc_resp,
        "whatsapp_eligibility": eligibility,
        "last_whatsapp_contact_date": c.last_whatsapp_contact_date,
        "last_whatsapp_response_date": c.last_whatsapp_response_date,
        "last_whatsapp_message_status": c.last_whatsapp_message_status,
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }
    return CandidateResponse(**c_dict)

@router.get("", response_model=List[CandidateResponse])
def get_candidates(
    search: Optional[str] = None,
    skill: Optional[str] = None,
    min_experience: Optional[float] = None,
    max_experience: Optional[float] = None,
    notice_days: Optional[int] = None,
    status: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    whatsapp_eligible: Optional[bool] = None,
    consent_status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)

    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        sub_candidate_ids = db.query(CVSubmission.candidate_id).filter(CVSubmission.client_id == current_user.client_id).all()
        cand_ids = [c[0] for c in sub_candidate_ids]
        query = query.filter(Candidate.id.in_(cand_ids))

    if recruiter_id:
        query = query.filter(Candidate.recruiter_id == recruiter_id)
    if status:
        query = query.filter(Candidate.status == status)
    if consent_status:
        query = query.filter(Candidate.whatsapp_consent_status == consent_status)
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
            Candidate.whatsapp_number.ilike(f"%{search}%") |
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

        resp = build_candidate_response_obj(c, db)
        if whatsapp_eligible is not None:
            if resp.whatsapp_eligibility and resp.whatsapp_eligibility.is_eligible != whatsapp_eligible:
                continue

        results.append(resp)
    return results

@router.post("/extract-cv", response_model=CVExtractionResponse)
async def extract_cv_details(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Parses an uploaded CV file (PDF, DOC, DOCX), extracts candidate details,
    performs duplicate checks, and evaluates WhatsApp Outreach eligibility.
    """
    filename, ext = storage_service.validate_file(file)
    content = await file.read()
    file_size = len(content)

    # 1. Extract text
    raw_text = extract_text_from_file(content, filename)

    # 2. Intelligently parse fields
    parsed = parse_candidate_from_text(raw_text, filename)

    # 3. Duplicate check
    is_dup, dup_cand, dup_reason = check_candidate_duplicate(
        db=db,
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        whatsapp_number=parsed.get("whatsapp_number"),
        first_name=parsed.get("first_name"),
        last_name=parsed.get("last_name")
    )

    # 4. WhatsApp outreach eligibility check
    eligibility = validate_whatsapp_eligibility(
        db=db,
        phone_or_whatsapp=parsed.get("whatsapp_number") or parsed.get("phone"),
        consent_status=WhatsAppConsentStatusEnum.NOT_COLLECTED
    )

    # Cache temporary uploaded file
    temp_id = uuid.uuid4().hex
    temp_dir = os.path.join(storage_service.local_dir, "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{temp_id}_{filename}")
    with open(temp_path, "wb") as f:
        f.write(content)

    return CVExtractionResponse(
        file_name=filename,
        file_size=file_size,
        mime_type=file.content_type or "application/pdf",
        temp_file_id=f"{temp_id}_{filename}",
        first_name=parsed.get("first_name", ""),
        last_name=parsed.get("last_name", ""),
        full_name=parsed.get("full_name", ""),
        email=parsed.get("email", ""),
        phone=parsed.get("phone", ""),
        alternate_phone=parsed.get("alternate_phone", ""),
        whatsapp_number=parsed.get("whatsapp_number", ""),
        country_code=parsed.get("country_code", "+91"),
        location=parsed.get("location", ""),
        preferred_location=parsed.get("preferred_location", ""),
        total_experience=parsed.get("total_experience", 0.0),
        relevant_experience=parsed.get("relevant_experience", 0.0),
        current_company=parsed.get("current_company", ""),
        current_designation=parsed.get("current_designation", ""),
        skills=parsed.get("skills", []),
        technical_skills=parsed.get("technical_skills", []),
        education=parsed.get("education", ""),
        highest_qualification=parsed.get("highest_qualification", ""),
        notice_period=parsed.get("notice_period", ""),
        current_ctc=parsed.get("current_ctc"),
        expected_ctc=parsed.get("expected_ctc"),
        linkedin_url=parsed.get("linkedin_url", ""),
        github_url=parsed.get("github_url", ""),
        certifications=parsed.get("certifications", []),
        date_of_birth=parsed.get("date_of_birth", ""),
        summary=parsed.get("summary", ""),
        whatsapp_eligibility=eligibility,
        is_duplicate=is_dup,
        duplicate_candidate_id=str(dup_cand.id) if dup_cand else None,
        duplicate_match_field=dup_reason
    )

@router.post("/bulk-upload", response_model=BulkCVUploadSummaryResponse)
async def bulk_cv_upload(
    files: List[UploadFile] = File(...),
    duplicate_action: str = Form("skip"),  # "skip", "update", "create_anyway"
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Processes multiple CVs simultaneously:
    - Extracts details from each file independently.
    - Performs duplicate checks against database.
    - Stores original CV and creates Candidate records.
    - Evaluates WhatsApp eligibility.
    """
    total_uploaded = len(files)
    processed_items: List[BulkCVProcessItem] = []
    success_count = 0
    failed_count = 0
    dup_count = 0
    new_created = 0
    wa_eligible = 0
    consent_req = 0
    invalid_num = 0

    now = datetime.now(timezone.utc)

    for file in files:
        filename = file.filename or "unknown_cv.pdf"
        try:
            content = await file.read()
            raw_text = extract_text_from_file(content, filename)
            parsed = parse_candidate_from_text(raw_text, filename)
            
            email = parsed.get("email") or f"candidate_{uuid.uuid4().hex[:6]}@recruitflow.talent"
            phone = parsed.get("phone") or ""
            whatsapp_num = parsed.get("whatsapp_number") or phone
            fname = parsed.get("first_name") or "Extracted"
            lname = parsed.get("last_name") or "Candidate"

            is_dup, dup_cand, dup_reason = check_candidate_duplicate(
                db=db, email=email, phone=phone, whatsapp_number=whatsapp_num,
                first_name=fname, last_name=lname
            )

            if is_dup:
                dup_count += 1
                if duplicate_action == "skip":
                    processed_items.append(BulkCVProcessItem(
                        file_name=filename,
                        status="Duplicate",
                        candidate_id=str(dup_cand.id) if dup_cand else None,
                        candidate_name=f"{dup_cand.first_name} {dup_cand.last_name}" if dup_cand else f"{fname} {lname}",
                        email=email,
                        phone=phone,
                        whatsapp_eligibility="Consent Required",
                        is_duplicate=True,
                        duplicate_reason=dup_reason,
                        error_message="Skipped: Duplicate candidate found in talent pool.",
                        retry_available=True
                    ))
                    continue
                elif duplicate_action == "update" and dup_cand:
                    dup_cand.skills = list(set((dup_cand.skills or []) + parsed.get("skills", [])))
                    if parsed.get("total_experience"):
                        dup_cand.total_experience = max(dup_cand.total_experience or 0.0, parsed["total_experience"])
                    db.commit()
                    success_count += 1
                    processed_items.append(BulkCVProcessItem(
                        file_name=filename,
                        status="Completed",
                        candidate_id=str(dup_cand.id),
                        candidate_name=f"{dup_cand.first_name} {dup_cand.last_name}",
                        email=dup_cand.email,
                        phone=dup_cand.phone,
                        whatsapp_eligibility="Eligible" if dup_cand.whatsapp_consent_status == WhatsAppConsentStatusEnum.GRANTED else "Consent Required",
                        is_duplicate=True,
                        duplicate_reason=dup_reason
                    ))
                    continue

            # Create new candidate record
            code = f"CAN-{uuid.uuid4().hex[:6].upper()}"
            cand = Candidate(
                candidate_code=code,
                first_name=fname,
                last_name=lname,
                email=email,
                phone=phone,
                whatsapp_number=whatsapp_num,
                country_code=parsed.get("country_code", "+91"),
                location=parsed.get("location", ""),
                total_experience=parsed.get("total_experience", 2.0),
                relevant_experience=parsed.get("relevant_experience", 2.0),
                current_company=parsed.get("current_company", ""),
                current_designation=parsed.get("current_designation", "Software Engineer"),
                skills=parsed.get("skills", []),
                technical_skills=parsed.get("technical_skills", []),
                education=parsed.get("education", "Bachelor's Degree"),
                highest_qualification=parsed.get("highest_qualification", "Bachelor's Degree"),
                notice_period=parsed.get("notice_period", "30 Days"),
                linkedin_url=parsed.get("linkedin_url", ""),
                github_url=parsed.get("github_url", ""),
                source="Bulk CV Upload",
                recruiter_id=current_user.id,
                status=CandidateStatusEnum.RECEIVED,
                whatsapp_consent_status=WhatsAppConsentStatusEnum.NOT_COLLECTED
            )
            db.add(cand)
            db.flush()

            # Store the original CV document
            safe_name = f"candidate_{cand.id}_v1_{uuid.uuid4().hex[:6]}_{filename}"
            cand_dir = os.path.join(storage_service.local_dir, "candidates", str(cand.id))
            os.makedirs(cand_dir, exist_ok=True)
            with open(os.path.join(cand_dir, safe_name), "wb") as f_out:
                f_out.write(content)

            doc = CandidateDocument(
                candidate_id=cand.id,
                version_number=1,
                document_type="Resume",
                file_name=filename,
                file_size=len(content),
                mime_type=file.content_type or "application/pdf",
                storage_path=os.path.relpath(os.path.join(cand_dir, safe_name), storage_service.local_dir),
                file_url=f"/api/v1/documents/download/{safe_name}?cid={cand.id}",
                uploaded_by_id=current_user.id
            )
            db.add(doc)

            # Record Timeline Event
            hist = CandidateStatusHistory(
                candidate_id=cand.id,
                old_status=None,
                new_status=CandidateStatusEnum.RECEIVED.value,
                changed_by_id=current_user.id,
                remarks=f"Candidate created via Bulk CV Upload: {filename}"
            )
            db.add(hist)
            db.commit()

            eligibility = validate_whatsapp_eligibility(db, whatsapp_num or phone, cand.whatsapp_consent_status, cand.id)
            if eligibility.is_eligible:
                wa_eligible += 1
                wa_status_label = "Eligible"
            elif eligibility.status == "Invalid Number":
                invalid_num += 1
                wa_status_label = "Invalid Number"
            else:
                consent_req += 1
                wa_status_label = "Consent Required"

            success_count += 1
            new_created += 1
            processed_items.append(BulkCVProcessItem(
                file_name=filename,
                status="Completed",
                candidate_id=str(cand.id),
                candidate_name=f"{cand.first_name} {cand.last_name}",
                email=cand.email,
                phone=cand.phone,
                whatsapp_eligibility=wa_status_label
            ))

        except Exception as e:
            logger.error(f"Failed to process bulk CV {filename}: {e}")
            failed_count += 1
            processed_items.append(BulkCVProcessItem(
                file_name=filename,
                status="Failed",
                error_message=str(e),
                whatsapp_eligibility="—",
                retry_available=True
            ))

    # Log Bulk upload audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="BULK_CV_UPLOADED",
        entity="CANDIDATE",
        new_value={
            "total": total_uploaded,
            "success": success_count,
            "failed": failed_count,
            "duplicates": dup_count,
            "created": new_created
        },
        remarks=f"Processed bulk upload of {total_uploaded} CVs ({success_count} succeeded, {failed_count} failed)."
    )
    db.add(audit)
    db.commit()

    return BulkCVUploadSummaryResponse(
        total_uploaded=total_uploaded,
        successfully_processed=success_count,
        failed_count=failed_count,
        duplicates_detected=dup_count,
        new_candidates_created=new_created,
        whatsapp_eligible_count=wa_eligible,
        consent_required_count=consent_req,
        invalid_numbers_count=invalid_num,
        items=processed_items
    )

@router.post("", response_model=CandidateResponse, status_code=status.HTTP_200_OK)
def create_candidate(
    cand_in: CandidateCreate,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    # Check duplicate email
    existing = db.query(Candidate).filter(Candidate.email == cand_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists")

    code = f"CAN-{uuid.uuid4().hex[:6].upper()}"
    recruiter_id = cand_in.recruiter_id or current_user.id

    cand = Candidate(
        candidate_code=code,
        first_name=cand_in.first_name,
        last_name=cand_in.last_name,
        email=cand_in.email,
        phone=cand_in.phone,
        alternate_phone=cand_in.alternate_phone,
        location=cand_in.location,
        preferred_location=cand_in.preferred_location,
        total_experience=cand_in.total_experience,
        relevant_experience=cand_in.relevant_experience,
        current_company=cand_in.current_company,
        current_designation=cand_in.current_designation,
        current_ctc=cand_in.current_ctc,
        expected_ctc=cand_in.expected_ctc,
        notice_period_days=cand_in.notice_period_days,
        notice_period=cand_in.notice_period,
        skills=cand_in.skills,
        technical_skills=cand_in.technical_skills or cand_in.skills,
        education=cand_in.education,
        highest_qualification=cand_in.highest_qualification or cand_in.education,
        linkedin_url=cand_in.linkedin_url,
        github_url=cand_in.github_url,
        certifications=cand_in.certifications,
        date_of_birth=cand_in.date_of_birth,
        source=cand_in.source,
        recruiter_id=recruiter_id,
        status=cand_in.status,
        whatsapp_number=cand_in.whatsapp_number or cand_in.phone,
        country_code=cand_in.country_code or "+91",
        whatsapp_consent_status=cand_in.whatsapp_consent_status,
        whatsapp_consent_source=cand_in.whatsapp_consent_source or ("Direct Form" if cand_in.whatsapp_consent_status == WhatsAppConsentStatusEnum.GRANTED else None),
        whatsapp_consent_date=datetime.now(timezone.utc) if cand_in.whatsapp_consent_status == WhatsAppConsentStatusEnum.GRANTED else None,
        whatsapp_opt_out_status=cand_in.whatsapp_opt_out_status,
        preferred_language=cand_in.preferred_language,
        preferred_contact_time=cand_in.preferred_contact_time,
        bench_status=cand_in.bench_status,
        bench_availability_date=cand_in.bench_availability_date,
        bench_primary_skills=cand_in.bench_primary_skills or (cand_in.skills[:5] if cand_in.skills else []),
        bench_secondary_skills=cand_in.bench_secondary_skills or (cand_in.skills[5:] if cand_in.skills and len(cand_in.skills) > 5 else [])
    )
    db.add(cand)
    db.flush()

    # If added to bench, create BenchResource record
    if cand_in.bench_status != BenchStatusEnum.NOT_ON_BENCH:
        bench_rec = BenchResource(
            candidate_id=cand.id,
            bench_status=cand_in.bench_status,
            primary_skills=cand.bench_primary_skills,
            secondary_skills=cand.bench_secondary_skills,
            availability_date=cand.bench_availability_date or datetime.now(timezone.utc),
            recruiter_id=recruiter_id
        )
        db.add(bench_rec)

    # Record Initial Status History
    hist = CandidateStatusHistory(
        candidate_id=cand.id,
        old_status=None,
        new_status=cand.status.value if hasattr(cand.status, 'value') else cand.status,
        changed_by_id=current_user.id,
        remarks="Candidate record created"
    )
    db.add(hist)

    # Activity & Audit
    act = RecruiterActivity(
        recruiter_id=current_user.id,
        activity_type="Candidate Added",
        entity_type="Candidate",
        entity_id=str(cand.id),
        description=f"Created candidate {cand.first_name} {cand.last_name} ({cand.email})"
    )
    db.add(act)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="CANDIDATE_CREATED",
        entity="CANDIDATE",
        entity_id=cand.id,
        new_value={"code": cand.candidate_code, "name": f"{cand.first_name} {cand.last_name}", "email": cand.email},
        remarks=f"Candidate {cand.first_name} {cand.last_name} added to talent pool."
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)

    return build_candidate_response_obj(cand, db)

@router.get("/{cand_id}", response_model=CandidateDetailResponse)
def get_candidate_detail(
    cand_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    base_resp = build_candidate_response_obj(cand, db)

    docs = db.query(CandidateDocument).filter(
        CandidateDocument.candidate_id == cand.id
    ).order_by(CandidateDocument.version_number.desc()).all()
    
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

    histories = db.query(CandidateStatusHistory).filter(
        CandidateStatusHistory.candidate_id == cand.id
    ).order_by(CandidateStatusHistory.created_at.desc()).all()
    
    hist_responses = [
        CandidateStatusHistoryResponse(
            id=str(h.id),
            candidate_id=str(h.candidate_id),
            old_status=h.old_status,
            new_status=h.new_status,
            stage_duration_hours=h.stage_duration_hours,
            remarks=h.remarks,
            changed_by_name=h.changed_by.full_name if h.changed_by else "System",
            created_at=h.created_at
        ) for h in histories
    ]

    return CandidateDetailResponse(
        **base_resp.model_dump(),
        documents=doc_responses,
        status_history=hist_responses,
        submissions_count=len(cand.submissions),
        interviews_count=len(cand.interviews),
        offers_count=len(cand.offers),
        conversations_count=len(cand.conversations)
    )

@router.get("/{cand_id}/cv/download")
def download_candidate_cv(
    cand_id: str,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Downloads the candidate's CV retaining the original uploaded filename wherever possible.
    """
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    query = db.query(CandidateDocument).filter(CandidateDocument.candidate_id == cand.id)
    if version:
        query = query.filter(CandidateDocument.version_number == version)
    doc = query.order_by(CandidateDocument.version_number.desc()).first()

    if not doc:
        # Fallback generated verified resume
        sample_filename = f"{cand.first_name}_{cand.last_name}_Resume.pdf"
        sample_pdf = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 200 >> stream
BT /F1 18 Tf 50 720 Td (RecruitFlow Verified Candidate Profile: {cand.first_name} {cand.last_name}) Tj ET
BT /F1 12 Tf 50 680 Td (Email: {cand.email} | Phone: {cand.phone} | Experience: {cand.total_experience} Years) Tj ET
BT /F1 12 Tf 50 650 Td (Skills: {', '.join(cand.skills or [])}) Tj ET
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

    # Check local filesystem
    local_path = storage_service.get_local_path(candidate_id=cand.id, safe_name=os.path.basename(doc.storage_path))
    if local_path and os.path.exists(local_path):
        return FileResponse(
            path=local_path,
            filename=doc.file_name,
            media_type=doc.mime_type or "application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'}
        )

    return FileResponse(
        path=os.path.join(storage_service.local_dir, doc.storage_path),
        filename=doc.file_name,
        media_type=doc.mime_type or "application/pdf"
    )

@router.put("/{cand_id}", response_model=CandidateResponse)
def update_candidate(
    cand_id: str,
    cand_in: CandidateUpdate,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_dict = {
        "status": str(cand.status.value if hasattr(cand.status, 'value') else cand.status),
        "bench_status": str(cand.bench_status.value if hasattr(cand.bench_status, 'value') else cand.bench_status),
        "whatsapp_consent_status": str(cand.whatsapp_consent_status.value if hasattr(cand.whatsapp_consent_status, 'value') else cand.whatsapp_consent_status)
    }

    update_data = cand_in.model_dump(exclude_unset=True)
    remarks_val = update_data.pop("remarks", None)
    for field, val in update_data.items():
        if hasattr(cand, field):
            setattr(cand, field, val)

    cand.updated_at = datetime.now(timezone.utc)

    # If bench status changed, update bench record
    if cand_in.bench_status is not None:
        bench_rec = cand.bench_resource
        if cand_in.bench_status == BenchStatusEnum.NOT_ON_BENCH:
            if bench_rec:
                db.delete(bench_rec)
        else:
            if not bench_rec:
                bench_rec = BenchResource(
                    candidate_id=cand.id,
                    bench_status=cand_in.bench_status,
                    primary_skills=cand.bench_primary_skills,
                    secondary_skills=cand.bench_secondary_skills,
                    availability_date=cand.bench_availability_date or datetime.now(timezone.utc),
                    recruiter_id=current_user.id
                )
                db.add(bench_rec)
            else:
                bench_rec.bench_status = cand_in.bench_status
                if cand_in.bench_availability_date:
                    bench_rec.availability_date = cand_in.bench_availability_date

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="CANDIDATE_UPDATED",
        entity="CANDIDATE",
        entity_id=cand.id,
        old_value=old_dict,
        new_value={"status": str(cand.status.value if hasattr(cand.status, 'value') else cand.status)},
        remarks=f"Candidate {cand.first_name} {cand.last_name} profile updated."
    )
    db.add(audit)

    # Record status history if status changed
    new_st = str(cand.status.value if hasattr(cand.status, 'value') else cand.status)
    if cand_in.status is not None:
        hist = CandidateStatusHistory(
            candidate_id=cand.id,
            old_status=old_dict["status"],
            new_status=new_st,
            changed_by_id=current_user.id,
            remarks=remarks_val or f"Candidate status updated to {new_st}"
        )
        db.add(hist)

    db.commit()
    db.refresh(cand)

    return build_candidate_response_obj(cand, db)

@router.post("/{cand_id}/documents", response_model=CandidateDocumentResponse)
async def upload_candidate_document(
    cand_id: str,
    file: UploadFile = File(...),
    document_type: str = Form("Resume"),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    filename, ext = storage_service.validate_file(file)
    content = await file.read()

    current_version = db.query(CandidateDocument).filter(
        CandidateDocument.candidate_id == cand.id
    ).count() + 1

    safe_name = f"candidate_{cand.id}_v{current_version}_{uuid.uuid4().hex[:6]}_{filename}"
    cand_dir = os.path.join(storage_service.local_dir, "candidates", str(cand.id))
    os.makedirs(cand_dir, exist_ok=True)
    with open(os.path.join(cand_dir, safe_name), "wb") as f_out:
        f_out.write(content)

    doc = CandidateDocument(
        candidate_id=cand.id,
        version_number=current_version,
        document_type=document_type,
        file_name=filename,
        file_size=len(content),
        mime_type=file.content_type or "application/pdf",
        storage_path=os.path.relpath(os.path.join(cand_dir, safe_name), storage_service.local_dir),
        file_url=f"/api/v1/documents/download/{safe_name}?cid={cand.id}",
        uploaded_by_id=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return CandidateDocumentResponse(
        id=str(doc.id),
        candidate_id=str(doc.candidate_id),
        version_number=doc.version_number,
        document_type=doc.document_type,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_url=doc.file_url,
        uploaded_by_id=str(doc.uploaded_by_id) if doc.uploaded_by_id else None,
        uploaded_by_name=current_user.full_name,
        created_at=doc.created_at
    )

@router.delete("/{cand_id}/documents/{doc_id}")
def delete_candidate_document(
    cand_id: str,
    doc_id: str,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER])),
    db: Session = Depends(get_db)
):
    doc = db.query(CandidateDocument).filter(
        CandidateDocument.id == doc_id,
        CandidateDocument.candidate_id == cand_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}

@router.delete("/{cand_id}")
def delete_candidate(
    cand_id: str,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(cand)
    db.commit()
    return {"message": "Candidate deleted successfully"}

@router.post("/{cand_id}/consent", response_model=CandidateResponse)
def record_candidate_whatsapp_consent(
    cand_id: str,
    consent_in: WhatsAppConsentRecordRequest,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_status = cand.whatsapp_consent_status
    cand.whatsapp_consent_status = consent_in.consent_status
    cand.whatsapp_consent_source = consent_in.consent_source
    cand.whatsapp_consent_evidence = consent_in.evidence_reference
    cand.whatsapp_consent_date = datetime.now(timezone.utc)
    cand.whatsapp_opt_out_status = False

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="WHATSAPP_CONSENT_GRANTED",
        entity="WHATSAPP_CONSENT",
        entity_id=cand.id,
        old_value={"consent_status": str(old_status.value if hasattr(old_status, 'value') else old_status)},
        new_value={"consent_status": "GRANTED", "source": consent_in.consent_source, "evidence": consent_in.evidence_reference},
        remarks=f"WhatsApp consent GRANTED for {cand.first_name} {cand.last_name} ({cand.whatsapp_number or cand.phone})."
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)

    return build_candidate_response_obj(cand, db)

@router.post("/{cand_id}/revoke-consent", response_model=CandidateResponse)
def revoke_candidate_whatsapp_consent(
    cand_id: str,
    revoke_in: WhatsAppConsentRevokeRequest,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cand.whatsapp_consent_status = WhatsAppConsentStatusEnum.REVOKED
    cand.do_not_contact_reason = revoke_in.reason

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="WHATSAPP_CONSENT_REVOKED",
        entity="WHATSAPP_CONSENT",
        entity_id=cand.id,
        new_value={"consent_status": "REVOKED", "reason": revoke_in.reason},
        remarks=f"WhatsApp consent revoked for {cand.first_name} {cand.last_name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(cand)

    return build_candidate_response_obj(cand, db)

@router.post("/{cand_id}/opt-out", response_model=CandidateResponse)
def opt_out_candidate(
    cand_id: str,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    record_candidate_opt_out(
        db=db,
        whatsapp_number=cand.whatsapp_number or cand.phone or "",
        candidate_id=cand.id,
        source="MANUAL_ADMIN",
        reason="Manual opt-out recorded by recruiter/admin",
        recorded_by=current_user
    )
    db.refresh(cand)
    return build_candidate_response_obj(cand, db)
