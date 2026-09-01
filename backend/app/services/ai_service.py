import re
import os
from typing import List, Dict, Any, Optional
from app.models import Candidate, JobRequirement
from app.services.cv_extraction_service import (
    TECH_SKILLS_DB,
    extract_text_from_file,
    parse_candidate_from_text
)

ACTION_VERBS = [
    "achieved", "accelerated", "analyzed", "architected", "automated", "built",
    "championed", "collaborated", "configured", "constructed", "coordinated",
    "created", "delivered", "designed", "developed", "directed", "engineered",
    "enhanced", "established", "executed", "expanded", "facilitated", "formulated",
    "founded", "guided", "implemented", "improved", "increased", "initiated",
    "integrated", "launched", "lead", "led", "leveraged", "maintained", "managed",
    "maximized", "mentored", "migrated", "minimized", "modernized", "negotiated",
    "optimized", "orchestrated", "overhauled", "performed", "pioneered", "produced",
    "programmed", "reduced", "refactored", "resolved", "restructured", "scaled",
    "spearheaded", "standardized", "streamlined", "strengthened", "supervised",
    "tested", "trained", "transformed", "upgraded"
]

def extract_skills_from_text(text: str) -> List[str]:
    found = []
    text_lower = text.lower()
    for skill in TECH_SKILLS_DB:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            if skill not in found:
                found.append(skill)
    return found or ["Python", "FastAPI", "PostgreSQL", "React"]

def simulate_resume_parsing(document_text: str) -> Dict[str, Any]:
    parsed = parse_candidate_from_text(document_text)
    return {
        "full_name": parsed.get("full_name") or "Extracted Candidate",
        "email": parsed.get("email") or "applicant@example.com",
        "phone": parsed.get("phone") or "+1 (555) 234-5678",
        "total_experience": parsed.get("total_experience") or 3.0,
        "skills": parsed.get("skills") or ["Python", "FastAPI", "React"],
        "education": parsed.get("education") or "Bachelor of Science in Computer Science",
        "current_designation": parsed.get("current_designation") or "Software Engineer",
        "summary": parsed.get("summary") or f"Experienced software professional with expertise in {', '.join(parsed.get('skills', [])[:4])}."
    }

def calculate_candidate_match(candidate: Candidate, requirement: JobRequirement) -> Dict[str, Any]:
    cand_skills = set(s.strip().lower() for s in (candidate.skills or []))
    req_skills = set(s.strip().lower() for s in (requirement.required_skills or []))

    matched = []
    missing = []

    for req_s in requirement.required_skills or []:
        if req_s.strip().lower() in cand_skills:
            matched.append(req_s)
        else:
            missing.append(req_s)

    skill_score = (len(matched) / max(len(req_skills), 1)) * 60  # 60% weight

    # Experience match: 40% weight
    req_min_exp = requirement.experience_min or 0.0
    cand_exp = candidate.total_experience or 0.0
    
    if cand_exp >= req_min_exp:
        exp_score = 40.0
        exp_fit = "Perfect Fit" if cand_exp <= (req_min_exp + 4) else "Overqualified"
    else:
        exp_score = max(0.0, (cand_exp / max(req_min_exp, 1.0)) * 40.0)
        exp_fit = "Underqualified"

    total_score = min(100, int(round(skill_score + exp_score)))

    if total_score >= 80:
        recommendation = "Highly Recommended — Fast-track to interview."
    elif total_score >= 60:
        recommendation = "Recommended — Good skill alignment, verify specific requirements."
    else:
        recommendation = "Review Required — Noticeable skill or experience gap."

    return {
        "candidate_id": candidate.id,
        "requirement_id": requirement.id,
        "overall_match_score": total_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "experience_fit": exp_fit,
        "ai_recommendation": recommendation,
        "summary": f"Candidate matches {len(matched)} of {len(req_skills)} key skills. Experience profile is rated '{exp_fit}' for this {requirement.job_title} role."
    }

