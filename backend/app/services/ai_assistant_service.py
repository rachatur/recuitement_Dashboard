import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.models import (
    Candidate, JobRequirement, Client, CVSubmission,
    Interview, User, RequirementStatusEnum, SubmissionStatusEnum, BenchStatusEnum
)
from app.services.cv_extraction_service import TECH_SKILLS_DB

SYSTEM_ROLE_PROMPT = """You are RecruitFlow AI Assistant, an expert AI copilot for technical recruiters, talent acquisition managers, and HR specialists.
You help recruiters find candidates, evaluate matches, draft personalized outreach messages, create job descriptions, prepare interview scorecards, and analyze hiring pipelines.
"""

def extract_search_parameters(prompt: str) -> Dict[str, Any]:
    text = prompt.lower()
    
    # Detect experience
    exp_match = re.search(r'(\d+)(?:\+|\s*(?:to|-)\s*(\d+))?\s*(?:yrs?|years?)', text)
    min_exp = None
    max_exp = None
    if exp_match:
        min_exp = float(exp_match.group(1))
        if exp_match.group(2):
            max_exp = float(exp_match.group(2))

    # Detect skills mentioned
    detected_skills = []
    for skill in TECH_SKILLS_DB:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text):
            detected_skills.append(skill)

    # Detect bench request
    is_bench = any(k in text for k in ['bench', 'available immediately', 'immediate joiner', 'on bench', 'bench pool'])

    # Detect location
    locations = ["pune", "hyderabad", "bangalore", "bengaluru", "mumbai", "delhi", "noida", "chennai", "remote", "san francisco", "austin", "new york"]
    found_location = None
    for loc in locations:
        if loc in text:
            found_location = loc
            break

    return {
        "min_exp": min_exp,
        "max_exp": max_exp,
        "skills": detected_skills,
        "is_bench": is_bench,
        "location": found_location
    }

def handle_candidate_search(db: Session, prompt: str, params: Dict[str, Any]) -> Dict[str, Any]:
    query = db.query(Candidate)

    if params["is_bench"]:
        query = query.filter(Candidate.bench_status != BenchStatusEnum.NOT_ON_BENCH)

    if params["min_exp"] is not None:
        query = query.filter(Candidate.total_experience >= params["min_exp"])
    if params["max_exp"] is not None:
        query = query.filter(Candidate.total_experience <= params["max_exp"])

    if params["location"]:
        query = query.filter(Candidate.location.ilike(f"%{params['location']}%"))

    candidates = query.order_by(desc(Candidate.total_experience)).limit(25).all()

    scored_candidates = []
    for c in candidates:
        cand_skills = [s.lower() for s in (c.skills or c.technical_skills or [])]
        matched_skills = [s for s in params["skills"] if s.lower() in cand_skills] if params["skills"] else cand_skills[:4]
        
        if params["skills"]:
            score = (len(matched_skills) / len(params["skills"])) * 100
        else:
            score = 85.0

        scored_candidates.append({
            "id": str(c.id),
            "code": c.candidate_code,
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "phone": c.phone or "N/A",
            "experience": c.total_experience or 0,
            "designation": c.current_designation or "Software Engineer",
            "company": c.current_company or "N/A",
            "location": c.location or "N/A",
            "skills": c.skills or c.technical_skills or [],
            "matched_skills": matched_skills,
            "bench_status": str(c.bench_status.value if hasattr(c.bench_status, 'value') else c.bench_status),
            "match_score": round(score, 1)
        })

    scored_candidates.sort(key=lambda x: (x["match_score"], x["experience"]), reverse=True)
    top_candidates = scored_candidates[:6]

    if not top_candidates:
        reply = (
            f"### 🔍 Candidate Search Results\n\n"
            f"I couldn't find candidates strictly matching the requested criteria "
            f"*(Skills: {', '.join(params['skills']) or 'Any'}, Min Experience: {params['min_exp'] or 0} yrs, Location: {params['location'] or 'Any'})*.\n\n"
            f"**💡 Suggestions:**\n"
            f"- Try broadening your skill filters (e.g. search for `JavaScript` instead of specific niche frameworks).\n"
            f"- Lower the minimum years of experience constraint.\n"
            f"- Check the **Candidates & CVs** module or upload new CVs in bulk."
        )
    else:
        skill_text = f" with skills in **{', '.join(params['skills'])}**" if params['skills'] else ""
        bench_text = " currently on the **Bench Pool**" if params['is_bench'] else ""
        exp_text = f" with **{params['min_exp']}+ years** of experience" if params['min_exp'] else ""
        
        reply = (
            f"### 🎯 Found {len(top_candidates)} Matching Candidate(s){skill_text}{exp_text}{bench_text}:\n\n"
        )
        for idx, cand in enumerate(top_candidates, 1):
            bench_tag = " 🌟 *(Available on Bench)*" if "ON_BENCH" in cand["bench_status"] else ""
            reply += (
                f"**{idx}. [{cand['name']} ({cand['code']})](/candidate/{cand['id']})** — **{cand['designation']}**{bench_tag}\n"
                f"- **Experience:** {cand['experience']} years • **Location:** {cand['location']}\n"
                f"- **Company:** {cand['company']} • **Email:** `{cand['email']}`\n"
                f"- **Skills:** {', '.join(cand['skills'][:6]) or 'N/A'}\n"
                f"- **Match Score:** `{cand['match_score']}%`\n\n"
            )

        reply += (
            f"**⚡ Next Steps:**\n"
            f"- Click candidate names to review full profile & verified CV.\n"
            f"- Say *\"Draft a WhatsApp outreach message for {top_candidates[0]['name']}\"* to instantly initiate communication."
        )

    return {
        "reply": reply,
        "intent": "candidate_search",
        "data": {"candidates": top_candidates, "count": len(top_candidates)},
        "suggested_prompts": [
            f"Draft outreach email for {top_candidates[0]['name']}" if top_candidates else "Find Python developers with 3+ years experience",
            "Show all candidates currently on Bench",
            "Generate Boolean search string for these skills",
            "What are our current open job requirements?"
        ]
    }

