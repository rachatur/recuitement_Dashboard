import logging
import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models import (
    User, RoleEnum, Candidate, JobRequirement, Client,
    WhatsAppIntegration, WhatsAppTemplate, WhatsAppCampaign, WhatsAppCampaignRecipient,
    WhatsAppConversation, WhatsAppMessage, WhatsAppConsent, WhatsAppOptOut,
    BenchResource, AuditLog,
    BenchStatusEnum, WhatsAppConsentStatusEnum, WhatsAppCampaignTypeEnum,
    WhatsAppCampaignStatusEnum, WhatsAppMessageStatusEnum, WhatsAppMessageDirectionEnum,
    WhatsAppMessageTypeEnum, WhatsAppTemplateCategoryEnum, WhatsAppTemplateStatusEnum,
    WhatsAppConversationStatusEnum, WhatsAppResponseCategoryEnum, WhatsAppRecipientEligibilityEnum,
    PositionStatusEnum
)

logger = logging.getLogger(__name__)

def seed_whatsapp_and_bench_data(db: Session):
    Base.metadata.create_all(bind=engine)
    now = datetime.now(timezone.utc)

    admin_user = db.query(User).filter(User.role == RoleEnum.SUPER_ADMIN).first()
    recruiter_user = db.query(User).filter(User.role == RoleEnum.RECRUITER).first() or admin_user
    if not admin_user:
        admin_user = db.query(User).first()

    # 1. WhatsApp Integration Settings
    integration = db.query(WhatsAppIntegration).first()
    if not integration:
        integration = WhatsAppIntegration(
            provider="MOCK_SIMULATOR",
            business_account_id="WABA_1092837482910",
            phone_number_id="PHONE_919876543210",
            api_base_url="https://graph.facebook.com/v20.0",
            webhook_url="/api/v1/whatsapp/webhook",
            webhook_verify_token="recruitflow_verify_token_secure_2026",
            default_country_code="+91",
            message_limit_per_day=1000,
            rate_limit_per_second=20,
            business_hours_start="09:00",
            business_hours_end="19:00",
            retry_policy_max_retries=3,
            default_recruiter_signature="— Talent Acquisition Team, RecruitFlow",
            is_connected=True,
            connection_status="Connected",
            last_test_date=now
        )
        db.add(integration)
        db.commit()

    # 2. WhatsApp Approved Message Templates
    templates_data = [
        {
            "name": "job_opportunity_outreach_v1",
            "category": WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION,
            "language": "en_US",
            "header_type": "TEXT",
            "header_text": "🌟 Exciting Career Opportunity",
            "body_text": "Hi {{candidate_name}},\n\nWe came across your impressive profile with {{experience}} and thought you would be an excellent fit for the *{{job_title}}* role at *{{client_name}}* in {{location}}.\n\nWould you be open to exploring this opportunity?",
            "footer_text": "Reply YES if interested, or STOP to unsubscribe.",
            "buttons": [
                {"type": "QUICK_REPLY", "text": "YES, Interested"},
                {"type": "QUICK_REPLY", "text": "Not at this time"}
            ],
            "variables": ["candidate_name", "experience", "job_title", "client_name", "location"]
        },
        {
            "name": "interview_availability_check_v1",
            "category": WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION,
            "language": "en_US",
            "header_type": "TEXT",
            "header_text": "📅 Interview Schedule Request",
            "body_text": "Hello {{candidate_name}},\n\nGreat news! The engineering team at *{{client_name}}* was impressed with your profile for the *{{job_title}}* position and would like to schedule a technical discussion.\n\nPlease let us know if {{interview_date}} works for you.",
            "footer_text": "Reply to confirm or suggest another time slot.",
            "buttons": [
                {"type": "QUICK_REPLY", "text": "Confirm Slot"},
                {"type": "QUICK_REPLY", "text": "Reschedule"}
            ],
            "variables": ["candidate_name", "client_name", "job_title", "interview_date"]
        },
        {
            "name": "bench_immediate_availability_v1",
            "category": WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION,
            "language": "en_US",
            "header_type": "TEXT",
            "header_text": "⚡ Immediate Project Opportunity",
            "body_text": "Hi {{candidate_name}},\n\nWe have an immediate client deployment opening for a *{{job_title}}* matching your expertise in {{skills}}.\n\nAs you are currently on our priority bench, we can fast-track client presentation. Are you ready for submission?",
            "footer_text": "Reply STOP to unsubscribe.",
            "buttons": [
                {"type": "QUICK_REPLY", "text": "Yes, submit my CV"},
                {"type": "QUICK_REPLY", "text": "Share JD first"}
            ],
            "variables": ["candidate_name", "job_title", "skills"]
        },
        {
            "name": "talent_pool_reengagement_v1",
            "category": WhatsAppTemplateCategoryEnum.MARKETING,
            "language": "en_US",
            "header_type": "TEXT",
            "header_text": "👋 RecruitFlow Talent Network",
            "body_text": "Hello {{candidate_name}},\n\nHope you're doing well! We're updating our active engineering talent network for Q3/Q4 hiring.\n\nAre you currently open to hearing about new Full-Time or Contract roles in {{location}}?",
            "footer_text": "Reply STOP to opt-out anytime.",
            "buttons": [
                {"type": "QUICK_REPLY", "text": "Yes, I am looking"},
                {"type": "QUICK_REPLY", "text": "Not right now"}
            ],
            "variables": ["candidate_name", "location"]
        }
    ]

    for td in templates_data:
        existing_t = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.template_name == td["name"]).first()
        if not existing_t:
            tmpl = WhatsAppTemplate(
                template_name=td["name"],
                category=td["category"],
                language=td["language"],
                provider_template_id=f"waba_tmpl_{uuid.uuid4().hex[:8]}",
                header_type=td["header_type"],
                header_text=td["header_text"],
                body_text=td["body_text"],
                footer_text=td["footer_text"],
                buttons=td["buttons"],
                variables=td["variables"],
                status=WhatsAppTemplateStatusEnum.APPROVED,
                created_by_id=admin_user.id if admin_user else None,
                approved_by_id=admin_user.id if admin_user else None
            )
            db.add(tmpl)
    db.commit()

    # 3. Update Existing Candidates with Realistic WhatsApp & Bench Data
    candidates = db.query(Candidate).all()
    bench_statuses = [
        BenchStatusEnum.AVAILABLE, BenchStatusEnum.AVAILABLE, BenchStatusEnum.PARTIALLY_AVAILABLE,
        BenchStatusEnum.ALLOCATED, BenchStatusEnum.INTERVIEWING, BenchStatusEnum.ON_HOLD
    ]

    for idx, cand in enumerate(candidates):
        cand.country_code = "+91"
        if not cand.whatsapp_number:
            cand.whatsapp_number = f"+9198{random.randint(10000000, 99999999)}"
            cand.phone = cand.whatsapp_number

        # Distribute consent statuses
        if idx % 5 == 0:
            cand.whatsapp_consent_status = WhatsAppConsentStatusEnum.PENDING
            cand.whatsapp_opt_out_status = False
        elif idx % 7 == 0:
            cand.whatsapp_consent_status = WhatsAppConsentStatusEnum.OPTED_OUT
            cand.whatsapp_opt_out_status = True
            cand.do_not_contact_reason = "Candidate opted out via STOP keyword"
        else:
            cand.whatsapp_consent_status = WhatsAppConsentStatusEnum.GRANTED
            cand.whatsapp_consent_source = "Direct Job Application Consent"
            cand.whatsapp_consent_date = now - timedelta(days=random.randint(5, 45))
            cand.whatsapp_opt_out_status = False

        # Assign Bench Status for several candidates
        if idx % 2 == 0:
            b_status = bench_statuses[idx % len(bench_statuses)]
            cand.bench_status = b_status
            cand.bench_availability_date = now + timedelta(days=random.randint(0, 30))
            cand.bench_primary_skills = cand.skills[:4] if cand.skills else ["Python", "FastAPI", "React"]
            cand.bench_secondary_skills = cand.skills[4:] if cand.skills and len(cand.skills) > 4 else ["PostgreSQL", "Docker"]

            # Create or update BenchResource record
            bench_rec = cand.bench_resource
            if not bench_rec:
                bench_rec = BenchResource(
                    candidate_id=cand.id,
                    bench_status=b_status,
                    primary_skills=cand.bench_primary_skills,
                    secondary_skills=cand.bench_secondary_skills,
                    availability_date=cand.bench_availability_date,
                    recruiter_id=recruiter_user.id if recruiter_user else None
                )
                db.add(bench_rec)
            else:
                bench_rec.bench_status = b_status
                bench_rec.availability_date = cand.bench_availability_date

    db.commit()

    # 4. Seed Opt-Out List Entries
    opt_cands = db.query(Candidate).filter(Candidate.whatsapp_opt_out_status == True).all()
    for oc in opt_cands:
        existing_opt = db.query(WhatsAppOptOut).filter(WhatsAppOptOut.whatsapp_number == oc.whatsapp_number).first()
        if not existing_opt and oc.whatsapp_number:
            opt = WhatsAppOptOut(
                candidate_id=oc.id,
                whatsapp_number=oc.whatsapp_number,
                opt_out_source="INCOMING_KEYWORD_STOP",
                reason="Candidate texted STOP",
                recorded_by_id=admin_user.id if admin_user else None,
                is_active=True
            )
            db.add(opt)
    db.commit()

    # 5. Seed Sample WhatsApp Campaigns
    req1 = db.query(JobRequirement).first()
    template1 = db.query(WhatsAppTemplate).first()
    if req1 and template1 and recruiter_user:
        existing_camp = db.query(WhatsAppCampaign).first()
        if not existing_camp:
            camp1 = WhatsAppCampaign(
                campaign_name="Q3 Senior Backend Outreach — NovaTech",
                campaign_type=WhatsAppCampaignTypeEnum.NEW_JOB_OPPORTUNITY,
                requirement_id=req1.id,
                client_id=str(req1.client_id),
                job_title=req1.job_title,
                template_id=template1.id,
                recruiter_id=recruiter_user.id,
                target_audience_type="BENCH",
                status=WhatsAppCampaignStatusEnum.COMPLETED,
                total_recipients=12,
                eligible_count=10,
                excluded_count=2,
                sent_count=10,
                delivered_count=10,
                read_count=8,
                replied_count=5,
                failed_count=0,
                opted_out_count=0,
                created_by_id=recruiter_user.id
            )
            db.add(camp1)
            db.flush()

            # Add recipients
            eligible_cands = db.query(Candidate).filter(
                Candidate.whatsapp_consent_status == WhatsAppConsentStatusEnum.GRANTED
            ).limit(10).all()

            for ec in eligible_cands:
                recip = WhatsAppCampaignRecipient(
                    campaign_id=camp1.id,
                    candidate_id=ec.id,
                    whatsapp_number=ec.whatsapp_number or "+919876543210",
                    eligibility_status=WhatsAppRecipientEligibilityEnum.ELIGIBLE,
                    message_status=WhatsAppMessageStatusEnum.DELIVERED,
                    sent_at=now - timedelta(days=2),
                    delivered_at=now - timedelta(days=2, hours=-1),
                    read_at=now - timedelta(days=2, hours=-2)
                )
                db.add(recip)
            db.commit()

    # 6. Seed Sample Two-Way Conversations with Messages
    active_cands = db.query(Candidate).filter(
        Candidate.whatsapp_consent_status == WhatsAppConsentStatusEnum.GRANTED,
        Candidate.whatsapp_opt_out_status == False
    ).limit(5).all()

    conv_samples = [
        (
            WhatsAppResponseCategoryEnum.INTERESTED,
            WhatsAppConversationStatusEnum.INTERESTED,
            "Hi Gayatri! Yes, I am interested in the Senior Backend role. What is the CTC range and work mode?",
            "Hello! Thank you for confirming. The budget is 28-35 LPA with a Hybrid model (2 days office in Bangalore). Can we connect tomorrow at 4 PM for a quick intro call?",
            "Yes, 4 PM works perfectly for me! Looking forward."
        ),
        (
            WhatsAppResponseCategoryEnum.AVAILABLE_FOR_INTERVIEW,
            WhatsAppConversationStatusEnum.AWAITING_RECRUITER,
            "I'm available for the technical discussion this Thursday or Friday after 3 PM.",
            "Great! I will lock in Friday at 3:30 PM with the NovaTech tech lead. Sending calendar invite shortly.",
            "Received the invite, thank you!"
        ),
        (
            WhatsAppResponseCategoryEnum.NEED_MORE_INFORMATION,
            WhatsAppConversationStatusEnum.AWAITING_RECRUITER,
            "Can you please share the detailed Job Description and company details?",
            "Sure! Attached is the official JD for the position. Let me know if you have any questions.",
            "Thank you, going through it now."
        )
    ]

    for idx, (cat, st, cand_reply1, rec_reply, cand_reply2) in enumerate(conv_samples):
        if idx < len(active_cands):
            c = active_cands[idx]
            existing_conv = db.query(WhatsAppConversation).filter(WhatsAppConversation.candidate_id == c.id).first()
            if not existing_conv:
                conv = WhatsAppConversation(
                    candidate_id=c.id,
                    recruiter_id=recruiter_user.id if recruiter_user else None,
                    requirement_id=req1.id if req1 else None,
                    status=st,
                    response_category=cat,
                    last_message_text=cand_reply2,
                    last_message_date=now - timedelta(hours=idx * 2),
                    last_incoming_date=now - timedelta(hours=idx * 2),
                    unread_count=0
                )
                db.add(conv)
                db.flush()

                # Outbound Initial Campaign Message
                msg1 = WhatsAppMessage(
                    conversation_id=conv.id,
                    candidate_id=c.id,
                    sender_id=recruiter_user.id if recruiter_user else None,
                    direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                    message_type=WhatsAppMessageTypeEnum.TEMPLATE,
                    content=f"Hi {c.first_name}, We came across your profile and thought you'd be a great fit for {req1.job_title if req1 else 'Backend Developer'}. Are you interested in exploring this role?\n\nReply YES if interested, or STOP to unsubscribe.",
                    status=WhatsAppMessageStatusEnum.READ,
                    sent_at=now - timedelta(days=1),
                    delivered_at=now - timedelta(days=1),
                    read_at=now - timedelta(days=1)
                )
                db.add(msg1)

                # Inbound Candidate Reply 1
                msg2 = WhatsAppMessage(
                    conversation_id=conv.id,
                    candidate_id=c.id,
                    direction=WhatsAppMessageDirectionEnum.INBOUND,
                    message_type=WhatsAppMessageTypeEnum.TEXT,
                    content=cand_reply1,
                    status=WhatsAppMessageStatusEnum.DELIVERED,
                    sent_at=now - timedelta(hours=12),
                    delivered_at=now - timedelta(hours=12),
                    read_at=now - timedelta(hours=12)
                )
                db.add(msg2)

                # Outbound Recruiter Reply
                msg3 = WhatsAppMessage(
                    conversation_id=conv.id,
                    candidate_id=c.id,
                    sender_id=recruiter_user.id if recruiter_user else None,
                    direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                    message_type=WhatsAppMessageTypeEnum.TEXT,
                    content=rec_reply,
                    status=WhatsAppMessageStatusEnum.READ,
                    sent_at=now - timedelta(hours=6),
                    delivered_at=now - timedelta(hours=6),
                    read_at=now - timedelta(hours=6)
                )
                db.add(msg3)

                # Inbound Candidate Reply 2
                msg4 = WhatsAppMessage(
                    conversation_id=conv.id,
                    candidate_id=c.id,
                    direction=WhatsAppMessageDirectionEnum.INBOUND,
                    message_type=WhatsAppMessageTypeEnum.TEXT,
                    content=cand_reply2,
                    status=WhatsAppMessageStatusEnum.DELIVERED,
                    sent_at=now - timedelta(hours=idx * 2),
                    delivered_at=now - timedelta(hours=idx * 2),
                    read_at=now - timedelta(hours=idx * 2)
                )
                db.add(msg4)

    db.commit()
    logger.info("Successfully seeded WhatsApp templates, settings, bench candidates, and conversations!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_whatsapp_and_bench_data(db)
    finally:
        db.close()
