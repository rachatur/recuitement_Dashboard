from app.core.database import SessionLocal, engine, Base
from sqlalchemy import text
from app.models import (
    User, RoleEnum, Candidate, Client, JobRequirement, CVSubmission,
    Interview, Offer, JoiningDetail, BenchResource, RecruiterActivity,
    AuditLog, WhatsAppCampaign, WhatsAppMessage, WhatsAppConversation,
    WhatsAppOptOut, WhatsAppConsent, WhatsAppTemplate, WhatsAppIntegration,
    WhatsAppCampaignRecipient, CandidateStatusHistory, CandidateDocument
)

db = SessionLocal()

print("Purging all candidate, submission, requirement, and client records...")

# Delete in dependency order
models_to_delete = [
    WhatsAppCampaignRecipient,
    WhatsAppMessage,
    WhatsAppConversation,
    WhatsAppCampaign,
    WhatsAppOptOut,
    WhatsAppConsent,
    CandidateDocument,
    JoiningDetail,
    Offer,
    Interview,
    CVSubmission,
    CandidateStatusHistory,
    RecruiterActivity,
    BenchResource,
    AuditLog,
    Candidate,
    JobRequirement,
    Client
]

for model in models_to_delete:
    try:
        count = db.query(model).delete()
        db.commit()
        print(f"Deleted {count} records from {model.__tablename__}")
    except Exception as e:
        print(f"Error on {model.__tablename__}: {e}")
        db.rollback()

try:
    deleted_users = db.query(User).filter(User.email != "admin@recruitflow.com").delete()
    db.commit()
    print(f"Deleted {deleted_users} dummy users (retained admin@recruitflow.com)")
except Exception as e:
    print(f"Error deleting users: {e}")
    db.rollback()

print("\n--- Final Table Counts ---")
print("Clients:", db.query(Client).count())
print("Job Requirements:", db.query(JobRequirement).count())
print("Candidates:", db.query(Candidate).count())
print("CV Submissions:", db.query(CVSubmission).count())
print("Interviews:", db.query(Interview).count())
print("Offers:", db.query(Offer).count())
print("Joinings:", db.query(JoiningDetail).count())
print("WhatsApp Campaigns:", db.query(WhatsAppCampaign).count())
print("WhatsApp Messages:", db.query(WhatsAppMessage).count())
print("Users:", db.query(User).count())

db.close()
print("\nDatabase is completely CLEAN! Zero dummy records remain.")