def handle_job_requirements_query(db: Session, prompt: str) -> Dict[str, Any]:
    reqs = db.query(JobRequirement).filter(
        JobRequirement.status == RequirementStatusEnum.OPEN
    ).order_by(JobRequirement.created_at.desc()).limit(8).all()

    if not reqs:
        return {
            "reply": "There are currently no **OPEN** job requirements in the system. You can create a new requirement from the **Job Requirements** page.",
            "intent": "job_requirements",
            "data": {"requirements": []},
            "suggested_prompts": [
                "How to add a new Job Requirement?",
                "Show candidates on bench",
                "Draft a technical Job Description for Full Stack Engineer"
            ]
        }

    reply = f"### 📋 Active Open Job Requirements ({len(reqs)} Open Positions):\n\n"
    for idx, r in enumerate(reqs, 1):
        client_name = r.client.name if r.client else "Direct Client"
        skills = ", ".join(r.required_skills or [])
        reply += (
            f"**{idx}. [{r.job_title} ({r.req_code})](/requirement/{r.id})** — **{client_name}**\n"
            f"- **Experience:** {r.experience_min} - {r.experience_max} yrs • **Work Mode:** {r.work_mode.value if hasattr(r.work_mode, 'value') else r.work_mode}\n"
            f"- **Required Skills:** {skills or 'General'}\n"
            f"- **Location:** {r.location or 'Flexible'}\n\n"
        )

    reply += f"💡 *Tip: Ask \"Find matched candidates for {reqs[0].job_title}\" to calculate instant compatibility.*"

    return {
        "reply": reply,
        "intent": "job_requirements",
        "data": {"count": len(reqs)},
        "suggested_prompts": [
            f"Find matching candidates for {reqs[0].job_title}",
            "Draft a WhatsApp campaign for these open jobs",
            "Show candidate pipeline summary",
            "Generate screening questions for " + reqs[0].job_title
        ]
    }

