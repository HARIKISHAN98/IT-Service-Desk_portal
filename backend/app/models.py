
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str,enum.Enum):
    ADMIN = "ADMIN"
    SUPPORT_AGENT = "SUPPORT_AGENT"
    END_USER = "END_USER"

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class DepartmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class TicketCategory(str, enum.Enum):
    HARDWARE = "HARDWARE"
    SOFTWARE = "SOFTWARE"
    NETWORK = "NETWORK"
    ACCESS_MANAGEMENT = "ACCESS_MANAGEMENT"
    OTHER = "OTHER"

class TicketType(str, enum.Enum):
    TASK = "TASK"
    INCIDENT = "INCIDENT"

class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

def get_current_utc_time():
    return datetime.now(timezone.utc)    

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(255),unique=True ,index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(SQLEnum(UserRole),nullable=False,default=UserRole.END_USER)
    status = Column(SQLEnum(UserStatus),nullable=False,default=UserStatus.ACTIVE)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)
    updated_at = Column(DateTime,default=get_current_utc_time, onupdate=get_current_utc_time, nullable=False)

    # Relationship
    support_agent = relationship("SupportAgentProfile", back_populates="user", uselist=False)
    created_tickets = relationship("Ticket", foreign_keys="Ticket.created_by_id", back_populates="created_by")
    assigned_tickets = relationship("Ticket", foreign_keys="Ticket.assigned_agent_id", back_populates="assigned_agent")
    comments = relationship("Comment", back_populates="author")
    attachments = relationship("Attachment", back_populates="uploader")
    history_entries = relationship("TicketHistory", back_populates="changed_by")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer,primary_key=True,index=True, autoincrement=True)
    name = Column(String(100), unique=True,nullable=False)
    description = Column(Text,nullable=True)
    status = Column(SQLEnum(DepartmentStatus), nullable=False, default=DepartmentStatus.ACTIVE)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)
    updated_at = Column(DateTime,default=get_current_utc_time,onupdate=get_current_utc_time,nullable=False)

    # Relationship
    tickets = relationship("Ticket", back_populates="department")

class SupportAgentProfile(Base):
    __tablename__ = "support_agent_profiles"

    id = Column(Integer, primary_key=True,index=True,autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"),unique=True,nullable=False)
    department_ids = Column(JSON,nullable=False,default=list)
    ticket_types = Column(JSON,nullable=False,default=list)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)
    updated_at = Column(DateTime,default=get_current_utc_time, onupdate=get_current_utc_time,nullable=False)

    # Relationship
    user = relationship("User", back_populates="support_agent")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer,primary_key=True,index=True,autoincrement=True)
    ticket_key = Column(String(20),unique=True,nullable=False,index=True)
    title = Column(String(255),nullable=False)
    description = Column(Text,nullable=False)
    category = Column(SQLEnum(TicketCategory),nullable=False)
    priority = Column(SQLEnum(TicketPriority),nullable=False)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.OPEN)
    ticket_type = Column(SQLEnum(TicketType), nullable=True)
    department_id = Column(Integer,ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(Integer,ForeignKey("users.id"),nullable=False)
    assigned_agent_id = Column(Integer,ForeignKey("users.id"),nullable=True)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)
    updated_at = Column(DateTime,default=get_current_utc_time, onupdate=get_current_utc_time, nullable=False)

    # Relationship
    department = relationship("Department", back_populates="tickets")
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")
    ticket_history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_tickets")
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id], back_populates="assigned_tickets")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer,primary_key=True,index=True,autoincrement=True)
    ticket_id = Column(Integer,ForeignKey("tickets.id"),nullable=False)
    author_id = Column(Integer,ForeignKey("users.id"),nullable=False)
    body = Column(Text,nullable=False)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)

    # Relationship
    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("User",foreign_keys=[author_id],back_populates="comments")

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer,primary_key=True,index=True,autoincrement=True)
    ticket_id = Column(Integer,ForeignKey("tickets.id"),nullable=False)
    uploaded_by_id = Column(Integer,ForeignKey("users.id"),nullable=False)
    file_name = Column(String(255), nullable=False)
    stored_file_name = Column(String(255), nullable=False, unique=True)
    file_path = Column(String(500),nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer,nullable=False)
    created_at = Column(DateTime,default=get_current_utc_time, nullable=False) 

    # Relationship
    ticket = relationship("Ticket", back_populates="attachments")  
    uploader = relationship("User", back_populates="attachments") 

class TicketHistory(Base):
    __tablename__ = "ticket_history"
    id = Column(Integer,primary_key=True,index=True,autoincrement=True)
    ticket_id = Column(Integer,ForeignKey("tickets.id"),nullable=False)
    changed_by_id = Column(Integer,ForeignKey("users.id"),nullable=False)
    field_name = Column(String(50),nullable=False)
    old_value = Column(Text,nullable=True)
    new_value = Column(Text,nullable=True)
    created_at = Column(DateTime,default=get_current_utc_time,nullable=False)
    
    # Relationship
    ticket = relationship("Ticket", back_populates="ticket_history")
    changed_by = relationship("User",foreign_keys=[changed_by_id] ,back_populates="history_entries")


