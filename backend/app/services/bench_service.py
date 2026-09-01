import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import (
    Candidate, BenchResource, JobRequirement, User, AuditLog,
    BenchStatusEnum, WhatsAppConsentStatusEnum
)
from app.schemas import (
    BenchCandidateResponse, RequirementMatchResultResponse,
    RequirementMatchCandidateResponse, WhatsAppEligibilityInfo
)
from app.services.cv_extraction_service import validate_whatsapp_eligibility, infer_position_and_skills

logger = logging.getLogger(__name__)

def build_bench_candidate_response(c: Candidate, db: Session) -> BenchCandidateResponse:
    recruiter_name = c.recruiter.full_name if c.recruiter else None
    
    # Bench record
    bench = c.bench_resource
    bench_status = bench.bench_status if bench else (c.bench_status or BenchStatusEnum.AVAILABLE)
    avail_date = bench.availability_date if bench else c.bench_availability_date
    
    # Dynamic Position & Skills normalization
    inferred_pos, p_skills, s_skills = infer_position_and_skills(
        raw_designation=c.current_designation,
        all_skills=c.skills or [],
        stored_primary=getattr(c, "bench_primary_skills", None) or (bench.primary_skills if bench else []),
        stored_secondary=getattr(c, "bench_secondary_skills", None) or (bench.secondary_skills if bench else [])
    )
    
    assigned_req = bench.assigned_requirement if bench else None
    
    # Latest resume document
    latest_doc = c.documents[-1] if c.documents else None
    resume_name = latest_doc.file_name if latest_doc else None
    resume_url = f"/api/v1/candidates/{c.id}/cv/download"

    # Resource type (Employee, Contract Based, Freelancer/Other)
    res_type = getattr(c, "resource_type", None) or "Employee"

    # WhatsApp eligibility
    eligibility = validate_whatsapp_eligibility(
        db=db,
        phone_or_whatsapp=c.whatsapp_number or c.phone,
        consent_status=c.whatsapp_consent_status,
        candidate_id=c.id
    )

    return BenchCandidateResponse(
        candidate_id=str(c.id),
        candidate_code=c.candidate_code,
        full_name=f"{c.first_name} {c.last_name}".strip(),
        first_name=c.first_name,
        last_name=c.last_name,
        email=c.email,
        phone=c.phone,
        whatsapp_number=c.whatsapp_number or c.phone,
        location=c.location,
        preferred_location=c.preferred_location,
        total_experience=c.total_experience or 0.0,
        relevant_experience=c.relevant_experience or 0.0,
        current_company=c.current_company,
        designation=c.current_designation or inferred_pos,
        position=inferred_pos,
        resource_type=res_type,
        primary_skills=p_skills,
        secondary_skills=s_skills,
        notice_period=c.notice_period or f"{c.notice_period_days} Days",
        current_ctc=c.current_ctc,
        expected_ctc=c.expected_ctc,
        bench_status=bench_status,
        availability_date=avail_date,
        assigned_requirement_id=str(assigned_req.id) if assigned_req else None,
        assigned_requirement_code=assigned_req.req_code if assigned_req else None,
        assigned_requirement_title=assigned_req.job_title if assigned_req else None,
        recruiter_id=str(c.recruiter_id) if c.recruiter_id else None,
        recruiter_name=recruiter_name,
        whatsapp_eligibility=eligibility,
        whatsapp_consent_status=c.whatsapp_consent_status,
        last_outreach_date=c.last_whatsapp_contact_date,
        last_updated=c.updated_at,
        resume_file_name=resume_name,
        resume_download_url=resume_url
    )

def query_bench_candidates(
    db: Session,
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
    consent_status: Optional[str] = None
) -> List[BenchCandidateResponse]:
    """Retrieves and filters candidates on the bench pool."""
    query = db.query(Candidate).filter(
        Candidate.bench_status != BenchStatusEnum.NOT_ON_BENCH
    )

    if bench_status:
        query = query.filter(Candidate.bench_status == bench_status)
    if resource_type:
        query = query.filter(Candidate.resource_type == resource_type)
    if min_exp is not None:
        query = query.filter(Candidate.total_experience >= min_exp)
    if max_exp is not None:
        query = query.filter(Candidate.total_experience <= max_exp)
    if location:
        query = query.filter(Candidate.location.ilike(f"%{location}%"))
    if designation:
        query = query.filter(Candidate.current_designation.ilike(f"%{designation}%"))
    if consent_status:
        query = query.filter(Candidate.whatsapp_consent_status == consent_status)
    if search:
        query = query.filter(
            or_(
                Candidate.first_name.ilike(f"%{search}%"),
                Candidate.last_name.ilike(f"%{search}%"),
                Candidate.email.ilike(f"%{search}%"),
                Candidate.phone.ilike(f"%{search}%"),
                Candidate.whatsapp_number.ilike(f"%{search}%"),
                Candidate.current_designation.ilike(f"%{search}%"),
                Candidate.location.ilike(f"%{search}%")
            )
        )

    candidates = query.order_by(Candidate.updated_at.desc()).all()
    results = []

    for c in candidates:
        if skill:
            cand_skills_lower = [s.lower() for s in (c.skills or [])] + [s.lower() for s in (c.bench_primary_skills or [])]
            if skill.lower() not in cand_skills_lower:
                continue

        resp = build_bench_candidate_response(c, db)

        if whatsapp_eligible_only and not resp.whatsapp_eligibility.is_eligible:
            continue

        results.append(resp)

    return results

