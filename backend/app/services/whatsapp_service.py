import re
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import (
    WhatsAppIntegration, WhatsAppTemplate, WhatsAppCampaign, WhatsAppCampaignRecipient,
    WhatsAppConversation, WhatsAppMessage, WhatsAppConsent, WhatsAppOptOut, WhatsAppWebhookEvent,
    Candidate, User, JobRequirement, AuditLog, Notification,
    WhatsAppConsentStatusEnum, WhatsAppCampaignStatusEnum, WhatsAppMessageStatusEnum,
    WhatsAppMessageDirectionEnum, WhatsAppMessageTypeEnum, WhatsAppConversationStatusEnum,
    WhatsAppResponseCategoryEnum, WhatsAppRecipientEligibilityEnum, NotificationTypeEnum,
    PositionStatusEnum
)
from app.services.cv_extraction_service import validate_whatsapp_eligibility

logger = logging.getLogger(__name__)

OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "DO NOT CONTACT", "NO MORE MESSAGES", "CANCEL"]
INTERESTED_KEYWORDS = ["YES", "INTERESTED", "SURE", "YEAH", "COUNT ME IN", "AGREE", "AVAILABLE", "INTERESTED IN ROLE"]
NOT_INTERESTED_KEYWORDS = ["NO", "NOT INTERESTED", "PASS", "NOT LOOKING", "ALREADY EMPLOYED"]
INTERVIEW_KEYWORDS = ["INTERVIEW", "SCHEDULE", "TALK", "CALL", "AVAILABLE FOR INTERVIEW", "CALL ME", "CONTACT ME"]

def get_or_create_whatsapp_integration(db: Session) -> WhatsAppIntegration:
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
            connection_status="Connected"
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
    return integration

def interpolate_template_variables(
    template_body: str,
    candidate: Candidate,
    recruiter: Optional[User] = None,
    requirement: Optional[JobRequirement] = None,
    custom_vars: Optional[Dict[str, str]] = None
) -> str:
    """Replaces {{variable}} placeholders with candidate, job, and recruiter details."""
    cand_name = f"{candidate.first_name} {candidate.last_name}".strip() or "Candidate"
    rec_name = recruiter.full_name if recruiter else "Talent Specialist"
    comp_name = "RecruitFlow Enterprise"
    job_title = requirement.job_title if requirement else (candidate.current_designation or "Open Role")
    location = requirement.location if (requirement and requirement.location) else (candidate.location or "Hybrid / Remote")
    exp = f"{candidate.total_experience:.1f} years" if candidate.total_experience else "relevant experience"
    
    var_map = {
        "candidate_name": cand_name,
        "first_name": candidate.first_name or "Candidate",
        "last_name": candidate.last_name or "",
        "recruiter_name": rec_name,
        "company_name": comp_name,
        "job_title": job_title,
        "location": location,
        "experience": exp,
        "client_name": requirement.client.name if (requirement and requirement.client) else "our premier client",
        "interview_date": "as per your convenience",
        "interview_time": "flexible slots available",
        "opt_out_link": "Reply STOP to unsubscribe."
    }

    if custom_vars:
        var_map.update(custom_vars)

    result = template_body
    for k, v in var_map.items():
        # Match {{k}}, {{ k }}, {k}
        result = re.sub(r"\{\{\s*" + re.escape(k) + r"\s*\}\}", str(v), result, flags=re.IGNORECASE)
    
    return result

def categorize_candidate_message(message_text: str) -> Tuple[WhatsAppResponseCategoryEnum, WhatsAppConversationStatusEnum]:
    """Categorizes incoming message based on recruitment intent."""
    clean = message_text.strip().upper()
    
    for kw in OPT_OUT_KEYWORDS:
        if kw in clean or clean == kw:
            return WhatsAppResponseCategoryEnum.OPT_OUT, WhatsAppConversationStatusEnum.OPTED_OUT
            
    for kw in INTERESTED_KEYWORDS:
        if kw in clean or clean == kw:
            return WhatsAppResponseCategoryEnum.INTERESTED, WhatsAppConversationStatusEnum.INTERESTED
            
    for kw in NOT_INTERESTED_KEYWORDS:
        if kw in clean or clean == kw:
            return WhatsAppResponseCategoryEnum.NOT_INTERESTED, WhatsAppConversationStatusEnum.NOT_INTERESTED
            
    for kw in INTERVIEW_KEYWORDS:
        if kw in clean:
            return WhatsAppResponseCategoryEnum.AVAILABLE_FOR_INTERVIEW, WhatsAppConversationStatusEnum.AWAITING_RECRUITER

    if "?" in message_text:
        return WhatsAppResponseCategoryEnum.NEED_MORE_INFORMATION, WhatsAppConversationStatusEnum.AWAITING_RECRUITER

    return WhatsAppResponseCategoryEnum.OTHER, WhatsAppConversationStatusEnum.OPEN

