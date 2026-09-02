from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
import app.crud as crud
from app.schemas import TicketCreate, TicketResponse, TicketUpdate, TicketHistoryResponse
from app.models import User, UserRole, UserStatus ,Ticket ,TicketStatus, TicketPriority, TicketCategory, TicketHistory, Department, DepartmentStatus

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/", response_model=TicketResponse,status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_in: TicketCreate,db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    create a new Ticket
    - Strictly allowed only for END_USER role.
    - Generate readable key (TICK-1001)
    - Sets Initial status to open and logs history
    """
    # Strict Role Check :- Only END_USER can create the ticket
    if current_user.role != UserRole.END_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only End-User are allowed to create the tickets"
        )
    return crud.create_ticket(db=db, ticket_in=ticket_in, user_id=current_user.id)

@router.get("/", response_model=List[TicketResponse])
def get_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[TicketStatus] = None,
    category: Optional[TicketCategory] = None,
    priority: Optional[TicketPriority] = None,
    department_id: Optional[int] = None,
    assigned_agent_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch ticket with multi-filter search and strict RBAC:
    - End-User see only thier created ticket.
    - Support Agent see only ticket assigned to them.
    - Admin has global visiblity across all filters.
    """
    # RBAC Logic 
    if current_user.role == UserRole.END_USER:
        created_by_id = current_user.id
    elif current_user.role == UserRole.SUPPORT_AGENT:
        assigned_agent_id = current_user.id

    return crud.get_tickets(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        priority=priority,
        category=category,
        department_id=department_id,
        assigned_agent_id=assigned_agent_id,
        created_by_id=created_by_id
    )        

def check_ticket_access(ticket, current_user: User):
    is_admin = current_user.role == UserRole.ADMIN
    is_creator = (current_user.role == UserRole.END_USER and ticket.created_by_id == current_user.id)
    is_assigned = (current_user.role == UserRole.SUPPORT_AGENT and ticket.assigned_agent_id == current_user.id)

    if not (is_admin or is_creator or is_assigned):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access the ticket"
        )

@router.get("/{ticket_id}",response_model=TicketResponse)
def get_ticket_by_id(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    # find ticket
    ticket = crud.get_ticket_by_id(db=db,ticket_id=ticket_id)

    # check ticket exist or not 
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    check_ticket_access(ticket=ticket, current_user=current_user)   
    return ticket

@router.get("/key/{ticket_key}", response_model=TicketResponse)
def get_ticket_by_key(ticket_key: str,db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    # find ticket
    ticket = crud.get_ticket_by_key(db=db,ticket_key=ticket_key)

    # check if ticket exist or not
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    check_ticket_access(ticket=ticket, current_user=current_user)
    return ticket

# RBAC :- Ticket Update Valdiation
def validate_ticket_update_rbac(db: Session, ticket: Ticket, update_data: dict, current_user: User):

    # -------------------------------GLOBAL LOCK: CLOSED TICKET--------------------------
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is closed and cannot be modified by anyone"
        )

    new_status = update_data.get("status")

    # -------------------------------1. END USER--------------------------
    if current_user.role == UserRole.END_USER:
        if ticket.created_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update ticket created by you"
            )

        # End User can not touch field other then 'status'
        if any ( field!= "status" for field in update_data):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="End User can only change the resolution status"
            )
        # End User can only act if ticket is in RESOLVE state
        if ticket.status != TicketStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only close or reopen a ticket when it is in RESOLVE status"
            )
        # Allowed target status
        if new_status not in [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only transition a resolved ticket to CLOSED or IN_PROGRESS"
            )

    # -------------------------------2. SUPPORT AGENT--------------------------
    elif current_user.role == UserRole.SUPPORT_AGENT:
        if ticket.assigned_agent_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update tickets assigned directly to you"
            )
        # Agent can not modify fields, other then status
        if any(field != "status" for field in update_data):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Support agent can only update the ticket status"
            )
        # Only allowed target status for Agent
        agent_allowed_status = [
            TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_FOR_USER,
            TicketStatus.RESOLVED
        ]

        if not new_status or new_status not in agent_allowed_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent can only set status to: IN_PROGRESS, WAITING_FOR_USER, or RESOLVED"
            )

    # -------------------------------3. ADMIN--------------------------
    elif current_user.role == UserRole.ADMIN:
    # Prevent movinng ticket back to open
        if new_status == TicketStatus.OPEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move a ticket back to OPEN status"
            )

        # validate department if provided
        if "department_id" in update_data:
            dept_id = update_data["department_id"]

            # cannot unassigned department if already assigned
            if dept_id is None and ticket.department_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot unassign department once it has been assigned"
                )

            if dept_id is not None:
                department = db.query(Department).filter(Department.id == dept_id).first()
                if not department:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Department with the id {dept_id} does not exist"
                    )
                # Inactive department check
                if hasattr(department,"status") and department.status != DepartmentStatus.ACTIVE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot assign ticket to an inactive department (ID {dept_id})"
                    )

        # validate assigned_agent_id if provided
        if "assigned_agent_id" in update_data:
            agent_id = update_data["assigned_agent_id"]

            # Cannot unassigned agent if already assigned
            if agent_id is None and ticket.assigned_agent_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot unassigned agent once a ticket has been assigned"
                )

            if agent_id is not None:
                agent = db.query(User).filter(User.id == agent_id).first()
                if not agent:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"User with id {agent_id} does not exist"
                    ) 

                # Check user has agent role
                if agent.role != UserRole.SUPPORT_AGENT:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User with id {agent_id} is a '{agent.role.value}', not a SUPPORT_AGENT  "
                    )
                # check agent is active
                if hasattr(agent, "status") and agent.status != UserStatus.ACTIVE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot assign ticket to an inactive agent (User ID {agent_id})"
                    )

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id:int, 
    ticket_in: TicketUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    """
    Update Ticket details (Status, Priority, Agent Assignment):
    - Authorized users can update.
    - End User are can only change status to CLOSE only, if ticket status is in "RESOLVE"
    - Support Agent can change only status to :- IN_PROGRESS, WAITING_FOR_USER, RESOLVED
    - Admin can change ticket_type, department_in, assigned_agent_id, category, priority, status (can not change status to OPEN)
    - Automatically records changes in TicketHistory Role
    """ 

    ticket = crud.get_ticket_by_id(db=db, ticket_id=ticket_id)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # check authorized user
    check_ticket_access(ticket=ticket, current_user=current_user)

    update_dict = ticket_in.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No field provided for update"
        )
    
    # Run RBAC and state validation
    validate_ticket_update_rbac(db=db, ticket=ticket, update_data=update_dict, current_user=current_user)

    # Call CRUD to apply, updates and log each field change in ticket_history    
    return crud.update_ticket(db=db, db_ticket=ticket, ticket_in=update_dict, change_by_id=current_user.id)

@router.get("/{ticket_id}/history", response_model=List[TicketHistoryResponse])
def get_ticket_history(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ): 
    """
    Fetch all audit history logs (Timeline) for a specific ticket.
    """
    ticket = crud.get_ticket_by_id(db=db,ticket_id=ticket_id)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Permission check : Admin, Creator, Assigned-Agent only 
    check_ticket_access(ticket=ticket, current_user=current_user)

    # Read history entries from DB stored by newest first
    return db.query(TicketHistory).filter(TicketHistory.ticket_id == ticket_id).order_by(TicketHistory.created_at.desc()).all()