def handle_outreach_draft(prompt: str, candidate_name: Optional[str] = None, job_title: Optional[str] = None) -> Dict[str, Any]:
    text_lower = prompt.lower()
    is_whatsapp = "whatsapp" in text_lower or "wa" in text_lower or "chat" in text_lower
    
    cand = candidate_name or "Candidate"
    role = job_title or "Senior Full Stack Engineer"

    if is_whatsapp:
        reply = (
            f"### 📱 Personalized WhatsApp Outreach Draft\n\n"
            f"```text\n"
            f"Hi {cand}, 👋\n\n"
            f"I hope you are doing well! I came across your profile and was impressed by your hands-on technical background.\n\n"
            f"We are currently hiring for a **{role}** with one of our high-growth enterprise clients. Given your expertise, I believe this would be an exceptional career match.\n\n"
            f"📍 Location: Hybrid / Remote\n"
            f"💼 Opportunity: Full-time permanent role with competitive compensation & leadership potential.\n\n"
            f"Would you be open for a brief 5-minute introductory call this week to discuss details?\n\n"
            f"Best regards,\n"
            f"[Your Name] • RecruitFlow Talent Acquisition\n"
            f"```\n\n"
            f"**💡 Pro-Tip:** You can directly send this via the **WhatsApp Outreach -> Campaigns** or **Conversations** module with 1-click delivery tracking."
        )
    else:
        reply = (
            f"### ✉️ Personalized Outreach Email Template\n\n"
            f"**Subject:** Exciting Career Opportunity: {role} @ RecruitFlow Talent Network\n\n"
            f"---\n\n"
            f"Dear {cand},\n\n"
            f"I hope this email finds you well.\n\n"
            f"I was reviewing your impressive background and track record in software engineering. Your specialized skill set stands out, and I wanted to reach out regarding a high-impact **{role}** opportunity we are actively prioritizing.\n\n"
            f"### 🚀 Key Highlights of the Role:\n"
            f"- **Position:** {role}\n"
            f"- **Impact:** Architect core distributed microservices and drive scalable cloud features.\n"
            f"- **Work Model:** Flexible Hybrid / Remote options with comprehensive benefits package.\n\n"
            f"I would love to connect for a quick 10-minute chat to share more details about the team, tech stack, and compensation bracket.\n\n"
            f"Please let me know if you are available for a brief call tomorrow or later this week.\n\n"
            f"Warm regards,\n\n"
            f"**[Your Name]**\n"
            f"Senior Technical Recruiter | RecruitFlow\n"
        )

    return {
        "reply": reply,
        "intent": "outreach_draft",
        "data": {"type": "whatsapp" if is_whatsapp else "email", "role": role, "candidate": cand},
        "suggested_prompts": [
            f"Draft interview invitation email for {cand}",
            f"Draft follow-up WhatsApp message if no response in 3 days",
            f"Generate technical interview questions for {role}",
            "Find candidates for this role in our database"
        ]
    }

