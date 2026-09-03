from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import User,UserRole, UserStatus ,Department ,SupportAgentProfile, Ticket, Comment, Attachment ,TicketCategory, TicketPriority, TicketStatus, TicketHistory
from app.schemas import UserCreate, UserUpdate, DepartmentCreate, DepartmentUpdate, SupportAgentProfileUpdate, TicketCreate, TicketUpdate, CommentCreate, AttachmentResponse

from app.utils import hash_password

# User CRUD 
def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, user_email: str) -> Optional[User]:
    return db.query(User).filter(User.email == user_email).first()

def get_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role: Optional[UserRole] = None,
    ) -> List[User]:
    """
    Fetch non-admin users with optional role filtering and pagination
    """

    """Exclude all admin on db-level"""
    query = db.query(User).filter(User.role != UserRole.ADMIN)

    """If dropdown filter selected (SUPPORT_AGENT or Only END_USER)"""
    if role:
        query = query.filter(User.role == role)

    """Apply Pagination"""    
    return query.offset(skip).limit(limit).all()

def create_user(db: Session, user_in: UserCreate,role: UserRole) -> User:
    hashed_pwd = hash_password(user_in.password)
    db_user = User(
        first_name = user_in.first_name,
        last_name = user_in.last_name,
        email = user_in.email,
        password_hash = hashed_pwd,
        phone = user_in.phone,
        role = role,
        status = UserStatus.ACTIVE
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
 
def update_user(db: Session, db_user: User, user_in: UserUpdate) -> User:
    #   only keep those fields whose value is changed  
    update_data = user_in.model_dump(exclude_unset=True)

    # update the rest fields dynamically
    for field, value in update_data.items():
       if value is not None:
            if field == "password":
                db_user.password_hash = hash_password(value)
            else:      
                setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user

# Department CRUD
def get_department_by_id(db: Session, department_id: int) -> Optional[Department]:
    return db.query(Department).filter(Department.id == department_id).first()

def get_department_by_name(db: Session, name: str) -> Optional[Department]:
    return db.query(Department).filter(Department.name == name).first()

def get_departments(db: Session,skip: int = 0,limit: int= 100) -> List[Department]:
    return db.query(Department).offset(skip).limit(limit).all()
  
def create_department(db: Session, department_in: DepartmentCreate) -> Department:
    db_department = Department(
        name = department_in.name,
        description = department_in.description,
        status = DepartmentStatus.ACTIVE
    )
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

def update_department(db: Session,db_department: Department, department_in: DepartmentUpdate) -> Department:
    # only add those field which update by used
    update_department = department_in.model_dump(exclude_unset=True)

    #add remaning updated field via looping
    for field, value in update_department.items():
        setattr(db_department, field, value)

    db.commit()
    db.refresh(db_department)
    return db_department
            
# SupportAgentProfile CRUD

def get_agent_profile(db: Session, user_id: int) -> Optional[SupportAgentProfile]:
    return db.query(SupportAgentProfile).filter(SupportAgentProfile.user_id == user_id).first()

def create_or_update_agent_profile(db: Session, user_id: int, profile_in: SupportAgentProfileUpdate ) -> SupportAgentProfile:
    profile = get_agent_profile(db, user_id)

    if not profile:
        profile = SupportAgentProfile(
            user_id = user_id,
            department_ids = profile_in.department_ids or [],
            ticket_types = profile_in.ticket_types or []
        )
        db.add(profile)
    else:
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
                
# Ticket CRUD

def generate_ticket_key(db: Session) -> str:
    max_id = db.query(func.max(Ticket.id)).scalar() or 0
    next_number = 1001 + max_id
    return f"TICK-{next_number}"

def get_ticket_by_id(db: Session,ticket_id: int) -> Optional[Ticket]:
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()

def get_ticket_by_key(db: Session,ticket_key: str) -> Optional[Ticket]:
    return db.query(Ticket).filter(Ticket.ticket_key == ticket_key).first()

def get_tickets(db: Session,
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None, 
        category : Optional[TicketCategory] = None,
        department_id: Optional[int] = None, 
        assigned_agent_id: Optional[int] = None, 
        created_by_id: Optional[int] = None
    ) -> List[Ticket]:
    query = db.query(Ticket)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if department_id:
        query = query.filter(Ticket.department_id == department_id)
    if assigned_agent_id:
        query = query.filter(Ticket.assigned_agent_id == assigned_agent_id)
    if created_by_id:
        query = query.filter(Ticket.created_by_id == created_by_id)

    return query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()
            
def log_ticket_history(
        db: Session, 
        ticket_id: int, 
        changed_by_id: int, 
        field_name: str, 
        old_value: Optional[str],
        new_value: Optional[str]
        ) -> TicketHistory:
    
    db_ticket_history = TicketHistory(
        ticket_id = ticket_id,
        changed_by_id = changed_by_id,
        field_name = field_name,
        old_value = old_value,
        new_value = new_value
    )

    db.add(db_ticket_history)
    db.commit()
    db.refresh(db_ticket_history)
    return db_ticket_history

def create_ticket(db: Session, ticket_in: TicketCreate, user_id: int) -> Ticket:
    generated_key = generate_ticket_key(db)
    db_ticket = Ticket(
        ticket_key = generated_key,
        title = ticket_in.title,
        description = ticket_in.description,
        category = ticket_in.category,
        priority = ticket_in.priority,
        ticket_type = None, # Initial state: unassigned
        department_id = None, # Initial state: unassigned
        assigned_agent_id = None, # Initial state: unassigned
        created_by_id = user_id,
        status = TicketStatus.OPEN
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    log_ticket_history(
        db = db,
        ticket_id = db_ticket.id,
        changed_by_id = user_id,
        field_name = "status",
        old_value=None,
        new_value=TicketStatus.OPEN.value
    )
    return db_ticket

def update_ticket(
        db: Session, 
        db_ticket: Ticket, 
        ticket_in : dict,
        change_by_id : int
        ) -> Ticket:

    #har field ko check kro
    for field, new_val in ticket_in.items():
        old_val = getattr(db_ticket, field)

        # Enum/values ko string me convert kro 
        old_str = str(old_val.value) if hasattr(old_val, "value") else str(old_val) if old_val is not None else None
        new_str = str(new_val.value) if hasattr(new_val, "value") else str(new_val) if new_val is not None else None

        #if value update hui h to log aur update kro
        if old_str != new_str:
            log_ticket_history(
                db = db,
                ticket_id = db_ticket.id,
                changed_by_id = change_by_id,
                field_name = field,
                old_value = old_str,
                new_value = new_str
            )
            setattr(db_ticket, field, new_val)

    # save aur return kro        
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

# Comment CRUD

def create_comment(db: Session,ticket_id: int, author_id: int, comment_in: CommentCreate) -> Comment:
    db_comment = Comment(
        ticket_id = ticket_id,
        author_id = author_id,
        body = comment_in.body.strip()
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_ticket_comments(db: Session, ticket_id: int) -> List[Comment]:
    comments =  db.query(Comment).filter(Comment.ticket_id == ticket_id)
    return comments.order_by(Comment.created_at.asc()).all()

# Attachement CRUD 

# check ticket attachment count
def get_ticket_attachment_count(db: Session, ticket_id: int) -> int:
    return db.query(Attachment).filter(Attachment.ticket_id == ticket_id).count()

# Fetch single attachment
def get_attachment_by_id(db: Session, attachment_id: int):
    return db.query(Attachment).filter(Attachment.id == attachment_id).first()

def create_attachment(
        db: Session, 
        ticket_id: int, 
        uploaded_by_id: int, 
        file_name: str, 
        stored_file_name: str,
        file_path: str, 
        content_type: str,
        file_size: int
        ) -> Attachment:
    db_attachment = Attachment(
        ticket_id = ticket_id,
        uploaded_by_id = uploaded_by_id,
        file_name = file_name,
        stored_file_name = stored_file_name,
        file_path = file_path,
        content_type = content_type,
        file_size = file_size
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment


