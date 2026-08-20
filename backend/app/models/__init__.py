import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, 
    Text, Enum as SQLEnum, JSON, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# ----------------- ENUMS -----------------

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"
    TEAM_LEAD = "TEAM_LEAD"
    CLIENT = "CLIENT"
    HIRING_MANAGER = "HIRING_MANAGER"
    VIEWER = "VIEWER"

class ClientStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_HOLD = "ON_HOLD"
    PROSPECT = "PROSPECT"

class WorkModeEnum(str, enum.Enum):
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"
    ONSITE = "ONSITE"

class PriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class RequirementStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class CandidateStatusEnum(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SCREENED = "SCREENED"
    SHORTLISTED = "SHORTLISTED"
    SUBMITTED = "SUBMITTED"
    CLIENT_REVIEW = "CLIENT_REVIEW"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    OFFER = "OFFER"
    JOINED = "JOINED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"

class SubmissionStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    CLIENT_VIEWED = "CLIENT_VIEWED"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    OFFER = "OFFER"
    JOINED = "JOINED"

class InterviewTypeEnum(str, enum.Enum):
    VIRTUAL = "VIRTUAL"
    IN_PERSON = "IN_PERSON"
    PHONE = "PHONE"

class InterviewStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    RESCHEDULED = "RESCHEDULED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class ClientFeedbackDecisionEnum(str, enum.Enum):
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    NEED_MORE_INFORMATION = "NEED_MORE_INFORMATION"
    SCHEDULE_INTERVIEW = "SCHEDULE_INTERVIEW"

class OfferStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    RELEASED = "RELEASED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    WITHDRAWN = "WITHDRAWN"

class JoiningStatusEnum(str, enum.Enum):
    PLANNED = "PLANNED"
    JOINED = "JOINED"
    DID_NOT_JOIN = "DID_NOT_JOIN"

class NotificationTypeEnum(str, enum.Enum):
    NEW_REQUIREMENT = "NEW_REQUIREMENT"
    CANDIDATE_ASSIGNED = "CANDIDATE_ASSIGNED"
    CV_SUBMITTED = "CV_SUBMITTED"
    CLIENT_FEEDBACK = "CLIENT_FEEDBACK"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_REMINDER = "INTERVIEW_REMINDER"
    CANDIDATE_SELECTED = "CANDIDATE_SELECTED"
    OFFER_RELEASED = "OFFER_RELEASED"
    REQUIREMENT_DEADLINE = "REQUIREMENT_DEADLINE"
    SYSTEM_ALERT = "SYSTEM_ALERT"

# ----------------- MODELS -----------------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.RECRUITER, nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="users", foreign_keys=[client_id])
    managed_clients = relationship("Client", back_populates="account_manager", foreign_keys="Client.account_manager_id")
    assigned_requirements = relationship("JobRequirement", back_populates="assigned_recruiter")
    sourced_candidates = relationship("Candidate", back_populates="recruiter")
    submissions = relationship("CVSubmission", back_populates="recruiter")
    notifications = relationship("Notification", back_populates="recipient")
    activities = relationship("RecruiterActivity", back_populates="recruiter")

class Client(Base):
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), unique=True, index=True, nullable=False)
    industry = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    contact_person = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    account_manager_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(ClientStatusEnum), default=ClientStatusEnum.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    users = relationship("User", back_populates="client", foreign_keys="User.client_id")
    account_manager = relationship("User", back_populates="managed_clients", foreign_keys=[account_manager_id])
    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")
    requirements = relationship("JobRequirement", back_populates="client", cascade="all, delete-orphan")
    submissions = relationship("CVSubmission", back_populates="client")
    interviews = relationship("Interview", back_populates="client")
    offers = relationship("Offer", back_populates="client")

class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    client = relationship("Client", back_populates="contacts")

