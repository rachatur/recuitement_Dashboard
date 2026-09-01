from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from app.models import (
    RoleEnum, ClientStatusEnum, WorkModeEnum, PriorityEnum, RequirementStatusEnum,
    PositionStatusEnum, CandidateStatusEnum, BenchStatusEnum, SubmissionStatusEnum,
    InterviewTypeEnum, InterviewStatusEnum, ClientFeedbackDecisionEnum, OfferStatusEnum,
    JoiningStatusEnum, NotificationTypeEnum, WhatsAppConsentStatusEnum,
    WhatsAppCampaignTypeEnum, WhatsAppCampaignStatusEnum, WhatsAppMessageStatusEnum,
    WhatsAppMessageDirectionEnum, WhatsAppMessageTypeEnum, WhatsAppTemplateCategoryEnum,
    WhatsAppTemplateStatusEnum, WhatsAppConversationStatusEnum, WhatsAppResponseCategoryEnum,
    WhatsAppRecipientEligibilityEnum
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
    open_positions_count: int = 0
    active_submissions_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClientDetailResponse(ClientResponse):
    contacts: List[ClientContactResponse] = []
    requirements_count: int = 0
    submissions_count: int = 0

# ----------------- REQUIREMENTS & POSITION TRACKING -----------------

class RequirementDocumentResponse(BaseModel):
    id: str
    requirement_id: str
    file_name: str
    file_type: str = "Job_Description"
    file_size: int = 0
    mime_type: str = "application/pdf"
    file_url: str
    uploaded_by_id: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

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
    open_date: Optional[datetime] = None
    hold_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    target_closing_date: Optional[datetime] = None
    status_updated_at: Optional[datetime] = None
    assigned_recruiter_id: Optional[str] = None
    status: RequirementStatusEnum = RequirementStatusEnum.OPEN
    position_status: PositionStatusEnum = PositionStatusEnum.OPEN
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
    open_date: Optional[datetime] = None
    hold_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    target_closing_date: Optional[datetime] = None
    status_updated_at: Optional[datetime] = None
    assigned_recruiter_id: Optional[str] = None
    status: Optional[RequirementStatusEnum] = None
    position_status: Optional[PositionStatusEnum] = None
    job_description: Optional[str] = None

class PositionStatusUpdateRequest(BaseModel):
    position_status: PositionStatusEnum
    remarks: Optional[str] = None

class RequirementResponse(RequirementBase):
    id: str
    req_code: str
    client_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    filled_count: int = 0
    candidates_count: int = 0
    jd_attachment_name: Optional[str] = None
    jd_attachment_url: Optional[str] = None
    jd_attachment_size: int = 0
    jd_attachment_mime: Optional[str] = "application/pdf"
    related_campaigns_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- CANDIDATES & CV -----------------

class CandidateDocumentResponse(BaseModel):
    id: str
    candidate_id: str
    version_number: int
    document_type: str = "Resume"
    file_name: str
    file_size: int
    mime_type: str
    file_url: str
    uploaded_by_id: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateStatusUpdateRequest(BaseModel):
    status: str
    remarks: Optional[str] = None
    requirement_id: Optional[str] = None

class CandidateStatusHistoryResponse(BaseModel):
    id: str
    candidate_id: str
    old_status: Optional[str] = None
    new_status: str
    stage_duration_hours: float = 0.0
    remarks: Optional[str] = None
    changed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateStatusSummaryCounts(BaseModel):
    selected: int = 0
    rejected: int = 0
    on_hold: int = 0
    in_interview: int = 0
    pending: int = 0
    other: int = 0
    total_candidates: int = 0
    total_transitions: int = 0
    by_status: Dict[str, int] = {}

class CandidateStatusHistoryFeedItem(BaseModel):
    id: str
    candidate_id: str
    candidate_code: str
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    candidate_current_company: Optional[str] = None
    candidate_current_designation: Optional[str] = None
    old_status: Optional[str] = None
    new_status: str
    stage_duration_hours: float = 0.0
    stage_duration_display: str = ""
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    client_name: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    created_at_formatted: str = ""

class CandidateHistoryLifecycleItem(BaseModel):
    candidate_id: str
    candidate_code: str
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    candidate_current_company: Optional[str] = None
    candidate_current_designation: Optional[str] = None
    current_status: str
    status_category: str  # "SELECTED", "REJECTED", "ON_HOLD", "IN_INTERVIEW", "PENDING", "OTHER"
    transitions_count: int = 0
    total_pipeline_days: float = 0.0
    initial_date: datetime
    latest_date: datetime
    latest_remarks: Optional[str] = None
    latest_changed_by: Optional[str] = None
    history_events: List[CandidateStatusHistoryFeedItem] = []

class CandidateHistoryPageResponse(BaseModel):
    summary: CandidateStatusSummaryCounts
    feed: List[CandidateStatusHistoryFeedItem]
    candidates: List[CandidateHistoryLifecycleItem]
    total_events: int

class WhatsAppEligibilityInfo(BaseModel):
    is_eligible: bool
    status: str  # "Eligible", "Consent Required", "Opted Out", "Invalid Number", "Blocked"
    whatsapp_number: Optional[str] = None
    country_code: Optional[str] = "+91"
    consent_status: WhatsAppConsentStatusEnum = WhatsAppConsentStatusEnum.NOT_COLLECTED
    opt_out_status: bool = False
    reason: Optional[str] = None

class EmploymentGapItem(BaseModel):
    start_date: str
    end_date: str
    gap_months: int
    previous_company: Optional[str] = None
    next_company: Optional[str] = None
    gap_reason: Optional[str] = None

class EmploymentHistoryItem(BaseModel):
    id: Optional[str] = None
    company_name: str
    designation: Optional[str] = None
    start_date: Optional[str] = None  # Joining date (e.g. "2021-01" or "Jan 2021")
    end_date: Optional[str] = None    # Leaving date (e.g. "2022-03" or "Present")
    duration_years: Optional[float] = None
    duration_months: Optional[int] = None
    is_current: bool = False
    location: Optional[str] = None
    description: Optional[str] = None
    reason_for_leaving: Optional[str] = None  # Candidate provided reason for departure

class JobStabilityMetrics(BaseModel):
    total_experience_years: float = 0.0
    companies_count: int = 0
    average_tenure_years: float = 0.0
    average_tenure_months: int = 0
    job_changes_recent_years: int = 0
    job_changes_summary: str = ""
    summary_headline: str = ""
    stability_rating: str = "STABLE"  # "HIGH_RETENTION", "STABLE", "MODERATE", "FREQUENT_CHANGER", "REVIEW_RECOMMENDED"
    stability_score: int = 80         # 0 - 100
    stability_label: str = "Standard Career Progression"
    stability_indicator: str = "STABLE"
    hr_review_required: bool = False
    short_stints_count: int = 0       # stints < 12 months
    longest_tenure_years: float = 0.0
    total_gaps_count: int = 0
    total_gap_months: int = 0
    employment_gaps: List[EmploymentGapItem] = []
    factual_observations: List[str] = []
    hr_evaluation_notes: Optional[str] = None
    retention_risk_level: str = "LOW" # "LOW", "MEDIUM", "HIGH"
    risk_reasons: List[str] = []

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    total_experience: float = 0.0
    relevant_experience: float = 0.0
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    employment_history: List[EmploymentHistoryItem] = []
    notice_period_days: int = 30
    notice_period: Optional[str] = "30 Days"
    skills: List[str] = []
    technical_skills: List[str] = []
    education: Optional[str] = None
    highest_qualification: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    certifications: List[str] = []
    date_of_birth: Optional[str] = None
    source: str = "Direct"
    recruiter_id: Optional[str] = None
    status: CandidateStatusEnum = CandidateStatusEnum.RECEIVED
    
    # WhatsApp fields
    whatsapp_number: Optional[str] = None
    country_code: Optional[str] = "+91"
    is_whatsapp_verified: bool = False
    whatsapp_consent_status: WhatsAppConsentStatusEnum = WhatsAppConsentStatusEnum.NOT_COLLECTED
    whatsapp_consent_source: Optional[str] = None
    whatsapp_consent_date: Optional[datetime] = None
    whatsapp_consent_evidence: Optional[str] = None
    whatsapp_opt_out_status: bool = False
    preferred_language: str = "en"
    preferred_contact_time: Optional[str] = None
    do_not_contact_reason: Optional[str] = None
    
    # Bench fields
    bench_status: BenchStatusEnum = BenchStatusEnum.NOT_ON_BENCH
    bench_availability_date: Optional[datetime] = None
    bench_primary_skills: List[str] = []
    bench_secondary_skills: List[str] = []

class CandidateCreate(CandidateBase):
    cv_document_id: Optional[str] = None

class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    total_experience: Optional[float] = None
    relevant_experience: Optional[float] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    employment_history: Optional[List[EmploymentHistoryItem]] = None
    notice_period_days: Optional[int] = None
    notice_period: Optional[str] = None
    skills: Optional[List[str]] = None
    technical_skills: Optional[List[str]] = None
    education: Optional[str] = None
    highest_qualification: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    certifications: Optional[List[str]] = None
    date_of_birth: Optional[str] = None
    source: Optional[str] = None
    recruiter_id: Optional[str] = None
    status: Optional[CandidateStatusEnum] = None
    whatsapp_number: Optional[str] = None
    country_code: Optional[str] = None
    is_whatsapp_verified: Optional[bool] = None
    whatsapp_consent_status: Optional[WhatsAppConsentStatusEnum] = None
    whatsapp_consent_source: Optional[str] = None
    whatsapp_consent_date: Optional[datetime] = None
    whatsapp_consent_evidence: Optional[str] = None
    whatsapp_opt_out_status: Optional[bool] = None
    preferred_language: Optional[str] = None
    preferred_contact_time: Optional[str] = None
    do_not_contact_reason: Optional[str] = None
    remarks: Optional[str] = None
    bench_status: Optional[BenchStatusEnum] = None
    bench_availability_date: Optional[datetime] = None
    bench_primary_skills: Optional[List[str]] = None
    bench_secondary_skills: Optional[List[str]] = None

class CandidateStatusUpdateRequest(BaseModel):
    status: CandidateStatusEnum
    remarks: Optional[str] = None
    submission_id: Optional[str] = None
    requirement_id: Optional[str] = None

class CandidateResponse(CandidateBase):
    id: str
    candidate_code: str
    recruiter_name: Optional[str] = None
    active_submissions_count: int = 0
    latest_document: Optional[CandidateDocumentResponse] = None
    whatsapp_eligibility: Optional[WhatsAppEligibilityInfo] = None
    last_whatsapp_contact_date: Optional[datetime] = None
    last_whatsapp_response_date: Optional[datetime] = None
    last_whatsapp_message_status: Optional[str] = None
    stability_metrics: Optional[JobStabilityMetrics] = None
    companies_count: int = 0
    average_tenure_years: float = 0.0
    stability_rating: str = "STABLE"
    stability_label: str = "Stable Retention"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CandidateSubmissionItem(BaseModel):
    id: str
    submission_code: str
    client_id: str
    client_name: Optional[str] = None
    requirement_id: str
    requirement_title: Optional[str] = None
    document_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    submission_date: datetime
    status: str
    remarks: Optional[str] = None
    client_viewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateInterviewItem(BaseModel):
    id: str
    client_name: Optional[str] = None
    requirement_title: Optional[str] = None
    round_number: int = 1
    round_name: str = "Round 1"
    interview_type: str = "VIRTUAL"
    interview_date: datetime
    interviewer_name: Optional[str] = None
    status: str = "SCHEDULED"
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class BatchCVSubmissionCreate(BaseModel):
    candidate_ids: List[str]
    requirement_id: str
    remarks: Optional[str] = None

class BulkDeleteCandidatesRequest(BaseModel):
    candidate_ids: List[str]

class BulkDeleteCandidatesResponse(BaseModel):
    message: str
    deleted_count: int
    deleted_ids: List[str]

class CandidateDetailResponse(CandidateResponse):
    documents: List[CandidateDocumentResponse] = []
    status_history: List[CandidateStatusHistoryResponse] = []
    submissions: List[CandidateSubmissionItem] = []
    interviews: List[CandidateInterviewItem] = []
    submissions_count: int = 0
    interviews_count: int = 0
    offers_count: int = 0
    conversations_count: int = 0

# --- CV Extraction & Bulk Upload Schemas ---

class CVExtractionResponse(BaseModel):
    file_name: str
    file_size: int
    mime_type: str
    temp_file_id: Optional[str] = None
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    alternate_phone: Optional[str] = ""
    whatsapp_number: Optional[str] = ""
    country_code: Optional[str] = "+91"
    location: Optional[str] = ""
    preferred_location: Optional[str] = ""
    total_experience: Optional[float] = 0.0
    relevant_experience: Optional[float] = 0.0
    current_company: Optional[str] = ""
    current_designation: Optional[str] = ""
    skills: List[str] = []
    technical_skills: List[str] = []
    education: Optional[str] = ""
    highest_qualification: Optional[str] = ""
    notice_period: Optional[str] = ""
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    linkedin_url: Optional[str] = ""
    github_url: Optional[str] = ""
    certifications: List[str] = []
    date_of_birth: Optional[str] = ""
    summary: Optional[str] = ""
    whatsapp_eligibility: WhatsAppEligibilityInfo
    is_duplicate: bool = False
    duplicate_candidate_id: Optional[str] = None
    duplicate_match_field: Optional[str] = None

class BulkCVProcessItem(BaseModel):
    file_name: str
    status: str  # "Completed", "Failed", "Duplicate", "Skipped"
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_eligibility: str
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None
    error_message: Optional[str] = None
    retry_available: bool = False

class BulkCVUploadSummaryResponse(BaseModel):
    total_uploaded: int
    successfully_processed: int
    failed_count: int
    duplicates_detected: int
    new_candidates_created: int
    whatsapp_eligible_count: int
    consent_required_count: int
    invalid_numbers_count: int
    items: List[BulkCVProcessItem]

# ----------------- BENCH SECTION SCHEMAS -----------------

class BenchCandidateResponse(BaseModel):
    candidate_id: str
    candidate_code: str
    full_name: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    total_experience: float
    relevant_experience: float
    current_company: Optional[str] = None
    designation: Optional[str] = None
    primary_skills: List[str] = []
    secondary_skills: List[str] = []
    notice_period: Optional[str] = None
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    bench_status: BenchStatusEnum
    availability_date: Optional[datetime] = None
    assigned_requirement_id: Optional[str] = None
    assigned_requirement_code: Optional[str] = None
    assigned_requirement_title: Optional[str] = None
    recruiter_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    whatsapp_eligibility: WhatsAppEligibilityInfo
    whatsapp_consent_status: WhatsAppConsentStatusEnum
    last_outreach_date: Optional[datetime] = None
    last_updated: datetime
    resume_file_name: Optional[str] = None
    resume_download_url: Optional[str] = None

class BenchStatusUpdateRequest(BaseModel):
    bench_status: BenchStatusEnum
    availability_date: Optional[datetime] = None
    assigned_requirement_id: Optional[str] = None
    notes: Optional[str] = None

class RequirementMatchCandidateResponse(BaseModel):
    candidate: BenchCandidateResponse
    match_percentage: int
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    experience_fit: str
    recommendation: str
    whatsapp_eligible: bool

class RequirementMatchResultResponse(BaseModel):
    requirement_id: str
    requirement_code: str
    job_title: str
    client_name: Optional[str] = None
    required_skills: List[str] = []
    total_candidates_evaluated: int
    matched_candidates: List[RequirementMatchCandidateResponse]

# ----------------- WHATSAPP INTEGRATION & SETTINGS -----------------

class WhatsAppIntegrationSettings(BaseModel):
    provider: str = "MOCK_SIMULATOR"
    business_account_id: str = "WABA_1092837482910"
    phone_number_id: str = "PHONE_919876543210"
    api_base_url: str = "https://graph.facebook.com/v20.0"
    access_token: Optional[str] = None
    webhook_url: str = "/api/v1/whatsapp/webhook"
    webhook_verify_token: str = "recruitflow_verify_token_secure_2026"
    default_country_code: str = "+91"
    message_limit_per_day: int = 1000
    rate_limit_per_second: int = 20
    business_hours_start: str = "09:00"
    business_hours_end: str = "19:00"
    retry_policy_max_retries: int = 3
    default_recruiter_signature: str = "— Talent Acquisition Team, RecruitFlow"
    is_connected: bool = True
    connection_status: str = "Connected"
    last_test_date: Optional[datetime] = None

class WhatsAppIntegrationUpdate(BaseModel):
    provider: Optional[str] = None
    business_account_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    api_base_url: Optional[str] = None
    access_token: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    default_country_code: Optional[str] = None
    message_limit_per_day: Optional[int] = None
    rate_limit_per_second: Optional[int] = None
    business_hours_start: Optional[str] = None
    business_hours_end: Optional[str] = None
    retry_policy_max_retries: Optional[int] = None
    default_recruiter_signature: Optional[str] = None

class WhatsAppTestConnectionResponse(BaseModel):
    success: bool
    provider: str
    connection_status: str
    latency_ms: int
    message: str
    checked_at: datetime

# ----------------- WHATSAPP TEMPLATES -----------------

class WhatsAppTemplateBase(BaseModel):
    template_name: str
    category: WhatsAppTemplateCategoryEnum = WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION
    language: str = "en_US"
    provider_template_id: Optional[str] = None
    header_type: str = "NONE"
    header_text: Optional[str] = None
    body_text: str
    footer_text: Optional[str] = "Reply STOP to unsubscribe."
    buttons: List[Dict[str, Any]] = []
    variables: List[str] = []
    status: WhatsAppTemplateStatusEnum = WhatsAppTemplateStatusEnum.APPROVED

class WhatsAppTemplateCreate(WhatsAppTemplateBase):
    pass

class WhatsAppTemplateUpdate(BaseModel):
    category: Optional[WhatsAppTemplateCategoryEnum] = None
    language: Optional[str] = None
    header_type: Optional[str] = None
    header_text: Optional[str] = None
    body_text: Optional[str] = None
    footer_text: Optional[str] = None
    buttons: Optional[List[Dict[str, Any]]] = None
    variables: Optional[List[str]] = None
    status: Optional[WhatsAppTemplateStatusEnum] = None

class WhatsAppTemplateResponse(WhatsAppTemplateBase):
    id: str
    version: int = 1
    created_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- WHATSAPP CAMPAIGNS -----------------

class WhatsAppCampaignCreate(BaseModel):
    campaign_name: str
    campaign_type: WhatsAppCampaignTypeEnum = WhatsAppCampaignTypeEnum.NEW_JOB_OPPORTUNITY
    requirement_id: Optional[str] = None
    template_id: str
    target_audience_type: str = "BENCH"
    candidate_ids: List[str] = []
    scheduled_date: Optional[datetime] = None
    time_zone: str = "Asia/Kolkata"
    require_consent: bool = True

class WhatsAppCampaignUpdate(BaseModel):
    campaign_name: Optional[str] = None
    status: Optional[WhatsAppCampaignStatusEnum] = None
    scheduled_date: Optional[datetime] = None

class WhatsAppCampaignValidationResponse(BaseModel):
    total_selected: int
    eligible_count: int
    excluded_no_consent: int
    excluded_opted_out: int
    excluded_invalid_number: int
    excluded_frequency_limit: int
    eligible_candidate_ids: List[str]
    estimated_message_count: int
    requires_approval: bool = False
    warning_messages: List[str] = []

class WhatsAppCampaignRecipientResponse(BaseModel):
    id: str
    campaign_id: str
    candidate_id: str
    candidate_name: str
    candidate_code: str
    whatsapp_number: str
    eligibility_status: WhatsAppRecipientEligibilityEnum
    exclusion_reason: Optional[str] = None
    message_status: WhatsAppMessageStatusEnum
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None

class WhatsAppCampaignResponse(BaseModel):
    id: str
    campaign_name: str
    campaign_type: WhatsAppCampaignTypeEnum
    requirement_id: Optional[str] = None
    requirement_code: Optional[str] = None
    job_title: Optional[str] = None
    client_name: Optional[str] = None
    template_id: str
    template_name: Optional[str] = None
    recruiter_id: str
    recruiter_name: Optional[str] = None
    status: WhatsAppCampaignStatusEnum
    scheduled_date: Optional[datetime] = None
    time_zone: str = "Asia/Kolkata"
    total_recipients: int = 0
    eligible_count: int = 0
    excluded_count: int = 0
    sent_count: int = 0
    delivered_count: int = 0
    read_count: int = 0
    replied_count: int = 0
    failed_count: int = 0
    opted_out_count: int = 0
    delivery_rate: float = 0.0
    response_rate: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WhatsAppCampaignAnalyticsResponse(BaseModel):
    campaign: WhatsAppCampaignResponse
    recipients: List[WhatsAppCampaignRecipientResponse] = []
    delivery_breakdown: Dict[str, int]
    response_rate_percent: float
    delivery_rate_percent: float
    read_rate_percent: float
    failure_rate_percent: float
    average_response_time_minutes: Optional[float] = None
    interested_count: int = 0
    not_interested_count: int = 0
    interviews_scheduled_count: int = 0

# ----------------- WHATSAPP CONVERSATIONS & MESSAGES -----------------

class WhatsAppMessageCreate(BaseModel):
    candidate_id: str
    content: Optional[str] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, str]] = None
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_mime: Optional[str] = None

