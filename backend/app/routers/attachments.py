import os       # To handle file path and create the directory 
import shutil   # uploaded file to copy/write on server disk
import uuid     # TO add random string in the file, so that existing file with same name can not override
from typing import List  # To write the response type hint

from fastapi import (
    APIRouter, # To define Sub-router/endpoint
    Depends, # To write dependency injection (DB session, auth user)
    HTTPException, # To throw custome error exception
    UploadFile, # To handling file upload 
    File, # To access the file data from request Body
    status, # To write the standard status code (200, 201, 400, 404)
)

from sqlalchemy.orm import Session # Database session type hinting
from app.dependencies import get_db, get_current_user
import app.crud as crud
from app.schemas import AttachmentResponse
from app.models import User, UserRole, Attachment

router = APIRouter(prefix="/tickets/{ticket_id}/attachments", tags=["Attachments"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def check_attachment_access(ticket, current_user: User):
    """
    To check the logged-in user have the permission to get or upload the attachments
    """
    is_admin = current_user.role == UserRole.ADMIN
    is_creator = current_user.role == UserRole.END_USER and ticket.created_by_id == current_user.id
    is_assigned_agent = current_user.role == UserRole.SUPPORT_AGENT and ticket.assigned_agent_id == current_user.id

    if not (is_admin or is_creator or is_assigned_agent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access the attatchment for this ticket"
        )

@router.get("/", response_model=List[AttachmentResponse])
def get_attachments(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the list of uploaded files/Attachments, combines with that particular ticket"""
    ticket = crud.get_ticket_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not Found"
        )

    check_attachment_access(ticket=ticket, current_user=current_user)
    return db.query(Attachment).filter(Attachment.ticket_id == ticket_id).all()

@router.post("/", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
def add_attachment(ticket_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Upload the new File on Ticket,
    save it on disk,
    save metadata in database
    """

    ticket = crud.get_ticket_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    check_attachment_access(ticket=ticket, current_user=current_user)

    # generate the random unique prefix for the file 
    unique_prefix = uuid.uuid4().hex[:8]

    # create unique file so that it will not overright existing file name
    safe_filename = f"{unique_prefix}_{file.filename}"

    # create the full local path
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # saved the file chunks in binary "wb" mode on disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # find the size of saved files in bytes
    file_size = os.path.getsize(file_path)
       
    # add the attachment record in db and return
    return crud.create_attachment(
        db=db, 
        ticket_id=ticket_id, 
        uploader_id=current_user.id, 
        file_name = file.filename ,
        file_path = file_path,
        file_size = file_size
    )

