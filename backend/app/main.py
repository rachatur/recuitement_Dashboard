import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import SessionLocal
from app.db.init_db import init_db
from app.db.seed_data import seed_database
from app.api.v1 import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("recruitflow")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Schema
    logger.info("Initializing RecruitFlow database schema...")
    db = SessionLocal()
    try:
        init_db(db)
        # Ensure at least the primary super admin exists
        from app.models import User, RoleEnum
        from app.core.security import get_password_hash
        existing_admin = db.query(User).filter(User.email == "admin@recruitflow.com").first()
        if not existing_admin:
            admin = User(
                email="admin@recruitflow.com",
                hashed_password=get_password_hash("AdminPassword123!"),
                full_name="System Administrator",
                role=RoleEnum.SUPER_ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            logger.info("Created default system administrator: admin@recruitflow.com")
    except Exception as e:
        logger.error(f"Error during startup database initialization: {e}")
    finally:
        db.close()
    yield
    # Shutdown
    logger.info("Shutting down RecruitFlow application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "recruitflow-backend"}
