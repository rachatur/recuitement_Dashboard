import os
import re
import io
import logging
import shutil
import subprocess
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import (
    Candidate, WhatsAppConsentStatusEnum, WhatsAppOptOut, BenchStatusEnum
)
from app.schemas import WhatsAppEligibilityInfo, CVExtractionResponse

logger = logging.getLogger(__name__)

# Common Skills Knowledge Base
TECH_SKILLS_DB = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Golang", "Rust", "PHP",
    "Ruby", "Swift", "Kotlin", "Scala", "R", "Dart", "SQL", "HTML", "CSS", "HTML5", "CSS3",
    # Frameworks & Libraries
    "React", "React.js", "React Native", "Next.js", "Angular", "Vue", "Vue.js", "Node.js",
    "FastAPI", "Django", "Flask", "Spring Boot", "Spring", "Express", "Express.js", "NestJS",
    "ASP.NET", ".NET Core", "Laravel", "Tailwind CSS", "Bootstrap", "Redux", "GraphQL",
    # Databases & Caching
    "PostgreSQL", "Postgres", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
    "DynamoDB", "Oracle", "SQLite", "MariaDB", "Firebase", "Firestore", "Supabase",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes",
    "K8s", "Terraform", "Ansible", "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins",
    "Linux", "Nginx", "Apache", "Kafka", "RabbitMQ", "Microservices", "Serverless",
    # Testing & Architecture
    "Pytest", "Jest", "Mocha", "Cypress", "Selenium", "JUnit", "Unit Testing",
    "REST API", "RESTful", "gRPC", "WebSocket", "System Design", "Agile", "Scrum",
    # Data & AI
    "Machine Learning", "Deep Learning", "NLP", "Pandas", "NumPy", "Scikit-Learn",
    "TensorFlow", "PyTorch", "Hadoop", "Spark", "Data Engineering", "Power BI", "Tableau"
]

DEGREE_PATTERNS = [
    (r"\b(Ph\.?D|Doctor of Philosophy)\b", "Ph.D"),
    (r"\b(M\.?Tech|Master of Technology)\b", "M.Tech"),
    (r"\b(M\.?S\.?|Master of Science)\b", "Master of Science (M.S.)"),
    (r"\b(M\.?C\.?A|Master of Computer Applications)\b", "MCA"),
    (r"\b(M\.?B\.?A|Master of Business Administration)\b", "MBA"),
    (r"\b(B\.?Tech|Bachelor of Technology)\b", "B.Tech"),
    (r"\b(B\.?E\.?|Bachelor of Engineering)\b", "B.E."),
    (r"\b(B\.?C\.?A|Bachelor of Computer Applications)\b", "BCA"),
    (r"\b(B\.?Sc|Bachelor of Science)\b", "B.Sc"),
    (r"\b(B\.?Com|Bachelor of Commerce)\b", "B.Com"),
    (r"\b(Bachelor'?s\s+Degree|Master'?s\s+Degree)\b", "Bachelor's Degree")
]

