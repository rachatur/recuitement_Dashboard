from typing import List, Optional
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.core.audit import log_audit_event
from app.core.storage import storage_service
from app.models import (
    Candidate, BenchResource, JobRequirement, User, AuditLog,
    BenchStatusEnum, WhatsAppConsentStatusEnum, CandidateDocument,
    CandidateStatusHistory, CandidateStatusEnum
)
from app.schemas import (
    BenchCandidateResponse, BenchStatusUpdateRequest,
    RequirementMatchResultResponse, BulkCVProcessItem, BulkCVUploadResponse
)
from app.services.bench_service import (
    query_bench_candidates, match_candidates_to_job_requirement,
    build_bench_candidate_response
)
from app.services.cv_extraction_service import parse_cv_document, validate_whatsapp_eligibility

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
    resource_type: Optional[str] = None,
    notice_period: Optional[str] = None,
    whatsapp_eligible_only: bool = False,
    consent_status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Lists candidates currently on the Bench with rich filtering options:
    - Skills, Experience, Location, Designation, Bench Status, Resource Type, Notice Period, WhatsApp Eligibility.
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
        resource_type=resource_type,
        notice_period=notice_period,
        whatsapp_eligible_only=whatsapp_eligible_only,
        consent_status=consent_status
    )

@router.post("/upload-cv", response_model=BenchCandidateResponse)
async def upload_bench_cv(
    file: UploadFile = File(...),
    resource_type: str = Form("Employee"),
    availability_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Uploads a CV directly into the Bench Resource Pool:
    - Automatically extracts candidate name, email, phone, exact position, experience, primary/secondary skills, location.
    - Sets bench status to AVAILABLE and classifies resource type (Employee, Contract Based, Freelancer/Other).
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "resume.pdf"
    parsed = parse_cv_document(filename, content)

    email = parsed.get("email") or f"bench.{uuid.uuid4().hex[:6]}@domain.com"
    fname = parsed.get("first_name") or "Bench"
    lname = parsed.get("last_name") or "Resource"
    phone = parsed.get("phone") or ""
    whatsapp_num = parsed.get("whatsapp_number") or phone
    exact_pos = parsed.get("position") or parsed.get("current_designation") or "Software Engineer"

    # Check if candidate already exists
    cand = db.query(Candidate).filter(Candidate.email == email).first()
    if not cand:
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
            current_designation=exact_pos,
            resource_type=resource_type,
            skills=parsed.get("skills", []),
            technical_skills=parsed.get("technical_skills", []),
            bench_primary_skills=parsed.get("primary_skills", []),
            bench_secondary_skills=parsed.get("secondary_skills", []),
            bench_status=BenchStatusEnum.AVAILABLE,
            source="Bench CV Upload",
            recruiter_id=current_user.id,
            status=CandidateStatusEnum.RECEIVED,
            whatsapp_consent_status=WhatsAppConsentStatusEnum.NOT_COLLECTED
        )
        db.add(cand)
        db.flush()
    else:
        cand.bench_status = BenchStatusEnum.AVAILABLE
        cand.resource_type = resource_type
        if parsed.get("primary_skills"):
            cand.bench_primary_skills = parsed.get("primary_skills")
        if parsed.get("secondary_skills"):
            cand.bench_secondary_skills = parsed.get("secondary_skills")
        if exact_pos:
            cand.current_designation = exact_pos
        db.flush()

    # Store CV Document
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

    # Upsert BenchResource record
    bench_rec = cand.bench_resource
    avail_dt = datetime.fromisoformat(availability_date) if availability_date else datetime.now(timezone.utc)
    if not bench_rec:
        bench_rec = BenchResource(
            candidate_id=cand.id,
            bench_status=BenchStatusEnum.AVAILABLE,
            primary_skills=cand.bench_primary_skills or (cand.skills[:5] if cand.skills else []),
            secondary_skills=cand.bench_secondary_skills or (cand.skills[5:] if cand.skills and len(cand.skills) > 5 else []),
            availability_date=avail_dt,
            recruiter_id=current_user.id,
            notes=notes
        )
        db.add(bench_rec)
    else:
        bench_rec.bench_status = BenchStatusEnum.AVAILABLE
        bench_rec.availability_date = avail_dt
        if notes:
            bench_rec.notes = notes

    db.commit()
    db.refresh(cand)
    return build_bench_candidate_response(cand, db)

