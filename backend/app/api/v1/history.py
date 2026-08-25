import csv
import io
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.models import AuditLog, User
from app.schemas import HistoryLogResponse

router = APIRouter(prefix="/history", tags=["History & Audit Trail"])

@router.get("", response_model=List[HistoryLogResponse])
def get_history_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns date-wise chronological history records for all important recruitment,
    position status, bench, and WhatsApp outreach actions.
    """
    query = db.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity.ilike(f"%{entity_type}%"))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if candidate_id:
        query = query.filter((AuditLog.entity_id == candidate_id) | (AuditLog.remarks.ilike(f"%{candidate_id}%")))
    if requirement_id:
        query = query.filter((AuditLog.entity_id == requirement_id) | (AuditLog.remarks.ilike(f"%{requirement_id}%")))
    if campaign_id:
        query = query.filter((AuditLog.campaign_id == campaign_id) | (AuditLog.entity_id == campaign_id))
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)
    if search:
        query = query.filter(
            AuditLog.action.ilike(f"%{search}%") |
            AuditLog.entity.ilike(f"%{search}%") |
            AuditLog.remarks.ilike(f"%{search}%") |
            AuditLog.user_name.ilike(f"%{search}%") |
            AuditLog.user_email.ilike(f"%{search}%")
        )

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append(HistoryLogResponse(
            id=str(l.id),
            entity_type=l.entity,
            entity_id=l.entity_id,
            action=l.action,
            user_id=l.user_id,
            user_name=l.user_name or l.user_email or "System",
            user_email=l.user_email,
            user_role=l.user_role,
            old_value=l.old_value,
            new_value=l.new_value,
            remarks=l.remarks,
            campaign_id=l.campaign_id,
            message_id=l.message_id,
            provider_ref_id=l.provider_ref_id,
            ip_address=l.ip_address or "127.0.0.1",
            user_agent=l.user_agent or "Web Browser",
            created_at=l.created_at
        ))
    return results

@router.get("/export")
def export_history_csv(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    """Exports filtered history logs to CSV."""
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity.ilike(f"%{entity_type}%"))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "History ID", "Date & Time (UTC)", "Action", "Entity Type", "Entity ID",
        "Changed By Name", "User Email", "User Role", "Remarks", "IP Address"
    ])

    for l in logs:
        writer.writerow([
            l.id,
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            l.action,
            l.entity,
            l.entity_id or "",
            l.user_name or l.user_email or "System",
            l.user_email or "",
            l.user_role or "",
            l.remarks or "",
            l.ip_address or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="recruitflow_history_audit.csv"'}
    )
