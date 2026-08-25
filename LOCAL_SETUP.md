# RecruitFlow Local Setup

This guide runs the FastAPI backend and React frontend locally on Windows, Linux, or macOS.

## Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer and npm
- PostgreSQL 17 running on `localhost:5432`
- Git

The default database settings are:

- Database: `recruitflow`
- User: `postgres`
- Password: `root`

Create the database if it does not already exist:

```sql
CREATE DATABASE recruitflow;
```

You can also run PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

## Backend

Open a terminal at the repository root.

### Windows PowerShell

```powershell
cd backend
..\venv\Scripts\python.exe -m pip install -r requirements.txt
..\venv\Scripts\python.exe -m app.db.recreate_db
..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

If the root `venv` does not exist, create it first:

```powershell
cd backend
python -m venv ..\venv
..\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m app.db.recreate_db
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Linux or macOS

```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
python -m app.db.recreate_db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Frontend

Open a second terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

The Vite development server proxies `/api` requests to `http://localhost:8000`. Keep the backend running while using the frontend.

## Test Login

After running `recreate_db`, use:

- Email: `admin@recruitflow.com`
- Password: `AdminPassword123!`

The clean test database contains one admin, one test client, one test job requirement containing the seeded JD, and one test candidate. `recreate_db` drops existing development data before recreating this test setup.

## Uploads

- Candidate CV upload supports PDF, DOC, DOCX, and TXT files.
- Job description attachments support PDF, DOC, DOCX, and TXT files.
- Maximum upload size is 15 MB.
- Local uploads are stored under `backend/uploads/`.

## Run Tests

With the backend virtual environment activated:

```powershell
cd backend
..\venv\Scripts\python.exe -m pytest -v
```

## Docker Option

To run the complete stack with PostgreSQL, Redis, MinIO, backend, and frontend:

```bash
docker compose up --build
```

Then open:

- Dashboard: `http://localhost`
- API docs: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001`
