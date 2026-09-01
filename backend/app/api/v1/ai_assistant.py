from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user
from app.models import User
from app.schemas import AIAssistantChatRequest, AIAssistantChatResponse
from app.services.ai_assistant_service import process_assistant_message

router = APIRouter(prefix="/ai-assistant", tags=["AI Copilot & Assistant"])

@router.post("/chat", response_model=AIAssistantChatResponse)
def chat_with_ai_assistant(
    req: AIAssistantChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    RecruitFlow conversational AI assistant endpoint.
    Answers recruiting queries, talent searches, outreach drafting,
    JD generation, interview prep, and live recruitment analytics.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message prompt cannot be empty.")

    result = process_assistant_message(
        db=db,
        message=req.message,
        candidate_id=req.candidate_id,
        requirement_id=req.requirement_id,
        mode=req.mode
    )

    return AIAssistantChatResponse(
        reply=result["reply"],
        intent=result.get("intent", "general"),
        data=result.get("data", {}),
        suggested_prompts=result.get("suggested_prompts", [])
    )

@router.get("/quick-prompts")
def get_quick_prompts(
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns categorized starter prompts for recruiters.
    """
    return [
        {
            "category": "Talent Sourcing",
            "icon": "Search",
            "prompts": [
                "Find Python & FastAPI developers with 3+ years experience",
                "Show all candidates currently on Bench Pool",
                "Find React & TypeScript engineers in Pune",
                "Find Lead DevOps architects with AWS & Kubernetes"
            ]
        },
        {
            "category": "Candidate Outreach",
            "icon": "MessageSquare",
            "prompts": [
                "Draft a high-converting WhatsApp message for an immediate joiner",
                "Write an interview invitation email for Senior Backend Role",
                "Draft a polite follow-up message for candidates who haven't replied",
                "Generate a cold outreach message highlighting competitive benefits"
            ]
        },
        {
            "category": "Job Descriptions",
            "icon": "FileText",
            "prompts": [
                "Write a JD for Senior Cloud DevOps Engineer",
                "Create a Job Description for Full Stack React & Node.js Developer",
                "Generate JD for Lead QA Automation Engineer with Playwright",
                "Write a modern JD for Technical Recruiter / Talent Specialist"
            ]
        },
        {
            "category": "Interview Preparation",
            "icon": "CalendarCheck",
            "prompts": [
                "Generate 5 technical screening questions for React + TypeScript",
                "Generate System Design interview questions for Python Microservices",
                "Generate behavioral questions (STAR method) for Engineering Lead",
                "Create an interview evaluation scorecard for Senior QA Engineer"
            ]
        },
        {
            "category": "Pipeline Intelligence",
            "icon": "BarChart3",
            "prompts": [
                "Give me a recruitment pipeline summary and current metrics",
                "What are our active open job requirements?",
                "Generate Boolean search string for Java Spring Boot microservices",
                "How many candidates are currently in interview stages?"
            ]
        }
    ]
