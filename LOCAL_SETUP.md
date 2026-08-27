# RecruitFlow — Local Setup & Development Guide

This guide covers running the FastAPI backend and React frontend locally or using Docker on Windows, Linux, and macOS.

---

## 📋 System Prerequisites

- **Python 3.11** or newer
- **Node.js 18** or newer and npm
- **PostgreSQL 17** (Local service on port `5432` or Docker container on port `5433`)
- **Git**

---

## 🗄️ Database Setup

Default PostgreSQL connection credentials:
- **Host**: `localhost`
- **Port**: `5432` (or `5433` if using Docker Compose)
- **Database**: `recruitflow`
- **User**: `postgres`
- **Password**: `root`

To create the database locally:
```sql
CREATE DATABASE recruitflow;
```

---

## 🚀 Running Locally (Without Docker)

### 1. Backend Setup

Open a terminal in the project directory:

#### Windows PowerShell:
```powershell
cd backend
python -m venv ..\venv
..\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

# Provision database tables & seed initial data:
python -m app.db.recreate_db
python -m app.db.setup_hr_recruiters

# Launch FastAPI server:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Linux / macOS:
```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

# Provision database tables & seed initial data:
python -m app.db.recreate_db
python -m app.db.setup_hr_recruiters

# Launch FastAPI server:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend URLs:
- **API Base**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

### 2. Frontend Setup

Open a second terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

- **Application URL**: `http://localhost:5173` (Vite dev server proxies `/api` requests to `http://localhost:8000`)

---

## 🐳 Running with Docker (Recommended)

To run the complete production-grade stack (PostgreSQL, Redis, MinIO, Backend, and Frontend) in one command:

```bash
docker compose up -d --build
```

Access Points:
- **Web Dashboard**: `http://localhost`
- **Backend Swagger Docs**: `http://localhost:8000/docs`
- **MinIO Object Storage Console**: `http://localhost:9001` (User: `minioadmin`, Pass: `minioadmin123`)

---

## 👥 Default Login Accounts

### 1. Super Admin
- **Email**: `admin@recruitflow.com`
- **Password**: `AdminPassword123!`

### 2. HR Recruiters (Full Application Access)
- **Madhavi Singh**: `madhavi.singh@ethxsoftcon.com` (Password: `Password123!`)
- **Niky Sharma**: `niky.sharma@ethxsoftcon.com` (Password: `Password123!`)

---

## ✨ Core Features & Module Overview

1. **Unified Candidate Search**:
   - Search across **Candidate Name**, **Mobile / WhatsApp Number**, **Skills**, **Designation**, **Experience (Years)**, **Current Company**, and **Candidate Code**.
   - Filter by **Experience Brackets** (`0-1`, `1-3`, `3-5`, `5-8`, `8-12`, `12+` years), **Lifecycle Status**, and **WhatsApp Outreach Status**.

2. **Bulk CV & Entire Folder Upload**:
   - Select multiple CV files or an **Entire Folder** (with recursive path normalization).
   - Real-time progress bar with duplicate detection (`skip`, `update`, `create_anyway`).

3. **Checkbox Selection & Batch Client Submission**:
   - **Select All** / Individual candidate checkboxes.
   - Floating Action Bar for batch submission to open **Job Requirements / Clients**.
   - Date-wise submission tracking with client name, role, recruiter, and status.

4. **WhatsApp Direct & Campaign Outreach**:
   - Direct messaging with approved templates or custom text.
   - Compliance consent management (`GRANTED`, `REVOKED`, `OPTED_OUT`).
   - Meta Graph API integration.

5. **Candidate Lifecycle & Date-Wise Timeline**:
   - Full date-wise audit history of every candidate status change, CV submission, interview scorecard, and recruiter note.

---

## 🧪 Running Tests

With the backend virtual environment activated:
```powershell
cd backend
pytest -v
```
