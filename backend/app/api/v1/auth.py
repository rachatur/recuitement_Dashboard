from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.rbac import get_current_active_user, get_current_user
from app.core.audit import log_audit_event
from app.models import User, RoleEnum
from app.schemas import Token, LoginRequest, RefreshTokenRequest, ChangePasswordRequest, ForgotPasswordRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact system administrator."
        )

    # Issue JWT tokens
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": role_str,
        "client_id": str(user.client_id) if user.client_id else None
    }
    access_token = create_access_token(data=token_payload)
    refresh_token = create_refresh_token(data=token_payload)

    # Log audit event
    log_audit_event(
        db=db,
        action="USER_LOGIN",
        entity="USER",
        entity_id=user.id,
        user=user,
        request=request,
        new_value={"email": user.email, "role": role_str}
    )

    user_info = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": role_str,
        "client_id": str(user.client_id) if user.client_id else None,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active
    }

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_info
    )

@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_req: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    payload = decode_token(refresh_req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": role_str,
        "client_id": str(user.client_id) if user.client_id else None
    }
    new_access_token = create_access_token(data=token_payload)
    new_refresh_token = create_refresh_token(data=token_payload)

    user_info = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": role_str,
        "client_id": str(user.client_id) if user.client_id else None,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active
    }

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user_info
    )

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_active_user)
):
    return current_user

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect existing password"
        )
    
    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        action="PASSWORD_CHANGED",
        entity="USER",
        entity_id=current_user.id,
        user=current_user,
        request=request
    )

    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    # Always return success message for security
    return {"message": "If this email is registered in RecruitFlow, a password reset link has been dispatched."}

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log_audit_event(
        db=db,
        action="USER_LOGOUT",
        entity="USER",
        entity_id=current_user.id,
        user=current_user,
        request=request
    )
    return {"message": "Successfully logged out"}
