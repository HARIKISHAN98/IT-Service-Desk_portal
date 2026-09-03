import os, mimetypes       # To handle file path and create the directory 
import uuid     # TO add random string in the file, so that existing file with same name can not override
from typing import List  # To write the response type hint
from pathlib import Path

from fastapi import (
    APIRouter, # To define Sub-router/endpoint
    Depends, # To write dependency injection (DB session, auth user)
    HTTPException, # To throw custome error exception
    UploadFile, # To handling file upload 
    File, # To access the file data from request Body
    status, # To write the standard status code (200, 201, 400, 404)
)
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session, joinedload # Database session type hinting
from app.dependencies import get_db, get_current_user
import app.crud as crud
from app.schemas import AttachmentResponse
from app.models import User, UserRole, Attachment, TicketStatus

router = APIRouter(prefix="/tickets/{ticket_id}/attachments", tags=["Attachments"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent /"uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Whitelisted extension & MIME types
ALLOWED_EXTENSIONS = [
    # Viewable inline
    ".png", ".jpg", ".jpeg", ".pdf", ".txt", ".log",
    # Download formats
    ".docx", ".doc", ".xlsx", ".xls", ".csv", ".zip"
]

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
MAX_FILES_PER_TICKET = 10

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
}

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

@router.get("/",response_model=List[AttachmentResponse])
def get_ticket_attachments(ticket_id:int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch all attachment metadata associated with this ticket"""
    ticket = crud.get_ticket_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    check_attachment_access(ticket=ticket, current_user=current_user)
    return db.query(Attachment).options(joinedload(Attachment.uploader)).filter(Attachment.ticket_id == ticket_id).order_by(Attachment.created_at.desc()).all()

@router.post("/", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(ticket_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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

    # 1. Block uploads if ticket is CLOSED
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is Closed. Attachments cannot be added."
        )

    # 2. check 10 files ceiling
    current_count = crud.get_ticket_attachment_count(db, ticket_id=ticket_id)
    if current_count >= MAX_FILES_PER_TICKET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment limit reached. Maximum {MAX_FILES_PER_TICKET} files allowed per ticket"
        )

    # 3. Extension & MIME validation
    clean_filename = os.path.basename(file.filename)
    file_ext = Path(clean_filename).suffix.lower()

    # Primary check : Extension whitelist me hona chaiye
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupport file format. Executables and unknow files are blocked."
        )

    # Secondry check : system se MIME guess karke agar client generic type bej rha ho
    guessed_mime, _ = mimetypes.guess_type(clean_filename)

    if (file.content_type and file.content_type != "application/octet-stream"):
        final_content_type = file.content_type 
    else :
        final_content_type =  guessed_mime or "application/octet-stream"

    # Fallback check: Block only if guessed type in explicitlly not allowed
    if final_content_type not in ALLOWED_MIME_TYPES and final_content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Executable and unknow files are blocked."
        )

    # 4. File size validation 
    file_data = await file.read()
    file_size = len(file_data)
    await file.close()

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File cannnot be empty"
        )

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 5 MB limit."
        )

    # 5. Store on disk using UUID
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    destination_path = UPLOAD_DIR / unique_filename

    with open(destination_path, "wb") as f:
        f.write(file_data)

    try:
    # 6. save metdata in Db
        attachment = crud.create_attachment(
        db=db,
        ticket_id=ticket_id,
        uploaded_by_id=current_user.id,
        file_name=clean_filename,
        stored_file_name=unique_filename,
        file_path=str(destination_path),
        content_type=final_content_type,
        file_size=file_size
    )

    # 7. Audit log in TicketHistory
        crud.log_ticket_history(
        db=db,
        ticket_id=ticket_id,
        changed_by_id=current_user.id,
        field_name="attachment_added",
        old_value=None,
        new_value=clean_filename
        )

    except Exception as e:

        print(f"\n DB save error: {type(e).__name__} -> {str(e)}\n")
        import traceback
        traceback.print_exc()

        if destination_path.exists():
            destination_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save attachment."
        )   
     
    return attachment

@router.get("/{attachment_id}/view")
def view_or_download_attachments(ticket_id: int, attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    """Return the list of uploaded files/Attachments, combines with that particular ticket"""

    attachment = crud.get_attachment_by_id(db=db, attachment_id=attachment_id)
    if not attachment or attachment.ticket_id != ticket_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found for this ticket"
        )

    ticket = crud.get_ticket_by_id(db=db, ticket_id=attachment.ticket_id)
    check_attachment_access(ticket,current_user=current_user)   

    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file missing on server storage."
        )

    return FileResponse(
        path=attachment.file_path,
        media_type=attachment.content_type,
        filename=attachment.file_name,
        content_disposition_type="inline"
    )

@router.delete("/{attachment_id}",status_code=status.HTTP_200_OK)
def delete_attachment(
    ticket_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = crud.get_attachment_by_id(db=db, attachment_id=attachment_id)
    if not attachment  or attachment.ticket_id != ticket_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found for this ticket"
        )
    
    ticket = crud.get_ticket_by_id(db=db, ticket_id=attachment.ticket_id)
    check_attachment_access(ticket=ticket,current_user=current_user)

    # 1. Closed ticket lock
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is closed, Attachments can not be deleted."
        )

    # 2. RBAC: Only Admin or the original uploader can delete
    if current_user.role != UserRole.ADMIN and attachment.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. You can only delete attachments uploaded by you."
        )

    # 3. Remove physical file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    deleted_filename = attachment.file_name
    ticket_id = attachment.ticket_id

    # 4. Remove database record
    db.delete(attachment)
    db.commit()  

    # 5. Audit log in TicketHistory
    crud.log_ticket_history(
        db=db,
        ticket_id=ticket_id,
        changed_by_id=current_user.id,
        field_name="attachment_removed",
        old_value=deleted_filename,
        new_value=None
    )

    return {
        "message": f"Attachment '{deleted_filename}' deleted successfully"
    }



