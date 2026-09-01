export type Role =
  | 'SUPER_ADMIN'
  | 'HR_RECRUITER'
  | 'ADMIN'
  | 'RECRUITER'
  | 'TEAM_LEAD'
  | 'CLIENT'
  | 'HIRING_MANAGER'
  | 'VIEWER';

export type CandidateStatus =
  | 'RECEIVED'
  | 'SCREENED'
  | 'SHORTLISTED'
  | 'SUBMITTED'
  | 'CLIENT_REVIEW'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFER'
  | 'JOINED'
  | 'REJECTED'
  | 'ON_HOLD';

export type PositionStatus = 'OPEN' | 'ON_HOLD' | 'CLOSED';

export type BenchStatus =
  | 'AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'ALLOCATED'
  | 'INTERVIEWING'
  | 'ON_HOLD'
  | 'RELEASED'
  | 'JOINED'
  | 'NOT_ON_BENCH';

export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CLIENT_VIEWED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFER'
  | 'JOINED';

export type RequirementStatus =
  | 'OPEN'
  | 'ON_HOLD'
  | 'PARTIALLY_FILLED'
  | 'CLOSED'
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';

export type WhatsAppConsentStatus =
  | 'NOT_COLLECTED'
  | 'PENDING'
  | 'GRANTED'
  | 'REVOKED'
  | 'OPTED_OUT'
  | 'INVALID_NUMBER'
  | 'BLOCKED'
  | 'UNAVAILABLE';

export type WhatsAppCampaignType =
  | 'NEW_JOB_OPPORTUNITY'
  | 'INTERVIEW_SCHEDULE'
  | 'DOCUMENT_COLLECTION'
  | 'OFFER_FOLLOW_UP'
  | 'BENCH_OUTREACH'
  | 'RE_ENGAGEMENT';

export type WhatsAppCampaignStatus =
  | 'DRAFT'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'SENDING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type WhatsAppMessageStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'REPLIED'
  | 'FAILED'
  | 'OPTED_OUT'
  | 'SUPPRESSED';

export type WhatsAppConversationStatus =
  | 'OPEN'
  | 'AWAITING_CANDIDATE'
  | 'AWAITING_RECRUITER'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'OPTED_OUT'
  | 'CLOSED';

export type WhatsAppResponseCategory =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'NEED_MORE_INFORMATION'
  | 'SALARY_EXPECTATION_MISMATCH'
  | 'LOCATION_UNSUITABLE'
  | 'AVAILABLE_FOR_INTERVIEW'
  | 'CALL_ME'
  | 'ALREADY_OFFERED'
  | 'OPT_OUT'
  | 'OTHER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  client_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  client_code: string;
  name: string;
  industry?: string | null;
  location?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  account_manager_id?: string | null;
  account_manager_name?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'PROSPECT';
  open_requirements_count?: number;
  open_positions_count?: number;
  total_submissions_count?: number;
  active_submissions_count?: number;
  contacts?: ClientContact[];
  requirements_count?: number;
  active_interviews_count?: number;
  hired_count?: number;
  created_at: string;
  updated_at: string;
}

export interface JobRequirement {
  id: string;
  req_code: string;
  client_id: string;
  client_name?: string | null;
  job_title: string;
  department?: string | null;
  required_skills: string[];
  experience_min: number;
  experience_max: number;
  education?: string | null;
  location?: string | null;
  work_mode: WorkMode;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  openings_count: number;
  filled_count: number;
  priority: Priority;
  open_date: string;
  hold_date?: string | null;
  closed_date?: string | null;
  target_closing_date?: string | null;
  status_updated_at?: string | null;
  assigned_recruiter_id?: string | null;
  recruiter_name?: string | null;
  status: RequirementStatus;
  position_status: PositionStatus;
  job_description?: string | null;
  jd_attachment_name?: string | null;
  jd_attachment_url?: string | null;
  jd_attachment_size?: number;
  jd_attachment_mime?: string;
  candidates_count?: number;
  related_campaigns_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  version_number: number;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  uploaded_by_id?: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}

