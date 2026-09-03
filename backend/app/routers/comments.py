from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models import TicketStatus, User, UserRole
import app.crud as crud
from app.schemas import CommentCreate, CommentResponse

router = APIRouter(prefix="/tickets/{ticket_id}/comments", tags=["Comments"])

def check_comment_access(ticket, current_user: User):
    """Check if logged-in User is allowed to add/write comment on thsi ticket"""
    is_admin = current_user.role == UserRole.ADMIN
    is_creator = current_user.role == UserRole.END_USER and ticket.created_by_id == current_user.id
    is_assigned_agent = current_user.role == UserRole.SUPPORT_AGENT and ticket.assigned_agent_id == current_user.id
    if not (is_admin or is_creator or is_assigned_agent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access the comment on this ticket"
        )

@router.get("/", response_model=List[CommentResponse])
def get_comments(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    # 1. find the ticket
    ticket = crud.get_ticket_by_id(db=db,ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # 2.check access permission
    check_comment_access(ticket=ticket, current_user=current_user)

    # return the comment list
    return crud.get_ticket_comments(db=db, ticket_id=ticket_id)
    

@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user : User = Depends(get_current_user)
):
    #1 first find the ticket
    ticket = crud.get_ticket_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    #2 check access the permission
    check_comment_access(ticket,current_user=current_user)

    # 1. Block comment additions if ticket is CLOSED
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is Closed. Comments cannot be added."
        )

    #3 Create the new comment
    return crud.create_comment(
        db=db,
        ticket_id = ticket_id,
        author_id = current_user.id,
        comment_in = comment_in 
    ) 