class JobRequirement(Base):
    __tablename__ = "job_requirements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    req_code = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    required_skills = Column(JSON, default=list)  # List of skill strings
    experience_min = Column(Float, default=0.0)
    experience_max = Column(Float, default=0.0)
    education = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    work_mode = Column(SQLEnum(WorkModeEnum), default=WorkModeEnum.HYBRID)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    openings_count = Column(Integer, default=1)
    filled_count = Column(Integer, default=0)
    priority = Column(SQLEnum(PriorityEnum), default=PriorityEnum.MEDIUM)
    open_date = Column(DateTime, default=utc_now)
    target_closing_date = Column(DateTime, nullable=True)
    assigned_recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(RequirementStatusEnum), default=RequirementStatusEnum.OPEN, nullable=False)
    job_description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="requirements")
    assigned_recruiter = relationship("User", back_populates="assigned_requirements")
    submissions = relationship("CVSubmission", back_populates="requirement")
    interviews = relationship("Interview", back_populates="requirement")
    offers = relationship("Offer", back_populates="requirement")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_code = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    preferred_location = Column(String(255), nullable=True)
    total_experience = Column(Float, default=0.0)  # in years
    relevant_experience = Column(Float, default=0.0)
    current_company = Column(String(255), nullable=True)
    current_ctc = Column(Float, nullable=True)
    expected_ctc = Column(Float, nullable=True)
    notice_period_days = Column(Integer, default=30)
    skills = Column(JSON, default=list)  # List of strings
    education = Column(String(255), nullable=True)
    source = Column(String(100), default="Direct")  # LinkedIn, Portal, Referral, etc.
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(CandidateStatusEnum), default=CandidateStatusEnum.RECEIVED, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    recruiter = relationship("User", back_populates="sourced_candidates")
    skill_items = relationship("CandidateSkill", back_populates="candidate", cascade="all, delete-orphan")
    documents = relationship("CandidateDocument", back_populates="candidate", cascade="all, delete-orphan")
    submissions = relationship("CVSubmission", back_populates="candidate", cascade="all, delete-orphan")
    status_history = relationship("CandidateStatusHistory", back_populates="candidate", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="candidate", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="candidate", cascade="all, delete-orphan")
    joining_details = relationship("JoiningDetail", back_populates="candidate", cascade="all, delete-orphan")

class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    years_experience = Column(Float, default=1.0)
    proficiency_level = Column(String(50), default="Intermediate")  # Beginner, Intermediate, Expert

    candidate = relationship("Candidate", back_populates="skill_items")

class CandidateDocument(Base):
    __tablename__ = "candidate_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    document_type = Column(String(50), default="Resume")  # Resume, Certificate, ID_Proof, Offer_Letter
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    storage_path = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="documents")
    uploaded_by = relationship("User")
    submissions = relationship("CVSubmission", back_populates="document")

class CVSubmission(Base):
    __tablename__ = "cv_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submission_code = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("candidate_documents.id", ondelete="CASCADE"), nullable=False)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submission_date = Column(DateTime, default=utc_now, nullable=False)
    remarks = Column(Text, nullable=True)
    status = Column(SQLEnum(SubmissionStatusEnum), default=SubmissionStatusEnum.SUBMITTED, nullable=False)
    client_viewed_at = Column(DateTime, nullable=True)
    feedback_requested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="submissions")
    requirement = relationship("JobRequirement", back_populates="submissions")
    candidate = relationship("Candidate", back_populates="submissions")
    document = relationship("CandidateDocument", back_populates="submissions")
    recruiter = relationship("User", back_populates="submissions")
    client_feedbacks = relationship("ClientFeedback", back_populates="submission", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="submission")
    offers = relationship("Offer", back_populates="submission")

class CandidateStatusHistory(Base):
    __tablename__ = "candidate_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="SET NULL"), nullable=True)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="SET NULL"), nullable=True)
    old_status = Column(String(100), nullable=True)
    new_status = Column(String(100), nullable=False)
    changed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    stage_duration_hours = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="status_history")
    changed_by = relationship("User")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_code = Column(String(50), unique=True, index=True, nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="SET NULL"), nullable=True)
    round_number = Column(Integer, default=1)
    round_name = Column(String(100), default="Technical Round 1")
    interview_type = Column(SQLEnum(InterviewTypeEnum), default=InterviewTypeEnum.VIRTUAL)
    interview_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=45)
    interviewer_name = Column(String(255), nullable=True)
    interviewer_email = Column(String(255), nullable=True)
    meeting_link = Column(String(500), nullable=True)
    status = Column(SQLEnum(InterviewStatusEnum), default=InterviewStatusEnum.SCHEDULED)
    notes = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")
    requirement = relationship("JobRequirement", back_populates="interviews")
    client = relationship("Client", back_populates="interviews")
    submission = relationship("CVSubmission", back_populates="interviews")
    feedbacks = relationship("InterviewFeedback", back_populates="interview", cascade="all, delete-orphan")
    created_by = relationship("User")