export interface CandidateStatusHistory {
  id: string;
  candidate_id: string;
  submission_id?: string | null;
  requirement_id?: string | null;
  old_status?: string | null;
  new_status: string;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  stage_duration_hours: number;
  remarks?: string | null;
  created_at: string;
}

export interface WhatsAppEligibilityInfo {
  is_eligible: boolean;
  status: string; // 'Eligible' | 'Consent Required' | 'Opted Out' | 'Invalid Number' | 'Blocked'
  whatsapp_number?: string | null;
  country_code?: string | null;
  consent_status: WhatsAppConsentStatus;
  opt_out_status: boolean;
  reason?: string | null;
}

export interface EmploymentGapItem {
  start_date: string;
  end_date: string;
  gap_months: number;
  previous_company?: string | null;
  next_company?: string | null;
  gap_reason?: string | null;
}

export interface EmploymentHistoryItem {
  id?: string | null;
  company_name: string;
  designation?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_years?: number | null;
  duration_months?: number | null;
  is_current?: boolean;
  location?: string | null;
  description?: string | null;
  reason_for_leaving?: string | null;
}

export interface JobStabilityMetrics {
  total_experience_years: number;
  companies_count: number;
  average_tenure_years: number;
  average_tenure_months: number;
  job_changes_recent_years?: number;
  job_changes_summary?: string;
  summary_headline?: string;
  stability_rating: 'HIGH_RETENTION' | 'STABLE' | 'MODERATE' | 'FREQUENT_CHANGER' | string;
  stability_indicator?: 'LONG_TENURE_STABLE' | 'STANDARD_CAREER_GROWTH' | 'REVIEW_RECOMMENDED_SHORT_TENURE' | 'REVIEW_RECOMMENDED_EMPLOYMENT_GAP' | string;
  stability_score: number;
  stability_label: string;
  hr_review_required?: boolean;
  short_stints_count: number;
  longest_tenure_years: number;
  total_gaps_count?: number;
  total_gap_months?: number;
  employment_gaps?: EmploymentGapItem[];
  factual_observations?: string[];
  hr_evaluation_notes?: string | null;
  retention_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  risk_reasons: string[];
}

export interface Candidate {
  id: string;
  candidate_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  alternate_phone?: string | null;
  location?: string | null;
  preferred_location?: string | null;
  total_experience: number;
  relevant_experience: number;
  current_company?: string | null;
  current_designation?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  employment_history?: EmploymentHistoryItem[];
  stability_metrics?: JobStabilityMetrics;
  companies_count?: number;
  average_tenure_years?: number;
  stability_rating?: string;
  stability_label?: string;
  notice_period_days: number;
  notice_period?: string | null;
  skills: string[];
  technical_skills?: string[];
  education?: string | null;
  highest_qualification?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  certifications?: string[];
  date_of_birth?: string | null;
  source: string;
  recruiter_id?: string | null;
  recruiter_name?: string | null;
  status: CandidateStatus;
  
  // WhatsApp fields
  whatsapp_number?: string | null;
  country_code?: string | null;
  is_whatsapp_verified?: boolean;
  whatsapp_consent_status: WhatsAppConsentStatus;
  whatsapp_consent_source?: string | null;
  whatsapp_consent_date?: string | null;
  whatsapp_consent_evidence?: string | null;
  whatsapp_opt_out_status?: boolean;
  preferred_language?: string | null;
  preferred_contact_time?: string | null;
  do_not_contact_reason?: string | null;
  whatsapp_eligibility?: WhatsAppEligibilityInfo;
  last_whatsapp_contact_date?: string | null;
  last_whatsapp_response_date?: string | null;
  last_whatsapp_message_status?: string | null;

  // Bench fields
  bench_status: BenchStatus;
  bench_availability_date?: string | null;
  bench_primary_skills?: string[];
  bench_secondary_skills?: string[];