def handle_jd_generation(prompt: str) -> Dict[str, Any]:
    title = "Senior Software Engineer"
    title_match = re.search(r'(?:jd|job description|role|for)\s+(?:a\s+)?([A-Za-z0-9\s\+\#\.]+?)(?:with|in|at|\.|$)', prompt, re.IGNORECASE)
    if title_match and len(title_match.group(1).strip()) > 3:
        title = title_match.group(1).strip().title()

    reply = (
        f"### 📄 Comprehensive Job Description: {title}\n\n"
        f"**Role Title:** {title}\n"
        f"**Department:** Engineering & Product Development\n"
        f"**Employment Type:** Full-Time, Permanent\n"
        f"**Location:** Hybrid / Remote / Onsite\n"
        f"**Experience Level:** 4 - 8 Years\n\n"
        f"---\n\n"
        f"#### 🌟 Role Overview\n"
        f"We are looking for a talented and proactive **{title}** to join our engineering organization. "
        f"In this role, you will design, build, and deploy mission-critical systems, collaborate with cross-functional product teams, "
        f"and drive technical excellence across our distributed architecture.\n\n"
        f"#### 🛠️ Key Responsibilities\n"
        f"- Architect, develop, and maintain clean, performant, and reliable backend/frontend systems.\n"
        f"- Collaborate with product managers, QA, and DevOps engineers in an agile sprint cycle.\n"
        f"- Implement robust RESTful / GraphQL APIs, optimize database queries, and ensure 99.9% uptime.\n"
        f"- Champion automated unit/integration testing, CI/CD deployment pipelines, and code reviews.\n"
        f"- Troubleshoot production issues and lead root-cause analysis (RCA) investigations.\n\n"
        f"#### 🎯 Qualifications & Skill Requirements\n"
        f"- **Education:** Bachelor's or Master's degree in Computer Science, Information Technology, or equivalent.\n"
        f"- **Core Technical Stack:** Proficiency in relevant languages (Python, JavaScript/TypeScript, Java, Go), frameworks (FastAPI, React, Spring Boot), and SQL/NoSQL databases (PostgreSQL, Redis, MongoDB).\n"
        f"- **Cloud & DevOps:** Familiarity with AWS/GCP/Azure, Docker containerization, and CI/CD pipelines.\n"
        f"- **Soft Skills:** Strong analytical mindset, proactive problem-solving attitude, and excellent communication skills.\n\n"
        f"#### 🎁 Benefits & Perks\n"
        f"- Highly competitive salary with annual performance incentives.\n"
        f"- Comprehensive health and wellness coverage.\n"
        f"- Flexible work hours and remote setup allowances.\n"
        f"- Continuous learning budget and conference sponsorships."
    )

    return {
        "reply": reply,
        "intent": "jd_generation",
        "data": {"title": title},
        "suggested_prompts": [
            f"Generate 5 technical screening questions for {title}",
            f"Generate Boolean search string for {title}",
            f"Find matching candidates for {title} in talent pool",
            "Draft outreach message for this job description"
        ]
    }

def handle_interview_prep(prompt: str) -> Dict[str, Any]:
    role = "Full Stack Engineer"
    role_match = re.search(r'(?:for|questions for)\s+(?:a\s+)?([A-Za-z0-9\s\+\#\.]+)', prompt, re.IGNORECASE)
    if role_match and len(role_match.group(1).strip()) > 3:
        role = role_match.group(1).strip().title()

    reply = (
        f"### 🎯 Structured Interview Scorecard & Questions for **{role}**\n\n"
        f"#### 1. 💻 Core Architecture & System Design\n"
        f"- **Question:** *How do you design a scalable caching strategy with Redis for high-frequency database read operations? How do you handle cache invalidation and race conditions?*\n"
        f"- **Ideal Answer Checklist:** Cache-aside vs write-through patterns, TTL policies, distributed locks, database indexing, and cache stampede mitigation.\n\n"
        f"#### 2. ⚡ Practical Problem Solving & Performance\n"
        f"- **Question:** *Describe a scenario where a database query or API endpoint became a major latency bottleneck in production. What diagnostic tools and query optimizations did you use to resolve it?*\n"
        f"- **Ideal Answer Checklist:** `EXPLAIN ANALYZE`, composite indexing, query restructuring, async background workers, and connection pooling.\n\n"
        f"#### 3. 🛡️ Security & API Reliability\n"
        f"- **Question:** *How do you secure modern RESTful endpoints against OWASP Top 10 vulnerabilities (such as Broken Object Level Authorization and Injection)?*\n"
        f"- **Ideal Answer Checklist:** JWT validation, role-based access control (RBAC), parameterized SQL queries, rate limiting, and input validation schemas.\n\n"
        f"#### 4. 🤝 Behavioral & Leadership (STAR Method)\n"
        f"- **Question:** *Tell me about a time when you strongly disagreed with a technical decision made by a peer or manager. How did you handle the situation and achieve alignment?*\n"
        f"- **Evaluation Criteria:** Collaboration, objective data-driven reasoning, professional empathy, and constructive communication.\n\n"
        f"#### 📊 Candidate Evaluation Rubric (1 - 5 Scale):\n"
        f"- **Technical Competence (40%):** Depth in core framework & system architecture.\n"
        f"- **Problem Solving (30%):** Analytical clarity and code structure.\n"
        f"- **Communication & Team Fit (30%):** Clarity, openness to feedback, and culture alignment."
    )

    return {
        "reply": reply,
        "intent": "interview_prep",
        "data": {"role": role},
        "suggested_prompts": [
            f"Draft interview invitation email for {role}",
            f"Generate coding challenge problem for {role}",
            "Show open candidates matching this role"
        ]
    }

