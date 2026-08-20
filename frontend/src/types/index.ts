export type Role =
  | 'SUPER_ADMIN'
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
  open_requirements_count: number;
  total_submissions_count: number;
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
  target_closing_date?: string | null;
  assigned_recruiter_id?: string | null;
  recruiter_name?: string | null;
  status: RequirementStatus;
  job_description?: string | null;
  candidates_count?: number;
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

export interface Candidate {
  id: string;
  candidate_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  preferred_location?: string | null;
  total_experience: number;
  relevant_experience: number;
  current_company?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  notice_period_days: number;
  skills: string[];
  education?: string | null;
  source: string;
  recruiter_id?: string | null;
  recruiter_name?: string | null;
  status: CandidateStatus;
  active_submission_count: number;
  latest_document?: CandidateDocument | null;
  documents?: CandidateDocument[];
  status_history?: CandidateStatusHistory[];
  created_at: string;
  updated_at: string;
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
  candidate_id: string;
  candidate_name?: string | null;
  requirement_id: string;
  requirement_title?: string | null;
  client_id: string;
  client_name?: string | null;
  submission_id: string;
  offered_ctc: number;
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
  total_candidates: number;
  cvs_received: number;
  cvs_screened: number;
  cvs_submitted: number;
  client_responses: number;
  interviews: number;
  selected: number;
  offers: number;
  joined: number;
}

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  candidates_added: number;
  cvs_submitted: number;
  interviews_held: number;
  selected: number;
  offers: number;
  joined: number;
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
  pipeline_funnel: PipelineFunnelStage[];
  timeseries: TimeSeriesPoint[];
  client_performance: ClientPerformanceItem[];
  recruiter_performance: RecruiterPerformanceItem[];
  time_metrics: TimeMetrics;
}
