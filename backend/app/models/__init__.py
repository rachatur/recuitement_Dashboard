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
    HR_RECRUITER = "HR_RECRUITER"
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

class PositionStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    CLOSED = "CLOSED"

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

class BenchStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_AVAILABLE = "PARTIALLY_AVAILABLE"
    ALLOCATED = "ALLOCATED"
    INTERVIEWING = "INTERVIEWING"
    ON_HOLD = "ON_HOLD"
    RELEASED = "RELEASED"
    JOINED = "JOINED"
    NOT_ON_BENCH = "NOT_ON_BENCH"

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
    PENDING = "PENDING"
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
    WHATSAPP_REPLY_RECEIVED = "WHATSAPP_REPLY_RECEIVED"
    WHATSAPP_OPT_OUT = "WHATSAPP_OPT_OUT"
    WHATSAPP_CAMPAIGN_COMPLETED = "WHATSAPP_CAMPAIGN_COMPLETED"

# --- WhatsApp Outreach Specific Enums ---

class WhatsAppConsentStatusEnum(str, enum.Enum):
    NOT_COLLECTED = "NOT_COLLECTED"
    PENDING = "PENDING"
    GRANTED = "GRANTED"
    REVOKED = "REVOKED"
    OPTED_OUT = "OPTED_OUT"
    INVALID_NUMBER = "INVALID_NUMBER"
    BLOCKED = "BLOCKED"
    UNAVAILABLE = "UNAVAILABLE"

class WhatsAppCampaignTypeEnum(str, enum.Enum):
    NEW_JOB_OPPORTUNITY = "NEW_JOB_OPPORTUNITY"
    BENCH_AVAILABILITY = "BENCH_AVAILABILITY"
    INTERVIEW_INVITATION = "INTERVIEW_INVITATION"
    INTERVIEW_REMINDER = "INTERVIEW_REMINDER"
    DOCUMENT_REQUEST = "DOCUMENT_REQUEST"
    FOLLOW_UP = "FOLLOW_UP"
    CANDIDATE_RE_ENGAGEMENT = "CANDIDATE_RE_ENGAGEMENT"
    JOINING_REMINDER = "JOINING_REMINDER"
    CUSTOM_TEMPLATE = "CUSTOM_TEMPLATE"

class WhatsAppCampaignStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    SENDING = "SENDING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class WhatsAppMessageStatusEnum(str, enum.Enum):
    QUEUED = "QUEUED"
    SENDING = "SENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    REPLIED = "REPLIED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    OPTED_OUT = "OPTED_OUT"

class WhatsAppMessageDirectionEnum(str, enum.Enum):
    OUTBOUND = "OUTBOUND"
    INBOUND = "INBOUND"

class WhatsAppMessageTypeEnum(str, enum.Enum):
    TEMPLATE = "TEMPLATE"
    TEXT = "TEXT"
    DOCUMENT = "DOCUMENT"
    IMAGE = "IMAGE"
    INTERACTIVE = "INTERACTIVE"

class WhatsAppTemplateCategoryEnum(str, enum.Enum):
    RECRUITMENT_COMMUNICATION = "RECRUITMENT_COMMUNICATION"
    UTILITY = "UTILITY"
    MARKETING = "MARKETING"
    AUTHENTICATION = "AUTHENTICATION"

class WhatsAppTemplateStatusEnum(str, enum.Enum):
    APPROVED = "APPROVED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"
    DRAFT = "DRAFT"
    DISABLED = "DISABLED"