def handle_boolean_search(prompt: str) -> Dict[str, Any]:
    skills = extract_search_parameters(prompt)["skills"] or ["Java", "Spring Boot", "Microservices", "PostgreSQL"]
    
    linkedin_query = " AND ".join([f'("{s}")' for s in skills])
    naukri_query = " AND ".join(skills)

    reply = (
        f"### 🔍 Boolean Search Query Generator\n\n"
        f"Here are optimized Boolean strings ready for LinkedIn Recruiter, Naukri, and Monster:\n\n"
        f"#### 1. 💼 LinkedIn Recruiter Boolean String:\n"
        f"```text\n"
        f"({linkedin_query}) AND (\"Developer\" OR \"Engineer\" OR \"Architect\") AND NOT (\"Intern\" OR \"Trainee\")\n"
        f"```\n\n"
        f"#### 2. 🌐 Job Board (Naukri / Monster / Indeed) Query:\n"
        f"```text\n"
        f"({naukri_query}) AND (Developer OR Engineer OR Lead) AND (Immediate OR \"15 Days\" OR \"30 Days\")\n"
        f"```\n\n"
        f"#### 3. 🎯 Google X-Ray Search for Public Resumes / GitHub:\n"
        f"```text\n"
        f"site:github.com/ {' '.join(skills)} \"resume\" OR \"cv\" -inurl:(commits|issues)\n"
        f"```\n\n"
        f"**💡 Pro-Tip:** Copy and paste directly into your sourcing search bar for high-precision sourcing."
    )

    return {
        "reply": reply,
        "intent": "boolean_search",
        "data": {"skills": skills},
        "suggested_prompts": [
            "Search for these candidates directly in our database",
            "Draft outreach message for these candidates",
            "Generate Job Description for these skills"
        ]
    }

def handle_pipeline_summary(db: Session) -> Dict[str, Any]:
    total_candidates = db.query(Candidate).count()
    bench_candidates = db.query(Candidate).filter(Candidate.bench_status != BenchStatusEnum.NOT_ON_BENCH).count()
    open_reqs = db.query(JobRequirement).filter(JobRequirement.status == RequirementStatusEnum.OPEN).count()
    total_clients = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.status == "ACTIVE").count()
    submissions_count = db.query(CVSubmission).count()
    interviews_count = db.query(Interview).count()
    hires_count = db.query(CVSubmission).filter(CVSubmission.status == SubmissionStatusEnum.JOINED).count()

    reply = (
        f"### 📊 RecruitFlow Live Pipeline & Operations Summary\n\n"
        f"| Metric | Current Count | Status / Notes |\n"
        f"| :--- | :--- | :--- |\n"
        f"| 👥 **Total Talent Pool** | **{total_candidates} Candidates** | Active talent database |\n"
        f"| 🌟 **Bench Pool** | **{bench_candidates} Candidates** | Immediate deployable talent |\n"
        f"| 📋 **Open Job Requirements** | **{open_reqs} Positions** | Active hiring mandates |\n"
        f"| 🏢 **Client Organizations** | **{total_clients} ({active_clients} Active)** | Enterprise accounts |\n"
        f"| 🚀 **Total CV Submissions** | **{submissions_count} Submissions** | Submitted to clients |\n"
        f"| 📅 **Interviews Scheduled** | **{interviews_count} Rounds** | Technical & Client evaluations |\n"
        f"| 🏆 **Successful Placements** | **{hires_count} Candidates Joined** | Converted hires |\n\n"
        f"**📈 Executive Takeaway:**\n"
        f"- The recruitment pipeline is healthy with **{open_reqs} open requirements** and **{bench_candidates} talent on the bench** ready for rapid submission.\n"
        f"- Consider running WhatsApp outreach campaigns for active bench profiles to maximize deployment speed."
    )

    return {
        "reply": reply,
        "intent": "pipeline_summary",
        "data": {
            "total_candidates": total_candidates,
            "bench_candidates": bench_candidates,
            "open_reqs": open_reqs,
            "submissions_count": submissions_count,
            "interviews_count": interviews_count,
            "hires_count": hires_count
        },
        "suggested_prompts": [
            "Show bench pool candidates",
            "Show open job requirements",
            "Draft WhatsApp campaign for bench candidates",
            "Find React & Python candidates"
        ]
    }