@router.post("/bulk-upload", response_model=BulkCVUploadResponse)
async def bulk_upload_bench_cvs(
    files: List[UploadFile] = File(...),
    resource_type: str = Form("Employee"),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """
    Bulk uploads multiple candidate resumes directly into the Bench Resource Pool.
    """
    items = []
    success_count = 0
    fail_count = 0
    new_cand_count = 0
    duplicate_count = 0
    wa_eligible_count = 0
    consent_req_count = 0
    invalid_num_count = 0

    for file in files:
        filename = file.filename or "uploaded_cv.pdf"
        try:
            content = await file.read()
            if not content:
                items.append(BulkCVProcessItem(
                    file_name=filename,
                    status="Failed",
                    error_message="Empty file content"
                ))
                fail_count += 1
                continue

            parsed = parse_cv_document(filename, content)
            email = parsed.get("email") or f"bench.{uuid.uuid4().hex[:6]}@domain.com"
            fname = parsed.get("first_name") or "Bench"
            lname = parsed.get("last_name") or "Resource"
            phone = parsed.get("phone") or ""
            whatsapp_num = parsed.get("whatsapp_number") or phone
            exact_pos = parsed.get("position") or parsed.get("current_designation") or "Software Engineer"

            dup_cand = db.query(Candidate).filter(Candidate.email == email).first()
            if dup_cand:
                dup_cand.bench_status = BenchStatusEnum.AVAILABLE
                dup_cand.resource_type = resource_type
                if exact_pos:
                    dup_cand.current_designation = exact_pos
                if parsed.get("primary_skills"):
                    dup_cand.bench_primary_skills = parsed.get("primary_skills")
                if parsed.get("secondary_skills"):
                    dup_cand.bench_secondary_skills = parsed.get("secondary_skills")
                db.flush()
                duplicate_count += 1
                cand = dup_cand
            else:
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
                    current_designation=exact_pos,
                    resource_type=resource_type,
                    skills=parsed.get("skills", []),
                    technical_skills=parsed.get("technical_skills", []),
                    bench_primary_skills=parsed.get("primary_skills", []),
                    bench_secondary_skills=parsed.get("secondary_skills", []),
                    bench_status=BenchStatusEnum.AVAILABLE,
                    source="Bench Bulk Upload",
                    recruiter_id=current_user.id,
                    status=CandidateStatusEnum.RECEIVED,
                    whatsapp_consent_status=WhatsAppConsentStatusEnum.NOT_COLLECTED
                )
                db.add(cand)
                db.flush()
                new_cand_count += 1

            # Save CV Document
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

            # Upsert BenchResource
            if not cand.bench_resource:
                b_rec = BenchResource(
                    candidate_id=cand.id,
                    bench_status=BenchStatusEnum.AVAILABLE,
                    primary_skills=cand.bench_primary_skills or (cand.skills[:5] if cand.skills else []),
                    secondary_skills=cand.bench_secondary_skills or (cand.skills[5:] if cand.skills and len(cand.skills) > 5 else []),
                    availability_date=datetime.now(timezone.utc),
                    recruiter_id=current_user.id
                )
                db.add(b_rec)

            success_count += 1
            items.append(BulkCVProcessItem(
                file_name=filename,
                status="Completed",
                candidate_id=str(cand.id),
                candidate_name=f"{cand.first_name} {cand.last_name}",
                email=cand.email,
                phone=cand.phone,
                whatsapp_eligibility="Consent Required" if cand.whatsapp_consent_status != WhatsAppConsentStatusEnum.GRANTED else "Eligible",
                is_duplicate=bool(dup_cand)
            ))
        except Exception as e:
            fail_count += 1
            items.append(BulkCVProcessItem(
                file_name=filename,
                status="Failed",
                error_message=str(e)
            ))

    db.commit()

    return BulkCVUploadResponse(
        total_uploaded=len(files),
        successfully_processed=success_count,
        failed_count=fail_count,
        duplicates_detected=duplicate_count,
        new_candidates_created=new_cand_count,
        whatsapp_eligible_count=wa_eligible_count,
        consent_required_count=consent_req_count,
        invalid_numbers_count=invalid_num_count,
        items=items
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
    if status_in.resource_type:
        cand.resource_type = status_in.resource_type
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
                secondary_skills=cand.bench_secondary_skills or (cand.skills[5:] if cand.skills and len(cand.skills) > 5 else []),
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
        new_value={"bench_status": status_in.bench_status.value, "notes": status_in.notes, "resource_type": cand.resource_type},
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
    - Analyzes position match, primary/secondary skills, experience fit, location, availability.
    - Shows match %, matched skills, missing skills, and WhatsApp outreach eligibility.
    """
    try:
        return match_candidates_to_job_requirement(db, requirement_id, bench_only=bench_only)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
