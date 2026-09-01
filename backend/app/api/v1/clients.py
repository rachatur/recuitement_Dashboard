import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_active_user, require_roles, RoleEnum, verify_client_access
from app.core.audit import log_audit_event
from app.models import Client, ClientContact, JobRequirement, CVSubmission, Interview, Offer, User, RequirementStatusEnum, SubmissionStatusEnum
from app.schemas import ClientCreate, ClientUpdate, ClientResponse, ClientDetailResponse, ClientContactCreate, ClientContactResponse

router = APIRouter(prefix="/clients", tags=["Client Management"])

@router.get("", response_model=List[ClientResponse])
def get_clients(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Client)

    # Scoping for CLIENT or HIRING_MANAGER
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    if user_role in [RoleEnum.CLIENT.value, RoleEnum.HIRING_MANAGER.value]:
        if not current_user.client_id:
            return []
        query = query.filter(Client.id == current_user.client_id)

    if search:
        query = query.filter(Client.name.ilike(f"%{search}%") | Client.client_code.ilike(f"%{search}%"))
    if status:
        query = query.filter(Client.status == status)

    clients = query.order_by(Client.created_at.desc()).all()
    results = []
    for c in clients:
        open_reqs = db.query(JobRequirement).filter(
            JobRequirement.client_id == c.id,
            JobRequirement.status == RequirementStatusEnum.OPEN
        ).count()
        total_subs = db.query(CVSubmission).filter(CVSubmission.client_id == c.id).count()
        
        c_dict = {
            "id": str(c.id),
            "client_code": c.client_code,
            "name": c.name,
            "industry": c.industry,
            "location": c.location,
            "contact_person": c.contact_person,
            "contact_email": c.contact_email,
            "contact_phone": c.contact_phone,
            "account_manager_id": c.account_manager_id,
            "account_manager_name": c.account_manager.full_name if c.account_manager else None,
            "status": c.status,
            "open_requirements_count": open_reqs,
            "total_submissions_count": total_subs,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }
        results.append(ClientResponse(**c_dict))
    return results

@router.get("/{client_id}", response_model=ClientDetailResponse)
def get_client(
    client_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    verify_client_access(current_user, client_id)

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    open_reqs = db.query(JobRequirement).filter(
        JobRequirement.client_id == client.id,
        JobRequirement.status == RequirementStatusEnum.OPEN
    ).count()
    total_reqs = db.query(JobRequirement).filter(JobRequirement.client_id == client.id).count()
    total_subs = db.query(CVSubmission).filter(CVSubmission.client_id == client.id).count()
    active_ints = db.query(Interview).filter(Interview.client_id == client.id).count()
    hired = db.query(CVSubmission).filter(
        CVSubmission.client_id == client.id,
        CVSubmission.status == SubmissionStatusEnum.JOINED
    ).count()

    contacts = db.query(ClientContact).filter(ClientContact.client_id == client.id).all()

    return ClientDetailResponse(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        industry=client.industry,
        location=client.location,
        contact_person=client.contact_person,
        contact_email=client.contact_email,
        contact_phone=client.contact_phone,
        account_manager_id=client.account_manager_id,
        account_manager_name=client.account_manager.full_name if client.account_manager else None,
        status=client.status,
        open_requirements_count=open_reqs,
        total_submissions_count=total_subs,
        contacts=[ClientContactResponse.from_orm(ct) for ct in contacts],
        requirements_count=total_reqs,
        active_interviews_count=active_ints,
        hired_count=hired,
        created_at=client.created_at,
        updated_at=client.updated_at
    )

@router.post("", response_model=ClientResponse)
def create_client(
    client_in: ClientCreate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER])),
    db: Session = Depends(get_db)
):
    while True:
        code_num = random.randint(1000, 99999)
        client_code = f"CLI-{code_num}"
        if not db.query(Client).filter(Client.client_code == client_code).first():
            break
    
    new_client = Client(
        client_code=client_code,
        name=client_in.name,
        industry=client_in.industry,
        location=client_in.location,
        contact_person=client_in.contact_person,
        contact_email=client_in.contact_email,
        contact_phone=client_in.contact_phone,
        account_manager_id=client_in.account_manager_id or current_user.id,
        status=client_in.status
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    # Automatically create primary contact if contact person provided
    if client_in.contact_person and client_in.contact_email:
        primary_contact = ClientContact(
            client_id=new_client.id,
            name=client_in.contact_person,
            email=client_in.contact_email,
            phone=client_in.contact_phone,
            designation="Primary Contact",
            is_primary=True
        )
        db.add(primary_contact)
        db.commit()

    log_audit_event(
        db=db,
        action="CLIENT_CREATED",
        entity="CLIENT",
        entity_id=new_client.id,
        user=current_user,
        request=request,
        new_value={"name": new_client.name, "code": new_client.client_code}
    )

    return ClientResponse(
        id=str(new_client.id),
        client_code=new_client.client_code,
        name=new_client.name,
        industry=new_client.industry,
        location=new_client.location,
        contact_person=new_client.contact_person,
        contact_email=new_client.contact_email,
        contact_phone=new_client.contact_phone,
        account_manager_id=new_client.account_manager_id,
        account_manager_name=current_user.full_name,
        status=new_client.status,
        open_requirements_count=0,
        total_submissions_count=0,
        created_at=new_client.created_at,
        updated_at=new_client.updated_at
    )

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    client_in: ClientUpdate,
    request: Request,
    current_user: User = Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.RECRUITER])),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    old_state = {"name": client.name, "status": str(client.status)}

    if client_in.name is not None:
        client.name = client_in.name
    if client_in.industry is not None:
        client.industry = client_in.industry
    if client_in.location is not None:
        client.location = client_in.location
    if client_in.contact_person is not None:
        client.contact_person = client_in.contact_person
    if client_in.contact_email is not None:
        client.contact_email = client_in.contact_email
    if client_in.contact_phone is not None:
        client.contact_phone = client_in.contact_phone
    if client_in.account_manager_id is not None:
        client.account_manager_id = client_in.account_manager_id
    if client_in.status is not None:
        client.status = client_in.status

    db.commit()
    db.refresh(client)

    log_audit_event(
        db=db,
        action="CLIENT_UPDATED",
        entity="CLIENT",
        entity_id=client.id,
        user=current_user,
        request=request,
        old_value=old_state,
        new_value={"name": client.name, "status": str(client.status)}
    )

    open_reqs = db.query(JobRequirement).filter(
        JobRequirement.client_id == client.id,
        JobRequirement.status == RequirementStatusEnum.OPEN
    ).count()
    total_subs = db.query(CVSubmission).filter(CVSubmission.client_id == client.id).count()

    return ClientResponse(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        industry=client.industry,
        location=client.location,
        contact_person=client.contact_person,
        contact_email=client.contact_email,
        contact_phone=client.contact_phone,
        account_manager_id=client.account_manager_id,
        account_manager_name=client.account_manager.full_name if client.account_manager else None,
        status=client.status,
        open_requirements_count=open_reqs,
        total_submissions_count=total_subs,
        created_at=client.created_at,
        updated_at=client.updated_at
    )