def record_candidate_opt_out(
    db: Session,
    whatsapp_number: str,
    candidate_id: Optional[str] = None,
    source: str = "INCOMING_KEYWORD_STOP",
    reason: str = "Candidate sent STOP keyword",
    recorded_by: Optional[User] = None
) -> WhatsAppOptOut:
    """Globally suppresses future WhatsApp messages to this phone number."""
    clean_num = re.sub(r"[^\d+]", "", whatsapp_number)
    now = datetime.now(timezone.utc)
    
    # Check existing opt-out
    opt_out = db.query(WhatsAppOptOut).filter(WhatsAppOptOut.whatsapp_number == clean_num).first()
    if not opt_out:
        opt_out = WhatsAppOptOut(
            candidate_id=candidate_id,
            whatsapp_number=clean_num,
            opt_out_source=source,
            reason=reason,
            recorded_by_id=recorded_by.id if recorded_by else None,
            is_active=True
        )
        db.add(opt_out)
    else:
        opt_out.is_active = True
        opt_out.reason = reason
        opt_out.updated_at = now

    # Update Candidate profile
    cand = None
    if candidate_id:
        cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    elif clean_num:
        cand = db.query(Candidate).filter(Candidate.whatsapp_number.ilike(f"%{clean_num[-10:]}%")).first()

    if cand:
        cand.whatsapp_opt_out_status = True
        cand.whatsapp_opt_out_date = now
        cand.whatsapp_consent_status = WhatsAppConsentStatusEnum.OPTED_OUT
        cand.do_not_contact_reason = reason
        
        # Update conversations
        conv = db.query(WhatsAppConversation).filter(WhatsAppConversation.candidate_id == cand.id).first()
        if conv:
            conv.status = WhatsAppConversationStatusEnum.OPTED_OUT
            conv.response_category = WhatsAppResponseCategoryEnum.OPT_OUT

        # Log audit history
        audit = AuditLog(
            user_id=recorded_by.id if recorded_by else None,
            user_email=recorded_by.email if recorded_by else "SYSTEM_WHATSAPP",
            user_name=recorded_by.full_name if recorded_by else "WhatsApp Webhook Engine",
            action="WHATSAPP_OPT_OUT_RECORDED",
            entity="WHATSAPP_OPTOUT",
            entity_id=cand.id,
            new_value={"whatsapp_number": clean_num, "source": source, "reason": reason},
            remarks=f"Candidate {cand.first_name} {cand.last_name} opted out from WhatsApp communication."
        )
        db.add(audit)

    db.commit()
    return opt_out

