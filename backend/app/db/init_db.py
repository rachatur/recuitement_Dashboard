import logging
from sqlalchemy.orm import Session
from app.core.database import engine, Base
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_db(db: Session = None):
    """
    Creates all database tables.
    """
    import app.models  # Ensure models are loaded
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
