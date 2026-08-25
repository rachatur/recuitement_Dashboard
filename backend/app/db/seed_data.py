import logging

from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import (
    Candidate,
    CandidateStatusEnum,
    Client,
    ClientStatusEnum,
    JobRequirement,
    PriorityEnum,
    RequirementStatusEnum,
    User,
    RoleEnum,
    WorkModeEnum,
)

logger = logging.getLogger(__name__)


def seed_database(db):
    """Create the schema and add only the accounts and record needed for testing."""
    Base.metadata.create_all(bind=engine)

    if db.query(User).filter(User.email == "admin@recruitflow.com").first():
        logger.info("Database already seeded. Skipping initial seeding.")
        return

    admin = User(
        email="admin@recruitflow.com",
        hashed_password=get_password_hash("AdminPassword123!"),
        full_name="System Administrator",
        role=RoleEnum.SUPER_ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()

    client = Client(
        client_code="CLI-TEST-001",
        name="Test Hiring Organization",
        industry="Technology",
        location="Gurgaon",
        status=ClientStatusEnum.ACTIVE,
    )
    db.add(client)
    db.flush()

    db.add(JobRequirement(
        req_code="REQ-TEST-001",
        client_id=client.id,
        job_title="Opus AuditBoard Functional Developer / Oracle Cloud Supply Planning Specialist",
        required_skills=[
            "AuditBoard Platform Configuration",
            "GRC",
            "SOX Compliance",
            "Requirements Gathering",
            "Oracle Fusion Supply Planning",
            "Oracle Fusion SCM Cloud",
            "Inventory Optimization",
            "S&OP",
        ],
        experience_min=7.0,
        location="Gurgaon / Any",
        work_mode=WorkModeEnum.ONSITE,
        openings_count=1,
        priority=PriorityEnum.HIGH,
        assigned_recruiter_id=admin.id,
        status=RequirementStatusEnum.OPEN,
        job_description="""Job Description: Opus AuditBoard Functional Developer

Location: Gurgaon
Employment Type: Contractor
Number of Positions: 1
Experience Required: 7+ Years

Role Overview
We are seeking an experienced Opus AuditBoard Functional Developer/Consultant with strong expertise in configuring and implementing AuditBoard solutions. The ideal candidate will have hands-on experience in designing and configuring workflows, managing governance, risk, and compliance (GRC) processes, and supporting audit and compliance teams through AuditBoard platform implementations.

Key Responsibilities
- Configure and customize AuditBoard workflows, forms, templates, reports, and dashboards.
- Implement OpsAudit, SOXHUB, RiskOversight, and CrossComply modules.
- Gather business requirements and convert them into functional specifications and workflow designs.
- Design and optimize audit, risk, and compliance processes.
- Support platform configuration, data mapping, integration testing, UAT, and production deployments.
- Troubleshoot configuration issues and prepare functional documentation and training materials.

Mandatory Skills
- AuditBoard Platform Configuration
- Workflow Configuration in AuditBoard
- Governance, Risk & Compliance (GRC)
- Internal Audit & SOX Compliance Processes
- Requirements Gathering and Functional Design
- Integration Testing and Data Mapping
- Architecture Patterns and Styles
- Generative AI, OpenAI, and Vector Database Concepts

Oracle Cloud Supply Planning Specialist (10+ Years)
Location: Any
Experience: 10+ Years

We are seeking an experienced Oracle Cloud Supply Planning Specialist with expertise in Oracle Fusion SCM Planning solutions. The ideal candidate will own demand forecasting, supply planning, inventory optimization, exception management, and Oracle best-practice adoption.

Responsibilities
- Configure Oracle Fusion Supply Planning, Demand Management, and S&OP.
- Manage demand forecasting, supply plan generation, and constraint-based planning.
- Configure sourcing rules, planning parameters, inventory policies, and replenishment strategies.
- Translate business requirements into scalable Oracle Cloud SCM solutions.
- Support inventory optimization, exception management, testing, deployment, and user training.

Mandatory Skills
- Oracle Fusion Supply Planning
- Oracle Demand Management Cloud
- Oracle Sales & Operations Planning (S&OP)
- Supply Chain Planning & Forecasting
- Inventory Optimization
- Constraint-Based Planning
- Sourcing Rules & Replenishment Planning
- Oracle Fusion SCM Cloud

Preferred Skills
- End-to-End SCM Process Knowledge
- Order Management & Inventory Management
- Data Migration and Integration
- Functional Solution Design
- Stakeholder Management""",
    ))

    db.add(Candidate(
        candidate_code="CAN-TEST-001",
        first_name="Test",
        last_name="Candidate",
        email="test.candidate@example.com",
        phone="+919876543210",
        location="Test Location",
        total_experience=2.0,
        relevant_experience=2.0,
        current_company="Test Company",
        current_designation="Software Developer",
        skills=["Python", "React"],
        education="Bachelor's Degree",
        source="Seed Test Data",
        recruiter_id=admin.id,
        status=CandidateStatusEnum.RECEIVED,
    ))
    db.commit()
    logger.info("Database seeded with one test candidate.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
