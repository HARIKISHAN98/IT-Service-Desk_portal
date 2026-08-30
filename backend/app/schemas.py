from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from app.models import (
    UserRole,
    UserStatus,
    DepartmentStatus,
    TicketCategory,
    TicketType,
    TicketPriority,
    TicketStatus
)

# Auth & Token Schemas
class Token(BaseModel):
    access_token : str
    token_type : str = "bearer"

class TokenData(BaseModel):
    user_id : Optional[int] = None
    email : Optional[str] = None
    role : Optional[UserRole] = None

class LoginRequest(BaseModel):
    email : EmailStr
    password : str    

# User Schemas

class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email : EmailStr
    phone : Optional[str] = Field(None,max_length=20)
    role : UserRole = UserRole.END_USER
    status : UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password : str = Field(..., min_length=8, max_length=128)

class UserUpdate(BaseModel):
    first_name : Optional[str] = Field(None, min_length=1, max_length=50)
    last_name : Optional[str] = Field(None, min_length=1, max_length=50)
    phone : Optional[str] = Field(None, max_length=20)
    role : Optional[UserRole] = None
    status : Optional[UserStatus] = None
    password : Optional[str] = Field(None, min_length=8, max_length=128)

class UserResponse(UserBase):
    id : int
    created_at : datetime
    updated_at : datetime

    class Config:
        from_attributes = True     

# Department Schemas

class DepartmentBase(BaseModel):
    name : str = Field(..., min_length=2, max_length=100)
    description : Optional[str] = None
    status : DepartmentStatus = DepartmentStatus.ACTIVE

class DepartmentCreate(DepartmentBase):
      pass

class DepartmentUpdate(BaseModel):
    name : Optional[str] = Field(None, min_length=2, max_length=100)
    description : Optional[str] = None
    status : Optional[DepartmentStatus] = None

class DepartmentResponse(DepartmentBase):
    id : int
    created_at : datetime
    updated_at : datetime

    class Config:
        from_attributes = True    

# Support Agent Profile Schemas

class SupportAgentProfileBase(BaseModel):
    department_ids : List[int] = Field(default_factory=list)
    ticket_types : List[TicketType] = Field(default_factory=list)

class SupportAgentProfileCreate(SupportAgentProfileBase):
    user_id : int = Field(...)

class SupportAgentProfileUpdate(BaseModel):
    department_ids : Optional[List[int]] = None
    ticket_types : Optional[List[TicketType]] = None

class SupportAgentProfileResponse(SupportAgentProfileBase):
    id : int
    user_id : int 
    created_at : datetime
    updated_at : datetime

    class Config:
        from_attributes = True

# Ticket Schemas

class TicketBase(BaseModel):
    title : str = Field(...,min_length=5, max_length=255)
    description : str = Field(..., min_length=10)
    category : TicketCategory
    priority : TicketPriority
    ticket_type : Optional[TicketType] = None
    department_id : Optional[int] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title : Optional[str] = Field(None, min_length=5, max_length=255)
    description : Optional[str] = Field(None, min_length=10)
    category : Optional[TicketCategory] = None
    priority : Optional[TicketPriority] = None
    status : Optional[TicketStatus] = None
    ticket_type : Optional[TicketType] = None
    department_id : Optional[int] = None
    assigned_agent_id : Optional[int] = None

class TicketResponse(TicketBase):
     id : int
     ticket_key : str
     status : TicketStatus
     created_by_id : int
     assigned_agent_id : Optional[int] = None
     created_at : datetime
     updated_at : datetime

     class Config:
       from_attributes = True

# Comment Schemas

class CommentBase(BaseModel):
    body : str = Field(..., min_length=1)

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id : int
    ticket_id : int
    author_id : int
    created_at : datetime

    class Config:
        from_attributes = True

# Attachment Schemas

class AttachmentResponse(BaseModel):
    id : int
    ticket_id : int
    uploader_id : int
    file_name : str
    file_path : str
    file_size : int
    created_at : datetime

    class Config:
        from_attributes = True    

# TicketHistory Schemas

class TicketHistoryResponse(BaseModel):
    id : int
    ticket_id : int
    changed_by_id : int
    field_name : str
    old_value: Optional[str] = None
    new_value : Optional[str] = None
    created_at : datetime

    class Config :
        from_attributes = True

