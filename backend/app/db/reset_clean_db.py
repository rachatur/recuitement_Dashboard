import logging
from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import User, RoleEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_and_clean_database():
    """
    Resets the PostgreSQL database to a clean production state.
    Creates schema tables and inserts ONLY the primary Super Admin account.
    Removes all dummy clients, requirements, candidates, submissions, interviews, and offers.
    """
    logger.info("Dropping public schema and recreating cleanly in PostgreSQL...")
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))

    logger.info("Creating clean database schema tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        logger.info("Creating initial Super Admin user account...")
        admin = User(
            email="admin@recruitflow.com",
            hashed_password=get_password_hash("AdminPassword123!"),
            full_name="System Administrator",
            role=RoleEnum.SUPER_ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        logger.info("Clean database reset complete! Only admin@recruitflow.com exists.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating admin user: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_clean_database()
