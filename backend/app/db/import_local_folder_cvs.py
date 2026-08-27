"""
Bulk Local Folder CV Importer CLI Tool for RecruitFlow
Usage:
    python -m app.db.import_local_folder_cvs "C:\\path\\to\\cv_folder" [--duplicate-action skip|update|create_anyway] [--max-workers 8]
"""

import os
import sys
import argparse
import uuid
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session

# Setup project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core.database import SessionLocal
from app.models import (
    Candidate, CandidateDocument, CandidateStatusHistory, User,
    CandidateStatusEnum, RoleEnum, WhatsAppConsentStatusEnum, BenchStatusEnum
)
from app.services.cv_extraction_service import (
    extract_text_from_file, parse_candidate_from_text,
    validate_whatsapp_eligibility, check_candidate_duplicate
)
from app.core.storage import storage_service

VALID_EXTS = {'.pdf', '.doc', '.docx', '.txt'}

def process_single_cv_file(file_path: str, duplicate_action: str, default_recruiter_id: str):
    """
    Reads a single CV file from disk, parses information, checks duplicates,
    and inserts Candidate & CandidateDocument into the database.
    """
    file_name = os.path.basename(file_path)
    ext = os.path.splitext(file_name)[1].lower()
    
    if ext not in VALID_EXTS or file_name.startswith('.'):
        return {"status": "Skipped", "file": file_name, "reason": "Unsupported format"}

    db: Session = SessionLocal()
    try:
        with open(file_path, "rb") as f:
            content = f.read()

        raw_text = extract_text_from_file(content, file_name)
        parsed = parse_candidate_from_text(raw_text, file_name)

        email = parsed.get("email") or f"cand_{uuid.uuid4().hex[:8]}@recruitflow.talent"
        phone = parsed.get("phone") or ""
        whatsapp_num = parsed.get("whatsapp_number") or phone
        fname = parsed.get("first_name") or "Extracted"
        lname = parsed.get("last_name") or "Candidate"

        is_dup, dup_cand, dup_reason = check_candidate_duplicate(
            db=db, email=email, phone=phone, whatsapp_number=whatsapp_num,
            first_name=fname, last_name=lname
        )

        if is_dup:
            if duplicate_action == "skip":
                return {
                    "status": "Duplicate",
                    "file": file_name,
                    "name": f"{dup_cand.first_name} {dup_cand.last_name}" if dup_cand else f"{fname} {lname}",
                    "email": email,
                    "reason": dup_reason
                }
            elif duplicate_action == "update" and dup_cand:
                dup_cand.skills = list(set((dup_cand.skills or []) + parsed.get("skills", [])))
                if parsed.get("total_experience"):
                    dup_cand.total_experience = max(dup_cand.total_experience or 0.0, parsed["total_experience"])
                db.commit()
                return {
                    "status": "Updated",
                    "file": file_name,
                    "name": f"{dup_cand.first_name} {dup_cand.last_name}",
                    "email": dup_cand.email
                }

        # Create new candidate
        code = f"CAN-{uuid.uuid4().hex[:6].upper()}"
        cand = Candidate(
            candidate_code=code,
            first_name=fname,
            last_name=lname,
            email=email,
            phone=phone,
            whatsapp_number=whatsapp_num,
            country_code=parsed.get("country_code", "+91"),
            location=parsed.get("location", ""),
            total_experience=parsed.get("total_experience", 2.0),
            relevant_experience=parsed.get("relevant_experience", 2.0),
            current_company=parsed.get("current_company", ""),
            current_designation=parsed.get("current_designation", "Software Engineer"),
            skills=parsed.get("skills", []),
            technical_skills=parsed.get("technical_skills", []),
            education=parsed.get("education", "Bachelor's Degree"),
            highest_qualification=parsed.get("highest_qualification", "Bachelor's Degree"),
            notice_period=parsed.get("notice_period", "30 Days"),
            linkedin_url=parsed.get("linkedin_url", ""),
            github_url=parsed.get("github_url", ""),
            source="Local Folder Bulk Upload",
            status=CandidateStatusEnum.RECEIVED,
            bench_status=BenchStatusEnum.AVAILABLE,
            whatsapp_consent_status=WhatsAppConsentStatusEnum.GRANTED,
            recruiter_id=default_recruiter_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(cand)
        db.flush()

        # Save document storage record
        storage_filename = f"candidates/{cand.id}/{uuid.uuid4().hex}_{file_name}"
        try:
            stored_path = storage_service.save_file_bytes(content, storage_filename)
        except Exception:
            stored_path = storage_filename

        doc = CandidateDocument(
            candidate_id=cand.id,
            file_name=file_name,
            file_path=stored_path,
            file_size_bytes=len(content),
            mime_type="application/pdf" if ext == ".pdf" else "application/octet-stream",
            document_type="CV",
            extracted_text=raw_text[:2000] if raw_text else None,
            version_number=1,
            uploaded_by_id=default_recruiter_id,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(doc)

        hist = CandidateStatusHistory(
            candidate_id=cand.id,
            from_status=None,
            to_status=CandidateStatusEnum.RECEIVED,
            changed_by_id=default_recruiter_id,
            notes="Imported via Local Bulk CV Ingester"
        )
        db.add(hist)
        db.commit()

        return {
            "status": "Success",
            "file": file_name,
            "name": f"{fname} {lname}",
            "email": email,
            "phone": phone
        }

    except Exception as e:
        db.rollback()
        return {"status": "Failed", "file": file_name, "error": str(e)}
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Bulk Import 5,000+ CVs from a local folder into RecruitFlow.")
    parser.add_argument("folder_path", help="Local directory path containing candidate CVs")
    parser.add_argument("--duplicate-action", choices=["skip", "update", "create_anyway"], default="skip", help="Strategy for duplicate candidates")
    parser.add_argument("--max-workers", type=int, default=8, help="Number of concurrent worker threads")
    args = parser.parse_args()

    folder = os.path.abspath(args.folder_path)
    if not os.path.isdir(folder):
        print(f"[ERROR] Directory does not exist: {folder}")
        sys.exit(1)

    print(f"\n=======================================================")
    print(f"   RecruitFlow 5,000+ Bulk Resume Folder Ingester")
    print(f"=======================================================")
    print(f"  Target Folder: {folder}")
    print(f"  Duplicate Action: {args.duplicate_action}")
    print(f"  Concurrent Threads: {args.max_workers}\n")

    # Find recruiter ID
    db = SessionLocal()
    recruiter = db.query(User).filter(User.role.in_([RoleEnum.HR_RECRUITER, RoleEnum.SUPER_ADMIN])).first()
    recruiter_id = str(recruiter.id) if recruiter else None
    db.close()

    # Discover all CV files recursively or flat
    all_files = []
    for root, _, files in os.walk(folder):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in VALID_EXTS and not file.startswith('.'):
                all_files.append(os.path.join(root, file))

    total = len(all_files)
    print(f"[INFO] Found {total:,} valid CV documents in folder.\n")

    if total == 0:
        print("[WARNING] No PDF/DOC/DOCX files found.")
        sys.exit(0)

    success_cnt = 0
    dup_cnt = 0
    fail_cnt = 0
    processed = 0

    print(f"[START] Processing {total:,} resumes concurrently...\n")

    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        futures = {
            executor.submit(process_single_cv_file, fp, args.duplicate_action, recruiter_id): fp
            for fp in all_files
        }

        for future in as_completed(futures):
            res = future.result()
            processed += 1
            st = res.get("status")
            if st == "Success":
                success_cnt += 1
            elif st in ("Duplicate", "Updated"):
                dup_cnt += 1
            else:
                fail_cnt += 1

            if processed % 25 == 0 or processed == total:
                pct = int((processed / total) * 100)
                print(f"  [{pct:3d}%] Processed {processed:,}/{total:,} | Success: {success_cnt:,} | Duplicates: {dup_cnt:,} | Failed: {fail_cnt:,}")

    print("\n=======================================================")
    print(f"   Bulk Import Complete!")
    print(f"=======================================================")
    print(f"  Total Files Processed : {total:,}")
    print(f"  Successfully Added    : {success_cnt:,}")
    print(f"  Duplicates Handled    : {dup_cnt:,}")
    print(f"  Failed Files          : {fail_cnt:,}")
    print(f"=======================================================\n")

if __name__ == "__main__":
    main()