class WhatsAppConversationStatusEnum(str, enum.Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    AWAITING_CANDIDATE = "AWAITING_CANDIDATE"
    AWAITING_RECRUITER = "AWAITING_RECRUITER"
    INTERESTED = "INTERESTED"
    NOT_INTERESTED = "NOT_INTERESTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    FOLLOW_UP_REQUIRED = "FOLLOW_UP_REQUIRED"
    CLOSED = "CLOSED"
    OPTED_OUT = "OPTED_OUT"

class WhatsAppResponseCategoryEnum(str, enum.Enum):
    INTERESTED = "INTERESTED"
    NOT_INTERESTED = "NOT_INTERESTED"
    NEED_MORE_INFORMATION = "NEED_MORE_INFORMATION"
    AVAILABLE_FOR_INTERVIEW = "AVAILABLE_FOR_INTERVIEW"
    NOT_AVAILABLE = "NOT_AVAILABLE"
    CALL_ME = "CALL_ME"
    WRONG_NUMBER = "WRONG_NUMBER"
    OPT_OUT = "OPT_OUT"
    OTHER = "OTHER"

class WhatsAppRecipientEligibilityEnum(str, enum.Enum):
    ELIGIBLE = "ELIGIBLE"
    EXCLUDED_NO_CONSENT = "EXCLUDED_NO_CONSENT"
    EXCLUDED_OPTED_OUT = "EXCLUDED_OPTED_OUT"
    EXCLUDED_INVALID_NUMBER = "EXCLUDED_INVALID_NUMBER"
    EXCLUDED_FREQUENCY_LIMIT = "EXCLUDED_FREQUENCY_LIMIT"


# ----------------- MODELS -----------------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.RECRUITER, nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL", use_alter=True, name="fk_users_client_id"), nullable=True)
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
    campaigns = relationship("WhatsAppCampaign", back_populates="recruiter", foreign_keys="WhatsAppCampaign.recruiter_id")
    conversations = relationship("WhatsAppConversation", back_populates="recruiter")

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
    account_manager_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL", use_alter=True, name="fk_clients_account_manager_id"), nullable=True)
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
    hold_date = Column(DateTime, nullable=True)
    closed_date = Column(DateTime, nullable=True)
    target_closing_date = Column(DateTime, nullable=True)
    status_updated_at = Column(DateTime, default=utc_now, nullable=True)
    assigned_recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(RequirementStatusEnum), default=RequirementStatusEnum.OPEN, nullable=False)
    position_status = Column(SQLEnum(PositionStatusEnum), default=PositionStatusEnum.OPEN, nullable=False)
    job_description = Column(Text, nullable=True)
    
    # JD Attachment fields
    jd_attachment_name = Column(String(255), nullable=True)
    jd_attachment_path = Column(String(500), nullable=True)
    jd_attachment_size = Column(Integer, default=0)
    jd_attachment_mime = Column(String(100), default="application/pdf")
    jd_attachment_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="requirements")
    assigned_recruiter = relationship("User", back_populates="assigned_requirements")
    submissions = relationship("CVSubmission", back_populates="requirement")
    interviews = relationship("Interview", back_populates="requirement")
    offers = relationship("Offer", back_populates="requirement")
    documents = relationship("RequirementDocument", back_populates="requirement", cascade="all, delete-orphan")
    campaigns = relationship("WhatsAppCampaign", back_populates="requirement")
    bench_matches = relationship("CandidateRequirementMapping", back_populates="requirement", cascade="all, delete-orphan")

