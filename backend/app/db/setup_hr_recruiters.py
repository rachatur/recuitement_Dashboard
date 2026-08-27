import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, RoleEnum, Candidate, JobRequirement, WhatsAppConversation
from app.core.security import get_password_hash

def setup_users_in_db(db_url: str, db_label: str):
    print(f"\n================ Setting up HR Recruiters in {db_label} ================")
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    now = datetime.now(timezone.utc)

    try:
        # 1. Ensure Super Admin
        admin = db.query(User).filter(User.email == "admin@recruitflow.com").first()
        if not admin:
            admin = User(
                email="admin@recruitflow.com",
                hashed_password=get_password_hash("AdminPassword123!"),
                full_name="System Administrator",
                role=RoleEnum.SUPER_ADMIN,
                is_active=True
            )
            db.add(admin)
            db.flush()
        print(f"[{db_label}] Super Admin verified: {admin.email}")

        # 2. HR Recruiter 1: Madhavi Singh
        madhavi = db.query(User).filter(User.email == "madhavi.singh@ethxsoftcon.com").first()
        if not madhavi:
            madhavi = User(
                email="madhavi.singh@ethxsoftcon.com",
                hashed_password=get_password_hash("Password123!"),
                full_name="Madhavi Singh",
                role=RoleEnum.HR_RECRUITER,
                phone="+919876500001",
                is_active=True
            )
            db.add(madhavi)
            db.flush()
        else:
            madhavi.role = RoleEnum.HR_RECRUITER
            madhavi.full_name = "Madhavi Singh"
            madhavi.is_active = True
            madhavi.hashed_password = get_password_hash("Password123!")
            db.flush()
        print(f"[{db_label}] HR Recruiter 1 active: {madhavi.full_name} ({madhavi.email}) - Role: {madhavi.role}")

        # 3. HR Recruiter 2: Niky Sharma
        niky = db.query(User).filter(User.email == "niky.sharma@ethxsoftcon.com").first()
        if not niky:
            niky = User(
                email="niky.sharma@ethxsoftcon.com",
                hashed_password=get_password_hash("Password123!"),
                full_name="Niky Sharma",
                role=RoleEnum.HR_RECRUITER,
                phone="+919876500002",
                is_active=True
            )
            db.add(niky)
            db.flush()
        else:
            niky.role = RoleEnum.HR_RECRUITER
            niky.full_name = "Niky Sharma"
            niky.is_active = True
            niky.hashed_password = get_password_hash("Password123!")
            db.flush()
        print(f"[{db_label}] HR Recruiter 2 active: {niky.full_name} ({niky.email}) - Role: {niky.role}")

        # 4. Remove / deactivate other demo/unused user accounts (e.g. sarah.admin, alex.recruiter, david.client)
        allowed_emails = ["admin@recruitflow.com", "madhavi.singh@ethxsoftcon.com", "niky.sharma@ethxsoftcon.com"]
        other_users = db.query(User).filter(~User.email.in_(allowed_emails)).all()
        for u in other_users:
            print(f"[{db_label}] Deactivating non-essential user account: {u.email} (Role: {u.role})")
            u.is_active = False

        db.commit()
        print(f"[{db_label}] Successfully configured HR Recruiters with full application access!")
    except Exception as e:
        db.rollback()
        print(f"[{db_label}] Error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    # Update Docker PostgreSQL
    setup_users_in_db("postgresql://postgres:root@localhost:5433/recruitflow", "Docker PostgreSQL (Port 5433)")

    # Update Local PostgreSQL
    setup_users_in_db("postgresql://postgres:root@localhost:5432/recruitflow", "Local Windows PostgreSQL (Port 5432)")
