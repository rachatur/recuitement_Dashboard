from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models import (
    RoleEnum, ClientStatusEnum, WorkModeEnum, PriorityEnum, RequirementStatusEnum,
    CandidateStatusEnum, SubmissionStatusEnum, InterviewTypeEnum, InterviewStatusEnum,
    ClientFeedbackDecisionEnum, OfferStatusEnum, JoiningStatusEnum, NotificationTypeEnum
)

# ----------------- AUTH & USER -----------------

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.RECRUITER
    client_id: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    client_id: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- CLIENT -----------------

class ClientContactBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_primary: bool = False

class ClientContactCreate(ClientContactBase):
    pass

class ClientContactResponse(ClientContactBase):
    id: str
    client_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    industry: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    account_manager_id: Optional[str] = None
    status: ClientStatusEnum = ClientStatusEnum.ACTIVE

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    account_manager_id: Optional[str] = None
    status: Optional[ClientStatusEnum] = None

class ClientResponse(ClientBase):
    id: str
    client_code: str
    account_manager_name: Optional[str] = None
    open_requirements_count: int = 0
    total_submissions_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClientDetailResponse(ClientResponse):
    contacts: List[ClientContactResponse] = []
    requirements_count: int = 0
    active_interviews_count: int = 0
    hired_count: int = 0

# ----------------- JOB REQUIREMENT -----------------

class RequirementBase(BaseModel):
    client_id: str
    job_title: str
    department: Optional[str] = None
    required_skills: List[str] = []
    experience_min: float = 0.0
    experience_max: float = 0.0
    education: Optional[str] = None
    location: Optional[str] = None
    work_mode: WorkModeEnum = WorkModeEnum.HYBRID
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"
    openings_count: int = 1
    priority: PriorityEnum = PriorityEnum.MEDIUM
    target_closing_date: Optional[datetime] = None
    assigned_recruiter_id: Optional[str] = None
    status: RequirementStatusEnum = RequirementStatusEnum.OPEN
    job_description: Optional[str] = None

class RequirementCreate(RequirementBase):
    pass

class RequirementUpdate(BaseModel):
    client_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    required_skills: Optional[List[str]] = None
    experience_min: Optional[float] = None
    experience_max: Optional[float] = None
    education: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[WorkModeEnum] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    openings_count: Optional[int] = None
    filled_count: Optional[int] = None
    priority: Optional[PriorityEnum] = None
    target_closing_date: Optional[datetime] = None
    assigned_recruiter_id: Optional[str] = None
    status: Optional[RequirementStatusEnum] = None
    job_description: Optional[str] = None

class RequirementResponse(RequirementBase):
    id: str
    req_code: str
    client_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    filled_count: int = 0
    candidates_count: int = 0
    open_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- CANDIDATE & CV -----------------

class CandidateSkillSchema(BaseModel):
    skill_name: str
    years_experience: float = 1.0
    proficiency_level: str = "Intermediate"

class CandidateDocumentResponse(BaseModel):
    id: str
    candidate_id: str
    version_number: int
    document_type: str
    file_name: str
    file_size: int
    mime_type: str
    file_url: str
    uploaded_by_id: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    total_experience: float = 0.0
    relevant_experience: float = 0.0
    current_company: Optional[str] = None
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    notice_period_days: int = 30
    skills: List[str] = []
    education: Optional[str] = None
    source: str = "Direct"
    recruiter_id: Optional[str] = None
    status: CandidateStatusEnum = CandidateStatusEnum.RECEIVED

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    total_experience: Optional[float] = None
    relevant_experience: Optional[float] = None
    current_company: Optional[str] = None
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    notice_period_days: Optional[int] = None
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    source: Optional[str] = None
    recruiter_id: Optional[str] = None
    status: Optional[CandidateStatusEnum] = None
    remarks: Optional[str] = None  # for timeline logging