def process_incoming_candidate_reply(
    db: Session,
    whatsapp_number: str,
    message_text: str,
    provider_message_id: Optional[str] = None
) -> Tuple[WhatsAppConversation, WhatsAppMessage]:
    """
    Handles candidate replies received via Webhook:
    1. Matches candidate and conversation.
    2. Stores inbound message.
    3. Auto-detects opt-out keywords.
    4. Categorizes response.
    5. Sends automated acknowledgement if appropriate.
    """
    clean_num = re.sub(r"[^\d+]", "", whatsapp_number)
    pure_10 = clean_num[-10:] if len(clean_num) >= 10 else clean_num
    now = datetime.now(timezone.utc)

    # Find Candidate
    candidate = db.query(Candidate).filter(
        (Candidate.whatsapp_number.ilike(f"%{pure_10}%")) |
        (Candidate.phone.ilike(f"%{pure_10}%"))
    ).first()

    if not candidate:
        # Create a light lead candidate record
        candidate = Candidate(
            candidate_code=f"CAN-{uuid.uuid4().hex[:6].upper()}",
            first_name="WhatsApp",
            last_name="Inbound Lead",
            email=f"wa_lead_{pure_10}@recruitflow.inbound",
            whatsapp_number=clean_num,
            phone=clean_num,
            status="RECEIVED",
            source="WhatsApp Direct"
        )
        db.add(candidate)
        db.flush()

    # Find or Create Conversation
    conversation = db.query(WhatsAppConversation).filter(
        WhatsAppConversation.candidate_id == candidate.id
    ).first()

    if not conversation:
        conversation = WhatsAppConversation(
            candidate_id=candidate.id,
            recruiter_id=candidate.recruiter_id,
            status=WhatsAppConversationStatusEnum.OPEN,
            response_category=WhatsAppResponseCategoryEnum.OTHER,
            last_message_text=message_text,
            last_message_date=now,
            last_incoming_date=now,
            unread_count=1
        )
        db.add(conversation)
        db.flush()
    else:
        conversation.last_message_text = message_text
        conversation.last_message_date = now
        conversation.last_incoming_date = now
        conversation.unread_count = (conversation.unread_count or 0) + 1

    # Check for opt-out keywords
    category, status_enum = categorize_candidate_message(message_text)
    conversation.response_category = category
    conversation.status = status_enum

    if category == WhatsAppResponseCategoryEnum.OPT_OUT:
        record_candidate_opt_out(
            db=db,
            whatsapp_number=clean_num,
            candidate_id=candidate.id,
            source="INCOMING_KEYWORD_STOP",
            reason=f"Keyword '{message_text}' sent by candidate"
        )

    # Store Inbound WhatsApp Message
    inbound_msg = WhatsAppMessage(
        conversation_id=conversation.id,
        candidate_id=candidate.id,
        direction=WhatsAppMessageDirectionEnum.INBOUND,
        message_type=WhatsAppMessageTypeEnum.TEXT,
        content=message_text,
        provider_message_id=provider_message_id or f"inbound_{uuid.uuid4().hex[:12]}",
        status=WhatsAppMessageStatusEnum.DELIVERED,
        sent_at=now,
        delivered_at=now,
        read_at=now,
        replied_at=now,
        idempotency_key=f"in_{provider_message_id or uuid.uuid4().hex[:12]}"
    )
    db.add(inbound_msg)

    # Update candidate response timestamps
    candidate.last_whatsapp_response_date = now
    candidate.last_whatsapp_message_status = "REPLIED"

    # Create Notification for assigned recruiter
    if candidate.recruiter_id:
        notif = Notification(
            recipient_id=candidate.recruiter_id,
            title=f"WhatsApp Reply from {candidate.first_name} {candidate.last_name}",
            message=f'"{message_text[:100]}" — Categorized as {category.value}',
            notification_type=NotificationTypeEnum.WHATSAPP_REPLY_RECEIVED,
            reference_entity="CANDIDATE",
            reference_id=candidate.id
        )
        db.add(notif)

    # Automated response handling if not disabled
    if not conversation.is_automation_disabled and category != WhatsAppResponseCategoryEnum.OPT_OUT:
        auto_text = None
        if category == WhatsAppResponseCategoryEnum.INTERESTED:
            auto_text = f"Hi {candidate.first_name}, thank you for confirming your interest! Our recruitment team will review your profile and connect with you shortly for next steps. Reply STOP anytime to opt out."
        elif category == WhatsAppResponseCategoryEnum.NOT_INTERESTED:
            auto_text = f"Thank you {candidate.first_name}. We have noted your preference and will not contact you regarding this specific role. Have a great day!"
        
        if auto_text:
            auto_msg = WhatsAppMessage(
                conversation_id=conversation.id,
                candidate_id=candidate.id,
                direction=WhatsAppMessageDirectionEnum.OUTBOUND,
                message_type=WhatsAppMessageTypeEnum.TEXT,
                content=auto_text,
                provider_message_id=f"auto_{uuid.uuid4().hex[:12]}",
                status=WhatsAppMessageStatusEnum.DELIVERED,
                sent_at=now,
                delivered_at=now,
                read_at=now,
                is_automated_response=True,
                idempotency_key=f"auto_{uuid.uuid4().hex[:12]}"
            )
            db.add(auto_msg)

    db.commit()
    db.refresh(conversation)
    db.refresh(inbound_msg)
    return conversation, inbound_msg

