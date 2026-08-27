import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base, User, RoleEnum, Candidate, CandidateStatusEnum,
    Client, ClientStatusEnum, JobRequirement, RequirementStatusEnum, PriorityEnum, WorkModeEnum,
    WhatsAppIntegration, WhatsAppTemplate, WhatsAppCampaign, WhatsAppCampaignRecipient,
    WhatsAppConversation, WhatsAppMessage, WhatsAppConsent, WhatsAppOptOut,
    BenchResource, BenchStatusEnum, WhatsAppConsentStatusEnum, WhatsAppCampaignTypeEnum,
    WhatsAppCampaignStatusEnum, WhatsAppMessageStatusEnum, WhatsAppMessageDirectionEnum,
    WhatsAppMessageTypeEnum, WhatsAppTemplateCategoryEnum, WhatsAppTemplateStatusEnum,
    WhatsAppConversationStatusEnum, WhatsAppResponseCategoryEnum, WhatsAppRecipientEligibilityEnum
)
from app.core.security import get_password_hash

def seed_target_db(db_url: str, db_label: str):
    print(f"\n================ Seeding WhatsApp Data to {db_label} ({db_url}) ================")
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    now = datetime.now(timezone.utc)

    try:
        # 1. Ensure Admin User
        admin = db.query(User).filter(User.email == "admin@recruitflow.com").first()
        if not admin:
            admin = User(
                email="admin@recruitflow.com",
                hashed_password=get_password_hash("AdminPassword123!"),
                full_name="System Administrator",
                role=RoleEnum.SUPER_ADMIN,
                is_active=True
            )
            db.add(admin)
            db.flush()
        print(f"[{db_label}] Admin user ready: {admin.email}")

        # 2. Ensure Client & Requirement
        client = db.query(Client).first()
        if not client:
            client = Client(
                client_code="CLI-TEST-001",
                name="Test Hiring Organization",
                industry="Technology",
                location="Gurgaon",
                status=ClientStatusEnum.ACTIVE
            )
            db.add(client)
            db.flush()

        req = db.query(JobRequirement).first()
        if not req:
            req = JobRequirement(
                req_code="REQ-TEST-001",
                client_id=client.id,
                job_title="Senior Python & Full-Stack Developer",
                required_skills=["Python", "FastAPI", "React", "PostgreSQL"],
                experience_min=5.0,
                location="Bangalore",
                work_mode=WorkModeEnum.HYBRID,
                openings_count=2,
                priority=PriorityEnum.HIGH,
                assigned_recruiter_id=admin.id,
                status=RequirementStatusEnum.OPEN,
                job_description="Senior Python developer with strong FastAPI, PostgreSQL, and modern React skills."
            )
            db.add(req)
            db.flush()

        # 3. WhatsApp Integration Settings
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
            db.flush()
        print(f"[{db_label}] WhatsApp Integration configured: {integration.provider}")

        # 4. Message Templates
        templates_data = [
            {
                "name": "job_opportunity_outreach_v1",
                "category": WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION,
                "header_type": "TEXT",
                "header_text": "🌟 Exciting Career Opportunity",
                "body_text": "Hi {{candidate_name}},\n\nWe came across your profile with {{experience}} and thought you would be an excellent fit for the *{{job_title}}* role at *{{client_name}}*.\n\nWould you be open to exploring this opportunity?",
                "footer_text": "Reply YES if interested, or STOP to unsubscribe.",
                "buttons": [{"type": "QUICK_REPLY", "text": "YES, Interested"}, {"type": "QUICK_REPLY", "text": "Not at this time"}],
                "variables": ["candidate_name", "experience", "job_title", "client_name"]
            },
            {
                "name": "interview_availability_check_v1",
                "category": WhatsAppTemplateCategoryEnum.RECRUITMENT_COMMUNICATION,
                "header_type": "TEXT",
                "header_text": "📅 Interview Schedule Request",
                "body_text": "Hello {{candidate_name}},\n\nThe hiring team at *{{client_name}}* was impressed with your profile for *{{job_title}}* and would like to schedule a technical round.\n\nPlease let us know if {{interview_date}} works for you.",
                "footer_text": "Reply to confirm or suggest another time slot.",
                "buttons": [{"type": "QUICK_REPLY", "text": "Confirm Slot"}, {"type": "QUICK_REPLY", "text": "Reschedule"}],
                "variables": ["candidate_name", "client_name", "job_title", "interview_date"]
            }
        ]

        for td in templates_data:
            existing_t = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.template_name == td["name"]).first()
            if not existing_t:
                tmpl = WhatsAppTemplate(
                    template_name=td["name"],
                    category=td["category"],
                    language="en_US",
                    provider_template_id=f"waba_tmpl_{uuid.uuid4().hex[:8]}",
                    header_type=td["header_type"],
                    header_text=td["header_text"],
                    body_text=td["body_text"],
                    footer_text=td["footer_text"],
                    buttons=td["buttons"],
                    variables=td["variables"],
                    status=WhatsAppTemplateStatusEnum.APPROVED,
                    created_by_id=admin.id,
                    approved_by_id=admin.id
                )
                db.add(tmpl)
        db.flush()

        # 5. HARDCODED RECORD 1: Aarav Mehta
        cand1 = db.query(Candidate).filter(Candidate.candidate_code == "CAN-WA-TEST01").first()
        if not cand1:
            cand1 = Candidate(
                candidate_code="CAN-WA-TEST01",
                first_name="Aarav",
                last_name="Mehta",
                email="aarav.mehta.test@example.com",
                phone="+919811223344",
                whatsapp_number="+919811223344",
                country_code="+91",
                location="Bangalore",
                total_experience=5.5,
                relevant_experience=5.0,
                current_company="TechCorp Solutions",
                current_designation="Senior Python Developer",
                skills=["Python", "FastAPI", "PostgreSQL", "Docker", "React"],
                education="B.Tech Computer Science",
                source="WhatsApp Bench Ingestion",
                recruiter_id=admin.id,
                status=CandidateStatusEnum.RECEIVED,
                whatsapp_consent_status=WhatsAppConsentStatusEnum.GRANTED,
                whatsapp_consent_source="Direct Web Application",
                whatsapp_consent_date=now - timedelta(days=10),
                whatsapp_opt_out_status=False,
                bench_status=BenchStatusEnum.AVAILABLE,
                bench_availability_date=now,
                bench_primary_skills=["Python", "FastAPI", "PostgreSQL"],
                bench_secondary_skills=["Docker", "React"]
            )
            db.add(cand1)
            db.flush()
        print(f"[{db_label}] Hardcoded Record 1 created: {cand1.first_name} {cand1.last_name} ({cand1.candidate_code})")

        # 6. HARDCODED RECORD 2: Pooja Sharma
        cand2 = db.query(Candidate).filter(Candidate.candidate_code == "CAN-WA-TEST02").first()
        if not cand2:
            cand2 = Candidate(
                candidate_code="CAN-WA-TEST02",
                first_name="Pooja",
                last_name="Sharma",
                email="pooja.sharma.test@example.com",
                phone="+919822334455",
                whatsapp_number="+919822334455",
                country_code="+91",
                location="Gurgaon",
                total_experience=6.0,
                relevant_experience=5.5,
                current_company="Enterprise Supply Systems",
                current_designation="Oracle Cloud Functional Consultant",
                skills=["Oracle Cloud", "Supply Planning", "SCM", "AuditBoard", "GRC"],
                education="MBA & B.Tech",
                source="WhatsApp Candidate Outreach",
                recruiter_id=admin.id,
                status=CandidateStatusEnum.SHORTLISTED,
                whatsapp_consent_status=WhatsAppConsentStatusEnum.GRANTED,
                whatsapp_consent_source="Direct Job Application Consent",
                whatsapp_consent_date=now - timedelta(days=5),
                whatsapp_opt_out_status=False,
                bench_status=BenchStatusEnum.AVAILABLE,
                bench_availability_date=now,
                bench_primary_skills=["Oracle Cloud", "Supply Planning", "AuditBoard"],
                bench_secondary_skills=["GRC", "SCM"]
            )
            db.add(cand2)
            db.flush()
        print(f"[{db_label}] Hardcoded Record 2 created: {cand2.first_name} {cand2.last_name} ({cand2.candidate_code})")

        # 7. Create WhatsApp Conversation for Candidate 1 (Aarav Mehta)
        conv1 = db.query(WhatsAppConversation).filter(WhatsAppConversation.candidate_id == cand1.id).first()
        if not conv1:
            conv1 = WhatsAppConversation(
                candidate_id=cand1.id,
                recruiter_id=admin.id,
                requirement_id=req.id,
                status=WhatsAppConversationStatusEnum.AWAITING_RECRUITER,
                response_category=WhatsAppResponseCategoryEnum.AVAILABLE_FOR_INTERVIEW,
                last_message_text="I am free tomorrow between 2 PM to 5 PM for the discussion.",
                last_message_date=now - timedelta(minutes=15),
                last_incoming_date=now - timedelta(minutes=15),
                unread_count=1
            )
            db.add(conv1)
            db.flush()

            # Message 1: Outbound Outreach
            db.add(WhatsAppMessage(
                conversation_id=conv1.id,
                candidate_id=cand1.id,
                sender_id=admin.id,
                direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                message_type=WhatsAppMessageTypeEnum.TEMPLATE,
                content=f"Hi Aarav, We came across your profile and thought you'd be a great fit for {req.job_title} at {client.name}. Are you interested in exploring this role?\n\nReply YES if interested, or STOP to unsubscribe.",
                status=WhatsAppMessageStatusEnum.READ,
                sent_at=now - timedelta(hours=3),
                delivered_at=now - timedelta(hours=3),
                read_at=now - timedelta(hours=3, minutes=-5)
            ))

            # Message 2: Inbound Candidate Reply
            db.add(WhatsAppMessage(
                conversation_id=conv1.id,
                candidate_id=cand1.id,
                direction=WhatsAppMessageDirectionEnum.INBOUND,
                message_type=WhatsAppMessageTypeEnum.TEXT,
                content="YES, I am interested! Could you share the budget range and work mode?",
                status=WhatsAppMessageStatusEnum.DELIVERED,
                sent_at=now - timedelta(hours=2),
                delivered_at=now - timedelta(hours=2),
                read_at=now - timedelta(hours=2)
            ))

            # Message 3: Outbound Recruiter Details
            db.add(WhatsAppMessage(
                conversation_id=conv1.id,
                candidate_id=cand1.id,
                sender_id=admin.id,
                direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                message_type=WhatsAppMessageTypeEnum.TEXT,
                content="Hi Aarav, the budget is 25-30 LPA and the role offers a hybrid setup in Bangalore. When are you free for an introductory call?",
                status=WhatsAppMessageStatusEnum.READ,
                sent_at=now - timedelta(hours=1),
                delivered_at=now - timedelta(hours=1),
                read_at=now - timedelta(hours=1)
            ))

            # Message 4: Inbound Candidate Availability
            db.add(WhatsAppMessage(
                conversation_id=conv1.id,
                candidate_id=cand1.id,
                direction=WhatsAppMessageDirectionEnum.INBOUND,
                message_type=WhatsAppMessageTypeEnum.TEXT,
                content="I am free tomorrow between 2 PM to 5 PM for the discussion.",
                status=WhatsAppMessageStatusEnum.DELIVERED,
                sent_at=now - timedelta(minutes=15),
                delivered_at=now - timedelta(minutes=15),
                read_at=now - timedelta(minutes=15)
            ))

        # 8. Create WhatsApp Conversation for Candidate 2 (Pooja Sharma)
        conv2 = db.query(WhatsAppConversation).filter(WhatsAppConversation.candidate_id == cand2.id).first()
        if not conv2:
            conv2 = WhatsAppConversation(
                candidate_id=cand2.id,
                recruiter_id=admin.id,
                requirement_id=req.id,
                status=WhatsAppConversationStatusEnum.INTERESTED,
                response_category=WhatsAppResponseCategoryEnum.INTERESTED,
                last_message_text="Hi, yes I am currently available and interested in immediate openings. Please share the detailed JD.",
                last_message_date=now - timedelta(minutes=40),
                last_incoming_date=now - timedelta(minutes=40),
                unread_count=1
            )
            db.add(conv2)
            db.flush()

            # Message 1: Outbound Outreach
            db.add(WhatsAppMessage(
                conversation_id=conv2.id,
                candidate_id=cand2.id,
                sender_id=admin.id,
                direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                message_type=WhatsAppMessageTypeEnum.TEMPLATE,
                content=f"Hello Pooja, We have an immediate requirement matching your Oracle Cloud & Supply Planning expertise at {client.name}. Are you open to exploring this role?",
                status=WhatsAppMessageStatusEnum.READ,
                sent_at=now - timedelta(hours=2),
                delivered_at=now - timedelta(hours=2),
                read_at=now - timedelta(hours=2)
            ))

            # Message 2: Inbound Candidate Reply
            db.add(WhatsAppMessage(
                conversation_id=conv2.id,
                candidate_id=cand2.id,
                direction=WhatsAppMessageDirectionEnum.INBOUND,
                message_type=WhatsAppMessageTypeEnum.TEXT,
                content="Hi, yes I am currently available and interested in immediate openings. Please share the detailed JD.",
                status=WhatsAppMessageStatusEnum.DELIVERED,
                sent_at=now - timedelta(minutes=40),
                delivered_at=now - timedelta(minutes=40),
                read_at=now - timedelta(minutes=40)
            ))

        # 9. Create a Sample Completed WhatsApp Campaign
        camp = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.campaign_name == "Q3 Python & Oracle Talent Outreach").first()
        template1 = db.query(WhatsAppTemplate).first()
        if not camp and template1:
            camp = WhatsAppCampaign(
                campaign_name="Q3 Python & Oracle Talent Outreach",
                campaign_type=WhatsAppCampaignTypeEnum.NEW_JOB_OPPORTUNITY,
                requirement_id=req.id,
                client_id=str(client.id),
                job_title=req.job_title,
                template_id=template1.id,
                recruiter_id=admin.id,
                target_audience_type="BENCH",
                status=WhatsAppCampaignStatusEnum.COMPLETED,
                total_recipients=2,
                eligible_count=2,
                excluded_count=0,
                sent_count=2,
                delivered_count=2,
                read_count=2,
                replied_count=2,
                failed_count=0,
                opted_out_count=0,
                created_by_id=admin.id
            )
            db.add(camp)
            db.flush()

            for c in [cand1, cand2]:
                db.add(WhatsAppCampaignRecipient(
                    campaign_id=camp.id,
                    candidate_id=c.id,
                    whatsapp_number=c.whatsapp_number,
                    eligibility_status=WhatsAppRecipientEligibilityEnum.ELIGIBLE,
                    message_status=WhatsAppMessageStatusEnum.REPLIED,
                    sent_at=now - timedelta(hours=3),
                    delivered_at=now - timedelta(hours=3),
                    read_at=now - timedelta(hours=3),
                    replied_at=now - timedelta(hours=2)
                ))

        db.commit()
        print(f"[{db_label}] Successfully seeded WhatsApp test candidates, templates, conversations, and campaigns!")
    except Exception as e:
        db.rollback()
        print(f"[{db_label}] Error seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    # Seed Docker PostgreSQL (Port 5433)
    docker_pg_url = "postgresql://postgres:root@localhost:5433/recruitflow"
    seed_target_db(docker_pg_url, "Docker PostgreSQL (Port 5433)")

    # Seed Local Windows PostgreSQL (Port 5432)
    local_pg_url = "postgresql://postgres:root@localhost:5432/recruitflow"
    seed_target_db(local_pg_url, "Local Windows PostgreSQL (Port 5432)")
