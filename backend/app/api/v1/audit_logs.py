from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import require_roles, RoleEnum
from app.models import AuditLog, User
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logging"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    entity: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if search:
        query = query.filter(
            AuditLog.action.ilike(f"%{search}%") |
            AuditLog.entity.ilike(f"%{search}%") |
            AuditLog.user_email.ilike(f"%{search}%") |
            AuditLog.entity_id.ilike(f"%{search}%")
        )

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return [
        AuditLogResponse(
            id=str(l.id),
            user_id=str(l.user_id) if l.user_id else None,
            user_email=l.user_email,
            user_role=l.user_role,
            action=l.action,
            entity=l.entity,
            entity_id=str(l.entity_id) if l.entity_id else None,
            old_value=l.old_value,
            new_value=l.new_value,
            ip_address=l.ip_address,
            user_agent=l.user_agent,
            created_at=l.created_at
        ) for l in logs
    ]
