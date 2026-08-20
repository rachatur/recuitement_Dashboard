import json
import logging
from typing import Any, Optional, Dict
from fastapi import Request
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def log_audit_event(
    db: Session,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    user: Optional[Any] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Creates an immutable audit log record in the database.
    """
    from app.models import AuditLog
    
    try:
        user_id = str(user.id) if user and hasattr(user, 'id') else None
        user_email = user.email if user and hasattr(user, 'email') else "SYSTEM"
        user_role = str(user.role.value if hasattr(user.role, 'value') else user.role) if user and hasattr(user, 'role') else "SYSTEM"
        
        # Extract IP and User Agent from request if provided
        if request:
            if not ip_address:
                ip_address = request.client.host if request.client else "127.0.0.1"
            if not user_agent:
                user_agent = request.headers.get("user-agent", "Unknown")
        
        audit_entry = AuditLog(
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id else None,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address or "127.0.0.1",
            user_agent=user_agent or "Web Browser"
        )
        db.add(audit_entry)
        db.commit()
        return audit_entry
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record audit log event {action} for {entity}: {e}")
        return None