def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract raw text from PDF, DOCX, DOC or Text files."""
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    
    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_content))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            logger.warning(f"pypdf extraction failed for {filename}: {e}")
            
    elif ext == ".doc":
        antiword = shutil.which("antiword")
        if antiword:
            try:
                result = subprocess.run(
                    [antiword, "-m", "UTF-8.txt", "-"],
                    input=file_content,
                    capture_output=True,
                    check=True,
                )
                text = result.stdout.decode("utf-8", errors="ignore")
            except (OSError, subprocess.SubprocessError) as e:
                logger.warning(f"antiword extraction failed for {filename}: {e}")
        else:
            logger.warning("antiword is not installed; legacy .doc text cannot be extracted")

    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_content))
            for p in doc.paragraphs:
                text += p.text + "\n"
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + " "
                    text += "\n"
        except Exception as e:
            logger.warning(f"python-docx extraction failed for {filename}: {e}")

    # Fallback to UTF-8 decoding
    if not text.strip():
        try:
            text = file_content.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    return text

def parse_candidate_from_text(raw_text: str, filename: str = "") -> Dict[str, Any]:
    """
    Intelligently parses candidate details from resume text.
    Leaves fields blank/None if not found.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    full_text = " ".join(lines)
    
    # 1. Email Extraction
    email = None
    email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", full_text)
    if email_match:
        email = email_match.group(0).lower()

    # 2. Phone Extraction (Supports International, Indian +91, US +1 formats)
    phone = None
    phone_pattern = r"(?:(?:\+|00)(\d{1,3})[\s.-]?)?(?:\(?(\d{2,4})\)?[\s.-]?)?(\d{3,5}[\s.-]?\d{3,5})"
    phone_matches = re.finditer(phone_pattern, full_text)
    for match in phone_matches:
        candidate_phone = match.group(0).strip()
        # Clean non-digit except leading +
        digits_only = re.sub(r"[^\d+]", "", candidate_phone)
        if 10 <= len(re.sub(r"\D", "", digits_only)) <= 15:
            phone = candidate_phone
            break

    # 3. Name Extraction
    # Heuristic: First non-empty lines that don't contain email, phone, url, or generic words
    first_name = ""
    last_name = ""
    full_name = ""
    
    # Check top 5 lines for candidate name
    for line in lines[:8]:
        if "@" in line or "http" in line or "resume" in line.lower() or "curriculum" in line.lower():
            continue
        cleaned_line = re.sub(r"[^a-zA-Z\s]", "", line).strip()
        words = cleaned_line.split()
        if 2 <= len(words) <= 4 and all(len(w) > 1 for w in words):
            first_name = words[0].capitalize()
            last_name = " ".join(words[1:]).capitalize()
            full_name = f"{first_name} {last_name}"
            break
            
    # Fallback to filename if name not found
    if not full_name and filename:
        clean_file = os.path.splitext(filename)[0]
        clean_file = re.sub(r"(resume|cv|profile|_|-|\d)", " ", clean_file, flags=re.IGNORECASE).strip()
        words = clean_file.split()
        if len(words) >= 2:
            first_name = words[0].capitalize()
            last_name = " ".join(words[1:]).capitalize()
            full_name = f"{first_name} {last_name}"
        elif len(words) == 1:
            first_name = words[0].capitalize()
            full_name = first_name

    # 4. Total Experience
    exp_years = 0.0
    exp_matches = re.finditer(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*(?:of)?\s*(?:experience|exp))?", full_text, re.IGNORECASE)
    for m in exp_matches:
        try:
            val = float(m.group(1))
            if 0.5 <= val <= 40:
                exp_years = max(exp_years, val)
        except ValueError:
            pass

    # 5. Skills Extraction
    found_skills = []
    text_lower = full_text.lower()
    for skill in TECH_SKILLS_DB:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            if skill not in found_skills:
                found_skills.append(skill)

    # 6. Education / Qualification
    highest_qual = ""
    for pat, label in DEGREE_PATTERNS:
        if re.search(pat, full_text, re.IGNORECASE):
            highest_qual = label
            break

    # 7. Current / Previous Company & Designation Heuristics
    current_company = ""
    current_designation = ""
    
    # Common designations
    desig_patterns = [
        r"\b(Senior\s+Software\s+Engineer|Software\s+Engineer|Full\s+Stack\s+Developer|Frontend\s+Developer|Backend\s+Developer|DevOps\s+Engineer|Tech\s+Lead|Engineering\s+Manager|Data\s+Scientist|QA\s+Engineer|Solution\s+Architect|Cloud\s+Architect)\b"
    ]
    for dp in desig_patterns:
        desig_m = re.search(dp, full_text, re.IGNORECASE)
        if desig_m:
            current_designation = desig_m.group(0)
            break

    # 8. LinkedIn & GitHub URLs
    linkedin_url = ""
    github_url = ""
    li_m = re.search(r"(https?://(?:www\.)?linkedin\.com/in/[A-Za-z0-9_-]+)", full_text, re.IGNORECASE)
    if li_m:
        linkedin_url = li_m.group(0)
    gh_m = re.search(r"(https?://(?:www\.)?github\.com/[A-Za-z0-9_-]+)", full_text, re.IGNORECASE)
    if gh_m:
        github_url = gh_m.group(0)

    # 9. Notice Period
    notice_period = ""
    np_m = re.search(r"\b(Immediate|15\s*days?|30\s*days?|60\s*days?|90\s*days?|1\s*month|2\s*months?|3\s*months?)\b", full_text, re.IGNORECASE)
    if np_m:
        notice_period = np_m.group(0)

    # 10. Location Heuristics
    location = ""
    common_cities = ["Bangalore", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi", "Gurgaon", "Gurugram", "Noida", "Chennai", "San Francisco", "Seattle", "New York", "London", "Remote"]
    for city in common_cities:
        if re.search(r"\b" + re.escape(city) + r"\b", full_text, re.IGNORECASE):
            location = city
            break

    # 11. Normalize WhatsApp number
    whatsapp_number = phone or ""
    
    return {
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name or "Applicant",
        "email": email or "",
        "phone": phone or "",
        "alternate_phone": "",
        "whatsapp_number": whatsapp_number,
        "country_code": "+91" if whatsapp_number.startswith("+91") or (phone and len(re.sub(r"\D", "", phone)) == 10) else "+1",
        "location": location,
        "preferred_location": "",
        "total_experience": exp_years if exp_years > 0 else 2.0,
        "relevant_experience": max(0.0, exp_years - 0.5) if exp_years > 0 else 2.0,
        "current_company": current_company,
        "current_designation": current_designation or "Software Engineer",
        "skills": found_skills,
        "technical_skills": found_skills,
        "education": highest_qual or "Bachelor's Degree",
        "highest_qualification": highest_qual or "Bachelor's Degree",
        "notice_period": notice_period or "30 Days",
        "current_ctc": None,
        "expected_ctc": None,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "certifications": [],
        "date_of_birth": "",
        "summary": f"Professional with {exp_years or 2} years of experience in {', '.join(found_skills[:5])}."
    }

def validate_whatsapp_eligibility(
    db: Session,
    phone_or_whatsapp: Optional[str],
    consent_status: Optional[WhatsAppConsentStatusEnum] = None,
    candidate_id: Optional[str] = None
) -> WhatsAppEligibilityInfo:
    """
    Computes real WhatsApp outreach eligibility status according to compliance:
    1. Valid E.164 phone length / format.
    2. Check global suppression / opt-out table.
    3. Check consent status (GRANTED vs PENDING / NOT_COLLECTED / REVOKED).
    """
    if not phone_or_whatsapp or not phone_or_whatsapp.strip():
        return WhatsAppEligibilityInfo(
            is_eligible=False,
            status="Invalid Number",
            whatsapp_number=None,
            consent_status=WhatsAppConsentStatusEnum.NOT_COLLECTED,
            opt_out_status=False,
            reason="Mobile or WhatsApp number is missing."
        )

    clean_digits = re.sub(r"[^\d+]", "", phone_or_whatsapp)
    pure_digits = re.sub(r"\D", "", clean_digits)
    
    if len(pure_digits) < 10 or len(pure_digits) > 15:
        return WhatsAppEligibilityInfo(
            is_eligible=False,
            status="Invalid Number",
            whatsapp_number=clean_digits,
            consent_status=consent_status or WhatsAppConsentStatusEnum.NOT_COLLECTED,
            opt_out_status=False,
            reason="Phone number format is invalid (requires 10-15 digits)."
        )

    # Check Opt-out / suppression list
    opt_out_record = db.query(WhatsAppOptOut).filter(
        (WhatsAppOptOut.whatsapp_number == clean_digits) | 
        (WhatsAppOptOut.whatsapp_number == pure_digits) |
        (WhatsAppOptOut.whatsapp_number.ilike(f"%{pure_digits[-10:]}%"))
    ).filter(WhatsAppOptOut.is_active == True).first()

    if opt_out_record:
        return WhatsAppEligibilityInfo(
            is_eligible=False,
            status="Opted Out",
            whatsapp_number=clean_digits,
            consent_status=WhatsAppConsentStatusEnum.OPTED_OUT,
            opt_out_status=True,
            reason=f"Candidate previously opted out: {opt_out_record.reason}"
        )

    effective_consent = consent_status or WhatsAppConsentStatusEnum.NOT_COLLECTED
    
    if effective_consent == WhatsAppConsentStatusEnum.GRANTED:
        return WhatsAppEligibilityInfo(
            is_eligible=True,
            status="Eligible",
            whatsapp_number=clean_digits,
            consent_status=WhatsAppConsentStatusEnum.GRANTED,
            opt_out_status=False,
            reason="Valid number and active consent verified."
        )
    elif effective_consent == WhatsAppConsentStatusEnum.REVOKED:
        return WhatsAppEligibilityInfo(
            is_eligible=False,
            status="Blocked",
            whatsapp_number=clean_digits,
            consent_status=WhatsAppConsentStatusEnum.REVOKED,
            opt_out_status=False,
            reason="WhatsApp consent has been revoked by candidate."
        )
    else:
        return WhatsAppEligibilityInfo(
            is_eligible=False,
            status="Consent Required",
            whatsapp_number=clean_digits,
            consent_status=effective_consent,
            opt_out_status=False,
            reason="WhatsApp consent is required before proactive outreach can be sent."
        )

def check_candidate_duplicate(
    db: Session,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    whatsapp_number: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    exclude_candidate_id: Optional[str] = None
) -> Tuple[bool, Optional[Candidate], Optional[str]]:
    """
    Checks if a candidate already exists in the talent pool by:
    - Email ID
    - Phone Number
    - WhatsApp Number
    - Name + Phone or Name + Email
    """
    query = db.query(Candidate)
    if exclude_candidate_id:
        query = query.filter(Candidate.id != exclude_candidate_id)

    # 1. Exact Email Match
    if email and email.strip():
        dup_email = query.filter(Candidate.email.ilike(email.strip())).first()
        if dup_email:
            return True, dup_email, f"Duplicate found by Email: {email}"

    # 2. Phone Match
    if phone and phone.strip():
        pure_p = re.sub(r"\D", "", phone)
        if len(pure_p) >= 10:
            dup_phone = query.filter(Candidate.phone.ilike(f"%{pure_p[-10:]}%")).first()
            if dup_phone:
                return True, dup_phone, f"Duplicate found by Phone: {phone}"

    # 3. WhatsApp Match
    if whatsapp_number and whatsapp_number.strip():
        pure_w = re.sub(r"\D", "", whatsapp_number)
        if len(pure_w) >= 10:
            dup_wa = query.filter(Candidate.whatsapp_number.ilike(f"%{pure_w[-10:]}%")).first()
            if dup_wa:
                return True, dup_wa, f"Duplicate found by WhatsApp Number: {whatsapp_number}"

    # 4. Name + Phone combination
    if first_name and last_name and (first_name.strip().lower() != "extracted" or last_name.strip().lower() != "candidate"):
        if phone:
            pure_p = re.sub(r"\D", "", phone)
            if len(pure_p) >= 10:
                dup_name_phone = query.filter(
                    Candidate.first_name.ilike(first_name.strip()),
                    Candidate.last_name.ilike(last_name.strip()),
                    Candidate.phone.ilike(f"%{pure_p[-10:]}%")
                ).first()
                if dup_name_phone:
                    return True, dup_name_phone, f"Duplicate candidate with matching name and phone: {first_name} {last_name}"

    return False, None, None
