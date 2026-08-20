import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notification, NotificationTypeEnum, User

logger = logging.getLogger(__name__)

def create_notification(
    db: Session,
    recipient_id: str,
    title: str,
    message: str,
    notification_type: NotificationTypeEnum = NotificationTypeEnum.SYSTEM_ALERT,
    reference_entity: Optional[str] = None,
    reference_id: Optional[str] = None
) -> Optional[Notification]:
    """Create a new notification for a specific user."""
    try:
        notification = Notification(
            recipient_id=recipient_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
            reference_entity=reference_entity,
            reference_id=str(reference_id) if reference_id else None
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create notification for {recipient_id}: {e}")
        return None

def broadcast_role_notification(
    db: Session,
    roles: list,
    title: str,
    message: str,
    notification_type: NotificationTypeEnum = NotificationTypeEnum.SYSTEM_ALERT,
    reference_entity: Optional[str] = None,
    reference_id: Optional[str] = None
):
    """Send notification to all active users with matching roles."""
    users = db.query(User).filter(User.role.in_(roles), User.is_active == True).all()
    for u in users:
        create_notification(
            db=db,
            recipient_id=u.id,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_entity=reference_entity,
            reference_id=reference_id
        )