class RequirementDocument(Base):
    __tablename__ = "requirement_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), default="Job_Description")
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    storage_path = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    requirement = relationship("JobRequirement", back_populates="documents")
    uploaded_by = relationship("User")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_code = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    alternate_phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    preferred_location = Column(String(255), nullable=True)
    total_experience = Column(Float, default=0.0)  # in years
    relevant_experience = Column(Float, default=0.0)
    current_company = Column(String(255), nullable=True)
    current_designation = Column(String(255), nullable=True)
    current_ctc = Column(Float, nullable=True)
    expected_ctc = Column(Float, nullable=True)
    employment_history = Column(JSON, default=list)  # List of past work experience items
    notice_period_days = Column(Integer, default=30)
    notice_period = Column(String(100), nullable=True)  # e.g. "Immediate", "15 Days", "30 Days"
    skills = Column(JSON, default=list)  # List of strings
    technical_skills = Column(JSON, default=list)
    education = Column(String(255), nullable=True)
    highest_qualification = Column(String(255), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    certifications = Column(JSON, default=list)
    date_of_birth = Column(String(50), nullable=True)
    source = Column(String(100), default="Direct")  # LinkedIn, Portal, Referral, WhatsApp, etc.
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(CandidateStatusEnum), default=CandidateStatusEnum.RECEIVED, nullable=False)

    # WhatsApp Specific Attributes
    whatsapp_number = Column(String(50), nullable=True, index=True)
    country_code = Column(String(10), default="+91")
    is_whatsapp_verified = Column(Boolean, default=False)
    whatsapp_consent_status = Column(SQLEnum(WhatsAppConsentStatusEnum), default=WhatsAppConsentStatusEnum.NOT_COLLECTED, nullable=False)
    whatsapp_consent_source = Column(String(100), nullable=True)
    whatsapp_consent_date = Column(DateTime, nullable=True)
    whatsapp_consent_evidence = Column(String(255), nullable=True)
    whatsapp_opt_out_status = Column(Boolean, default=False, nullable=False)
    whatsapp_opt_out_date = Column(DateTime, nullable=True)
    preferred_language = Column(String(20), default="en")
    preferred_contact_time = Column(String(100), nullable=True)
    last_whatsapp_contact_date = Column(DateTime, nullable=True)
    last_whatsapp_response_date = Column(DateTime, nullable=True)
    last_whatsapp_message_status = Column(String(50), nullable=True)
    do_not_contact_reason = Column(String(255), nullable=True)

    # Bench specific attributes
    bench_status = Column(SQLEnum(BenchStatusEnum), default=BenchStatusEnum.NOT_ON_BENCH, nullable=False)
    bench_availability_date = Column(DateTime, nullable=True)
    bench_primary_skills = Column(JSON, default=list)
    bench_secondary_skills = Column(JSON, default=list)

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
    bench_resource = relationship("BenchResource", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    consents = relationship("WhatsAppConsent", back_populates="candidate", cascade="all, delete-orphan")
    opt_out_record = relationship("WhatsAppOptOut", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    conversations = relationship("WhatsAppConversation", back_populates="candidate", cascade="all, delete-orphan")
    messages = relationship("WhatsAppMessage", back_populates="candidate", cascade="all, delete-orphan")
    campaign_recipients = relationship("WhatsAppCampaignRecipient", back_populates="candidate", cascade="all, delete-orphan")

class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    years_experience = Column(Float, default=1.0)
    proficiency_level = Column(String(50), default="Intermediate")

    candidate = relationship("Candidate", back_populates="skill_items")

class CandidateDocument(Base):
    __tablename__ = "candidate_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    document_type = Column(String(50), default="Resume")
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

class BenchResource(Base):
    __tablename__ = "bench_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, nullable=False)
    bench_status = Column(SQLEnum(BenchStatusEnum), default=BenchStatusEnum.AVAILABLE, nullable=False)
    primary_skills = Column(JSON, default=list)
    secondary_skills = Column(JSON, default=list)
    availability_date = Column(DateTime, default=utc_now)
    assigned_requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="SET NULL"), nullable=True)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    last_outreach_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    candidate = relationship("Candidate", back_populates="bench_resource")
    assigned_requirement = relationship("JobRequirement")
    recruiter = relationship("User")

class CandidateRequirementMapping(Base):
    __tablename__ = "candidate_requirement_mapping"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, default=0.0)
    match_details = Column(JSON, default=dict)
    status = Column(String(50), default="MATCHED")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    candidate = relationship("Candidate")
    requirement = relationship("JobRequirement", back_populates="bench_matches")

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

class InterviewFeedback(Base):
    __tablename__ = "interview_feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    submitted_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    technical_rating = Column(Integer, default=3)
    communication_rating = Column(Integer, default=3)
    problem_solving_rating = Column(Integer, default=3)
    cultural_fit_rating = Column(Integer, default=3)
    overall_rating = Column(Float, default=3.0)
    rating = Column(Float, default=4.0, nullable=True)
    technical_score = Column(Float, default=4.0, nullable=True)
    communication_score = Column(Float, default=4.0, nullable=True)
    cultural_fit_score = Column(Float, default=4.0, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    detailed_comments = Column(Text, nullable=True)
    detailed_feedback = Column(Text, nullable=True)
    recommendation = Column(String(50), default="SHORTLIST")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    interview = relationship("Interview", back_populates="feedbacks")
    submitted_by = relationship("User")

class ClientFeedback(Base):
    __tablename__ = "client_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(SQLEnum(ClientFeedbackDecisionEnum), nullable=False)
    feedback_notes = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    rating = Column(Integer, nullable=True)
    feedback_date = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    submission = relationship("CVSubmission", back_populates="client_feedbacks")
    client = relationship("Client")
    user = relationship("User")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    offer_code = Column(String(50), unique=True, index=True, default=lambda: f"OFF-{generate_uuid()[:6].upper()}", nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    submission_id = Column(String(36), ForeignKey("cv_submissions.id", ondelete="CASCADE"), nullable=False)
    designation_offered = Column(String(255), default="Software Engineer", nullable=True)
    annual_ctc = Column(Float, default=100000.0, nullable=True)
    offered_ctc = Column(Float, default=100000.0, nullable=True)
    variable_pay = Column(Float, default=0.0)
    joining_bonus = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")
    offer_date = Column(DateTime, default=utc_now, nullable=False)
    target_joining_date = Column(DateTime, nullable=False)
    validity_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(OfferStatusEnum), default=OfferStatusEnum.DRAFT, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    candidate = relationship("Candidate", back_populates="offers")
    requirement = relationship("JobRequirement", back_populates="offers")
    client = relationship("Client", back_populates="offers")
    submission = relationship("CVSubmission", back_populates="offers")
    joining_detail = relationship("JoiningDetail", back_populates="offer", uselist=False, cascade="all, delete-orphan")
    created_by = relationship("User")

class JoiningDetail(Base):
    __tablename__ = "joining_details"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    actual_joining_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(JoiningStatusEnum), default=JoiningStatusEnum.PLANNED)
    documents_submitted = Column(Boolean, default=False)
    background_verification_status = Column(String(50), default="PENDING")
    employee_code = Column(String(50), nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

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
    reference_entity = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    recipient = relationship("User", back_populates="notifications")

class RecruiterActivity(Base):
    __tablename__ = "recruiter_activity"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    recruiter = relationship("User", back_populates="activities")

class DashboardMetric(Base):
    __tablename__ = "dashboard_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    metric_date = Column(DateTime, nullable=False, index=True)
    metric_key = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, default=0.0)
    dimension_type = Column(String(50), default="SYSTEM")
    dimension_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


# ----------------- WHATSAPP OUTREACH MODELS -----------------

class WhatsAppIntegration(Base):
    __tablename__ = "whatsapp_integrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), default="MOCK_SIMULATOR", nullable=False)
    business_account_id = Column(String(100), default="WABA_1092837482910")
    phone_number_id = Column(String(100), default="PHONE_919876543210")
    api_base_url = Column(String(255), default="https://graph.facebook.com/v20.0")
    access_token_encrypted = Column(Text, nullable=True)
    webhook_url = Column(String(500), default="/api/v1/whatsapp/webhook")
    webhook_verify_token = Column(String(100), default="recruitflow_verify_token_secure_2026")
    default_country_code = Column(String(10), default="+91")
    message_limit_per_day = Column(Integer, default=1000)
    rate_limit_per_second = Column(Integer, default=20)
    business_hours_start = Column(String(10), default="09:00")
    business_hours_end = Column(String(10), default="19:00")
    retry_policy_max_retries = Column(Integer, default=3)
    default_recruiter_signature = Column(String(255), default="— Talent Acquisition Team, RecruitFlow")
    is_connected = Column(Boolean, default=True)
    connection_status = Column(String(50), default="Connected")
    last_test_date = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    template_name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(SQLEnum(WhatsAppTemplateCategoryEnum), default=WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION, nullable=False)
    language = Column(String(20), default="en_US", nullable=False)
    provider_template_id = Column(String(100), nullable=True)
    header_type = Column(String(20), default="NONE")
    header_text = Column(String(255), nullable=True)
    body_text = Column(Text, nullable=False)
    footer_text = Column(String(255), default="Reply STOP to unsubscribe.")
    buttons = Column(JSON, default=list)
    variables = Column(JSON, default=list)
    status = Column(SQLEnum(WhatsAppTemplateStatusEnum), default=WhatsAppTemplateStatusEnum.APPROVED, nullable=False)
    version = Column(Integer, default=1)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    campaigns = relationship("WhatsAppCampaign", back_populates="template")

class WhatsAppCampaign(Base):
    __tablename__ = "whatsapp_campaigns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    campaign_name = Column(String(255), nullable=False)
    campaign_type = Column(SQLEnum(WhatsAppCampaignTypeEnum), default=WhatsAppCampaignTypeEnum.NEW_JOB_OPPORTUNITY, nullable=False)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    job_title = Column(String(255), nullable=True)
    template_id = Column(String(36), ForeignKey("whatsapp_templates.id", ondelete="RESTRICT"), nullable=False)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_audience_type = Column(String(50), default="BENCH")
    status = Column(SQLEnum(WhatsAppCampaignStatusEnum), default=WhatsAppCampaignStatusEnum.DRAFT, nullable=False)
    scheduled_date = Column(DateTime, nullable=True)
    time_zone = Column(String(50), default="Asia/Kolkata")
    
    # Counts & Metrics
    total_recipients = Column(Integer, default=0)
    eligible_count = Column(Integer, default=0)
    excluded_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    read_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    opted_out_count = Column(Integer, default=0)

    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    requirement = relationship("JobRequirement", back_populates="campaigns")
    client = relationship("Client")
    template = relationship("WhatsAppTemplate", back_populates="campaigns")
    recruiter = relationship("User", foreign_keys=[recruiter_id], back_populates="campaigns")
    created_by = relationship("User", foreign_keys=[created_by_id])
    recipients = relationship("WhatsAppCampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")
    messages = relationship("WhatsAppMessage", back_populates="campaign")

class WhatsAppCampaignRecipient(Base):
    __tablename__ = "whatsapp_campaign_recipients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    campaign_id = Column(String(36), ForeignKey("whatsapp_campaigns.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    whatsapp_number = Column(String(50), nullable=False)
    eligibility_status = Column(SQLEnum(WhatsAppRecipientEligibilityEnum), default=WhatsAppRecipientEligibilityEnum.ELIGIBLE, nullable=False)
    exclusion_reason = Column(String(255), nullable=True)
    consent_snapshot = Column(String(100), nullable=True)
    message_status = Column(SQLEnum(WhatsAppMessageStatusEnum), default=WhatsAppMessageStatusEnum.QUEUED, nullable=False)
    provider_message_id = Column(String(100), nullable=True, index=True)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    campaign = relationship("WhatsAppCampaign", back_populates="recipients")
    candidate = relationship("Candidate", back_populates="campaign_recipients")

class WhatsAppConversation(Base):
    __tablename__ = "whatsapp_conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    recruiter_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requirement_id = Column(String(36), ForeignKey("job_requirements.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(WhatsAppConversationStatusEnum), default=WhatsAppConversationStatusEnum.OPEN, nullable=False)
    response_category = Column(SQLEnum(WhatsAppResponseCategoryEnum), default=WhatsAppResponseCategoryEnum.OTHER, nullable=False)
    last_message_text = Column(Text, nullable=True)
    last_message_date = Column(DateTime, default=utc_now, nullable=False)
    last_incoming_date = Column(DateTime, nullable=True)
    unread_count = Column(Integer, default=0)
    internal_notes = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    is_automation_disabled = Column(Boolean, default=False)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    candidate = relationship("Candidate", back_populates="conversations")
    recruiter = relationship("User", back_populates="conversations")
    requirement = relationship("JobRequirement")
    messages = relationship("WhatsAppMessage", back_populates="conversation", cascade="all, delete-orphan")

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(String(36), ForeignKey("whatsapp_campaigns.id", ondelete="SET NULL"), nullable=True)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    direction = Column(SQLEnum(WhatsAppMessageDirectionEnum), nullable=False)
    message_type = Column(SQLEnum(WhatsAppMessageTypeEnum), default=WhatsAppMessageTypeEnum.TEXT, nullable=False)
    template_id = Column(String(36), ForeignKey("whatsapp_templates.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    attachment_name = Column(String(255), nullable=True)
    attachment_url = Column(String(500), nullable=True)
    attachment_mime = Column(String(100), nullable=True)
    attachment_size = Column(Integer, default=0)
    provider_message_id = Column(String(100), index=True, nullable=True)
    status = Column(SQLEnum(WhatsAppMessageStatusEnum), default=WhatsAppMessageStatusEnum.SENT, nullable=False)
    sent_at = Column(DateTime, default=utc_now)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(String(255), nullable=True)
    is_automated_response = Column(Boolean, default=False)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    conversation = relationship("WhatsAppConversation", back_populates="messages")
    campaign = relationship("WhatsAppCampaign", back_populates="messages")
    candidate = relationship("Candidate", back_populates="messages")
    sender = relationship("User")
    template = relationship("WhatsAppTemplate")

class WhatsAppConsent(Base):
    __tablename__ = "whatsapp_consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    whatsapp_number = Column(String(50), nullable=False)
    consent_status = Column(SQLEnum(WhatsAppConsentStatusEnum), default=WhatsAppConsentStatusEnum.GRANTED, nullable=False)
    consent_source = Column(String(100), default="Direct Recruiter Outreach", nullable=False)
    consent_text_version = Column(String(50), default="v1.0", nullable=False)
    recorded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evidence_reference = Column(String(255), nullable=True)
    revoked_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    candidate = relationship("Candidate", back_populates="consents")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    revoked_by = relationship("User", foreign_keys=[revoked_by_id])

class WhatsAppOptOut(Base):
    __tablename__ = "whatsapp_opt_outs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True)
    whatsapp_number = Column(String(50), unique=True, index=True, nullable=False)
    opt_out_source = Column(String(100), default="INCOMING_KEYWORD_STOP")
    reason = Column(String(255), default="Candidate sent STOP keyword")
    recorded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    candidate = relationship("Candidate", back_populates="opt_out_record")
    recorded_by = relationship("User")

class WhatsAppWebhookEvent(Base):
    __tablename__ = "whatsapp_webhook_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), default="OFFICIAL_CLOUD_API")
    provider_event_id = Column(String(150), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(50), default="PROCESSED")
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    processed_at = Column(DateTime, default=utc_now, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True, index=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(100), default="127.0.0.1")
    user_agent = Column(String(500), default="Web Browser")
    remarks = Column(Text, nullable=True)
    campaign_id = Column(String(36), nullable=True)
    message_id = Column(String(36), nullable=True)
    provider_ref_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

# Indexes
Index("ix_candidate_status_hist_cand_created", CandidateStatusHistory.candidate_id, CandidateStatusHistory.created_at)
Index("ix_cv_submission_client_status", CVSubmission.client_id, CVSubmission.status)
Index("ix_recruiter_activity_date", RecruiterActivity.recruiter_id, RecruiterActivity.created_at)
Index("ix_whatsapp_messages_conv_date", WhatsAppMessage.conversation_id, WhatsAppMessage.created_at)
Index("ix_whatsapp_campaign_recip_status", WhatsAppCampaignRecipient.campaign_id, WhatsAppCampaignRecipient.message_status)
Index("ix_bench_resources_status", BenchResource.bench_status)
Index("ix_audit_logs_action_date", AuditLog.action, AuditLog.created_at)
