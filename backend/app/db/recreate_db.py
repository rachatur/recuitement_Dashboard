import logging
from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.db.seed_data import seed_database
from app.models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recreate_and_seed():
    logger.info("Dropping all existing database tables with CASCADE...")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.commit()

    logger.info("Creating all tables afresh from enhanced models...")
    Base.metadata.create_all(bind=engine)

    logger.info("Seeding base database...")
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Base database seeded successfully.")
        
    finally:
        db.close()

if __name__ == "__main__":
    recreate_and_seed()
