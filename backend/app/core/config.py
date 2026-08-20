import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RecruitFlow"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "RecruitFlow — Enterprise Recruitment Management & Applicant Tracking Platform"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "supersecretrecruitflowproductionjwtkeychangeinproduction"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:root@localhost:5432/recruitflow"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    
    # Storage
    STORAGE_TYPE: str = "local"  # 'local', 'minio', 's3'
    STORAGE_LOCAL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "recruitflow-documents"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_REDIS: bool = False
    
    # Initial Super Admin Seed
    INITIAL_SUPERADMIN_EMAIL: str = "admin@recruitflow.com"
    INITIAL_SUPERADMIN_PASSWORD: str = "AdminPassword123!"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
