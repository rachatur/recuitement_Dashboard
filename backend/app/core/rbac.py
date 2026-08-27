import enum
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    HR_RECRUITER = "HR_RECRUITER"
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"
    TEAM_LEAD = "TEAM_LEAD"
    CLIENT = "CLIENT"
    HIRING_MANAGER = "HIRING_MANAGER"
    VIEWER = "VIEWER"

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    from app.models import User
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")
    if user_id is None or token_type != "access":
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(
    current_user = Depends(get_current_user)
):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user = Depends(get_current_active_user)):
        # SUPER_ADMIN and HR_RECRUITER have full unrestricted access to all application features
        user_role = str(user.role.value if hasattr(user.role, 'value') else user.role)
        if user_role in [RoleEnum.SUPER_ADMIN.value, RoleEnum.SUPER_ADMIN, RoleEnum.HR_RECRUITER.value, RoleEnum.HR_RECRUITER]:
            return user
            
        allowed = [r.value if hasattr(r, 'value') else str(r) for r in self.allowed_roles]
        
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value if hasattr(r, 'value') else str(r) for r in self.allowed_roles]}. Your role: {user_role}"
            )
        return user

def require_roles(allowed_roles: List[RoleEnum]):
    return RoleChecker(allowed_roles)

def verify_client_access(user, client_id: str):
    """
    Ensures that if the user has role CLIENT or HIRING_MANAGER,
    they can only access data belonging to their assigned client_id.
    """
    user_role = str(user.role.value if hasattr(user.role, 'value') else user.role)
    if user_role in [RoleEnum.SUPER_ADMIN.value, RoleEnum.HR_RECRUITER.value, RoleEnum.ADMIN.value, RoleEnum.TEAM_LEAD.value, RoleEnum.RECRUITER.value]:
        return True
    
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if str(user.client_id) != str(client_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view candidates and requirements for your assigned client organization."
            )
    return True