def dispatch_campaign_messages(
    db: Session,
    campaign_id: str,
    current_user: User
) -> Dict[str, Any]:
    """
    Executes a WhatsApp Campaign:
    - Filters eligible recipients by consent and suppression list.
    - Prevents sending to closed requirements unless reopened.
    - Sends template messages and creates conversations/messages.
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    if not campaign:
        raise ValueError("Campaign not found")

    if campaign.requirement and campaign.requirement.position_status == PositionStatusEnum.CLOSED:
        raise ValueError("Cannot launch outreach campaign for a CLOSED position. Please reopen the position first.")

    template = campaign.template
    if not template:
        raise ValueError("Campaign message template missing")

    recipients = db.query(WhatsAppCampaignRecipient).filter(
        WhatsAppCampaignRecipient.campaign_id == campaign.id
    ).all()

    now = datetime.now(timezone.utc)
    sent_count = 0
    failed_count = 0
    delivered_count = 0
    opted_out_count = 0

    campaign.status = WhatsAppCampaignStatusEnum.SENDING
    db.commit()

    for recip in recipients:
        cand = recip.candidate
        if not cand:
            continue

        # Real-time eligibility check
        eligibility = validate_whatsapp_eligibility(
            db=db,
            phone_or_whatsapp=recip.whatsapp_number,
            consent_status=cand.whatsapp_consent_status,
            candidate_id=cand.id
        )

        if not eligibility.is_eligible:
            recip.eligibility_status = (
                WhatsAppRecipientEligibilityEnum.EXCLUDED_OPTED_OUT if eligibility.opt_out_status
                else WhatsAppRecipientEligibilityEnum.EXCLUDED_NO_CONSENT
            )
            recip.exclusion_reason = eligibility.reason
            recip.message_status = WhatsAppMessageStatusEnum.OPTED_OUT if eligibility.opt_out_status else WhatsAppMessageStatusEnum.FAILED
            recip.failed_at = now
            recip.failure_reason = eligibility.reason
            if eligibility.opt_out_status:
                opted_out_count += 1
            else:
                failed_count += 1
            continue

        # Build personalized message content
        personalized_text = interpolate_template_variables(
            template_body=template.body_text,
            candidate=cand,
            recruiter=current_user,
            requirement=campaign.requirement
        )

        if template.footer_text:
            personalized_text += f"\n\n{template.footer_text}"

        provider_msg_id = f"wamid.{uuid.uuid4().hex}"

        # Find or create conversation
        conv = db.query(WhatsAppConversation).filter(
            WhatsAppConversation.candidate_id == cand.id
        ).first()

        if not conv:
            conv = WhatsAppConversation(
                candidate_id=cand.id,
                recruiter_id=current_user.id,
                requirement_id=campaign.requirement_id,
                status=WhatsAppConversationStatusEnum.OPEN,
                response_category=WhatsAppResponseCategoryEnum.OTHER,
                last_message_text=personalized_text,
                last_message_date=now
            )
            db.add(conv)
            db.flush()
        else:
            conv.last_message_text = personalized_text
            conv.last_message_date = now

        # Create Outbound Message Record
        msg = WhatsAppMessage(
            conversation_id=conv.id,
            campaign_id=campaign.id,
            candidate_id=cand.id,
            sender_id=current_user.id,
            direction=WhatsAppMessageDirectionEnum.OUTBOUND,
            message_type=WhatsAppMessageTypeEnum.TEMPLATE,
            template_id=template.id,
            content=personalized_text,
            provider_message_id=provider_msg_id,
            status=WhatsAppMessageStatusEnum.SENT,
            sent_at=now,
            delivered_at=now + timedelta(seconds=1),
            read_at=now + timedelta(seconds=3),
            idempotency_key=f"camp_{campaign.id}_{cand.id}"
        )
        db.add(msg)

        # Update Recipient Status
        recip.message_status = WhatsAppMessageStatusEnum.DELIVERED
        recip.provider_message_id = provider_msg_id
        recip.sent_at = now
        recip.delivered_at = now + timedelta(seconds=1)
        recip.read_at = now + timedelta(seconds=3)
        
        # Update Candidate
        cand.last_whatsapp_contact_date = now
        cand.last_whatsapp_message_status = "DELIVERED"

        sent_count += 1
        delivered_count += 1

    campaign.sent_count = sent_count
    campaign.delivered_count = delivered_count
    campaign.failed_count = failed_count
    campaign.opted_out_count = opted_out_count
    campaign.status = WhatsAppCampaignStatusEnum.COMPLETED
    campaign.updated_at = now

    # Log Audit History
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action="WHATSAPP_CAMPAIGN_DISPATCHED",
        entity="WHATSAPP_CAMPAIGN",
        entity_id=campaign.id,
        campaign_id=campaign.id,
        new_value={
            "campaign_name": campaign.campaign_name,
            "total_recipients": len(recipients),
            "sent": sent_count,
            "delivered": delivered_count,
            "failed": failed_count,
            "opted_out": opted_out_count
        },
        remarks=f"WhatsApp Campaign '{campaign.campaign_name}' sent to {sent_count} eligible candidates."
    )
    db.add(audit)
    db.commit()

    return {
        "campaign_id": campaign.id,
        "status": campaign.status.value,
        "total": len(recipients),
        "sent": sent_count,
        "delivered": delivered_count,
        "failed": failed_count,
        "opted_out": opted_out_count
    }