  active_submission_count?: number;
  active_submissions_count?: number;
  latest_document?: CandidateDocument | null;
  documents?: CandidateDocument[];
  status_history?: CandidateStatusHistory[];
  submissions?: any[];
  interviews?: any[];
  submissions_count?: number;
  interviews_count?: number;
  offers_count?: number;
  conversations_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CVExtractionResponse {
  file_name: string;
  file_size: number;
  mime_type: string;
  temp_file_id?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  whatsapp_number?: string;
  country_code?: string;
  location?: string;
  preferred_location?: string;
  total_experience?: number;
  relevant_experience?: number;
  current_company?: string;
  current_designation?: string;
  skills: string[];
  technical_skills?: string[];
  education?: string;
  highest_qualification?: string;
  notice_period?: string;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  linkedin_url?: string;
  github_url?: string;
  certifications?: string[];
  date_of_birth?: string;
  summary?: string;
  whatsapp_eligibility: WhatsAppEligibilityInfo;
  is_duplicate: boolean;
  duplicate_candidate_id?: string | null;
  duplicate_match_field?: string | null;
}

export interface BulkCVProcessItem {
  file_name: string;
  status: 'Completed' | 'Failed' | 'Duplicate' | 'Skipped';
  candidate_id?: string | null;
  candidate_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_eligibility: string;
  is_duplicate: boolean;
  duplicate_reason?: string | null;
  error_message?: string | null;
  retry_available?: boolean;
}

export interface BulkCVUploadSummaryResponse {
  total_uploaded: number;
  successfully_processed: number;
  failed_count: number;
  duplicates_detected: number;
  new_candidates_created: number;
  whatsapp_eligible_count: number;
  consent_required_count: number;
  invalid_numbers_count: number;
  items: BulkCVProcessItem[];
}

export interface BenchCandidate {
  candidate_id: string;
  candidate_code: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  preferred_location?: string | null;
  total_experience: number;
  relevant_experience: number;
  current_company?: string | null;
  designation?: string | null;
  primary_skills: string[];
  secondary_skills: string[];
  notice_period?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  bench_status: BenchStatus;
  availability_date?: string | null;
  assigned_requirement_id?: string | null;
  assigned_requirement_code?: string | null;
  assigned_requirement_title?: string | null;
  recruiter_id?: string | null;
  recruiter_name?: string | null;
  whatsapp_eligibility: WhatsAppEligibilityInfo;
  whatsapp_consent_status: WhatsAppConsentStatus;
  last_outreach_date?: string | null;
  last_updated: string;
  resume_file_name?: string | null;
  resume_download_url?: string | null;
}

export interface RequirementMatchCandidate {
  candidate: BenchCandidate;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_fit: string;
  recommendation: string;
  whatsapp_eligible: boolean;
}

export interface RequirementMatchResult {
  requirement_id: string;
  requirement_code: string;
  job_title: string;
  client_name?: string | null;
  required_skills: string[];
  total_candidates_evaluated: number;
  matched_candidates: RequirementMatchCandidate[];
}

export interface WhatsAppIntegrationSettings {
  provider: 'MOCK_SIMULATOR' | 'OFFICIAL_CLOUD_API' | 'TWILIO';
  business_account_id: string;
  phone_number_id: string;
  api_base_url: string;
  access_token?: string | null;
  webhook_url: string;
  webhook_verify_token: string;
  default_country_code: string;
  message_limit_per_day: number;
  rate_limit_per_second: number;
  business_hours_start: string;
  business_hours_end: string;
  retry_policy_max_retries: number;
  default_recruiter_signature: string;
  is_connected: boolean;
  connection_status: string;
  last_test_date?: string | null;
}

export interface WhatsAppTemplate {
  id: string;
  template_name: string;
  category: 'RECRUITMENT_COMMUNICATION' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  provider_template_id?: string | null;
  header_type: 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  header_text?: string | null;
  body_text: string;
  footer_text?: string | null;
  buttons: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  variables: string[];
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  version: number;
  created_by_name?: string | null;
  approved_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppCampaignRecipient {
  id: string;
  campaign_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_code: string;
  whatsapp_number: string;
  eligibility_status: string;
  exclusion_reason?: string | null;
  message_status: WhatsAppMessageStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  replied_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
}

export interface WhatsAppCampaign {
  id: string;
  campaign_name: string;
  campaign_type: WhatsAppCampaignType;
  requirement_id?: string | null;
  requirement_code?: string | null;
  job_title?: string | null;
  client_name?: string | null;
  template_id: string;
  template_name?: string | null;
  recruiter_id: string;
  recruiter_name?: string | null;
  status: WhatsAppCampaignStatus;
  scheduled_date?: string | null;
  time_zone: string;
  total_recipients: number;
  eligible_count: number;
  excluded_count: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  opted_out_count: number;
  delivery_rate: number;
  response_rate: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppCampaignAnalytics {
  campaign: WhatsAppCampaign;
  recipients: WhatsAppCampaignRecipient[];
  delivery_breakdown: Record<string, number>;
  response_rate_percent: number;
  delivery_rate_percent: number;
  read_rate_percent: number;
  failure_rate_percent: number;
  average_response_time_minutes?: number | null;
  interested_count: number;
  not_interested_count: number;
  interviews_scheduled_count: number;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  candidate_id: string;
  candidate_name?: string | null;
  direction: 'OUTBOUND' | 'INBOUND';
  message_type: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'INTERACTIVE_BUTTON' | 'LOCATION';
  content: string;
  attachment_name?: string | null;
  attachment_url?: string | null;
  status: WhatsAppMessageStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  replied_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  is_automated_response?: boolean;
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_code: string;
  whatsapp_number: string;
  assigned_recruiter_id?: string | null;
  assigned_recruiter_name?: string | null;
  requirement_id?: string | null;
  requirement_title?: string | null;
  status: WhatsAppConversationStatus;
  response_category: WhatsAppResponseCategory;
  last_message_text?: string | null;
  last_message_date: string;
  last_incoming_date?: string | null;
  unread_count: number;
  internal_notes?: string | null;
  follow_up_date?: string | null;
  is_automation_disabled?: boolean;
  opt_out_status?: boolean;
  messages: WhatsAppMessage[];
  created_at: string;
  updated_at: string;
}

export interface WhatsAppOptOut {
  id: string;
  candidate_id?: string | null;
  candidate_name?: string | null;
  whatsapp_number: string;
  opt_out_source: string;
  reason: string;
  recorded_by_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HistoryLog {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  old_value?: any;
  new_value?: any;
  remarks?: string | null;
  campaign_id?: string | null;
  message_id?: string | null;
  provider_ref_id?: string | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface WhatsAppDashboardSummary {
  total_campaigns: number;
  active_campaigns: number;
  draft_campaigns: number;
  scheduled_campaigns: number;
  completed_campaigns: number;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_replied: number;
  messages_failed: number;
  opted_out_count: number;
  invalid_numbers_count: number;
  delivery_rate_percent: number;
  response_rate_percent: number;
  read_rate_percent: number;
  volume_trend: Array<{ date: string; sent: number; replied: number }>;
  delivery_breakdown: Record<string, number>;
  response_categories: Record<string, number>;
  campaign_performances: Array<any>;
  opt_out_trends: Array<any>;
}

export interface CVSubmission {
  id: string;
  submission_code: string;
  client_id: string;
  client_name?: string | null;
  requirement_id: string;
  requirement_title?: string | null;
  candidate_id: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  document_id: string;
  document_version?: number;
  document_file_name?: string | null;
  document_file_url?: string | null;
  document_url?: string | null;
  recruiter_id?: string | null;
  recruiter_name?: string | null;
  submission_date: string;
  remarks?: string | null;
  status: SubmissionStatus;
  client_viewed_at?: string | null;
  feedback_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewFeedback {
  id: string;
  interview_id: string;
  submitted_by_id?: string | null;
  submitted_by_name?: string | null;
  rating: number;
  technical_score: number;
  communication_score: number;
  cultural_fit_score: number;
  recommendation: string;
  detailed_feedback?: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  interview_code: string;
  candidate_id: string;
  candidate_name?: string | null;
  candidate_whatsapp?: string | null;
  requirement_id: string;
  requirement_title?: string | null;
  client_id: string;
  client_name?: string | null;
  submission_id?: string | null;
  round_number: number;
  round_name: string;
  interview_type: 'VIRTUAL' | 'IN_PERSON' | 'PHONE';
  interview_date: string;
  duration_minutes: number;
  interviewer_name?: string | null;
  interviewer_email?: string | null;
  meeting_link?: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string | null;
  feedbacks?: InterviewFeedback[];
  created_at: string;
  updated_at: string;
}

export interface ClientFeedback {
  id: string;
  submission_id: string;
  client_id: string;
  user_id?: string | null;
  user_name?: string | null;
  decision: 'SHORTLISTED' | 'REJECTED' | 'ON_HOLD' | 'NEED_MORE_INFORMATION' | 'SCHEDULE_INTERVIEW';
  rating: number;
  comments?: string | null;
  created_at: string;
}

export interface JoiningDetail {
  id: string;
  offer_id: string;
  candidate_id: string;
  actual_joining_date?: string | null;
  status: 'PLANNED' | 'JOINED' | 'DID_NOT_JOIN';
  employee_code?: string | null;
  remarks?: string | null;
  verified_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  offer_code?: string;
  candidate_id: string;
  candidate_name?: string | null;
  requirement_id: string;
  requirement_title?: string | null;
  client_id: string;
  client_name?: string | null;
  submission_id: string;
  offered_ctc?: number;
  annual_ctc?: number;
  joining_bonus: number;
  currency: string;
  offer_date: string;
  target_joining_date: string;
  validity_date?: string | null;
  status: 'DRAFT' | 'RELEASED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  decline_reason?: string | null;
  document_url?: string | null;
  joining_detail?: JoiningDetail | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  reference_entity?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_value?: any;
  new_value?: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface KPICards {
  open_requirements: number;
  open_positions?: number;
  on_hold_positions?: number;
  closed_positions?: number;
  total_requirements?: number;
  total_candidates: number;
  cvs_received: number;
  cvs_screened: number;
  cvs_submitted: number;
  candidates_submitted?: number;
  candidates_shortlisted?: number;
  candidates_rejected?: number;
  candidates_in_interview?: number;
  bench_resources?: number;
  available_bench_resources?: number;
  positions_filled?: number;
  client_responses: number;
  interviews: number;
  selected: number;
  offers: number;
  joined: number;
  whatsapp_campaigns?: number;
  whatsapp_messages_sent?: number;
  whatsapp_messages_delivered?: number;
  whatsapp_candidate_replies?: number;
  whatsapp_response_rate?: number;
  whatsapp_opt_outs?: number;
}

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  candidates_added: number;
  cvs_received?: number;
  cvs_submitted: number;
  interviews?: number;
  interviews_held?: number;
  selected?: number;
  offers: number;
  joined: number;
  wa_sent?: number;
  wa_replies?: number;
}

export interface ClientPerformanceItem {
  client_id: string;
  client_name: string;
  open_requirements: number;
  cvs_received: number;
  cvs_submitted: number;
  client_responses: number;
  interviews: number;
  selections: number;
  avg_response_time_days: number;
}

export interface RecruiterPerformanceItem {
  recruiter_id: string;
  recruiter_name: string;
  candidates_added: number;
  candidates_screened: number;
  cvs_submitted: number;
  interviews: number;
  selections: number;
  joining_count: number;
  avg_submission_time_hours: number;
}

export interface TimeMetrics {
  time_to_screen_hours: number;
  time_to_shortlist_hours: number;
  time_to_submit_hours: number;
  client_response_time_days: number;
  time_to_interview_days: number;
  time_in_stage_avg_days: number;
  time_to_offer_days: number;
  time_to_hire_days: number;
  time_to_fill_requirement_days: number;
}

export interface DashboardSummary {
  kpis: KPICards;
  funnel?: PipelineFunnelStage[];
  pipeline_funnel?: PipelineFunnelStage[];
  position_status_distribution?: Record<string, number>;
  candidate_status_distribution?: Record<string, number>;
  bench_kpis?: Record<string, any>;
  whatsapp_kpis?: Record<string, any>;
  active_clients?: Array<any>;
  urgent_requirements?: Array<any>;
  recent_activities?: Array<any>;
  time_series_trend?: Array<any>;
  timeseries?: TimeSeriesPoint[];
  client_performance?: ClientPerformanceItem[];
  recruiter_performance?: RecruiterPerformanceItem[];
  time_metrics?: TimeMetrics;
}

export interface ATSRecommendation {
  category: 'critical' | 'improvement' | 'strength';
  title: string;
  description: string;
}

export interface ATSCandidateDetails {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  total_experience?: number;
  current_company?: string;
  current_designation?: string;
  education?: string;
  highest_qualification?: string;
  skills?: string[];
  linkedin_url?: string;
  github_url?: string;
  summary?: string;
}

export interface ATSAnalysisResult {
  overall_score: number;
  grade: string;
  pass_probability: string;
  summary: string;
  file_name?: string;
  file_size_formatted?: string;
  candidate_details: ATSCandidateDetails;
  sections_detected: Record<string, boolean>;
  category_scores: {
    contact_info: number;
    sections: number;
    content_impact: number;
    skills_keywords: number;
    formatting: number;
  };
  category_max_scores: {
    contact_info: number;
    sections: number;
    content_impact: number;
    skills_keywords: number;
    formatting: number;
  };
  contact_info_check: {
    name_detected?: boolean;
    name_value?: string;
    email_detected?: boolean;
    email_value?: string;
    phone_detected?: boolean;
    phone_value?: string;
    location_detected?: boolean;
    location_value?: string;
    links_detected?: boolean;
    linkedin_url?: string;
    github_url?: string;
  };
  formatting_check: {
    file_format_compatibility?: string;
    bullet_points_structure?: string;
    text_extractability?: string;
  };
  skills_analysis: {
    extracted_skills: string[];
    skills_count: number;
    matched_skills?: string[];
    missing_skills?: string[];
    skills_score: number;
  };
  content_metrics: {
    word_count: number;
    estimated_pages: number;
    length_status: string;
    action_verbs_count: number;
    action_verbs_found: string[];
    quantified_metrics_count: number;
    quantified_metrics_samples: string[];
    reading_time_minutes: number;
  };
  recommendations: ATSRecommendation[];
  target_job?: {
    requirement_id: string;
    req_code: string;
    job_title: string;
    client_name: string;
    required_skills: string[];
    matched_skills: string[];
    missing_skills: string[];
    experience_fit: string;
    match_percentage: number;
  } | null;
  temp_file_id?: string | null;
}

export interface AIAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  suggested_prompts?: string[];
  data?: any;
}

export interface AIAssistantCategory {
  category: string;
  icon: string;
  prompts: string[];
}

export interface CandidateStatusSummaryCounts {
  selected: number;
  rejected: number;
  on_hold: number;
  in_interview: number;
  pending: number;
  other: number;
  total_candidates: number;
  total_transitions: number;
  by_status: Record<string, number>;
}

export interface CandidateStatusHistoryFeedItem {
  id: string;
  candidate_id: string;
  candidate_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  candidate_current_company?: string | null;
  candidate_current_designation?: string | null;
  old_status?: string | null;
  new_status: string;
  stage_duration_hours: number;
  stage_duration_display: string;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  requirement_id?: string | null;
  requirement_title?: string | null;
  client_name?: string | null;
  remarks?: string | null;
  created_at: string;
  created_at_formatted: string;
}

export interface CandidateHistoryLifecycleItem {
  candidate_id: string;
  candidate_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  candidate_current_company?: string | null;
  candidate_current_designation?: string | null;
  current_status: string;
  status_category: 'SELECTED' | 'REJECTED' | 'ON_HOLD' | 'IN_INTERVIEW' | 'PENDING' | 'OTHER' | string;
  transitions_count: number;
  total_pipeline_days: number;
  initial_date: string;
  latest_date: string;
  latest_remarks?: string | null;
  latest_changed_by?: string | null;
  history_events: CandidateStatusHistoryFeedItem[];
}

export interface CandidateHistoryPageResponse {
  summary: CandidateStatusSummaryCounts;
  feed: CandidateStatusHistoryFeedItem[];
  candidates: CandidateHistoryLifecycleItem[];
  total_events: number;
}

