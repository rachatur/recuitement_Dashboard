from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.core.rbac import get_current_active_user, RoleEnum
from app.models import (
    User, Candidate, CVSubmission, Interview, Offer, JoiningDetail,
    CandidateStatusHistory, Client, ClientFeedback, JobRequirement, RequirementStatusEnum
)
from app.schemas import (
    TimeSeriesPoint, TimeMetricsResponse, RecruiterPerformanceItem,
    ClientPerformanceItem, WeeklyHRReportResponse, WeeklyReportDailyMetric,
    WeeklyReportStageFunnel
)

router = APIRouter(prefix="/analytics", tags=["Time-Series Analytics & Reports"])

@router.get("/time-series", response_model=List[TimeSeriesPoint])
def get_time_series_analytics(
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly|quarterly|yearly)$"),
    days: int = Query(30, ge=7, le=365),
    client_id: Optional[str] = Query(None),
    recruiter_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    points = []
    
    step_days = 1
    if granularity == "weekly":
        step_days = 7
    elif granularity == "monthly":
        step_days = 30
    elif granularity == "quarterly":
        step_days = 90
    elif granularity == "yearly":
        step_days = 365

    iterations = max(1, days // step_days)
    for i in range(iterations, -1, -1):
        p_start = now - timedelta(days=(i + 1) * step_days)
        p_end = now - timedelta(days=i * step_days)

        cand_q = db.query(Candidate).filter(Candidate.created_at.between(p_start, p_end))
        sub_q = db.query(CVSubmission).filter(CVSubmission.created_at.between(p_start, p_end))
        int_q = db.query(Interview).filter(Interview.interview_date.between(p_start, p_end))
        off_q = db.query(Offer).filter(Offer.created_at.between(p_start, p_end))
        joi_q = db.query(JoiningDetail).filter(JoiningDetail.created_at.between(p_start, p_end))

        if client_id:
            sub_q = sub_q.filter(CVSubmission.client_id == client_id)
            int_q = int_q.filter(Interview.client_id == client_id)
            off_q = off_q.filter(Offer.client_id == client_id)

        if recruiter_id:
            cand_q = cand_q.filter(Candidate.recruiter_id == recruiter_id)
            sub_q = sub_q.filter(CVSubmission.recruiter_id == recruiter_id)

        fmt = "%b %d" if granularity in ["daily", "weekly"] else "%b %Y"
        label = p_end.strftime(fmt)

        points.append(TimeSeriesPoint(
            date=label,
            candidates_added=cand_q.count(),
            cvs_submitted=sub_q.count(),
            interviews_held=int_q.count(),
            selected=sub_q.filter(CVSubmission.status.in_(["SELECTED", "OFFER", "JOINED"])).count(),
            offers=off_q.count(),
            joined=joi_q.filter(JoiningDetail.status == "JOINED").count()
        ))
    return points

@router.get("/time-metrics", response_model=TimeMetricsResponse)
def get_time_metrics(
    client_id: Optional[str] = Query(None),
    recruiter_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    screen_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == "SCREENED"
    ).scalar() or 0.0

    shortlist_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == "SHORTLISTED"
    ).scalar() or 0.0

    submit_hist = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).filter(
        CandidateStatusHistory.new_status == "SUBMITTED"
    ).scalar() or 0.0

    all_stage_avg = db.query(func.avg(CandidateStatusHistory.stage_duration_hours)).scalar() or 0.0

    all_fbs = db.query(ClientFeedback).all()
    avg_client_resp = 0.0
    if all_fbs:
        tot = sum(
            (fb.created_at - fb.submission.created_at).total_seconds() / 86400.0
            for fb in all_fbs if fb.submission and fb.created_at and fb.submission.created_at
        )
        avg_client_resp = round(tot / len(all_fbs), 1)

    all_ints = db.query(Interview).all()
    avg_int_days = 0.0
    if all_ints:
        tot_int = sum(
            max(0.1, (int_item.interview_date - int_item.created_at).total_seconds() / 86400.0)
            for int_item in all_ints if int_item.interview_date and int_item.created_at
        )
        avg_int_days = round(tot_int / len(all_ints), 1)

    all_offers = db.query(Offer).all()
    avg_offer_days = 0.0
    if all_offers:
        tot_off = sum(
            max(0.1, (off.created_at - off.candidate.created_at).total_seconds() / 86400.0)
            for off in all_offers if off.candidate and off.created_at and off.candidate.created_at
        )
        avg_offer_days = round(tot_off / len(all_offers), 1)

    all_joins = db.query(JoiningDetail).filter(JoiningDetail.status == "JOINED").all()
    avg_hire_days = 0.0
    if all_joins:
        tot_join = sum(
            max(0.1, (j.created_at - j.candidate.created_at).total_seconds() / 86400.0)
            for j in all_joins if j.candidate and j.created_at and j.candidate.created_at
        )
        avg_hire_days = round(tot_join / len(all_joins), 1)

    return TimeMetricsResponse(
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

@router.get("/recruiter-scorecard", response_model=List[RecruiterPerformanceItem])
def get_recruiter_scorecard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    recruiters = db.query(User).filter(User.role.in_([RoleEnum.RECRUITER, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN])).all()
    results = []
    for r in recruiters:
        r_cands = db.query(Candidate).filter(Candidate.recruiter_id == r.id).count()
        r_screened = db.query(Candidate).filter(Candidate.recruiter_id == r.id, Candidate.status != "RECEIVED").count()
        r_subs = db.query(CVSubmission).filter(CVSubmission.recruiter_id == r.id).count()
        r_ints = db.query(Interview).filter(Interview.created_by_id == r.id).count()
        r_sels = db.query(CVSubmission).filter(CVSubmission.recruiter_id == r.id, CVSubmission.status.in_(["SELECTED", "OFFER", "JOINED"])).count()
        r_joins = db.query(JoiningDetail).filter(JoiningDetail.verified_by_id == r.id, JoiningDetail.status == "JOINED").count()

        avg_sub_hrs = 0.0
        recruiter_subs = db.query(CVSubmission).filter(CVSubmission.recruiter_id == r.id).all()
        if recruiter_subs:
            total_hrs = sum(
                max(0.1, (sub.created_at - sub.candidate.created_at).total_seconds() / 3600.0)
                for sub in recruiter_subs if sub.candidate and sub.created_at and sub.candidate.created_at
            )
            avg_sub_hrs = round(total_hrs / len(recruiter_subs), 1)

        results.append(RecruiterPerformanceItem(
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
    return results

@router.get("/client-efficiency", response_model=List[ClientPerformanceItem])
def get_client_efficiency(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    clients = db.query(Client).all()
    results = []
    for c in clients:
        c_open_reqs = db.query(JobRequirement).filter(
            JobRequirement.client_id == c.id,
            JobRequirement.status.in_([RequirementStatusEnum.OPEN, RequirementStatusEnum.PARTIALLY_FILLED])
        ).count()
        c_subs = db.query(CVSubmission).filter(CVSubmission.client_id == c.id).count()
        c_resps = db.query(CVSubmission).filter(CVSubmission.client_id == c.id, CVSubmission.status.in_(["SHORTLISTED", "REJECTED", "SELECTED", "OFFER", "JOINED"])).count()
        c_ints = db.query(Interview).filter(Interview.client_id == c.id).count()
        c_sels = db.query(CVSubmission).filter(CVSubmission.client_id == c.id, CVSubmission.status.in_(["SELECTED", "OFFER", "JOINED"])).count()

        avg_resp_days = 0.0
        feedbacks = db.query(ClientFeedback).join(CVSubmission, CVSubmission.id == ClientFeedback.submission_id).filter(CVSubmission.client_id == c.id).all()
        if feedbacks:
            total_days = sum(
                max(0.1, (fb.created_at - fb.submission.created_at).total_seconds() / 86400.0)
                for fb in feedbacks if fb.submission and fb.created_at and fb.submission.created_at
            )
            avg_resp_days = round(total_days / len(feedbacks), 1)

        results.append(ClientPerformanceItem(
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
    return results

@router.get("/weekly-hr-report", response_model=WeeklyHRReportResponse)
def get_weekly_hr_report(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    week_offset: int = Query(0, description="0 for current week, -1 for previous week, etc."),
    client_id: Optional[str] = Query(None),
    recruiter_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Weekly HR Recruitment Report:
    - Calculates Total Candidates, CVs Submitted, Candidates Selected, Candidates Rejected,
      Interviews Scheduled, Interviews Completed, Candidates Hired, Candidates On Hold, Candidates Joined.
    - Provides day-by-day metrics, pipeline funnel conversions, and status breakdown.
    """
    now = datetime.now(timezone.utc)

    if start_date and end_date:
        try:
            p_start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
            p_end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            week_num = p_start.isocalendar()[1]
            week_label = f"Week {week_num} ({p_start.strftime('%b %d')} - {p_end.strftime('%b %d, %Y')})"
        except Exception:
            # Fallback to current week if parsing fails
            curr_monday = now - timedelta(days=now.weekday())
            p_start = curr_monday.replace(hour=0, minute=0, second=0, microsecond=0)
            p_end = (p_start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
            week_num = p_start.isocalendar()[1]
            week_label = f"Week {week_num} ({p_start.strftime('%b %d')} - {p_end.strftime('%b %d, %Y')})"
    else:
        # Determine week bounds from offset
        curr_monday = now - timedelta(days=now.weekday()) + timedelta(weeks=week_offset)
        p_start = curr_monday.replace(hour=0, minute=0, second=0, microsecond=0)
        p_end = (p_start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
        week_num = p_start.isocalendar()[1]
        
        if week_offset == 0:
            prefix = "Current Week"
        elif week_offset == -1:
            prefix = "Last Week"
        else:
            prefix = f"{abs(week_offset)} Weeks Ago" if week_offset < 0 else f"+{week_offset} Weeks"
            
        week_label = f"{prefix} — Week {week_num} ({p_start.strftime('%b %d')} - {p_end.strftime('%b %d, %Y')})"

    # Base queries filtered by date range
    cand_q = db.query(Candidate).filter(Candidate.created_at.between(p_start, p_end))
    sub_q = db.query(CVSubmission).filter(CVSubmission.created_at.between(p_start, p_end))
    int_q = db.query(Interview).filter(
        or_(
            Interview.interview_date.between(p_start, p_end),
            Interview.created_at.between(p_start, p_end)
        )
    )
    off_q = db.query(Offer).filter(Offer.created_at.between(p_start, p_end))
    joi_q = db.query(JoiningDetail).filter(
        or_(
            JoiningDetail.joining_date.between(p_start, p_end),
            JoiningDetail.created_at.between(p_start, p_end)
        )
    )

    if client_id:
        sub_q = sub_q.filter(CVSubmission.client_id == client_id)
        int_q = int_q.filter(Interview.client_id == client_id)
        off_q = off_q.filter(Offer.client_id == client_id)

    if recruiter_id:
        cand_q = cand_q.filter(Candidate.recruiter_id == recruiter_id)
        sub_q = sub_q.filter(CVSubmission.recruiter_id == recruiter_id)

    total_candidates = cand_q.count()
    cvs_submitted = sub_q.count()
    candidates_selected = sub_q.filter(CVSubmission.status.in_(["SELECTED", "OFFER", "JOINED", "SHORTLISTED"])).count()
    candidates_rejected = sub_q.filter(CVSubmission.status == "REJECTED").count()
    interviews_scheduled = int_q.count()
    interviews_completed = int_q.filter(Interview.status == "COMPLETED").count()
    candidates_hired = off_q.filter(Offer.status.in_(["ACCEPTED", "RELEASED"])).count()
    
    # On hold count
    candidates_on_hold = db.query(Candidate).filter(
        Candidate.status == "ON_HOLD",
        Candidate.updated_at.between(p_start, p_end)
    ).count()

    candidates_joined = joi_q.filter(JoiningDetail.status == "JOINED").count()

    # Day-by-day activity points
    daily_metrics = []
    num_days = max(1, (p_end - p_start).days + 1)
    day_cursor = p_start
    for _ in range(min(num_days, 14)):
        day_end = (day_cursor + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        d_cand = db.query(Candidate).filter(Candidate.created_at >= day_cursor, Candidate.created_at < day_end).count()
        d_sub = db.query(CVSubmission).filter(CVSubmission.created_at >= day_cursor, CVSubmission.created_at < day_end).count()
        d_int_sched = db.query(Interview).filter(Interview.interview_date >= day_cursor, Interview.interview_date < day_end).count()
        d_int_comp = db.query(Interview).filter(Interview.interview_date >= day_cursor, Interview.interview_date < day_end, Interview.status == "COMPLETED").count()
        d_sel = db.query(CVSubmission).filter(CVSubmission.created_at >= day_cursor, CVSubmission.created_at < day_end, CVSubmission.status.in_(["SELECTED", "OFFER", "JOINED"])).count()
        d_rej = db.query(CVSubmission).filter(CVSubmission.created_at >= day_cursor, CVSubmission.created_at < day_end, CVSubmission.status == "REJECTED").count()
        d_off = db.query(Offer).filter(Offer.created_at >= day_cursor, Offer.created_at < day_end).count()
        d_joi = db.query(JoiningDetail).filter(JoiningDetail.created_at >= day_cursor, JoiningDetail.created_at < day_end, JoiningDetail.status == "JOINED").count()

        daily_metrics.append(WeeklyReportDailyMetric(
            date=day_cursor.strftime("%Y-%m-%d"),
            day_name=day_cursor.strftime("%a (%b %d)"),
            candidates_added=d_cand,
            cvs_submitted=d_sub,
            interviews_scheduled=d_int_sched,
            interviews_completed=d_int_comp,
            selected=d_sel,
            rejected=d_rej,
            offers=d_off,
            joined=d_joi
        ))
        day_cursor = day_end

    # Pipeline Funnel
    base_funnel = max(total_candidates, 1)
    pipeline_funnel = [
        WeeklyReportStageFunnel(stage="Sourced Candidates", count=total_candidates, conversion_rate=100.0),
        WeeklyReportStageFunnel(stage="CVs Submitted", count=cvs_submitted, conversion_rate=round((cvs_submitted / base_funnel) * 100.0, 1)),
        WeeklyReportStageFunnel(stage="Interviews Scheduled", count=interviews_scheduled, conversion_rate=round((interviews_scheduled / max(cvs_submitted, 1)) * 100.0, 1)),
        WeeklyReportStageFunnel(stage="Candidates Selected", count=candidates_selected, conversion_rate=round((candidates_selected / max(interviews_scheduled, 1)) * 100.0, 1)),
        WeeklyReportStageFunnel(stage="Offers Released", count=candidates_hired, conversion_rate=round((candidates_hired / max(candidates_selected, 1)) * 100.0, 1)),
        WeeklyReportStageFunnel(stage="Candidates Joined", count=candidates_joined, conversion_rate=round((candidates_joined / max(candidates_hired, 1)) * 100.0, 1)),
    ]

    # Status distribution
    status_distribution = {
        "Sourced": total_candidates,
        "Submitted": cvs_submitted,
        "Selected": candidates_selected,
        "Rejected": candidates_rejected,
        "Interviews": interviews_scheduled,
        "Hired": candidates_hired,
        "On Hold": candidates_on_hold,
        "Joined": candidates_joined
    }

    # Top positions in the week
    pos_counts: Dict[str, int] = {}
    for cand in cand_q.all():
        pos = cand.current_designation or "Software Engineer"
        pos_counts[pos] = pos_counts.get(pos, 0) + 1
    top_positions = [{"position": k, "count": v} for k, v in sorted(pos_counts.items(), key=lambda x: x[1], reverse=True)[:6]]

    # Recent submissions in the week
    recent_submissions = []
    for sub in sub_q.order_by(CVSubmission.created_at.desc()).limit(10).all():
        recent_submissions.append({
            "id": str(sub.id),
            "submission_code": sub.submission_code,
            "candidate_name": f"{sub.candidate.first_name} {sub.candidate.last_name}" if sub.candidate else "Candidate",
            "client_name": sub.client.name if sub.client else "Client",
            "position": sub.requirement.job_title if sub.requirement else "Role",
            "status": str(sub.status.value if hasattr(sub.status, 'value') else sub.status),
            "date": sub.created_at.strftime("%Y-%m-%d %H:%M") if sub.created_at else ""
        })

    return WeeklyHRReportResponse(
        start_date=p_start.strftime("%Y-%m-%d"),
        end_date=p_end.strftime("%Y-%m-%d"),
        week_label=week_label,
        total_candidates=total_candidates,
        cvs_submitted=cvs_submitted,
        candidates_selected=candidates_selected,
        candidates_rejected=candidates_rejected,
        interviews_scheduled=interviews_scheduled,
        interviews_completed=interviews_completed,
        candidates_hired=candidates_hired,
        candidates_on_hold=candidates_on_hold,
        candidates_joined=candidates_joined,
        daily_breakdown=daily_metrics,
        pipeline_funnel=pipeline_funnel,
        status_distribution=status_distribution,
        top_positions=top_positions,
        recent_submissions=recent_submissions
    )