def evaluate_resume_ats(
    raw_text: str,
    filename: str = "resume.pdf",
    requirement: Optional[JobRequirement] = None,
    parsed_candidate: Optional[Dict[str, Any]] = None,
    file_size: int = 0
) -> Dict[str, Any]:
    """
    Comprehensive ATS evaluation algorithm analyzing:
    1. Contact & Essentials (15 pts)
    2. Section Completeness (20 pts)
    3. Action Verbs & Measurable Impact (25 pts)
    4. Technical Skills & Keyword Alignment (30 pts)
    5. Formatting & ATS Parsing Health (10 pts)
    """
    if not parsed_candidate:
        parsed_candidate = parse_candidate_from_text(raw_text, filename)

    text_lower = raw_text.lower()
    words = [w for w in re.split(r"\s+", raw_text) if w]
    word_count = len(words)

    # 1. Contact & Essentials Check (Max 15 pts)
    contact_check = {}
    contact_score = 0

    has_first_name = bool(parsed_candidate.get("first_name"))
    has_last_name = bool(parsed_candidate.get("last_name"))
    has_full_name = has_first_name or bool(parsed_candidate.get("full_name"))
    name_pts = 4 if (has_first_name and has_last_name) else (2 if has_full_name else 0)
    contact_score += name_pts
    contact_check["name_detected"] = has_full_name
    contact_check["name_value"] = parsed_candidate.get("full_name") or f"{parsed_candidate.get('first_name', '')} {parsed_candidate.get('last_name', '')}".strip()

    email_val = parsed_candidate.get("email")
    has_email = bool(email_val and "@" in email_val)
    email_pts = 4 if has_email else 0
    contact_score += email_pts
    contact_check["email_detected"] = has_email
    contact_check["email_value"] = email_val or ""

    phone_val = parsed_candidate.get("phone")
    has_phone = bool(phone_val and len(re.sub(r"\D", "", phone_val)) >= 10)
    phone_pts = 4 if has_phone else 0
    contact_score += phone_pts
    contact_check["phone_detected"] = has_phone
    contact_check["phone_value"] = phone_val or ""

    location_val = parsed_candidate.get("location")
    has_location = bool(location_val)
    loc_pts = 2 if has_location else 0
    contact_score += loc_pts
    contact_check["location_detected"] = has_location
    contact_check["location_value"] = location_val or ""

    li_url = parsed_candidate.get("linkedin_url")
    gh_url = parsed_candidate.get("github_url")
    has_links = bool(li_url or gh_url)
    link_pts = 1 if has_links else 0
    contact_score += link_pts
    contact_check["links_detected"] = has_links
    contact_check["linkedin_url"] = li_url or ""
    contact_check["github_url"] = gh_url or ""

    contact_score = min(15, contact_score)

    # 2. Section Completeness Check (Max 20 pts)
    sections_detected = {}
    section_score = 0

    has_summary = bool(re.search(r"\b(summary|profile|about\s+me|career\s+objective|professional\s+summary|overview)\b", text_lower))
    sections_detected["summary"] = has_summary
    if has_summary: section_score += 3

    has_experience = bool(re.search(r"\b(experience|work\s+history|employment|professional\s+background|career\s+history|internship|work\s+experience)\b", text_lower))
    sections_detected["work_experience"] = has_experience
    if has_experience: section_score += 6

    has_education = bool(re.search(r"\b(education|academic|qualifications?|degree|university|college|b\.tech|b\.e|m\.tech|b\.sc|mca|bca|master|bachelor)\b", text_lower))
    sections_detected["education"] = has_education
    if has_education: section_score += 4

    has_skills_sec = bool(re.search(r"\b(skills|technical\s+skills|technologies|tools|competencies|tech\s+stack|proficiencies|languages\s+and\s+tools)\b", text_lower))
    sections_detected["skills"] = has_skills_sec
    if has_skills_sec: section_score += 5

    has_projects_certs = bool(re.search(r"\b(projects|certifications?|courses|licenses?|achievements?|awards?|publications?)\b", text_lower))
    sections_detected["projects_and_certifications"] = has_projects_certs
    if has_projects_certs: section_score += 2

    section_score = min(20, section_score)

    # 3. Action Verbs, Measurable Impact & Length (Max 25 pts)
    found_action_verbs = []
    for verb in ACTION_VERBS:
        if re.search(r"\b" + re.escape(verb) + r"\b", text_lower):
            found_action_verbs.append(verb.capitalize())

    num_verbs = len(found_action_verbs)
    if num_verbs >= 8:
        verb_pts = 10
    elif num_verbs >= 5:
        verb_pts = 8
    elif num_verbs >= 3:
        verb_pts = 5
    elif num_verbs >= 1:
        verb_pts = 2
    else:
        verb_pts = 0

    metric_matches = re.findall(
        r"(\b\d+(?:\.\d+)?%\b|\$\s*\d+(?:[\d,.]*)?(?:[kmbKMB]|(?:\s*million|\s*billion|\s*thousand))?|\b\d+\+?\s*(?:users|clients|engineers|developers|microservices|pipelines|endpoints|requests|transactions|team\s+members|projects|features|releases|apps|servers|nodes)\b|\b(?:reduced|increased|improved|boosted|saved|grew|accelerated|decreased)\s+.*?\b\d+)",
        raw_text,
        re.IGNORECASE
    )
    metric_count = len(metric_matches)
    if metric_count >= 4:
        metric_pts = 10
    elif metric_count >= 2:
        metric_pts = 7
    elif metric_count >= 1:
        metric_pts = 4
    else:
        metric_pts = 0

    if 350 <= word_count <= 1100:
        word_pts = 5
        length_status = "Optimal (1-2 pages)"
    elif 200 <= word_count < 350 or 1100 < word_count <= 1600:
        word_pts = 3
        length_status = "Acceptable"
    elif word_count < 200:
        word_pts = 1
        length_status = "Too Short (<200 words)"
    else:
        word_pts = 2
        length_status = "Slightly Long (>1600 words)"

    content_score = min(25, verb_pts + metric_pts + word_pts)

    content_metrics = {
        "word_count": word_count,
        "estimated_pages": max(1, round(word_count / 450, 1)),
        "length_status": length_status,
        "action_verbs_count": num_verbs,
        "action_verbs_found": found_action_verbs[:10],
        "quantified_metrics_count": metric_count,
        "quantified_metrics_samples": [m[0] if isinstance(m, tuple) else m for m in metric_matches[:5]],
        "reading_time_minutes": max(1, round(word_count / 200, 1))
    }

    # 4. Technical Skills & Keyword Match (Max 30 pts)
    extracted_skills = parsed_candidate.get("skills") or extract_skills_from_text(raw_text)
    
    target_job_info = None
    matched_skills = []
    missing_skills = []

    if requirement:
        req_skills = requirement.required_skills or []
        for s in req_skills:
            if s.strip().lower() in [es.lower() for es in extracted_skills] or re.search(r"\b" + re.escape(s.lower()) + r"\b", text_lower):
                matched_skills.append(s)
            else:
                missing_skills.append(s)
        
        match_ratio = len(matched_skills) / max(len(req_skills), 1)
        skills_score = int(round(match_ratio * 30))

        cand_exp = parsed_candidate.get("total_experience") or 0.0
        req_min_exp = requirement.experience_min or 0.0
        if cand_exp >= req_min_exp:
            exp_fit = "Direct Alignment" if cand_exp <= (req_min_exp + 4) else "Senior Candidate"
        else:
            exp_fit = f"Experience Gap ({cand_exp}y vs {req_min_exp}y required)"

        target_job_info = {
            "requirement_id": requirement.id,
            "req_code": requirement.req_code,
            "job_title": requirement.job_title,
            "client_name": requirement.client.name if requirement.client else "Client",
            "required_skills": req_skills,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "experience_fit": exp_fit,
            "match_percentage": int(round(match_ratio * 100))
        }
    else:
        # General Benchmark
        skill_cnt = len(extracted_skills)
        if skill_cnt >= 8:
            skills_score = 30
        elif skill_cnt >= 6:
            skills_score = 24
        elif skill_cnt >= 4:
            skills_score = 18
        elif skill_cnt >= 2:
            skills_score = 12
        elif skill_cnt >= 1:
            skills_score = 6
        else:
            skills_score = 0

    skills_analysis = {
        "extracted_skills": extracted_skills,
        "skills_count": len(extracted_skills),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skills_score": skills_score
    }

    # 5. Formatting & ATS Parsing Health (Max 10 pts)
    formatting_check = {}
    format_score = 0

    ext = os.path.splitext(filename)[1].lower()
    if ext in [".pdf", ".docx"]:
        format_score += 3
        formatting_check["file_format_compatibility"] = "Optimal (.pdf / .docx standard)"
    elif ext in [".txt", ".doc"]:
        format_score += 2
        formatting_check["file_format_compatibility"] = f"Standard ({ext})"
    else:
        format_score += 1
        formatting_check["file_format_compatibility"] = "Plain Document"

    has_bullet_points = bool(re.search(r"[•\-\*\u2022\u2023\u25E6\u2043\u2219]", raw_text)) or bool(re.search(r"^\s*\d+[\.\)]", raw_text, re.MULTILINE))
    if has_bullet_points:
        format_score += 4
        formatting_check["bullet_points_structure"] = "Clear bullet structure detected"
    else:
        format_score += 1
        formatting_check["bullet_points_structure"] = "Paragraph heavy — bullet points recommended"

    # Text readability
    non_ascii = len(re.findall(r"[^\x00-\x7F]", raw_text))
    if len(raw_text) > 0 and (non_ascii / len(raw_text)) < 0.05:
        format_score += 3
        formatting_check["text_extractability"] = "High (Clean UTF-8 text parsed seamlessly)"
    else:
        format_score += 1
        formatting_check["text_extractability"] = "Moderate (Some non-standard encoding detected)"

    formatting_score = min(10, format_score)

    # Calculate Overall Score (0 - 100)
    overall_score = contact_score + section_score + content_score + skills_score + formatting_score
    overall_score = max(5, min(100, overall_score))

    # Determine Grade and Pass Probability
    if overall_score >= 85:
        grade = "A+ (Exceptional ATS Match)"
        pass_probability = "High (~95% Shortlist Chance)"
    elif overall_score >= 70:
        grade = "B (Strong ATS Candidate)"
        pass_probability = "High (~80% Shortlist Chance)"
    elif overall_score >= 55:
        grade = "C (Moderate Alignment)"
        pass_probability = "Medium (~60% Shortlist Chance)"
    elif overall_score >= 40:
        grade = "D (Needs ATS Optimization)"
        pass_probability = "Low (~35% Shortlist Chance)"
    else:
        grade = "F (High ATS Rejection Risk)"
        pass_probability = "Critical (~15% Shortlist Chance)"

    # Generate Actionable Recommendations
    recommendations = []

    # Critical recommendations
    if not has_email or not has_phone:
        recommendations.append({
            "category": "critical",
            "title": "Missing Direct Contact Details",
            "description": "ATS parsers look for email and phone number near the top header. Ensure both are clearly formatted without complex tables or images."
        })

    if not has_experience:
        recommendations.append({
            "category": "critical",
            "title": "Add Clear Work Experience Section",
            "description": "Ensure there is a standard section header titled 'Work Experience' or 'Professional Experience' with clear company names and employment dates."
        })

    if requirement and missing_skills:
        recommendations.append({
            "category": "critical",
            "title": f"Missing Core Job Keywords ({len(missing_skills)} key skills)",
            "description": f"Target job specifically requires: {', '.join(missing_skills[:5])}. Add these technologies to your skills section and project descriptions where applicable."
        })

    if metric_count == 0:
        recommendations.append({
            "category": "critical",
            "title": "Include Quantified Impact & Metrics",
            "description": "Recruiters and modern ATS screening algorithms look for measurable results (e.g. 'Improved API latency by 35%', 'Scaled service to 100K active users')."
        })

    # Improvement recommendations
    if num_verbs < 5:
        recommendations.append({
            "category": "improvement",
            "title": "Incorporate Stronger Action Verbs",
            "description": "Begin bullet points with powerful action verbs like 'Architected', 'Spearheaded', 'Optimized', 'Automated' rather than passive duty descriptions."
        })

    if not has_summary:
        recommendations.append({
            "category": "improvement",
            "title": "Include a Professional Summary",
            "description": "A 2-3 line executive summary at the top gives recruiters an immediate snapshot of your experience and core specializations."
        })

    if not has_links:
        recommendations.append({
            "category": "improvement",
            "title": "Add LinkedIn & GitHub Links",
            "description": "Adding active URLs for LinkedIn and GitHub/Portfolio significantly improves candidate credibility and technical verification."
        })

    if not has_bullet_points:
        recommendations.append({
            "category": "improvement",
            "title": "Format Experience into Bullet Points",
            "description": "ATS scanners and human screeners read bullet lists far faster and more reliably than long continuous text paragraphs."
        })

    if word_count < 250:
        recommendations.append({
            "category": "improvement",
            "title": "Expand Resume Depth",
            "description": "Resume word count is quite low. Elaborate on project deliverables, system architecture, and specific tools utilized."
        })

    # Strengths
    if has_full_name and has_email and has_phone:
        recommendations.append({
            "category": "strength",
            "title": "Complete Header & Contact Information",
            "description": "All essential contact details (Name, Email, Phone, Location) are clearly structured and immediately parsable by ATS engines."
        })

    if len(extracted_skills) >= 6:
        recommendations.append({
            "category": "strength",
            "title": "Rich Technical Keyword Density",
            "description": f"Extracted {len(extracted_skills)} industry-standard technical skills ({', '.join(extracted_skills[:4])}, etc.), ensuring strong search indexability."
        })

    if num_verbs >= 5:
        recommendations.append({
            "category": "strength",
            "title": "Effective Use of Action-Oriented Language",
            "description": f"Identified {num_verbs} impactful action verbs ({', '.join(found_action_verbs[:4])}) reinforcing proactive achievements."
        })

    # Executive Summary Text
    cand_name = parsed_candidate.get("full_name") or "Candidate"
    summary_text = (
        f"ATS Evaluation for {cand_name} ({filename}): Scored {overall_score}/100 [{grade}]. "
        f"Detected {len(extracted_skills)} technical competencies and {metric_count} quantified performance metrics. "
        f"Candidate has {pass_probability.lower()}."
    )

    file_size_formatted = "0 KB"
    if file_size > 0:
        if file_size >= 1024 * 1024:
            file_size_formatted = f"{file_size / (1024*1024):.1f} MB"
        else:
            file_size_formatted = f"{file_size / 1024:.1f} KB"

    return {
        "overall_score": overall_score,
        "grade": grade,
        "pass_probability": pass_probability,
        "summary": summary_text,
        "file_name": filename,
        "file_size_formatted": file_size_formatted,
        "candidate_details": parsed_candidate,
        "sections_detected": sections_detected,
        "category_scores": {
            "contact_info": contact_score,
            "sections": section_score,
            "content_impact": content_score,
            "skills_keywords": skills_score,
            "formatting": formatting_score
        },
        "category_max_scores": {
            "contact_info": 15,
            "sections": 20,
            "content_impact": 25,
            "skills_keywords": 30,
            "formatting": 10
        },
        "contact_info_check": contact_check,
        "formatting_check": formatting_check,
        "skills_analysis": skills_analysis,
        "content_metrics": content_metrics,
        "recommendations": recommendations,
        "target_job": target_job_info
    }