def handle_general_recruitment_query(prompt: str) -> Dict[str, Any]:
    reply = (
        f"### 🤖 RecruitFlow AI Assistant\n\n"
        f"I can assist you with all aspects of end-to-end recruitment and talent operations:\n\n"
        f"1. **🔍 Candidate & Bench Search**: *\"Find Java developers with 5+ years experience\"* or *\"Show bench candidates in Pune\"*\n"
        f"2. **📋 Job Requirements & Matching**: *\"Show open jobs\"* or *\"Find best matches for Job CLI-872\"*\n"
        f"3. **✉️ Outreach Generation**: *\"Draft WhatsApp message for Alex\"* or *\"Write interview invitation email\"*\n"
        f"4. **📄 Job Description Creator**: *\"Write a JD for Senior Cloud DevOps Engineer\"*\n"
        f"5. **🎯 Interview Preparation**: *\"Generate 5 technical questions for React + Node.js Lead\"*\n"
        f"6. **📊 Pipeline Analytics**: *\"Give me a pipeline summary\"*\n"
        f"7. **🔎 Boolean Search Query**: *\"Create Boolean search for AWS, Kubernetes, Terraform\"*\n\n"
        f"How can I help you accelerate your recruiting workflow today?"
    )

    return {
        "reply": reply,
        "intent": "general",
        "data": {},
        "suggested_prompts": [
            "Find Python & React developers",
            "Show all candidates currently on Bench",
            "Show open job requirements",
            "Give me a recruitment pipeline summary"
        ]
    }

def process_assistant_message(
    db: Session,
    message: str,
    candidate_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    mode: Optional[str] = None
) -> Dict[str, Any]:
    msg = message.strip()
    msg_lower = msg.lower()

    candidate = None
    if candidate_id:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    requirement = None
    if requirement_id:
        requirement = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()

    if any(k in msg_lower for k in ["summary", "pipeline", "metrics", "overview", "kpi", "dashboard stats", "how many candidates"]):
        return handle_pipeline_summary(db)

    if "boolean" in msg_lower or "x-ray" in msg_lower or "xray" in msg_lower or "search string" in msg_lower:
        return handle_boolean_search(msg)

    if any(k in msg_lower for k in ["draft", "outreach", "whatsapp message", "email template", "message for", "invite to interview", "invitation"]):
        cand_name = f"{candidate.first_name} {candidate.last_name}" if candidate else None
        job_title = requirement.job_title if requirement else None
        return handle_outreach_draft(msg, candidate_name=cand_name, job_title=job_title)

    if any(k in msg_lower for k in ["jd", "job description", "write a jd", "generate jd", "create requirement spec"]):
        return handle_jd_generation(msg)

    if any(k in msg_lower for k in ["interview question", "screening question", "scorecard", "interview prep", "questions for"]):
        return handle_interview_prep(msg)

    if any(k in msg_lower for k in ["open requirements", "open jobs", "open positions", "show requirements", "show jobs", "active requirements"]):
        return handle_job_requirements_query(db, msg)

    search_params = extract_search_parameters(msg)
    if search_params["skills"] or search_params["is_bench"] or search_params["min_exp"] is not None or any(k in msg_lower for k in ["find", "search", "show candidates", "list developers", "engineers", "who has"]):
        return handle_candidate_search(db, msg, search_params)

    return handle_general_recruitment_query(msg)
