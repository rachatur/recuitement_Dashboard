import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import engine, Base
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_db(db: Session = None):
    """
    Creates all database tables and ensures schema columns are up to date.
    """
    import app.models  # Ensure models are loaded
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    # Apply incremental column migrations for PostgreSQL
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE job_requirements ADD COLUMN IF NOT EXISTS hold_date TIMESTAMP;"))
            conn.execute(text("ALTER TABLE job_requirements ADD COLUMN IF NOT EXISTS closed_date TIMESTAMP;"))
            conn.execute(text("ALTER TABLE job_requirements ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS employment_history JSONB DEFAULT '[]'::jsonb;"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Column migration warning (safe to ignore if non-pg): {e}")

    logger.info("Database tables created and synchronized successfully.")

