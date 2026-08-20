from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models import (
    Candidate, CandidateStatusEnum, CVSubmission, SubmissionStatusEnum,
    JobRequirement, RequirementStatusEnum, Interview, InterviewStatusEnum,
    Offer, OfferStatusEnum, JoiningDetail, JoiningStatusEnum, Client, User, RoleEnum,
    CandidateStatusHistory, RecruiterActivity, DashboardMetric, ClientFeedback
)
from app.schemas import (
    KPICards, PipelineFunnelStage, TimeSeriesPoint, ClientPerformanceItem,
    RecruiterPerformanceItem, TimeMetricsResponse, DashboardSummaryResponse
)

def compute_dashboard_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    client_id: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    status_filter: Optional[str] = None
) -> DashboardSummaryResponse:
    if not end_date:
        end_date = datetime.now(timezone.utc)
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # 1. Base Query Filters
    cand_query = db.query(Candidate)
    req_query = db.query(JobRequirement)
    sub_query = db.query(CVSubmission)
    int_query = db.query(Interview)
    off_query = db.query(Offer)
    join_query = db.query(JoiningDetail)

    if client_id:
        req_query = req_query.filter(JobRequirement.client_id == client_id)
        sub_query = sub_query.filter(CVSubmission.client_id == client_id)
        int_query = int_query.filter(Interview.client_id == client_id)
        off_query = off_query.filter(Offer.client_id == client_id)

    if recruiter_id:
        cand_query = cand_query.filter(Candidate.recruiter_id == recruiter_id)
        req_query = req_query.filter(JobRequirement.assigned_recruiter_id == recruiter_id)
        sub_query = sub_query.filter(CVSubmission.recruiter_id == recruiter_id)

    # 2. KPI Cards
    open_reqs = req_query.filter(JobRequirement.status.in_([RequirementStatusEnum.OPEN, RequirementStatusEnum.PARTIALLY_FILLED])).count()
    total_cands = cand_query.count()
    cvs_received = cand_query.count()
    cvs_screened = cand_query.filter(Candidate.status != CandidateStatusEnum.RECEIVED).count()
    cvs_submitted = sub_query.count()
    client_responses = sub_query.filter(CVSubmission.status.in_([
        SubmissionStatusEnum.SHORTLISTED, SubmissionStatusEnum.REJECTED,
        SubmissionStatusEnum.INTERVIEW, SubmissionStatusEnum.SELECTED,
        SubmissionStatusEnum.OFFER, SubmissionStatusEnum.JOINED
    ])).count()
    interviews_count = int_query.count()
    selected_count = sub_query.filter(CVSubmission.status.in_([
        SubmissionStatusEnum.SELECTED, SubmissionStatusEnum.OFFER, SubmissionStatusEnum.JOINED
    ])).count()
    offers_count = off_query.count()
    joined_count = join_query.filter(JoiningDetail.status == JoiningStatusEnum.JOINED).count()

    kpis = KPICards(
        open_requirements=open_reqs,
        total_candidates=total_cands,
        cvs_received=cvs_received,
        cvs_screened=cvs_screened,
        cvs_submitted=cvs_submitted,
        client_responses=client_responses,
        interviews=interviews_count,
        selected=selected_count,
        offers=offers_count,
        joined=joined_count
    )

    # 3. Pipeline Funnel
    # Stages: Received -> Screened -> Shortlisted -> Submitted -> Client Review -> Interview -> Selected -> Offer -> Joined
    received_cnt = max(total_cands, 1)
    screened_cnt = cvs_screened
    shortlisted_cnt = cand_query.filter(Candidate.status.in_([
        CandidateStatusEnum.SHORTLISTED, CandidateStatusEnum.SUBMITTED,
        CandidateStatusEnum.CLIENT_REVIEW, CandidateStatusEnum.INTERVIEW,
        CandidateStatusEnum.SELECTED, CandidateStatusEnum.OFFER, CandidateStatusEnum.JOINED
    ])).count()
    submitted_cnt = cvs_submitted
    client_review_cnt = sub_query.filter(CVSubmission.status != SubmissionStatusEnum.DRAFT).count()
    interview_cnt = interviews_count
    selected_stage_cnt = selected_count
    offer_cnt = offers_count
    joined_stage_cnt = joined_count

    funnel_stages = [
        {"stage": "CV Received", "count": total_cands},
        {"stage": "Screened", "count": screened_cnt},
        {"stage": "Shortlisted", "count": shortlisted_cnt},
        {"stage": "Submitted", "count": submitted_cnt},
        {"stage": "Client Review", "count": client_review_cnt},
        {"stage": "Interview", "count": interview_cnt},
        {"stage": "Selected", "count": selected_stage_cnt},
        {"stage": "Offer", "count": offer_cnt},
        {"stage": "Joined", "count": joined_stage_cnt},
    ]

    pipeline_funnel: List[PipelineFunnelStage] = []
    base_count = max(total_cands, 1)
    prev_cnt = base_count
    for item in funnel_stages:
        cnt = item["count"]
        conversion = round((cnt / prev_cnt * 100.0) if prev_cnt > 0 else 0.0, 1)
        prev_cnt = max(cnt, 1)
        pipeline_funnel.append(PipelineFunnelStage(
            stage=item["stage"],
            count=cnt,
            conversion_rate=min(conversion, 100.0)
        ))

    # 4. Time Series Analytics (Daily for last 14 days or custom span)
    timeseries: List[TimeSeriesPoint] = []
    days_span = 14
    for i in range(days_span, -1, -1):
        day_date = (end_date - timedelta(days=i)).date()
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())

        c_add = db.query(Candidate).filter(Candidate.created_at.between(day_start, day_end)).count()
        c_sub = db.query(CVSubmission).filter(CVSubmission.created_at.between(day_start, day_end)).count()
        c_int = db.query(Interview).filter(Interview.interview_date.between(day_start, day_end)).count()
        c_sel = db.query(CandidateStatusHistory).filter(
            and_(
                CandidateStatusHistory.new_status == CandidateStatusEnum.SELECTED.value,
                CandidateStatusHistory.created_at.between(day_start, day_end)
            )
        ).count()
        c_off = db.query(Offer).filter(Offer.created_at.between(day_start, day_end)).count()
        c_joi = db.query(JoiningDetail).filter(JoiningDetail.created_at.between(day_start, day_end)).count()

        timeseries.append(TimeSeriesPoint(
            date=day_date.strftime("%b %d"),
            candidates_added=c_add,
            cvs_submitted=c_sub,
            interviews_held=c_int,
            selected=c_sel,
            offers=c_off,
            joined=c_joi
        ))

    # 5. Client Performance
    client_performance: List[ClientPerformanceItem] = []
    clients = db.query(Client).all()
    for c in clients:
        c_open_reqs = db.query(JobRequirement).filter(
            JobRequirement.client_id == c.id,
            JobRequirement.status.in_([RequirementStatusEnum.OPEN, RequirementStatusEnum.PARTIALLY_FILLED])
        ).count()
        c_subs = db.query(CVSubmission).filter(CVSubmission.client_id == c.id).count()
        c_resps = db.query(CVSubmission).filter(
            CVSubmission.client_id == c.id,
            CVSubmission.status.in_([
                SubmissionStatusEnum.SHORTLISTED, SubmissionStatusEnum.REJECTED,
                SubmissionStatusEnum.INTERVIEW, SubmissionStatusEnum.SELECTED,
                SubmissionStatusEnum.OFFER, SubmissionStatusEnum.JOINED
            ])
        ).count()
        c_ints = db.query(Interview).filter(Interview.client_id == c.id).count()
        c_sels = db.query(CVSubmission).filter(
            CVSubmission.client_id == c.id,
            CVSubmission.status.in_([SubmissionStatusEnum.SELECTED, SubmissionStatusEnum.OFFER, SubmissionStatusEnum.JOINED])
        ).count()

        # Calculate average response time if client feedbacks exist
        avg_resp_days = 0.0
        feedbacks = db.query(ClientFeedback).join(CVSubmission, CVSubmission.id == ClientFeedback.submission_id).filter(CVSubmission.client_id == c.id).all()
        if feedbacks:
            total_days = sum(
                max(0.1, (fb.created_at - fb.submission.created_at).total_seconds() / 86400.0)
                for fb in feedbacks if fb.submission and fb.created_at and fb.submission.created_at
            )
            avg_resp_days = round(total_days / len(feedbacks), 1)

        client_performance.append(ClientPerformanceItem(
            client_id=c.id,
            client_name=c.name,
            open_requirements=c_open_reqs,
            cvs_received=c_subs,
            cvs_submitted=c_subs,
            client_responses=c_resps,
            interviews=c_ints,
            selections=c_sels,
            avg_response_time_days=avg_resp_days
        ))

    # 6. Recruiter Performance
    recruiter_performance: List[RecruiterPerformanceItem] = []
    recruiters = db.query(User).filter(User.role.in_([RoleEnum.RECRUITER, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN])).all()
    for r in recruiters:
        r_cands = db.query(Candidate).filter(Candidate.recruiter_id == r.id).count()
        r_screened = db.query(Candidate).filter(
            Candidate.recruiter_id == r.id,
            Candidate.status != CandidateStatusEnum.RECEIVED
        ).count()
        r_subs = db.query(CVSubmission).filter(CVSubmission.recruiter_id == r.id).count()
        r_ints = db.query(Interview).filter(Interview.created_by_id == r.id).count()
        r_sels = db.query(CVSubmission).filter(
            CVSubmission.recruiter_id == r.id,
            CVSubmission.status.in_([SubmissionStatusEnum.SELECTED, SubmissionStatusEnum.OFFER, SubmissionStatusEnum.JOINED])
        ).count()
        r_joins = db.query(JoiningDetail).filter(JoiningDetail.verified_by_id == r.id, JoiningDetail.status == JoiningStatusEnum.JOINED).count()

        # Calculate average submission time in hours
        avg_sub_hrs = 0.0
        recruiter_subs = db.query(CVSubmission).filter(CVSubmission.recruiter_id == r.id).all()
        if recruiter_subs:
            total_hrs = sum(
                max(0.1, (sub.created_at - sub.candidate.created_at).total_seconds() / 3600.0)
                for sub in recruiter_subs if sub.candidate and sub.created_at and sub.candidate.created_at
            )
            avg_sub_hrs = round(total_hrs / len(recruiter_subs), 1)

        recruiter_performance.append(RecruiterPerformanceItem(
            recruiter_id=r.id,
            recruiter_name=r.full_name,
            candidates_added=r_cands,
            candidates_screened=r_screened,
            cvs_submitted=r_subs,
            interviews=r_ints,
            selections=r_sels,
            joining_count=r_joins,
            avg_submission_time_hours=avg_sub_hrs
        ))

    # 7. Real Dynamic Time Metrics
    screen_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == CandidateStatusEnum.SCREENED.value
    ).scalar() or 0.0

    shortlist_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == CandidateStatusEnum.SHORTLISTED.value
    ).scalar() or 0.0

    submit_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == CandidateStatusEnum.SUBMITTED.value
    ).scalar() or 0.0

    all_stage_avg = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).scalar() or 0.0

    # Calculate real client response time from feedbacks
    all_fbs = db.query(ClientFeedback).all()
    avg_client_resp = 0.0
    if all_fbs:
        tot = sum(
            (fb.created_at - fb.submission.created_at).total_seconds() / 86400.0
            for fb in all_fbs if fb.submission and fb.created_at and fb.submission.created_at
        )
        avg_client_resp = round(tot / len(all_fbs), 1)

    # Real time to interview from candidate creation
    all_ints = db.query(Interview).all()
    avg_int_days = 0.0
    if all_ints:
        tot_int = sum(
            max(0.1, (int_item.interview_date - int_item.created_at).total_seconds() / 86400.0)
            for int_item in all_ints if int_item.interview_date and int_item.created_at
        )
        avg_int_days = round(tot_int / len(all_ints), 1)

    # Real time to offer from candidate creation
    all_offers = db.query(Offer).all()
    avg_offer_days = 0.0
    if all_offers:
        tot_off = sum(
            max(0.1, (off.created_at - off.candidate.created_at).total_seconds() / 86400.0)
            for off in all_offers if off.candidate and off.created_at and off.candidate.created_at
        )
        avg_offer_days = round(tot_off / len(all_offers), 1)

    # Real time to hire / join
    all_joins = db.query(JoiningDetail).filter(JoiningDetail.status == JoiningStatusEnum.JOINED).all()
    avg_hire_days = 0.0
    if all_joins:
        tot_join = sum(
            max(0.1, (j.created_at - j.candidate.created_at).total_seconds() / 86400.0)
            for j in all_joins if j.candidate and j.created_at and j.candidate.created_at
        )
        avg_hire_days = round(tot_join / len(all_joins), 1)

    time_metrics = TimeMetricsResponse(
        time_to_screen_hours=round(float(screen_hist), 1),
        time_to_shortlist_hours=round(float(shortlist_hist), 1),
        time_to_submit_hours=round(float(submit_hist), 1),
        client_response_time_days=avg_client_resp,
        time_to_interview_days=avg_int_days,
        time_in_stage_avg_days=round(float(all_stage_avg) / 24.0, 1),
        time_to_offer_days=avg_offer_days,
        time_to_hire_days=avg_hire_days,
        time_to_fill_requirement_days=avg_hire_days
    )

    return DashboardSummaryResponse(
        kpis=kpis,
        pipeline_funnel=pipeline_funnel,
        timeseries=timeseries,
        client_performance=client_performance,
        recruiter_performance=recruiter_performance,
        time_metrics=time_metrics
    )
