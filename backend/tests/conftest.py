import pytest
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import User, RoleEnum, Client, ClientStatusEnum

@pytest.fixture(scope="session", autouse=True)
def setup_test_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create test client if not present
        client = db.query(Client).filter(Client.client_code == "TEST-CLI").first()
        if not client:
            client = Client(
                client_code="TEST-CLI",
                name="Test NovaTech Solutions",
                status=ClientStatusEnum.ACTIVE
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        users_to_ensure = [
            ("admin@recruitflow.com", "AdminPassword123!", "System Admin", RoleEnum.SUPER_ADMIN, None),
            ("sarah.admin@recruitflow.com", "Password123!", "Sarah Admin", RoleEnum.ADMIN, None),
            ("alex.recruiter@recruitflow.com", "Password123!", "Alex Recruiter", RoleEnum.RECRUITER, None),
            ("david.client@novatech.com", "Password123!", "David Client", RoleEnum.CLIENT, client.id),
        ]

        for email, pwd, name, role, cid in users_to_ensure:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                u = User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    full_name=name,
                    role=role,
                    client_id=cid,
                    is_active=True
                )
                db.add(u)
        db.commit()
    finally:
        db.close()