class WhatsAppMessageResponse(BaseModel):
    id: str
    conversation_id: str
    candidate_id: str
    candidate_name: Optional[str] = None
    direction: WhatsAppMessageDirectionEnum
    message_type: WhatsAppMessageTypeEnum
    content: str
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None
    status: WhatsAppMessageStatusEnum
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    is_automated_response: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class WhatsAppConversationResponse(BaseModel):
    id: str
    candidate_id: str
    candidate_name: str
    candidate_code: str
    whatsapp_number: str
    assigned_recruiter_id: Optional[str] = None
    assigned_recruiter_name: Optional[str] = None
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    status: WhatsAppConversationStatusEnum
    response_category: WhatsAppResponseCategoryEnum
    last_message_text: Optional[str] = None
    last_message_date: datetime
    last_incoming_date: Optional[datetime] = None
    unread_count: int = 0
    internal_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    is_automation_disabled: bool = False
    opt_out_status: bool = False
    messages: List[WhatsAppMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WhatsAppConversationStatusUpdateRequest(BaseModel):
    status: WhatsAppConversationStatusEnum
    response_category: Optional[WhatsAppResponseCategoryEnum] = None
    internal_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    assigned_recruiter_id: Optional[str] = None

class WhatsAppSimulateReplyRequest(BaseModel):
    candidate_id: str
    message_text: str

# ----------------- CONSENT & OPT-OUT SCHEMAS -----------------

class WhatsAppConsentRecordRequest(BaseModel):
    candidate_id: str
    consent_status: WhatsAppConsentStatusEnum = WhatsAppConsentStatusEnum.GRANTED
    consent_source: str = "Direct Recruiter Outreach"
    consent_text_version: str = "v1.0"
    evidence_reference: Optional[str] = None

class WhatsAppConsentRevokeRequest(BaseModel):
    candidate_id: str
    reason: Optional[str] = "Consent revoked by candidate request"

class WhatsAppConsentResponse(BaseModel):
    id: str
    candidate_id: str
    candidate_name: str
    whatsapp_number: str
    consent_status: WhatsAppConsentStatusEnum
    consent_source: str
    consent_text_version: str
    recorded_by_name: Optional[str] = None
    evidence_reference: Optional[str] = None
    revoked_by_name: Optional[str] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WhatsAppOptOutCreateRequest(BaseModel):
    candidate_id: Optional[str] = None
    whatsapp_number: str
    reason: str = "Manual opt-out recorded by recruiter/admin"
    opt_out_source: str = "MANUAL_ADMIN"

class WhatsAppOptOutResponse(BaseModel):
    id: str
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    whatsapp_number: str
    opt_out_source: str
    reason: str
    recorded_by_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- HISTORY / AUDIT LOG SCHEMAS -----------------

class HistoryLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: Optional[str] = None
    action: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None
    campaign_id: Optional[str] = None
    message_id: Optional[str] = None
    provider_ref_id: Optional[str] = None
    ip_address: str = "127.0.0.1"
    user_agent: str = "Web Browser"
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: str
    entity: str
    entity_id: Optional[str] = None
    action: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: str = "127.0.0.1"
    user_agent: str = "Web Browser"
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- DASHBOARD & OUTREACH METRICS -----------------

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
    conversion_rate: float = 0.0

class TimeSeriesPoint(BaseModel):
    date: str
    candidates_added: int = 0
    cvs_received: int = 0
    cvs_submitted: int = 0
    interviews: int = 0
    interviews_held: int = 0
    selected: int = 0
    offers: int = 0
    joined: int = 0
    wa_sent: int = 0
    wa_replies: int = 0

class ClientPerformanceItem(BaseModel):
    client_id: str
    client_name: str
    requirements_count: int = 0
    open_requirements: int = 0
    cvs_received: int = 0
    cvs_submitted: int = 0
    client_responses: int = 0
    submissions_count: int = 0
    interviews: int = 0
    interviews_count: int = 0
    selections: int = 0
    joined_count: int = 0
    avg_response_time_days: float = 0.0

class RecruiterPerformanceItem(BaseModel):
    recruiter_id: str
    recruiter_name: str
    candidates_added: int = 0
    candidates_screened: int = 0
    submissions_made: int = 0
    cvs_submitted: int = 0
    interviews: int = 0
    interviews_scheduled: int = 0
    selections: int = 0
    offers_made: int = 0
    joining_count: int = 0
    joined_count: int = 0
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
    average_time_to_screen_hours: float = 0.0
    average_time_to_submit_days: float = 0.0
    average_time_to_interview_days: float = 0.0
    average_time_to_hire_days: float = 0.0

class WhatsAppDashboardSummaryResponse(BaseModel):
    total_campaigns: int = 0
    active_campaigns: int = 0
    draft_campaigns: int = 0
    scheduled_campaigns: int = 0
    completed_campaigns: int = 0
    total_recipients: int = 0
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_read: int = 0
    messages_replied: int = 0
    messages_failed: int = 0
    opted_out_count: int = 0
    invalid_numbers_count: int = 0
    delivery_rate_percent: float = 0.0
    response_rate_percent: float = 0.0
    read_rate_percent: float = 0.0
    volume_trend: List[Dict[str, Any]] = []
    delivery_breakdown: Dict[str, int] = {}
    response_categories: Dict[str, int] = {}
    campaign_performances: List[Dict[str, Any]] = []
    opt_out_trends: List[Dict[str, Any]] = []

class DashboardSummaryResponse(BaseModel):
    kpis: Dict[str, Any]
    funnel: List[Dict[str, Any]]
    pipeline_funnel: Optional[List[Dict[str, Any]]] = None
    timeseries: Optional[List[Dict[str, Any]]] = None
    client_performance: Optional[List[Dict[str, Any]]] = None
    recruiter_performance: Optional[List[Dict[str, Any]]] = None
    time_metrics: Optional[Dict[str, Any]] = None
    position_status_distribution: Dict[str, int]
    candidate_status_distribution: Dict[str, int]
    bench_kpis: Dict[str, Any]
    whatsapp_kpis: Dict[str, Any]
    active_clients: List[Dict[str, Any]] = []
    urgent_requirements: List[Dict[str, Any]] = []
    recent_activities: List[Dict[str, Any]] = []
    time_series_trend: List[Dict[str, Any]] = []

# ----------------- SUBMISSION, INTERVIEW, OFFER, FEEDBACK -----------------

class CVSubmissionBase(BaseModel):
    client_id: str
    requirement_id: str
    candidate_id: str
    document_id: str
    recruiter_id: Optional[str] = None
    remarks: Optional[str] = None
    status: SubmissionStatusEnum = SubmissionStatusEnum.SUBMITTED

class CVSubmissionCreate(CVSubmissionBase):
    pass

class CVSubmissionStatusUpdate(BaseModel):
    status: SubmissionStatusEnum
    remarks: Optional[str] = None

class CVSubmissionResponse(CVSubmissionBase):
    id: str
    submission_code: str
    client_name: Optional[str] = None
    requirement_title: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    recruiter_name: Optional[str] = None
    document_file_name: Optional[str] = None
    document_file_url: Optional[str] = None
    submission_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
    round_number: Optional[int] = None
    round_name: Optional[str] = None
    interview_type: Optional[InterviewTypeEnum] = None
    interview_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    interviewer_name: Optional[str] = None
    interviewer_email: Optional[str] = None
    meeting_link: Optional[str] = None
    status: Optional[InterviewStatusEnum] = None
    notes: Optional[str] = None

class InterviewResponse(InterviewBase):
    id: str
    interview_code: str
    candidate_name: Optional[str] = None
    candidate_whatsapp: Optional[str] = None
    requirement_title: Optional[str] = None
    client_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InterviewFeedbackCreate(BaseModel):
    rating: float = 4.0
    technical_score: float = 4.0
    communication_score: float = 4.0
    cultural_fit_score: float = 4.0
    recommendation: str = "Strong Yes"
    detailed_feedback: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None

class InterviewFeedbackResponse(BaseModel):
    id: str
    interview_id: str
    submitted_by_name: Optional[str] = None
    rating: float = 4.0
    technical_score: float = 4.0
    communication_score: float = 4.0
    cultural_fit_score: float = 4.0
    recommendation: str
    detailed_feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ClientFeedbackCreate(BaseModel):
    submission_id: str
    decision: ClientFeedbackDecisionEnum
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    rating: Optional[int] = None

class ClientFeedbackResponse(BaseModel):
    id: str
    submission_id: str
    client_id: str
    user_name: Optional[str] = None
    decision: ClientFeedbackDecisionEnum
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    rating: Optional[int] = None
    feedback_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class OfferBase(BaseModel):
    candidate_id: str
    requirement_id: str
    client_id: str
    submission_id: str
    designation_offered: str = "Software Engineer"
    annual_ctc: float = 100000.0
    variable_pay: float = 0.0
    joining_bonus: float = 0.0
    currency: str = "USD"
    offer_date: datetime
    target_joining_date: datetime
    status: OfferStatusEnum = OfferStatusEnum.DRAFT
    remarks: Optional[str] = None

class OfferCreate(OfferBase):
    pass

class OfferUpdate(BaseModel):
    designation_offered: Optional[str] = None
    annual_ctc: Optional[float] = None
    variable_pay: Optional[float] = None
    joining_bonus: Optional[float] = None
    currency: Optional[str] = None
    target_joining_date: Optional[datetime] = None
    status: Optional[OfferStatusEnum] = None
    remarks: Optional[str] = None

class OfferResponse(OfferBase):
    id: str
    offer_code: str
    candidate_name: Optional[str] = None
    requirement_title: Optional[str] = None
    client_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
    candidate_name: Optional[str] = None
    actual_joining_date: Optional[datetime] = None
    status: JoiningStatusEnum
    employee_code: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

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

# ----------------- AI TOOLS SCHEMAS -----------------

class AIParseResumeRequest(BaseModel):
    document_text: str

class AIParseResumeResponse(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    total_experience: Optional[float] = 0.0
    skills: List[str] = []
    education: Optional[str] = None
    current_designation: Optional[str] = None

class AIMatchScoreRequest(BaseModel):
    candidate_id: str
    requirement_id: str

class AIMatchScoreResponse(BaseModel):
    candidate_id: str
    requirement_id: str
    overall_match_score: int
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    experience_fit: str
    ai_recommendation: str
    summary: str

class ATSRecommendationItem(BaseModel):
    category: str  # "critical" | "improvement" | "strength"
    title: str
    description: str

class ATSCandidateDetails(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    total_experience: Optional[float] = 0.0
    current_company: Optional[str] = ""
    current_designation: Optional[str] = ""
    education: Optional[str] = ""
    highest_qualification: Optional[str] = ""
    skills: List[str] = []
    linkedin_url: Optional[str] = ""
    github_url: Optional[str] = ""
    summary: Optional[str] = ""

class ATSAnalysisResponse(BaseModel):
    overall_score: int
    grade: str
    pass_probability: str
    summary: str
    file_name: Optional[str] = None
    file_size_formatted: Optional[str] = None
    candidate_details: ATSCandidateDetails = ATSCandidateDetails()
    sections_detected: Dict[str, bool] = {}
    category_scores: Dict[str, int] = {}
    category_max_scores: Dict[str, int] = {
        "contact_info": 15,
        "sections": 20,
        "content_impact": 25,
        "skills_keywords": 30,
        "formatting": 10
    }
    contact_info_check: Dict[str, Any] = {}
    formatting_check: Dict[str, Any] = {}
    skills_analysis: Dict[str, Any] = {}
    content_metrics: Dict[str, Any] = {}
    recommendations: List[ATSRecommendationItem] = []
    target_job: Optional[Dict[str, Any]] = None
    temp_file_id: Optional[str] = None

class ATSCreateCandidateRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    location: Optional[str] = None
    total_experience: float = 0.0
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    education: Optional[str] = None
    skills: List[str] = []
    temp_file_id: Optional[str] = None
    source: str = "ATS_CV_Studio"

class AIAssistantMessageItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None

class AIAssistantChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[AIAssistantMessageItem]] = []
    candidate_id: Optional[str] = None
    requirement_id: Optional[str] = None
    mode: Optional[str] = "general"

class AIAssistantChatResponse(BaseModel):
    reply: str
    intent: str
    data: Optional[Dict[str, Any]] = {}
    suggested_prompts: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