def match_candidates_to_job_requirement(
    db: Session,
    requirement_id: str,
    bench_only: bool = False
) -> RequirementMatchResultResponse:
    """
    Intelligently scores and matches bench (or talent pool) candidates against a specific job requirement:
    - Position/Job Title match (25% weight)
    - Primary Skills overlap (40% weight)
    - Secondary/Supporting Skills overlap (15% weight)
    - Experience fit (15% weight)
    - Location & Availability fit (5% weight)
    """
    req = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()
    if not req:
        raise ValueError("Requirement not found")

    query = db.query(Candidate)
    if bench_only:
        query = query.filter(Candidate.bench_status != BenchStatusEnum.NOT_ON_BENCH)
    
    candidates = query.all()
    req_title_lower = (req.job_title or "").strip().lower()
    req_skills = [s.strip().lower() for s in (req.required_skills or [])]
    matched_results = []

    for c in candidates:
        bench_resp = build_bench_candidate_response(c, db)
        cand_pos_lower = (bench_resp.position or c.current_designation or "").strip().lower()
        
        cand_primary = set(s.strip().lower() for s in bench_resp.primary_skills)
        cand_secondary = set(s.strip().lower() for s in bench_resp.secondary_skills)
        cand_all_skills = set(s.strip().lower() for s in (c.skills or [])) | cand_primary | cand_secondary

        matched = []
        missing = []

        for rs in req.required_skills or []:
            if rs.strip().lower() in cand_all_skills:
                matched.append(rs)
            else:
                missing.append(rs)

        # 1. Position / Job Title Score (0 to 25)
        pos_score = 0.0
        if req_title_lower and cand_pos_lower:
            if req_title_lower == cand_pos_lower or req_title_lower in cand_pos_lower or cand_pos_lower in req_title_lower:
                pos_score = 25.0
            else:
                # Check keyword overlap in job titles (e.g. "Oracle", "Java", "React", "Developer")
                req_words = set(req_title_lower.split())
                cand_words = set(cand_pos_lower.split())
                common_words = req_words.intersection(cand_words) - {"developer", "engineer", "senior", "lead", "junior"}
                if common_words:
                    pos_score = 20.0
                elif req_words.intersection(cand_words):
                    pos_score = 10.0

        # 2. Primary & Secondary Skill Score (0 to 55)
        primary_matches = sum(1 for rs in req.required_skills or [] if rs.strip().lower() in cand_primary)
        other_matches = len(matched) - primary_matches
        
        if req_skills:
            skill_score = (primary_matches / len(req_skills)) * 40.0 + (other_matches / len(req_skills)) * 15.0
        else:
            skill_score = 40.0 if pos_score > 0 else 20.0

        # 3. Experience Score (0 to 15)
        cand_exp = c.total_experience or 0.0
        req_min = req.experience_min or 0.0
        if cand_exp >= req_min:
            exp_score = 15.0
            exp_fit = f"{cand_exp} Years (Meets {req_min}+ Years requirement)"
        else:
            exp_score = max(0.0, (cand_exp / max(req_min, 1.0)) * 15.0)
            exp_fit = f"{cand_exp} Years (Under {req_min} Years requirement)"

        # 4. Location & Availability (0 to 5)
        loc_score = 5.0
        if req.location and c.location and req.location.lower() not in c.location.lower():
            loc_score = 2.5

        total_match = min(100, int(round(pos_score + skill_score + exp_score + loc_score)))

        if total_match >= 85:
            rec = f"Top Match ({total_match}%) — Recommended for immediate client submission & interview scheduling."
        elif total_match >= 65:
            rec = f"Strong Fit ({total_match}%) — Good alignment on core stack and experience."
        elif total_match >= 45:
            rec = f"Moderate Fit ({total_match}%) — Partial stack overlap; review candidate profile."
        else:
            rec = f"Low Fit ({total_match}%) — Significant position or skill gaps."

        matched_results.append(
            RequirementMatchCandidateResponse(
                candidate=bench_resp,
                match_percentage=total_match,
                matched_skills=matched,
                missing_skills=missing,
                experience_fit=exp_fit,
                recommendation=rec,
                whatsapp_eligible=bench_resp.whatsapp_eligibility.is_eligible
            )
        )

    # Sort descending by match percentage
    matched_results.sort(key=lambda x: x.match_percentage, reverse=True)

    return RequirementMatchResultResponse(
        requirement_id=str(req.id),
        requirement_code=req.req_code,
        job_title=req.job_title,
        client_name=req.client.name if req.client else None,
        required_skills=req.required_skills or [],
        total_candidates_evaluated=len(candidates),
        matched_candidates=matched_results
    )
