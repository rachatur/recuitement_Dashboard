from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.rbac import get_current_active_user, require_roles, RoleEnum
from app.core.audit import log_audit_event
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if client_id:
        query = query.filter(User.client_id == client_id)
    return query.order_by(User.created_at.desc()).all()

@router.get("/recruiters", response_model=List[UserResponse])
def get_recruiters(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Available to any authenticated user to populate recruiter dropdowns."""
    return db.query(User).filter(
        User.role.in_([RoleEnum.HR_RECRUITER, RoleEnum.RECRUITER, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
        User.is_active == True
    ).all()

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.TEAM_LEAD])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        client_id=user_in.client_id,
        phone=user_in.phone,
        avatar_url=user_in.avatar_url,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="USER_CREATED",
        entity="USER",
        entity_id=new_user.id,
        user=current_user,
        request=request,
        new_value={"email": new_user.email, "role": str(new_user.role), "name": new_user.full_name}
    )

    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_state = {"email": user.email, "role": str(user.role), "is_active": user.is_active}

    if user_in.email is not None:
        user.email = user_in.email.lower().strip()
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.client_id is not None:
        user.client_id = user_in.client_id
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.avatar_url is not None:
        user.avatar_url = user_in.avatar_url
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="USER_UPDATED",
        entity="USER",
        entity_id=user.id,
        user=current_user,
        request=request,
        old_value=old_state,
        new_value={"email": user.email, "role": str(user.role), "is_active": user.is_active}
    )

    return user