class CandidateStatusHistoryResponse(BaseModel):
    id: str
    candidate_id: str
    submission_id: Optional[str] = None
    requirement_id: Optional[str] = None
    old_status: Optional[str] = None
    new_status: str
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    stage_duration_hours: float = 0.0
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateResponse(CandidateBase):
    id: str
    candidate_code: str
    recruiter_name: Optional[str] = None
    active_submission_count: int = 0
    latest_document: Optional[CandidateDocumentResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CandidateDetailResponse(CandidateResponse):
    documents: List[CandidateDocumentResponse] = []
    status_history: List[CandidateStatusHistoryResponse] = []

# ----------------- CV SUBMISSION -----------------

class CVSubmissionCreate(BaseModel):
    client_id: str
    requirement_id: str
    candidate_id: str
    document_id: str  # specific version
    recruiter_id: Optional[str] = None
    remarks: Optional[str] = None

class CVSubmissionStatusUpdate(BaseModel):
    status: SubmissionStatusEnum
    remarks: Optional[str] = None

class CVSubmissionResponse(BaseModel):
    id: str
    submission_code: str
    client_id: str
    client_name: Optional[str] = None
    requirement_id: str
    requirement_title: Optional[str] = None
    candidate_id: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    document_id: str
    document_version: Optional[int] = 1
    document_url: Optional[str] = None
    recruiter_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    submission_date: datetime
    remarks: Optional[str] = None
    status: SubmissionStatusEnum
    client_viewed_at: Optional[datetime] = None
    feedback_requested_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- INTERVIEW -----------------

class InterviewBase(BaseModel):
    candidate_id: str
    requirement_id: str
    client_id: str
    submission_id: Optional[str] = None
    round_number: int = 1
    round_name: str = "Technical Round 1"
    interview_type: InterviewTypeEnum = InterviewTypeEnum.VIRTUAL
    interview_date: datetime
    duration_minutes: int = 45
    interviewer_name: Optional[str] = None
    interviewer_email: Optional[str] = None
    meeting_link: Optional[str] = None
    status: InterviewStatusEnum = InterviewStatusEnum.SCHEDULED
    notes: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(BaseModel):
    round_name: Optional[str] = None
    interview_type: Optional[InterviewTypeEnum] = None
    interview_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    interviewer_name: Optional[str] = None
    interviewer_email: Optional[str] = None
    meeting_link: Optional[str] = None
    status: Optional[InterviewStatusEnum] = None
    notes: Optional[str] = None

class InterviewFeedbackCreate(BaseModel):
    interview_id: str
    rating: float = 4.0
    technical_score: float = 4.0
    communication_score: float = 4.0
    cultural_fit_score: float = 4.0
    recommendation: str = "Strong Yes"
    detailed_feedback: Optional[str] = None

class InterviewFeedbackResponse(BaseModel):
    id: str
    interview_id: str
    submitted_by_id: Optional[str] = None
    submitted_by_name: Optional[str] = None
    rating: float
    technical_score: float
    communication_score: float
    cultural_fit_score: float
    recommendation: str
    detailed_feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InterviewResponse(InterviewBase):
    id: str
    interview_code: str
    candidate_name: Optional[str] = None
    requirement_title: Optional[str] = None
    client_name: Optional[str] = None
    feedbacks: List[InterviewFeedbackResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- CLIENT FEEDBACK -----------------

class ClientFeedbackCreate(BaseModel):
    submission_id: str
    decision: ClientFeedbackDecisionEnum
    rating: float = 4.0
    comments: Optional[str] = None

class ClientFeedbackResponse(BaseModel):
    id: str
    submission_id: str
    client_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    decision: ClientFeedbackDecisionEnum
    rating: float
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- OFFER & JOINING -----------------

class OfferBase(BaseModel):
    candidate_id: str
    requirement_id: str
    client_id: str
    submission_id: str
    offered_ctc: float
    joining_bonus: float = 0.0
    currency: str = "USD"
    offer_date: datetime = Field(default_factory=datetime.utcnow)
    target_joining_date: datetime
    validity_date: Optional[datetime] = None
    status: OfferStatusEnum = OfferStatusEnum.RELEASED
    decline_reason: Optional[str] = None
    document_url: Optional[str] = None

class OfferCreate(OfferBase):
    pass

class OfferUpdate(BaseModel):
    status: Optional[OfferStatusEnum] = None
    decline_reason: Optional[str] = None
    target_joining_date: Optional[datetime] = None
    document_url: Optional[str] = None

class JoiningDetailCreate(BaseModel):
    offer_id: str
    candidate_id: str
    actual_joining_date: Optional[datetime] = None
    status: JoiningStatusEnum = JoiningStatusEnum.JOINED
    employee_code: Optional[str] = None
    remarks: Optional[str] = None

class JoiningDetailResponse(BaseModel):
    id: str
    offer_id: str
    candidate_id: str
    actual_joining_date: Optional[datetime] = None
    status: JoiningStatusEnum
    employee_code: Optional[str] = None
    remarks: Optional[str] = None
    verified_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OfferResponse(OfferBase):
    id: str
    candidate_name: Optional[str] = None
    client_name: Optional[str] = None
    requirement_title: Optional[str] = None
    joining_detail: Optional[JoiningDetailResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- NOTIFICATIONS -----------------

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: NotificationTypeEnum
    is_read: bool
    reference_entity: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- AUDIT LOGS -----------------

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: str
    user_agent: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- DASHBOARD & ANALYTICS -----------------

class KPICards(BaseModel):
    open_requirements: int = 0
    total_candidates: int = 0
    cvs_received: int = 0
    cvs_screened: int = 0
    cvs_submitted: int = 0
    client_responses: int = 0
    interviews: int = 0
    selected: int = 0
    offers: int = 0
    joined: int = 0

class PipelineFunnelStage(BaseModel):
    stage: str
    count: int
    conversion_rate: float  # percentage

class TimeSeriesPoint(BaseModel):
    date: str
    candidates_added: int = 0
    cvs_submitted: int = 0
    interviews_held: int = 0
    selected: int = 0
    offers: int = 0
    joined: int = 0

class ClientPerformanceItem(BaseModel):
    client_id: str
    client_name: str
    open_requirements: int = 0
    cvs_received: int = 0
    cvs_submitted: int = 0
    client_responses: int = 0
    interviews: int = 0
    selections: int = 0
    avg_response_time_days: float = 0.0

class RecruiterPerformanceItem(BaseModel):
    recruiter_id: str
    recruiter_name: str
    candidates_added: int = 0
    candidates_screened: int = 0
    cvs_submitted: int = 0
    interviews: int = 0
    selections: int = 0
    joining_count: int = 0
    avg_submission_time_hours: float = 0.0

class TimeMetricsResponse(BaseModel):
    time_to_screen_hours: float = 0.0
    time_to_shortlist_hours: float = 0.0
    time_to_submit_hours: float = 0.0
    client_response_time_days: float = 0.0
    time_to_interview_days: float = 0.0
    time_in_stage_avg_days: float = 0.0
    time_to_offer_days: float = 0.0
    time_to_hire_days: float = 0.0
    time_to_fill_requirement_days: float = 0.0

class DashboardSummaryResponse(BaseModel):
    kpis: KPICards
    pipeline_funnel: List[PipelineFunnelStage]
    timeseries: List[TimeSeriesPoint]
    client_performance: List[ClientPerformanceItem]
    recruiter_performance: List[RecruiterPerformanceItem]
    time_metrics: TimeMetricsResponse

# ----------------- AI READINESS SCHEMAS -----------------

class AIParseResumeRequest(BaseModel):
    document_text: str

class AIParseResumeResponse(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    total_experience: float
    skills: List[str]
    education: str
    summary: str

class AIMatchScoreRequest(BaseModel):
    candidate_id: str
    requirement_id: str

class AIMatchScoreResponse(BaseModel):
    candidate_id: str
    requirement_id: str
    overall_match_score: int  # 0 - 100
    matched_skills: List[str]
    missing_skills: List[str]
    experience_fit: str  # Underqualified, Perfect Fit, Overqualified
    ai_recommendation: str
    summary: str
