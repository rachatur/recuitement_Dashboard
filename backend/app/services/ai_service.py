import re
from typing import List, Dict, Any
from app.models import Candidate, JobRequirement

COMMON_TECH_SKILLS = [
    "Python", "FastAPI", "React", "TypeScript", "JavaScript", "SQL", "PostgreSQL",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Node.js", "Java", "Spring Boot",
    "Go", "C#", ".NET", "Tailwind CSS", "Redis", "GraphQL", "CI/CD", "Git", "Linux",
    "Microservices", "REST API", "Kafka", "Elasticsearch", "Machine Learning", "PyTorch"
]

def extract_skills_from_text(text: str) -> List[str]:
    found = []
    text_lower = text.lower()
    for skill in COMMON_TECH_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return found or ["Python", "FastAPI", "PostgreSQL", "React"]

def simulate_resume_parsing(document_text: str) -> Dict[str, Any]:
    skills = extract_skills_from_text(document_text)
    
    # Try simple email & phone extraction
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", document_text)
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", document_text)
    
    # Try finding experience keywords
    exp_years = 4.5
    exp_match = re.search(r"(\d+(\.\d+)?)\+?\s*(years|yrs)", document_text, re.IGNORECASE)
    if exp_match:
        try:
            exp_years = float(exp_match.group(1))
        except ValueError:
            pass

    return {
        "full_name": "Extracted Candidate",
        "email": email_match.group(0) if email_match else "applicant@example.com",
        "phone": phone_match.group(0) if phone_match else "+1 (555) 234-5678",
        "total_experience": exp_years,
        "skills": skills,
        "education": "Bachelor of Science in Computer Science",
        "summary": f"Experienced software professional with deep expertise in {', '.join(skills[:4])}. Proven track record of delivering scalable web services and responsive client applications."
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
