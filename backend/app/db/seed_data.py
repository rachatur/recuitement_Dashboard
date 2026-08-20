import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    User, RoleEnum, Client, ClientStatusEnum, ClientContact,
    JobRequirement, RequirementStatusEnum, PriorityEnum, WorkModeEnum,
    Candidate, CandidateStatusEnum, CandidateSkill, CandidateDocument,
    CVSubmission, SubmissionStatusEnum, CandidateStatusHistory,
    Interview, InterviewStatusEnum, InterviewTypeEnum, InterviewFeedback,
    ClientFeedback, ClientFeedbackDecisionEnum, Offer, OfferStatusEnum,
    JoiningDetail, JoiningStatusEnum, Notification, NotificationTypeEnum,
    RecruiterActivity, AuditLog, DashboardMetric
)

logger = logging.getLogger(__name__)

def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    existing_admin = db.query(User).filter(User.email == "admin@recruitflow.com").first()
    if existing_admin:
        logger.info("Database already seeded. Skipping initial seeding.")
        return

    logger.info("Starting database seeding with comprehensive recruitment data...")
    now = datetime.now(timezone.utc)

    # 1. SEED CLIENTS FIRST (so we can attach client_id to client users)
    clients_data = [
        {
            "code": "CLI-101",
            "name": "NovaTech Solutions",
            "industry": "Enterprise Software & Cloud",
            "location": "San Francisco, CA",
            "person": "David Vance",
            "email": "david.vance@novatech.com",
            "phone": "+1 (415) 890-1200",
            "status": ClientStatusEnum.ACTIVE
        },
        {
            "code": "CLI-102",
            "name": "Apex Cloud Systems",
            "industry": "Cloud Infrastructure & DevOps",
            "location": "Seattle, WA",
            "person": "Clara Higgins",
            "email": "clara.higgins@apexcloud.io",
            "phone": "+1 (206) 555-8765",
            "status": ClientStatusEnum.ACTIVE
        },
        {
            "code": "CLI-103",
            "name": "FinEdge Dynamics",
            "industry": "Financial Technology & Banking",
            "location": "New York, NY",
            "person": "Arthur Morgan",
            "email": "arthur.morgan@finedge.com",
            "phone": "+1 (212) 789-4321",
            "status": ClientStatusEnum.ACTIVE
        },
        {
            "code": "CLI-104",
            "name": "HealthPulse AI",
            "industry": "Healthcare AI & Diagnostics",
            "location": "Boston, MA",
            "person": "Dr. Susan Reed",
            "email": "susan.reed@healthpulse.ai",
            "phone": "+1 (617) 432-8900",
            "status": ClientStatusEnum.ACTIVE
        },
        {
            "code": "CLI-105",
            "name": "OmniRetail Global",
            "industry": "E-Commerce & Supply Chain",
            "location": "Austin, TX",
            "person": "Victor Chen",
            "email": "victor.chen@omniretail.com",
            "phone": "+1 (512) 345-9876",
            "status": ClientStatusEnum.ACTIVE
        }
    ]

    client_objs = []
    for c in clients_data:
        client = Client(
            client_code=c["code"],
            name=c["name"],
            industry=c["industry"],
            location=c["location"],
            contact_person=c["person"],
            contact_email=c["email"],
            contact_phone=c["phone"],
            status=c["status"],
            created_at=now - timedelta(days=90)
        )
        db.add(client)
        client_objs.append(client)
    db.flush()

    novatech = client_objs[0]
    apexcloud = client_objs[1]
    finedge = client_objs[2]
    healthpulse = client_objs[3]
    omniretail = client_objs[4]

    # Add Client Contacts
    for client in client_objs:
        db.add(ClientContact(
            client_id=client.id,
            name=client.contact_person,
            email=client.contact_email,
            phone=client.contact_phone,
            designation="VP of Talent & Engineering",
            is_primary=True
        ))
        db.add(ClientContact(
            client_id=client.id,
            name=f"HR Coord - {client.name.split()[0]}",
            email=f"hr@{client.name.lower().replace(' ', '')}.com",
            phone="+1 (555) 019-2831",
            designation="HR Operations Manager",
            is_primary=False
        ))

    # 2. SEED USERS ACROSS ALL ROLES
    default_password_hash = get_password_hash("Password123!")
    admin_password_hash = get_password_hash("AdminPassword123!")

    users_data = [
        {
            "email": "admin@recruitflow.com",
            "password": admin_password_hash,
            "name": "System Administrator",
            "role": RoleEnum.SUPER_ADMIN,
            "phone": "+1 (555) 100-0001",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        },
        {
            "email": "sarah.admin@recruitflow.com",
            "password": default_password_hash,
            "name": "Sarah Jenkins",
            "role": RoleEnum.ADMIN,
            "phone": "+1 (555) 100-0002",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        },
        {
            "email": "alex.recruiter@recruitflow.com",
            "password": default_password_hash,
            "name": "Alex Rivera",
            "role": RoleEnum.RECRUITER,
            "phone": "+1 (555) 100-0003",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        },
        {
            "email": "elena.recruiter@recruitflow.com",
            "password": default_password_hash,
            "name": "Elena Rostova",
            "role": RoleEnum.RECRUITER,
            "phone": "+1 (555) 100-0004",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        },
        {
            "email": "marcus.lead@recruitflow.com",
            "password": default_password_hash,
            "name": "Marcus Sterling",
            "role": RoleEnum.TEAM_LEAD,
            "phone": "+1 (555) 100-0005",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        },
        {
            "email": "david.client@novatech.com",
            "password": default_password_hash,
            "name": "David Vance (NovaTech)",
            "role": RoleEnum.CLIENT,
            "client_id": novatech.id,
            "phone": "+1 (415) 890-1200",
            "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
        },
        {
            "email": "rachel.hm@novatech.com",
            "password": default_password_hash,
            "name": "Rachel Kim (NovaTech Hiring Manager)",
            "role": RoleEnum.HIRING_MANAGER,
            "client_id": novatech.id,
            "phone": "+1 (415) 890-1205",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
        },
        {
            "email": "lisa.viewer@recruitflow.com",
            "password": default_password_hash,
            "name": "Lisa Montgomery",
            "role": RoleEnum.VIEWER,
            "phone": "+1 (555) 100-0008",
            "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
        }
    ]

    user_objs = {}
    for u in users_data:
        user = User(
            email=u["email"],
            hashed_password=u["password"],
            full_name=u["name"],
            role=u["role"],
            client_id=u.get("client_id"),
            phone=u["phone"],
            avatar_url=u["avatar_url"],
            is_active=True,
            created_at=now - timedelta(days=90)
        )
        db.add(user)
        user_objs[u["role"].value] = user
    db.flush()

    super_admin = user_objs[RoleEnum.SUPER_ADMIN.value]
    admin_user = user_objs[RoleEnum.ADMIN.value]
    alex_rec = user_objs[RoleEnum.RECRUITER.value]
    elena_rec = db.query(User).filter(User.email == "elena.recruiter@recruitflow.com").first()
    team_lead = user_objs[RoleEnum.TEAM_LEAD.value]
    client_user = user_objs[RoleEnum.CLIENT.value]
    hm_user = user_objs[RoleEnum.HIRING_MANAGER.value]

    # Assign Account Managers to Clients
    novatech.account_manager_id = admin_user.id
    apexcloud.account_manager_id = admin_user.id
    finedge.account_manager_id = team_lead.id
    healthpulse.account_manager_id = alex_rec.id
    omniretail.account_manager_id = elena_rec.id

    # 3. SEED JOB REQUIREMENTS
    reqs_data = [
        {
            "code": "REQ-1001",
            "client": novatech,
            "title": "Senior Full Stack Engineer",
            "dept": "Platform Engineering",
            "skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker"],
            "exp_min": 5.0,
            "exp_max": 9.0,
            "edu": "B.S. / M.S. in Computer Science or equivalent",
            "loc": "San Francisco, CA",
            "work_mode": WorkModeEnum.HYBRID,
            "sal_min": 150000,
            "sal_max": 185000,
            "openings": 2,
            "filled": 1,
            "priority": PriorityEnum.HIGH,
            "recruiter": alex_rec,
            "status": RequirementStatusEnum.OPEN,
            "desc": "Lead full-stack engineering initiatives building real-time collaboration tools with FastAPI and React."
        },
        {
            "code": "REQ-1002",
            "client": novatech,
            "title": "Lead React & Frontend Specialist",
            "dept": "Design Systems & UI",
            "skills": ["React", "TypeScript", "Tailwind CSS", "Vite", "GraphQL", "Jest"],
            "exp_min": 6.0,
            "exp_max": 10.0,
            "edu": "Bachelor's Degree",
            "loc": "Remote / USA",
            "work_mode": WorkModeEnum.REMOTE,
            "sal_min": 160000,
            "sal_max": 195000,
            "openings": 1,
            "filled": 0,
            "priority": PriorityEnum.URGENT,
            "recruiter": alex_rec,
            "status": RequirementStatusEnum.OPEN,
            "desc": "Architect high-performance web applications with modular frontend components, responsive micro-frontends, and Tailwind design tokens."
        },
        {
            "code": "REQ-1003",
            "client": apexcloud,
            "title": "Senior Cloud DevOps & Kubernetes Lead",
            "dept": "Cloud Infrastructure",
            "skills": ["Kubernetes", "AWS", "Terraform", "CI/CD", "Docker", "Python", "Linux"],
            "exp_min": 7.0,
            "exp_max": 12.0,
            "edu": "B.Tech / B.S. Engineering",
            "loc": "Seattle, WA",
            "work_mode": WorkModeEnum.HYBRID,
            "sal_min": 170000,
            "sal_max": 210000,
            "openings": 2,
            "filled": 0,
            "priority": PriorityEnum.HIGH,
            "recruiter": elena_rec,
            "status": RequirementStatusEnum.OPEN,
            "desc": "Design and manage zero-downtime multi-region Kubernetes clusters on AWS and automated GitOps deployment pipelines."
        },
        {
            "code": "REQ-1004",
            "client": finedge,
            "title": "Staff Backend Python / Data Architect",
            "dept": "Core Banking Architecture",
            "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Microservices"],
            "exp_min": 8.0,
            "exp_max": 14.0,
            "edu": "M.S. / B.S. in Computer Science",
            "loc": "New York, NY",
            "work_mode": WorkModeEnum.ONSITE,
            "sal_min": 190000,
            "sal_max": 240000,
            "openings": 1,
            "filled": 0,
            "priority": PriorityEnum.HIGH,
            "recruiter": alex_rec,
            "status": RequirementStatusEnum.OPEN,
            "desc": "Build ultra-low latency payment transaction ingestion pipelines and financial compliance event streams."
        },
        {
            "code": "REQ-1005",
            "client": healthpulse,
            "title": "Applied AI / ML Research Engineer",
            "dept": "Clinical AI Labs",
            "skills": ["Python", "PyTorch", "Machine Learning", "FastAPI", "Docker", "SQL"],
            "exp_min": 4.0,
            "exp_max": 8.0,
            "edu": "Ph.D. or Master's in CS / AI",
            "loc": "Boston, MA",
            "work_mode": WorkModeEnum.HYBRID,
            "sal_min": 165000,
            "sal_max": 205000,
            "openings": 2,
            "filled": 1,
            "priority": PriorityEnum.MEDIUM,
            "recruiter": elena_rec,
            "status": RequirementStatusEnum.PARTIALLY_FILLED,
            "desc": "Develop transformer-based clinical report summarization models and computer vision pipelines for medical scans."
        },
        {
            "code": "REQ-1006",
            "client": omniretail,
            "title": "QA Automation Lead Engineer",
            "dept": "E-Commerce Quality",
            "skills": ["Playwright", "Cypress", "TypeScript", "Python", "CI/CD", "API Testing"],
            "exp_min": 5.0,
            "exp_max": 9.0,
            "edu": "Bachelor's Degree",
            "loc": "Austin, TX",
            "work_mode": WorkModeEnum.HYBRID,
            "sal_min": 130000,
            "sal_max": 155000,
            "openings": 1,
            "filled": 0,
            "priority": PriorityEnum.MEDIUM,
            "recruiter": alex_rec,
            "status": RequirementStatusEnum.OPEN,
            "desc": "Establish automated end-to-end testing frameworks across web checkout and mobile e-commerce flows."
        }
    ]

    req_objs = []
    for r in reqs_data:
        req = JobRequirement(
            req_code=r["code"],
            client_id=r["client"].id,
            job_title=r["title"],
            department=r["dept"],
            required_skills=r["skills"],
            experience_min=r["exp_min"],
            experience_max=r["exp_max"],
            education=r["edu"],
            location=r["loc"],
            work_mode=r["work_mode"],
            salary_min=r["sal_min"],
            salary_max=r["sal_max"],
            salary_currency="USD",
            openings_count=r["openings"],
            filled_count=r["filled"],
            priority=r["priority"],
            open_date=now - timedelta(days=45),
            target_closing_date=now + timedelta(days=30),
            assigned_recruiter_id=r["recruiter"].id,
            status=r["status"],
            job_description=r["desc"],
            created_at=now - timedelta(days=45)
        )
        db.add(req)
        req_objs.append(req)
    db.flush()

    req_fullstack = req_objs[0]
    req_react = req_objs[1]
    req_devops = req_objs[2]
    req_data = req_objs[3]
    req_ai = req_objs[4]
    req_qa = req_objs[5]

    # 4. SEED CANDIDATES WITH MULTI-VERSION CVS
    candidates_data = [
        {
            "code": "CAN-5001",
            "first": "Michael",
            "last": "Chen",
            "email": "michael.chen.dev@gmail.com",
            "phone": "+1 (415) 782-9012",
            "loc": "San Francisco, CA",
            "pref_loc": "San Francisco / Remote",
            "tot_exp": 6.5,
            "rel_exp": 5.5,
            "curr_co": "CloudSphere Technologies",
            "curr_ctc": 145000,
            "exp_ctc": 165000,
            "notice": 30,
            "skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "Tailwind CSS"],
            "edu": "B.S. in Computer Science, UC Berkeley",
            "src": "LinkedIn Recruiter",
            "recruiter": alex_rec,
            "status": CandidateStatusEnum.JOINED,
            "created_days_ago": 35
        },
        {
            "code": "CAN-5002",
            "first": "Samantha",
            "last": "Taylor",
            "email": "samantha.taylor.code@outlook.com",
            "phone": "+1 (206) 891-2345",
            "loc": "Seattle, WA",
            "pref_loc": "Seattle / Remote",
            "tot_exp": 8.0,
            "rel_exp": 7.0,
            "curr_co": "InnoSoft Systems",
            "curr_ctc": 155000,
            "exp_ctc": 180000,
            "notice": 15,
            "skills": ["Kubernetes", "AWS", "Terraform", "Docker", "CI/CD", "Linux", "Python"],
            "edu": "M.S. in Software Engineering, Univ. of Washington",
            "src": "Referral",
            "recruiter": elena_rec,
            "status": CandidateStatusEnum.INTERVIEW,
            "created_days_ago": 20
        },
        {
            "code": "CAN-5003",
            "first": "Priya",
            "last": "Sharma",
            "email": "priya.sharma.tech@gmail.com",
            "phone": "+1 (408) 555-0199",
            "loc": "San Jose, CA",
            "pref_loc": "San Francisco Bay Area",
            "tot_exp": 7.2,
            "rel_exp": 6.5,
            "curr_co": "ByteCraft Labs",
            "curr_ctc": 150000,
            "exp_ctc": 175000,
            "notice": 30,
            "skills": ["React", "TypeScript", "Tailwind CSS", "GraphQL", "Next.js", "Jest"],
            "edu": "B.E. in Computer Science",
            "src": "Direct Application",
            "recruiter": alex_rec,
            "status": CandidateStatusEnum.CLIENT_REVIEW,
            "created_days_ago": 18
        },
        {
            "code": "CAN-5004",
            "first": "David",
            "last": "Kim",
            "email": "david.kim.ml@gmail.com",
            "phone": "+1 (617) 902-3456",
            "loc": "Boston, MA",
            "pref_loc": "Boston, MA",
            "tot_exp": 5.0,
            "rel_exp": 4.5,
            "curr_co": "NeuroWave Analytics",
            "curr_ctc": 160000,
            "exp_ctc": 185000,
            "notice": 45,
            "skills": ["Python", "PyTorch", "Machine Learning", "FastAPI", "Docker", "SQL"],
            "edu": "M.S. in Data Science, MIT",
            "src": "LinkedIn",
            "recruiter": elena_rec,
            "status": CandidateStatusEnum.OFFER,
            "created_days_ago": 28
        },
        {
            "code": "CAN-5005",
            "first": "James",
            "last": "O'Connor",
            "email": "james.oconnor.dev@gmail.com",
            "phone": "+1 (212) 445-6789",
            "loc": "New York, NY",
            "pref_loc": "New York, NY",
            "tot_exp": 9.5,
            "rel_exp": 9.0,
            "curr_co": "AlphaStream Capital",
            "curr_ctc": 185000,
            "exp_ctc": 215000,
            "notice": 30,
            "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Microservices"],
            "edu": "B.S. in Computer Engineering, NYU",
            "src": "Agency Sourced",
            "recruiter": alex_rec,
            "status": CandidateStatusEnum.SUBMITTED,
            "created_days_ago": 12
        },
        {
            "code": "CAN-5006",
            "first": "Anita",
            "last": "Deshmukh",
            "email": "anita.deshmukh.qa@gmail.com",
            "phone": "+1 (512) 678-1234",
            "loc": "Austin, TX",
            "pref_loc": "Austin, TX / Remote",
            "tot_exp": 6.0,
            "rel_exp": 5.0,
            "curr_co": "ScaleCommerce Inc",
            "curr_ctc": 120000,
            "exp_ctc": 140000,
            "notice": 15,
            "skills": ["Playwright", "Cypress", "TypeScript", "Python", "CI/CD", "Postman"],
            "edu": "B.Tech in Information Technology",
            "src": "Portal Sourced",
            "recruiter": alex_rec,
            "status": CandidateStatusEnum.SHORTLISTED,
            "created_days_ago": 10
        },
        {
            "code": "CAN-5007",
            "first": "Robert",
            "last": "Zhao",
            "email": "robert.zhao.eng@gmail.com",
            "phone": "+1 (415) 334-9988",
            "loc": "Oakland, CA",
            "pref_loc": "San Francisco Bay Area",
            "tot_exp": 4.5,
            "rel_exp": 4.0,
            "curr_co": "NexusApps Inc",
            "curr_ctc": 135000,
            "exp_ctc": 155000,
            "notice": 30,
            "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"],
            "edu": "B.S. in CS, UC Davis",
            "src": "Direct Application",
            "recruiter": alex_rec,
            "status": CandidateStatusEnum.SCREENED,
            "created_days_ago": 6
        },
        {
            "code": "CAN-5008",
            "first": "Emily",
            "last": "Watson",
            "email": "emily.watson.candidate@gmail.com",
            "phone": "+1 (206) 777-1234",
            "loc": "Seattle, WA",
            "pref_loc": "Seattle, WA",
            "tot_exp": 3.5,
            "rel_exp": 3.0,
            "curr_co": "TechBridge LLC",
            "curr_ctc": 110000,
            "exp_ctc": 130000,
            "notice": 30,
            "skills": ["Python", "Django", "SQL", "Git", "REST API"],
            "edu": "B.A. in Computer Science",
            "src": "Career Fair",
            "recruiter": elena_rec,
            "status": CandidateStatusEnum.RECEIVED,
            "created_days_ago": 2
        }
    ]

    candidate_objs = []
    for c in candidates_data:
        cand_created = now - timedelta(days=c["created_days_ago"])
        cand = Candidate(
            candidate_code=c["code"],
            first_name=c["first"],
            last_name=c["last"],
            email=c["email"],
            phone=c["phone"],
            location=c["loc"],
            preferred_location=c["pref_loc"],
            total_experience=c["tot_exp"],
            relevant_experience=c["rel_exp"],
            current_company=c["curr_co"],
            current_ctc=c["curr_ctc"],
            expected_ctc=c["exp_ctc"],
            notice_period_days=c["notice"],
            skills=c["skills"],
            education=c["edu"],
            source=c["src"],
            recruiter_id=c["recruiter"].id,
            status=c["status"],
            created_at=cand_created,
            updated_at=cand_created + timedelta(hours=4)
        )
        db.add(cand)
        candidate_objs.append(cand)
    db.flush()

    michael_cand = candidate_objs[0]
    samantha_cand = candidate_objs[1]
    priya_cand = candidate_objs[2]
    david_cand = candidate_objs[3]
    james_cand = candidate_objs[4]
    anita_cand = candidate_objs[5]
    robert_cand = candidate_objs[6]
    emily_cand = candidate_objs[7]

    # Add Skills to candidate_skills table
    for cand in candidate_objs:
        for sk in cand.skills:
            db.add(CandidateSkill(
                candidate_id=cand.id,
                skill_name=sk,
                years_experience=round(cand.relevant_experience * 0.8, 1),
                proficiency_level="Expert" if cand.total_experience > 6 else "Intermediate"
            ))

    # Add Document Versions (Resumes v1, v2)
    doc_objs = []
    for cand in candidate_objs:
        doc_v1 = CandidateDocument(
            candidate_id=cand.id,
            version_number=1,
            document_type="Resume",
            file_name=f"{cand.first_name}_{cand.last_name}_Resume_v1.pdf",
            file_size=425600,
            mime_type="application/pdf",
            storage_path=f"candidates/{cand.id}/resume_v1.pdf",
            file_url=f"/api/v1/documents/download/resume_v1.pdf?cid={cand.id}",
            uploaded_by_id=cand.recruiter_id,
            created_at=cand.created_at
        )
        db.add(doc_v1)
        doc_objs.append(doc_v1)

        # Some candidates have a v2
        if cand.status in [CandidateStatusEnum.INTERVIEW, CandidateStatusEnum.OFFER, CandidateStatusEnum.JOINED, CandidateStatusEnum.SUBMITTED]:
            doc_v2 = CandidateDocument(
                candidate_id=cand.id,
                version_number=2,
                document_type="Resume",
                file_name=f"{cand.first_name}_{cand.last_name}_Resume_v2_Updated.pdf",
                file_size=452100,
                mime_type="application/pdf",
                storage_path=f"candidates/{cand.id}/resume_v2.pdf",
                file_url=f"/api/v1/documents/download/resume_v2.pdf?cid={cand.id}",
                uploaded_by_id=cand.recruiter_id,
                created_at=cand.created_at + timedelta(days=2)
            )
            db.add(doc_v2)
            doc_objs.append(doc_v2)
    db.flush()

    michael_doc = doc_objs[1]  # v2
    samantha_doc = doc_objs[3] # v2
    priya_doc = doc_objs[4]
    david_doc = doc_objs[6]
    james_doc = doc_objs[8]

    # 5. SEED CV SUBMISSIONS & COMPLETE IMMUTABLE TIMELINE
    # Submission 1: Michael Chen -> NovaTech (Full Stack Engineer) -> Joined!
    sub_michael = CVSubmission(
        submission_code="SUB-8001",
        client_id=novatech.id,
        requirement_id=req_fullstack.id,
        candidate_id=michael_cand.id,
        document_id=michael_doc.id,
        recruiter_id=alex_rec.id,
        submission_date=now - timedelta(days=32),
        remarks="Candidate has stellar background in FastAPI and React from CloudSphere.",
        status=SubmissionStatusEnum.JOINED,
        client_viewed_at=now - timedelta(days=31, hours=20),
        feedback_requested_at=now - timedelta(days=32),
        created_at=now - timedelta(days=32)
    )
    db.add(sub_michael)

    # Submission 2: Samantha Taylor -> ApexCloud (Senior Cloud DevOps) -> Interview Round
    sub_samantha = CVSubmission(
        submission_code="SUB-8002",
        client_id=apexcloud.id,
        requirement_id=req_devops.id,
        candidate_id=samantha_cand.id,
        document_id=samantha_doc.id,
        recruiter_id=elena_rec.id,
        submission_date=now - timedelta(days=16),
        remarks="Exceptional AWS Kubernetes experience; managed 50+ node production clusters.",
        status=SubmissionStatusEnum.INTERVIEW,
        client_viewed_at=now - timedelta(days=15, hours=22),
        feedback_requested_at=now - timedelta(days=16),
        created_at=now - timedelta(days=16)
    )
    db.add(sub_samantha)

    # Submission 3: Priya Sharma -> NovaTech (Lead React Specialist) -> Client Review
    sub_priya = CVSubmission(
        submission_code="SUB-8003",
        client_id=novatech.id,
        requirement_id=req_react.id,
        candidate_id=priya_cand.id,
        document_id=priya_doc.id,
        recruiter_id=alex_rec.id,
        submission_date=now - timedelta(days=14),
        remarks="Strong modern frontend architecture experience with Tailwind and TypeScript.",
        status=SubmissionStatusEnum.CLIENT_VIEWED,
        client_viewed_at=now - timedelta(days=13, hours=10),
        feedback_requested_at=now - timedelta(days=14),
        created_at=now - timedelta(days=14)
    )
    db.add(sub_priya)

    # Submission 4: David Kim -> HealthPulse AI -> Offer
    sub_david = CVSubmission(
        submission_code="SUB-8004",
        client_id=healthpulse.id,
        requirement_id=req_ai.id,
        candidate_id=david_cand.id,
        document_id=david_doc.id,
        recruiter_id=elena_rec.id,
        submission_date=now - timedelta(days=25),
        remarks="Specialized in PyTorch biomedical imaging and clinical NLP models.",
        status=SubmissionStatusEnum.OFFER,
        client_viewed_at=now - timedelta(days=24, hours=18),
        feedback_requested_at=now - timedelta(days=25),
        created_at=now - timedelta(days=25)
    )
    db.add(sub_david)

    # Submission 5: James O'Connor -> FinEdge Dynamics -> Submitted
    sub_james = CVSubmission(
        submission_code="SUB-8005",
        client_id=finedge.id,
        requirement_id=req_data.id,
        candidate_id=james_cand.id,
        document_id=james_doc.id,
        recruiter_id=alex_rec.id,
        submission_date=now - timedelta(days=10),
        remarks="Top fintech background with ultra low latency messaging.",
        status=SubmissionStatusEnum.SUBMITTED,
        created_at=now - timedelta(days=10)
    )
    db.add(sub_james)
    db.flush()

    # 6. IMMUTABLE TIMELINE ENTRIES (CandidateStatusHistory)
    # Michael Chen's full timeline
    timeline_michael = [
        (michael_cand.created_at, None, CandidateStatusEnum.RECEIVED.value, alex_rec.id, "Candidate sourced via LinkedIn Recruiter and profile created.", 0.0),
        (michael_cand.created_at + timedelta(hours=2), CandidateStatusEnum.RECEIVED.value, CandidateStatusEnum.SCREENED.value, alex_rec.id, "Phone screening conducted. Verified notice period and CTC expectations.", 2.0),
        (michael_cand.created_at + timedelta(hours=5), CandidateStatusEnum.SCREENED.value, CandidateStatusEnum.SHORTLISTED.value, alex_rec.id, "Shortlisted for Senior Full Stack Engineer at NovaTech.", 3.0),
        (michael_cand.created_at + timedelta(days=2), CandidateStatusEnum.SHORTLISTED.value, CandidateStatusEnum.SUBMITTED.value, alex_rec.id, "CV v2 submitted to NovaTech Solutions for REQ-1001.", 43.0),
        (michael_cand.created_at + timedelta(days=3), CandidateStatusEnum.SUBMITTED.value, CandidateStatusEnum.CLIENT_REVIEW.value, client_user.id, "Client opened and reviewed candidate profile and resume.", 24.0),
        (michael_cand.created_at + timedelta(days=5), CandidateStatusEnum.CLIENT_REVIEW.value, CandidateStatusEnum.INTERVIEW.value, hm_user.id, "Client shortlisted candidate and requested Technical Round 1.", 48.0),
        (michael_cand.created_at + timedelta(days=14), CandidateStatusEnum.INTERVIEW.value, CandidateStatusEnum.SELECTED.value, hm_user.id, "Completed all 3 interview rounds with high ratings. Selected for offer.", 216.0),
        (michael_cand.created_at + timedelta(days=18), CandidateStatusEnum.SELECTED.value, CandidateStatusEnum.OFFER.value, alex_rec.id, "Offer of $175,000 + $10,000 signing bonus released to candidate.", 96.0),
        (michael_cand.created_at + timedelta(days=22), CandidateStatusEnum.OFFER.value, CandidateStatusEnum.JOINED.value, alex_rec.id, "Candidate accepted offer and successfully joined NovaTech Solutions as Employee #NT-4402.", 96.0),
    ]

    for t in timeline_michael:
        db.add(CandidateStatusHistory(
            candidate_id=michael_cand.id,
            submission_id=sub_michael.id,
            requirement_id=req_fullstack.id,
            old_status=t[1],
            new_status=t[2],
            changed_by_id=t[3],
            remarks=t[4],
            stage_duration_hours=t[5],
            created_at=t[0]
        ))

    # Samantha Taylor's timeline
    timeline_samantha = [
        (samantha_cand.created_at, None, CandidateStatusEnum.RECEIVED.value, elena_rec.id, "Candidate profile created via employee referral.", 0.0),
        (samantha_cand.created_at + timedelta(hours=3), CandidateStatusEnum.RECEIVED.value, CandidateStatusEnum.SCREENED.value, elena_rec.id, "Screened candidate technical background on Terraform & EKS.", 3.0),
        (samantha_cand.created_at + timedelta(hours=6), CandidateStatusEnum.SCREENED.value, CandidateStatusEnum.SHORTLISTED.value, elena_rec.id, "Shortlisted for Senior Cloud DevOps role at Apex Cloud.", 3.0),
        (samantha_cand.created_at + timedelta(days=4), CandidateStatusEnum.SHORTLISTED.value, CandidateStatusEnum.SUBMITTED.value, elena_rec.id, "CV submitted to Apex Cloud Systems.", 90.0),
        (samantha_cand.created_at + timedelta(days=5), CandidateStatusEnum.SUBMITTED.value, CandidateStatusEnum.CLIENT_REVIEW.value, admin_user.id, "Client viewed CV.", 24.0),
        (samantha_cand.created_at + timedelta(days=7), CandidateStatusEnum.CLIENT_REVIEW.value, CandidateStatusEnum.INTERVIEW.value, elena_rec.id, "Technical Round 1 scheduled with Lead DevOps Architect.", 48.0),
    ]

    for t in timeline_samantha:
        db.add(CandidateStatusHistory(
            candidate_id=samantha_cand.id,
            submission_id=sub_samantha.id,
            requirement_id=req_devops.id,
            old_status=t[1],
            new_status=t[2],
            changed_by_id=t[3],
            remarks=t[4],
            stage_duration_hours=t[5],
            created_at=t[0]
        ))

    # 7. SEED INTERVIEWS & FEEDBACK
    int_michael = Interview(
        interview_code="INT-3001",
        candidate_id=michael_cand.id,
        requirement_id=req_fullstack.id,
        client_id=novatech.id,
        submission_id=sub_michael.id,
        round_number=1,
        round_name="Technical Architecture Round",
        interview_type=InterviewTypeEnum.VIRTUAL,
        interview_date=now - timedelta(days=22),
        duration_minutes=60,
        interviewer_name="Rachel Kim",
        interviewer_email="rachel.kim@novatech.com",
        meeting_link="https://meet.google.com/abc-recruitflow-demo",
        status=InterviewStatusEnum.COMPLETED,
        notes="Deep dive into FastAPI async services and React state management.",
        created_by_id=alex_rec.id,
        created_at=now - timedelta(days=25)
    )
    db.add(int_michael)
    db.flush()

    db.add(InterviewFeedback(
        interview_id=int_michael.id,
        submitted_by_id=hm_user.id,
        rating=4.8,
        technical_score=5.0,
        communication_score=4.5,
        cultural_fit_score=4.9,
        recommendation="Strong Yes",
        detailed_feedback="Candidate demonstrated extraordinary depth in distributed system design, clean API structure with FastAPI, and modern frontend component patterns.",
        created_at=now - timedelta(days=22, hours=-2)
    ))

    int_samantha = Interview(
        interview_code="INT-3002",
        candidate_id=samantha_cand.id,
        requirement_id=req_devops.id,
        client_id=apexcloud.id,
        submission_id=sub_samantha.id,
        round_number=1,
        round_name="Cloud Infrastructure & Kubernetes",
        interview_type=InterviewTypeEnum.VIRTUAL,
        interview_date=now + timedelta(days=2),
        duration_minutes=45,
        interviewer_name="Clara Higgins",
        interviewer_email="clara.higgins@apexcloud.io",
        meeting_link="https://meet.google.com/apex-devops-interview",
        status=InterviewStatusEnum.SCHEDULED,
        notes="Assess multi-cluster Helm deployment strategies and AWS IAM roles for service accounts.",
        created_by_id=elena_rec.id,
        created_at=now - timedelta(days=2)
    )
    db.add(int_samantha)

    # 8. SEED CLIENT FEEDBACK
    db.add(ClientFeedback(
        submission_id=sub_michael.id,
        client_id=novatech.id,
        user_id=client_user.id,
        decision=ClientFeedbackDecisionEnum.SHORTLISTED,
        rating=5.0,
        comments="Resume looks top notch. Please proceed with scheduling technical interviews immediately.",
        created_at=now - timedelta(days=30)
    ))

    db.add(ClientFeedback(
        submission_id=sub_priya.id,
        client_id=novatech.id,
        user_id=client_user.id,
        decision=ClientFeedbackDecisionEnum.SCHEDULE_INTERVIEW,
        rating=4.5,
        comments="Great portfolio and UI component library work. Let's set up a UI design review round.",
        created_at=now - timedelta(days=12)
    ))

    # 9. SEED OFFERS & JOINING
    offer_michael = Offer(
        candidate_id=michael_cand.id,
        requirement_id=req_fullstack.id,
        client_id=novatech.id,
        submission_id=sub_michael.id,
        offered_ctc=175000,
        joining_bonus=10000,
        currency="USD",
        offer_date=now - timedelta(days=18),
        target_joining_date=now - timedelta(days=5),
        validity_date=now - timedelta(days=11),
        status=OfferStatusEnum.ACCEPTED,
        created_by_id=alex_rec.id,
        created_at=now - timedelta(days=18)
    )
    db.add(offer_michael)
    db.flush()

    db.add(JoiningDetail(
        offer_id=offer_michael.id,
        candidate_id=michael_cand.id,
        actual_joining_date=now - timedelta(days=5),
        status=JoiningStatusEnum.JOINED,
        employee_code="NT-4402",
        remarks="Successfully completed HR onboarding and IT asset provisioning.",
        verified_by_id=alex_rec.id,
        created_at=now - timedelta(days=5)
    ))

    offer_david = Offer(
        candidate_id=david_cand.id,
        requirement_id=req_ai.id,
        client_id=healthpulse.id,
        submission_id=sub_david.id,
        offered_ctc=180000,
        joining_bonus=15000,
        currency="USD",
        offer_date=now - timedelta(days=3),
        target_joining_date=now + timedelta(days=25),
        validity_date=now + timedelta(days=7),
        status=OfferStatusEnum.RELEASED,
        created_by_id=elena_rec.id,
        created_at=now - timedelta(days=3)
    )
    db.add(offer_david)
    db.flush()

    db.add(JoiningDetail(
        offer_id=offer_david.id,
        candidate_id=david_cand.id,
        actual_joining_date=None,
        status=JoiningStatusEnum.PLANNED,
        employee_code="HP-1088",
        remarks="Offer sent to candidate. Awaiting signed acceptance copy.",
        verified_by_id=elena_rec.id,
        created_at=now - timedelta(days=3)
    ))

    # 10. SEED RECRUITER ACTIVITY
    activities = [
        (alex_rec.id, "Candidate Added", "Candidate", michael_cand.id, "Added candidate Michael Chen to system.", now - timedelta(days=35)),
        (alex_rec.id, "CV Uploaded", "Candidate", michael_cand.id, "Uploaded Michael Chen Resume v1 and v2.", now - timedelta(days=34)),
        (alex_rec.id, "CV Submitted", "Submission", sub_michael.id, "Submitted Michael Chen to NovaTech Solutions.", now - timedelta(days=32)),
        (alex_rec.id, "Interview Scheduled", "Interview", int_michael.id, "Scheduled Technical Architecture Round for Michael Chen.", now - timedelta(days=25)),
        (alex_rec.id, "Offer Released", "Offer", offer_michael.id, "Released offer letter ($175k) for Michael Chen.", now - timedelta(days=18)),
        (elena_rec.id, "Candidate Added", "Candidate", samantha_cand.id, "Added candidate Samantha Taylor (DevOps).", now - timedelta(days=20)),
        (elena_rec.id, "CV Submitted", "Submission", sub_samantha.id, "Submitted Samantha Taylor to Apex Cloud Systems.", now - timedelta(days=16)),
        (elena_rec.id, "Interview Scheduled", "Interview", int_samantha.id, "Scheduled Technical Round with Clara Higgins.", now - timedelta(days=2)),
    ]

    for act in activities:
        db.add(RecruiterActivity(
            recruiter_id=act[0],
            activity_type=act[1],
            entity_type=act[2],
            entity_id=act[3],
            description=act[4],
            created_at=act[5]
        ))

    # 11. SEED NOTIFICATIONS
    notifs = [
        (alex_rec.id, "Client Feedback Received", "NovaTech Solutions approved candidate Priya Sharma for interview.", NotificationTypeEnum.CLIENT_FEEDBACK, "SUBMISSION", sub_priya.id),
        (alex_rec.id, "Candidate Joined Confirmation", "Michael Chen has successfully joined NovaTech Solutions as Senior Full Stack Engineer.", NotificationTypeEnum.CANDIDATE_SELECTED, "CANDIDATE", michael_cand.id),
        (elena_rec.id, "Interview Reminder", "Interview for Samantha Taylor with Apex Cloud is scheduled in 2 days.", NotificationTypeEnum.INTERVIEW_REMINDER, "INTERVIEW", int_samantha.id),
        (team_lead.id, "New Requirement Created", "NovaTech Solutions created a new urgent requirement: Lead React & Frontend Specialist.", NotificationTypeEnum.NEW_REQUIREMENT, "REQUIREMENT", req_react.id),
        (admin_user.id, "Offer Released", "Offer letter of $180,000 was released for David Kim at HealthPulse AI.", NotificationTypeEnum.OFFER_RELEASED, "OFFER", offer_david.id)
    ]

    for n in notifs:
        db.add(Notification(
            recipient_id=n[0],
            title=n[1],
            message=n[2],
            notification_type=n[3],
            is_read=False,
            reference_entity=n[4],
            reference_id=n[5],
            created_at=now - timedelta(hours=6)
        ))

    # 12. SEED IMMUTABLE AUDIT LOGS
    audit_events = [
        (super_admin.id, super_admin.email, "SUPER_ADMIN", "SYSTEM_INITIALIZED", "SYSTEM", None, None, {"status": "Initialized"}, now - timedelta(days=90)),
        (admin_user.id, admin_user.email, "ADMIN", "CLIENT_CREATED", "CLIENT", novatech.id, None, {"name": "NovaTech Solutions", "code": "CLI-101"}, now - timedelta(days=88)),
        (admin_user.id, admin_user.email, "ADMIN", "REQUIREMENT_CREATED", "JOB_REQUIREMENT", req_fullstack.id, None, {"title": "Senior Full Stack Engineer", "client": "NovaTech Solutions"}, now - timedelta(days=45)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "CANDIDATE_CREATED", "CANDIDATE", michael_cand.id, None, {"name": "Michael Chen", "email": michael_cand.email}, now - timedelta(days=35)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "CV_UPLOADED", "CANDIDATE_DOCUMENT", michael_doc.id, None, {"version": 2, "file": michael_doc.file_name}, now - timedelta(days=34)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "CV_SUBMITTED", "CV_SUBMISSION", sub_michael.id, None, {"candidate": "Michael Chen", "client": "NovaTech", "status": "SUBMITTED"}, now - timedelta(days=32)),
        (client_user.id, client_user.email, "CLIENT", "CLIENT_FEEDBACK_ADDED", "CLIENT_FEEDBACK", sub_michael.id, None, {"decision": "SHORTLISTED", "rating": 5.0}, now - timedelta(days=30)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "INTERVIEW_SCHEDULED", "INTERVIEW", int_michael.id, None, {"round": "Technical Architecture Round", "date": str(int_michael.interview_date)}, now - timedelta(days=25)),
        (hm_user.id, hm_user.email, "HIRING_MANAGER", "INTERVIEW_FEEDBACK_SUBMITTED", "INTERVIEW_FEEDBACK", int_michael.id, None, {"recommendation": "Strong Yes", "rating": 4.8}, now - timedelta(days=22)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "OFFER_RELEASED", "OFFER", offer_michael.id, None, {"offered_ctc": 175000, "status": "RELEASED"}, now - timedelta(days=18)),
        (alex_rec.id, alex_rec.email, "RECRUITER", "CANDIDATE_JOINED", "JOINING_DETAIL", michael_cand.id, None, {"status": "JOINED", "emp_code": "NT-4402"}, now - timedelta(days=5)),
    ]

    for a in audit_events:
        db.add(AuditLog(
            user_id=a[0],
            user_email=a[1],
            user_role=a[2],
            action=a[3],
            entity=a[4],
            entity_id=a[5],
            old_value=a[6],
            new_value=a[7],
            ip_address="192.168.1.10",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) RecruitFlow/1.0",
            created_at=a[8]
        ))

    db.commit()
    logger.info("Database successfully seeded with comprehensive enterprise recruitment lifecycle data!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
