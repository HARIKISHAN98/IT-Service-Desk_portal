from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
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

# Reusable summary schemas

class UserSummary(BaseModel):
    id:int
    first_name:str
    last_name:str
    email:str
    role: UserRole

    class Config:
        from_attributes: True

class DepartmentSummry(BaseModel):
    id: int
    name: str

    class Config:
        from_attribute:True

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

class UserCreate(UserBase):
    password : str = Field(..., min_length=8, max_length=128)

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid") # Rejects unexpected/extra fields

    first_name : Optional[str] = Field(None, min_length=1, max_length=50)
    last_name : Optional[str] = Field(None, min_length=1, max_length=50)
    phone : Optional[str] = Field(None, max_length=20)
    status : Optional[UserStatus] = None
    password : Optional[str] = Field(None, min_length=8, max_length=128)

class UserResponse(UserBase):
    id : int
    created_at : datetime
    updated_at : datetime
    role : UserRole 
    status : UserStatus 

    class Config:
        from_attributes = True     

# Department Schemas

class DepartmentBase(BaseModel):
    name : str = Field(..., min_length=2, max_length=100)
    description : Optional[str] = None

class DepartmentCreate(DepartmentBase):
    model_config= ConfigDict(extra="forbid")

class DepartmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name : Optional[str] = Field(None, min_length=2, max_length=100)
    description : Optional[str] = None
    status : Optional[DepartmentStatus] = None

class DepartmentResponse(DepartmentBase):
    id : int
    status : DepartmentStatus
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

class TicketCreate(TicketBase):
    model_config = ConfigDict(extra="forbid")

    @field_validator("title","description")
    @classmethod
    def strip_and_validate_text(cls,v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field can not be empty and contain only whitespace.")
        return trimmed

class TicketUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
     ticket_type : Optional[TicketType] = None
     created_at : datetime
     updated_at : datetime

    # IDs are preserved for (Frontend conditionals & Routing ke liye)
     department_id: Optional[int] = None
     created_by_id : int
     assigned_agent_id : Optional[int] = None

    # Nested Objects (Screen display labels ke liye)
     department: Optional[DepartmentSummry] = None
     created_by: UserSummary
     assigned_agent: Optional[UserSummary] = None

     class Config:
       from_attributes = True

# Comment Schemas

class CommentBase(BaseModel):
    body : str = Field(..., min_length=1, max_length=2000)

class CommentCreate(CommentBase):
    model_config = ConfigDict(extra="forbid")
    @field_validator("body")
    @classmethod
    def validate_non_empty_body(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Comment body cannot be empty or just whitespace.")
        return trimmed

class CommentResponse(CommentBase):
    id : int
    ticket_id : int
    author_id : int
    created_at : datetime
    author: UserSummary  #Nested user details

    class Config:
        from_attributes = True

# Attachment Schemas

class AttachmentResponse(BaseModel):
    id : int
    ticket_id : int
    file_name : str
    content_type: str
    file_size : int
    created_at : datetime
    uploader : UserSummary
    
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
    changed_by: UserSummary  # Nester user who made the changes

    class Config :
        from_attributes = True

 