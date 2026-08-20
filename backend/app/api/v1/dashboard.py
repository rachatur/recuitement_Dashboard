from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, RoleEnum
from app.models import User
from app.schemas import DashboardSummaryResponse
from app.services.metrics_service import compute_dashboard_metrics

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardSummaryResponse)
def get_dashboard_data(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    client_id: Optional[str] = Query(None),
    recruiter_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Auto scope for CLIENT / HIRING_MANAGER
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        client_id = str(current_user.client_id) if current_user.client_id else "NONE"

    return compute_dashboard_metrics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        client_id=client_id,
        recruiter_id=recruiter_id,
        status_filter=status
    )
