import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.rbac import get_current_active_user
from app.core.storage import storage_service
from app.core.audit import log_audit_event
from app.models import (
    Candidate, JobRequirement, User, CandidateDocument,
    CandidateStatusHistory, CandidateStatusEnum, WhatsAppConsentStatusEnum, BenchStatusEnum
)
from app.schemas import (
    AIParseResumeRequest, AIParseResumeResponse,
    AIMatchScoreRequest, AIMatchScoreResponse,
    ATSAnalysisResponse, ATSCreateCandidateRequest
)
from app.services.ai_service import (
    simulate_resume_parsing, calculate_candidate_match, evaluate_resume_ats
)
from app.services.cv_extraction_service import (
    extract_text_from_file, parse_candidate_from_text
)

router = APIRouter(prefix="/ai-tools", tags=["AI Module & Matching Tools"])

@router.post("/parse-resume", response_model=AIParseResumeResponse)
def parse_resume(
    req: AIParseResumeRequest,
    current_user: User = Depends(get_current_active_user)
):
    parsed = simulate_resume_parsing(req.document_text)
    return AIParseResumeResponse(**parsed)

@router.post("/match-score", response_model=AIMatchScoreResponse)
def compute_match_score(
    req: AIMatchScoreRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    requirement = db.query(JobRequirement).filter(JobRequirement.id == req.requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Job requirement not found")

    match_result = calculate_candidate_match(candidate, requirement)
    return AIMatchScoreResponse(**match_result)

@router.post("/ats-checker", response_model=ATSAnalysisResponse)
async def check_resume_ats(
    file: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
    candidate_id: Optional[str] = Form(None),
    requirement_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive ATS CV evaluation endpoint.
    Accepts:
    1. Uploaded CV file (.pdf, .docx, .doc, .txt)
    2. Raw resume text
    3. Existing Candidate ID
    Optionally evaluates match against a specific Job Requirement.
    """
    requirement = None
    if requirement_id and requirement_id.strip():
        requirement = db.query(JobRequirement).filter(JobRequirement.id == requirement_id.strip()).first()

    raw_text = ""
    filename = "resume.pdf"
    file_size = 0
    temp_file_id = None
    parsed_candidate = None

    if file:
        filename, _ = storage_service.validate_file(file)
        content = await file.read()
        file_size = len(content)
        raw_text = extract_text_from_file(content, filename)
        parsed_candidate = parse_candidate_from_text(raw_text, filename)

        # Cache file in temp_uploads for 1-click candidate creation
        temp_id = uuid.uuid4().hex
        temp_dir = os.path.join(storage_service.local_dir, "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_id = f"{temp_id}_{filename}"
        temp_path = os.path.join(temp_dir, temp_file_id)
        with open(temp_path, "wb") as f:
            f.write(content)

    elif candidate_id and candidate_id.strip():
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id.strip()).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Check if candidate has an uploaded resume file
        latest_doc = db.query(CandidateDocument).filter(
            CandidateDocument.candidate_id == candidate.id
        ).order_by(CandidateDocument.version_number.desc()).first()

        if latest_doc:
            filename = latest_doc.file_name
            file_size = latest_doc.file_size
            local_doc_path = storage_service.get_local_path(candidate.id, os.path.basename(latest_doc.file_url.split("?")[0]))
            if local_doc_path and os.path.exists(local_doc_path):
                with open(local_doc_path, "rb") as f:
                    doc_bytes = f.read()
                raw_text = extract_text_from_file(doc_bytes, filename)

        if not raw_text:
            skills_str = ", ".join(candidate.skills or candidate.technical_skills or [])
            raw_text = (
                f"{candidate.first_name} {candidate.last_name}\n"
                f"Email: {candidate.email}\nPhone: {candidate.phone or ''}\n"
                f"Location: {candidate.location or ''}\n"
                f"Summary: Experienced {candidate.current_designation or 'Professional'} with {candidate.total_experience or 0} years experience.\n"
                f"Work Experience: {candidate.current_designation or ''} at {candidate.current_company or ''}\n"
                f"Education: {candidate.highest_qualification or candidate.education or 'Bachelor Degree'}\n"
                f"Technical Skills: {skills_str}\n"
            )

        parsed_candidate = {
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "full_name": f"{candidate.first_name} {candidate.last_name}",
            "email": candidate.email,
            "phone": candidate.phone,
            "location": candidate.location,
            "total_experience": candidate.total_experience or 0.0,
            "current_company": candidate.current_company,
            "current_designation": candidate.current_designation,
            "education": candidate.education or candidate.highest_qualification,
            "highest_qualification": candidate.highest_qualification or candidate.education,
            "skills": candidate.skills or candidate.technical_skills or [],
            "linkedin_url": candidate.linkedin_url,
            "github_url": candidate.github_url,
            "summary": f"{candidate.current_designation or 'Engineer'} with expertise in {skills_str[:60]}."
        }

    elif resume_text and resume_text.strip():
        raw_text = resume_text.strip()
        filename = "resume.txt"
        file_size = len(raw_text.encode("utf-8"))
        parsed_candidate = parse_candidate_from_text(raw_text, filename)

    else:
        raise HTTPException(status_code=400, detail="Please provide a CV file, resume text, or select an existing candidate.")

    result = evaluate_resume_ats(
        raw_text=raw_text,
        filename=filename,
        requirement=requirement,
        parsed_candidate=parsed_candidate,
        file_size=file_size
    )
    result["temp_file_id"] = temp_file_id

    return ATSAnalysisResponse(**result)

@router.post("/ats-create-candidate")
def create_candidate_from_ats(
    req: ATSCreateCandidateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Directly registers a candidate created from ATS studio into the database.
    Links the uploaded document if a temporary file is provided.
    """
    existing = db.query(Candidate).filter(Candidate.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists in the talent pool.")

    code = f"CAN-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc)

    candidate = Candidate(
        candidate_code=code,
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone=req.phone,
        whatsapp_number=req.whatsapp_number or req.phone,
        location=req.location,
        total_experience=req.total_experience,
        relevant_experience=max(0.0, req.total_experience - 0.5),
        current_company=req.current_company,
        current_designation=req.current_designation or "Software Engineer",
        skills=req.skills,
        technical_skills=req.skills,
        education=req.education or "Bachelor's Degree",
        highest_qualification=req.education or "Bachelor's Degree",
        source=req.source,
        status=CandidateStatusEnum.RECEIVED,
        bench_status=BenchStatusEnum.NOT_ON_BENCH,
        whatsapp_consent_status=WhatsAppConsentStatusEnum.GRANTED,
        whatsapp_consent_source="ATS Studio Upload",
        whatsapp_consent_date=now,
        recruiter_id=current_user.id
    )
    db.add(candidate)
    db.flush()

    # Move temp file to candidate folder if temp_file_id provided
    if req.temp_file_id:
        temp_dir = os.path.join(storage_service.local_dir, "temp_uploads")
        temp_path = os.path.join(temp_dir, req.temp_file_id)
        if os.path.exists(temp_path):
            cand_dir = os.path.join(storage_service.local_dir, "candidates", str(candidate.id))
            os.makedirs(cand_dir, exist_ok=True)
            
            ext = os.path.splitext(req.temp_file_id)[1]
            safe_name = f"candidate_{candidate.id}_v1_{uuid.uuid4().hex[:8]}{ext}"
            final_path = os.path.join(cand_dir, safe_name)
            shutil.copy2(temp_path, final_path)

            file_size = os.path.getsize(final_path)
            orig_name = req.temp_file_id.split("_", 1)[1] if "_" in req.temp_file_id else req.temp_file_id
            
            doc = CandidateDocument(
                candidate_id=candidate.id,
                version_number=1,
                document_type="Resume",
                file_name=orig_name,
                file_size=file_size,
                mime_type="application/pdf" if ext == ".pdf" else "application/octet-stream",
                file_url=f"/api/v1/documents/download/{safe_name}?cid={candidate.id}",
                uploaded_by_id=current_user.id
            )
            db.add(doc)

    status_hist = CandidateStatusHistory(
        candidate_id=candidate.id,
        old_status=None,
        new_status=CandidateStatusEnum.RECEIVED.value,
        changed_by_id=current_user.id,
        remarks="Candidate created via AI ATS Studio"
    )
    db.add(status_hist)
    db.commit()
    db.refresh(candidate)

    log_audit_event(
        db=db,
        user=current_user,
        entity="Candidate",
        entity_id=candidate.id,
        action="CREATE_FROM_ATS",
        new_value={"code": candidate.candidate_code, "name": f"{candidate.first_name} {candidate.last_name}", "email": candidate.email}
    )

    return {
        "message": f"Candidate {candidate.first_name} {candidate.last_name} ({candidate.candidate_code}) created successfully!",
        "candidate_id": str(candidate.id),
        "candidate_code": candidate.candidate_code,
        "email": candidate.email,
        "full_name": f"{candidate.first_name} {candidate.last_name}"
    }

@router.get("/duplicate-check/{candidate_id}")
def check_duplicates(
    candidate_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    duplicates = db.query(Candidate).filter(
        Candidate.id != candidate.id,
        or_(
            Candidate.email == candidate.email,
            Candidate.phone == candidate.phone,
            (Candidate.first_name == candidate.first_name) & (Candidate.last_name == candidate.last_name)
        )
    ).all()

    return {
        "candidate_id": candidate.id,
        "is_duplicate_likely": len(duplicates) > 0,
        "potential_matches": [
            {
                "id": str(d.id),
                "code": d.candidate_code,
                "name": f"{d.first_name} {d.last_name}",
                "email": d.email,
                "phone": d.phone,
                "current_company": d.current_company
            } for d in duplicates
        ]
    }

