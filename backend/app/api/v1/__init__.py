from fastapi import APIRouter
from app.api.v1 import (
    auth, users, clients, requirements, candidates,
    documents, submissions, interviews, client_feedback,
    offers, dashboard, analytics, audit_logs, notifications, ai_tools,
    bench, whatsapp, history
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(clients.router)
api_router.include_router(requirements.router)
api_router.include_router(candidates.router)
api_router.include_router(bench.router)
api_router.include_router(whatsapp.router)
api_router.include_router(history.router)
api_router.include_router(documents.router)
api_router.include_router(submissions.router)
api_router.include_router(interviews.router)
api_router.include_router(client_feedback.router)
api_router.include_router(offers.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(audit_logs.router)
api_router.include_router(notifications.router)
api_router.include_router(ai_tools.router)