class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    submitted_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Float, default=4.0)  # 1-5 scale
    technical_score = Column(Float, default=4.0)
    communication_score = Column(Float, default=4.0)
    cultural_fit_score = Column(Float, default=4.0)
    recommendation = Column(String(50), default="Strong Yes")  # Strong Yes, Yes, Neutral, No, Strong No
    detailed_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    interview = relationship("Interview", back_populates="feedbacks")
    submitted_by = relationship("User")

class ClientFeedback(Base):
    __tablename__ = "client_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(SQLEnum(ClientFeedbackDecisionEnum), default=ClientFeedbackDecisionEnum.SHORTLISTED)
    rating = Column(Float, default=4.0)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    submission = relationship("CVSubmission", back_populates="client_feedbacks")
    user = relationship("User")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="CASCADE"), nullable=False)
    offered_ctc = Column(Float, nullable=False)
    joining_bonus = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")
    offer_date = Column(DateTime, default=utc_now, nullable=False)
    target_joining_date = Column(DateTime, nullable=False)
    validity_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(OfferStatusEnum), default=OfferStatusEnum.RELEASED, nullable=False)
    decline_reason = Column(Text, nullable=True)
    document_url = Column(String(500), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="offers")
    requirement = relationship("JobRequirement", back_populates="offers")
    client = relationship("Client", back_populates="offers")
    submission = relationship("CVSubmission", back_populates="offers")
    joining_detail = relationship("JoiningDetail", back_populates="offer", uselist=False)
    created_by = relationship("User")

class JoiningDetail(Base):
    __tablename__ = "joining_details"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    actual_joining_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(JoiningStatusEnum), default=JoiningStatusEnum.PLANNED)
    employee_code = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    offer = relationship("Offer", back_populates="joining_detail")
    candidate = relationship("Candidate", back_populates="joining_details")
    verified_by = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(SQLEnum(NotificationTypeEnum), default=NotificationTypeEnum.SYSTEM_ALERT)
    is_read = Column(Boolean, default=False)
    reference_entity = Column(String(50), nullable=True)  # CANDIDATE, REQUIREMENT, SUBMISSION, INTERVIEW, OFFER
    reference_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    recipient = relationship("User", back_populates="notifications")

class RecruiterActivity(Base):
    __tablename__ = "recruiter_activity"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(100), nullable=False)  # Candidate Added, Screened, CV Uploaded, CV Submitted, Interview Scheduled, Offer Released
    entity_type = Column(String(50), nullable=False)  # Candidate, Requirement, Submission, Interview
    entity_id = Column(String(36), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    recruiter = relationship("User", back_populates="activities")

class DashboardMetric(Base):
    __tablename__ = "dashboard_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    metric_date = Column(DateTime, nullable=False, index=True)
    metric_key = Column(String(100), nullable=False, index=True)  # candidates_added, cvs_submitted, interviews_held, selections, offers, joins
    metric_value = Column(Float, default=0.0)
    dimension_type = Column(String(50), default="SYSTEM")  # SYSTEM, CLIENT, RECRUITER
    dimension_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # USER_CREATED, CANDIDATE_CREATED, CV_SUBMITTED, etc.
    entity = Column(String(100), nullable=False, index=True)  # USER, CANDIDATE, SUBMISSION, INTERVIEW, OFFER
    entity_id = Column(String(36), nullable=True, index=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(100), default="127.0.0.1")
    user_agent = Column(String(500), default="Web Browser")
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

# Indexes for fast historical queries
Index("ix_candidate_status_hist_cand_created", CandidateStatusHistory.candidate_id, CandidateStatusHistory.created_at)
Index("ix_cv_submission_client_status", CVSubmission.client_id, CVSubmission.status)
Index("ix_recruiter_activity_date", RecruiterActivity.recruiter_id, RecruiterActivity.created_at)
