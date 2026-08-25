import os
import shutil
import uuid
import logging
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "text/plain"
}
MAX_FILE_SIZE_MB = 15
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.local_dir = settings.STORAGE_LOCAL_DIR
        os.makedirs(self.local_dir, exist_ok=True)
        self.minio_client = None
        
        if self.storage_type == "minio":
            try:
                from minio import Minio
                self.minio_client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE
                )
                # Ensure bucket exists
                if not self.minio_client.bucket_exists(settings.MINIO_BUCKET):
                    self.minio_client.make_bucket(settings.MINIO_BUCKET)
                logger.info("MinIO storage initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not connect to MinIO ({e}). Falling back to local storage.")
                self.storage_type = "local"

    def validate_file(self, file: UploadFile) -> Tuple[str, str]:
        """Validate file extension and mime type."""
        filename = file.filename or "unknown_document.pdf"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension: '{ext}'. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        return filename, ext

    async def save_file(
        self,
        file: UploadFile,
        candidate_id: str,
        version: int
    ) -> Tuple[str, str, int, str]:
        """
        Saves document file and returns (storage_path, file_url, file_size, mime_type).
        """
        filename, ext = self.validate_file(file)
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        mime_type = file.content_type or "application/octet-stream"
        unique_file_id = uuid.uuid4().hex[:8]
        safe_name = f"candidate_{candidate_id}_v{version}_{unique_file_id}{ext}"
        
        if self.storage_type == "minio" and self.minio_client:
            try:
                import io
                self.minio_client.put_object(
                    bucket_name=settings.MINIO_BUCKET,
                    object_name=f"candidates/{candidate_id}/{safe_name}",
                    data=io.BytesIO(content),
                    length=file_size,
                    content_type=mime_type
                )
                storage_path = f"candidates/{candidate_id}/{safe_name}"
                file_url = f"/api/v1/documents/download/{safe_name}"
                return storage_path, file_url, file_size, mime_type
            except Exception as e:
                logger.error(f"MinIO upload error: {e}. Saving locally instead.")
        
        # Local storage fallback
        candidate_dir = os.path.join(self.local_dir, "candidates", str(candidate_id))
        os.makedirs(candidate_dir, exist_ok=True)
        local_file_path = os.path.join(candidate_dir, safe_name)
        
        with open(local_file_path, "wb") as f:
            f.write(content)
            
        storage_path = os.path.relpath(local_file_path, self.local_dir)
        file_url = f"/api/v1/documents/download/{safe_name}?cid={candidate_id}"
        return storage_path, file_url, file_size, mime_type

    def get_local_path(self, candidate_id: Optional[str], safe_name: str) -> Optional[str]:
        if candidate_id:
            path = os.path.join(self.local_dir, "candidates", str(candidate_id), safe_name)
            if os.path.exists(path):
                return path
        # Search all candidate directories
        cand_root = os.path.join(self.local_dir, "candidates")
        if os.path.exists(cand_root):
            for root, _, files in os.walk(cand_root):
                if safe_name in files:
                    return os.path.join(root, safe_name)
        return None

storage_service = StorageService()
