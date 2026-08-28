# IT Service Desk Portal — Technical Design Document

## 1. System Architecture Overview

The backend is built as a modular monolithic REST API using Python, FastAPI, SQLAlchemy ORM, and Pydantic.

Data integrity and business logic are enforced through a strict Layered Architecture (One-Directional Flow):

[ HTTP Client / Frontend ]
          │
          ▼
   1. API Layer (Routers & Dependencies)
          │  - Parses HTTP requests & query parameters
          │  - Authenticates via JWT & extracts current user context
          │  - Enforces Role-Based Access Control (RBAC) via FastAPI dependencies
          │  - Validates request payload structures using Pydantic Schemas
          ▼
   2. Service Layer (Business Logic Engine)
          │  - Executes state machine rules and status transitions
          │  - Validates business constraints (e.g., Agent department/type eligibility)
          │  - Manages atomic transactions (Ticket update + History audit logging)
          ▼
   3. Data Access Layer (SQLAlchemy ORM Models)
          │  - Maps Python models to database tables
          │  - Defines Foreign Keys, Constraints, Junctions, and Indexes
          ▼
   4. Database (SQLite for development / PostgreSQL for production)

---

## 2. Directory Structure

backend/
├── app/
│   ├── api/
│   │   ├── deps.py             # Auth dependencies, get_db, require_role
│   │   └── v1/
│   │       ├── auth.py         # Login, End User registration, profile
│   │       ├── tickets.py      # Ticket CRUD, triage, assignment, status, comments
│   │       ├── users.py        # Agent management, user querying
│   │       └── departments.py  # Department CRUD & status toggles
│   ├── core/
│   │   ├── config.py           # Environment variables (Settings, JWT secrets)
│   │   ├── database.py         # SQLAlchemy engine and session factory
│   │   └── security.py         # Bcrypt password hashing & JWT encode/decode
│   ├── models/                 # SQLAlchemy DB Models
│   │   ├── user.py
│   │   ├── department.py
│   │   ├── ticket.py
│   │   ├── comment.py
│   │   ├── attachment.py
│   │   └── history.py
│   ├── schemas/                # Pydantic Schemas (Request/Response DTOs)
│   │   ├── user.py
│   │   ├── department.py
│   │   ├── ticket.py
│   │   ├── comment.py
│   │   └── history.py
│   ├── services/               # Core Business Logic & State Machines
│   │   ├── auth_service.py
│   │   ├── ticket_service.py   # State machine, assignment validation, history logger
│   │   ├── user_service.py
│   │   └── department_service.py
│   └── main.py                 # FastAPI application factory & middleware
├── seed/
│   └── seed_data.py            # Initial seed script for Admin and default master data
├── tests/                      # Pytest test suite
│   ├── conftest.py             # Test DB fixtures, auth client helpers
│   ├── test_auth.py
│   ├── test_tickets.py
│   └── test_state_machine.py
└── requirements.txt

---

## 3. Database Schema & Data Models

### 3.1 Enumerations (Enums)

- UserRole: END_USER, SUPPORT_AGENT, ADMIN
- UserStatus: ACTIVE, INACTIVE
- DepartmentStatus: ACTIVE, INACTIVE
- TicketType: INCIDENT, TASK
- TicketPriority: LOW, MEDIUM, HIGH, URGENT
- TicketCategory: HARDWARE, SOFTWARE, NETWORK, ACCESS_MANAGEMENT, OTHER
- TicketStatus: OPEN, ASSIGNED, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED

---

### 3.2 Relational Entity Diagram

  ┌──────────────────┐               ┌───────────────────────┐
  │   departments    │◄──┐       ┌──►│     ticket_types      │
  ├──────────────────┤   │       │   ├───────────────────────┤
  │ id (PK)          │   │       │   │ enum / static values  │
  │ name (Unique)    │   │       │   └───────────────────────┘
  │ status           │   │       │               ▲
  └──────────────────┘   │       │               │
           ▲             │       │               │
           │ (Junction)  │       │ (Junction)    │
  ┌────────┴─────────────┴─┐   ┌─┴───────────────┴──────┐
  │   agent_departments    │   │   agent_ticket_types   │
  ├────────────────────────┤   ├────────────────────────┤
  │ agent_id (FK -> users) │   │ agent_id (FK -> users) │
  │ department_id (FK)     │   │ ticket_type (Enum)     │
  └────────────────────────┘   └────────────────────────┘
           ▲
           │
  ┌────────┴─────────┐
  │      users       │
  ├──────────────────┤
  │ id (PK)          │
  │ email (Unique)   │
  │ hashed_password  │
  │ role (Enum)      │
  │ status (Enum)    │
  └────────┬─────────┘
           │
           ├────────────────────────┬────────────────────────┐
           │ (Created By)           │ (Assigned To)          │ (Author/Uploader)
           ▼                        ▼                        ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                           tickets                           │
  ├─────────────────────────────────────────────────────────────┤
  │ id (PK, Auto-Increment)                                     │
  │ title, description, category, priority                      │
  │ status (Enum)                                               │
  │ ticket_type (Enum, Nullable until triage)                   │
  │ department_id (FK -> departments.id, Nullable)              │
  │ created_by_id (FK -> users.id)                              │
  │ assigned_agent_id (FK -> users.id, Nullable)                │
  │ created_at, updated_at                                      │
  └────────┬────────────────────────┬───────────────────────────┘
           │                        │
           ▼                        ▼
  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │     comments     │     │   attachments    │     │  ticket_history  │
  ├──────────────────┤     ├──────────────────┤     ├──────────────────┤
  │ id (PK)          │     │ id (PK)          │     │ id (PK)          │
  │ ticket_id (FK)   │     │ ticket_id (FK)   │     │ ticket_id (FK)   │
  │ author_id (FK)   │     │ uploader_id (FK) │     │ changed_by_id(FK)│
  │ content          │     │ file_name        │     │ field_name       │
  │ created_at       │     │ file_path        │     │ old_value        │
  └──────────────────┘     │ file_size        │     │ new_value        │
                           │ created_at       │     │ created_at       │
                           └──────────────────┘     └──────────────────┘

---

### 3.3 Detailed Table Definitions

#### users
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | User identifier |
| first_name | String(50) | NOT NULL | User first name |
| last_name | String(50) | NULLABLE | User last name |
| email | String(100) | NOT NULL, UNIQUE, Indexed | Login email address |
| phone | String(20) | NULLABLE | Phone number (mandatory for agents) |
| hashed_password | String(255) | NOT NULL | Bcrypt password hash |
| role | Enum(UserRole) | NOT NULL | END_USER, SUPPORT_AGENT, ADMIN |
| status | Enum(UserStatus) | NOT NULL, Default: ACTIVE | Account state (ACTIVE / INACTIVE) |
| created_at | DateTime(UTC) | NOT NULL, Default: now() | Insertion timestamp |

#### departments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | Department identifier |
| name | String(100) | NOT NULL, UNIQUE | Department name |
| description | String(255) | NULLABLE | Department scope/details |
| status | Enum(DepartmentStatus) | NOT NULL, Default: ACTIVE | Department state (ACTIVE / INACTIVE) |
| created_at | DateTime(UTC) | NOT NULL, Default: now() | Insertion timestamp |

#### agent_departments (Junction Table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| agent_id | Integer | PK, FK -> users.id (ON DELETE CASCADE) | Agent ID |
| department_id | Integer | PK, FK -> departments.id (ON DELETE CASCADE) | Handled Department ID |

#### agent_ticket_types (Junction Table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| agent_id | Integer | PK, FK -> users.id (ON DELETE CASCADE) | Agent ID |
| ticket_type | Enum(TicketType) | PK | Handled Ticket Type (INCIDENT, TASK) |

#### tickets
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | Ticket internal identifier |
| title | String(150) | NOT NULL | Ticket summary title |
| description | Text | NOT NULL | Detailed problem description |
| category | Enum(TicketCategory) | NOT NULL | Categorization |
| priority | Enum(TicketPriority) | NOT NULL | Priority level |
| status | Enum(TicketStatus) | NOT NULL, Default: OPEN, Indexed | Current lifecycle state |
| ticket_type | Enum(TicketType) | NULLABLE | Set during Admin triage |
| department_id | Integer | NULLABLE, FK -> departments.id | Set during Admin triage |
| created_by_id | Integer | NOT NULL, FK -> users.id, Indexed | Ticket creator (End User) |
| assigned_agent_id | Integer | NULLABLE, FK -> users.id, Indexed | Assigned Support Agent |
| created_at | DateTime(UTC) | NOT NULL, Default: now(), Indexed | Creation timestamp |
| updated_at | DateTime(UTC) | NOT NULL, Default: now(), onupdate | Last update timestamp |

Display Serialization: Formatted dynamically in API responses as TKT-{id:04d} (e.g., TKT-0001).

#### comments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | Comment identifier |
| ticket_id | Integer | NOT NULL, FK -> tickets.id, Indexed | Associated ticket |
| author_id | Integer | NOT NULL, FK -> users.id | User who posted the comment |
| content | Text | NOT NULL | Comment text body |
| created_at | DateTime(UTC) | NOT NULL, Default: now() | Posting timestamp |

#### attachments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | Attachment identifier |
| ticket_id | Integer | NOT NULL, FK -> tickets.id, Indexed | Associated ticket |
| uploader_id | Integer | NOT NULL, FK -> users.id | User who uploaded file |
| file_name | String(255) | NOT NULL | Original filename |
| file_path | String(500) | NOT NULL | Server/local storage path |
| file_size | Integer | NOT NULL | Size in bytes |
| created_at | DateTime(UTC) | NOT NULL, Default: now() | Upload timestamp |

#### ticket_history
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | PK, Auto-Increment | Audit log identifier |
| ticket_id | Integer | NOT NULL, FK -> tickets.id, Indexed | Associated ticket |
| changed_by_id | Integer | NOT NULL, FK -> users.id | User who made the change |
| field_name | String(50) | NOT NULL | Field modified (status, priority, etc.) |
| old_value | String(255) | NULLABLE | Value prior to update |
| new_value | String(255) | NOT NULL | Value after update |
| created_at | DateTime(UTC) | NOT NULL, Default: now(), Indexed | Timestamp of change |

---

## 4. Soft-Status & Lifecycle Integrity Rules

To preserve full auditability and maintain permanent historical records, hard deletions (DELETE FROM ...) on primary resources are disabled. The system implements Soft State Management:

### 4.1 Department Deactivation Behavior
- When a Department transitions to INACTIVE:
  - Existing open tickets associated with that department remain active and can be worked on and resolved normally.
  - Historical closed tickets retain their foreign key association without data corruption.
  - The department is filtered out of active dropdowns and cannot be assigned to new tickets during triage.

### 4.2 Support Agent Deactivation Behavior
- When a Support Agent transitions to INACTIVE:
  - The agent is blocked from logging in.
  - Any open/in-progress tickets currently assigned to that agent have assigned_agent_id set to NULL (unassigned).
  - An audit record is created in ticket_history recording the unassignment.
  - Past resolved/closed tickets, comments, and historical assignment records are preserved permanently.

---

## 5. Authentication, Security & RBAC

### 5.1 Password Hashing & Verification
- Passwords are encrypted using bcrypt via passlib[bcrypt] before database storage.
- Raw passwords are never logged or persisted.

### 5.2 JWT Token Specification
- On authentication, the backend issues an industry-standard signed JWT Bearer token:
{
  "sub": "12",
  "email": "user@company.com",
  "role": "END_USER",
  "exp": 1787755200
}

### 5.3 FastAPI Dependency-Based RBAC
Access control is implemented via dependency injection callables:
- Dependency get_current_user extracts and decodes the JWT bearer token from HTTP headers, validates expiry, and fetches user record from database.
- Dependency require_role(allowed_roles) wraps get_current_user and checks whether current_user.role belongs to the allowed set. If not authorized, raises HTTP 403 Forbidden.

---

## 6. Business Service Layer Execution

### 6.1 Assignment Validation Engine
When an Admin calls POST /api/v1/tickets/{id}/assign:
1. Retrieve target Agent from database.
2. Verify agent.status == UserStatus.ACTIVE and agent.role == UserRole.SUPPORT_AGENT.
3. Verify target Department exists in agent.departments.
4. Verify target TicketType exists in agent.ticket_types.
5. Update ticket fields (department_id, ticket_type, assigned_agent_id, priority), set status = ASSIGNED, and record audit history in a single atomic database transaction.

### 6.2 Auto-Resume Lifecycle Engine
When a user adds a comment or attachment to a ticket:
1. Verify if ticket.status == TicketStatus.WAITING_FOR_USER and current_user.id == ticket.created_by_id.
2. If true, automatically transition ticket.status to TicketStatus.IN_PROGRESS.
3. Commit the change and append an audit record to ticket_history logging the automatic transition.

---

## 7. Seed Data Specification

The database seeder (seed/seed_data.py) provisions the baseline environment:
1. Default Admin Account:
   - Email: admin@servicedesk.local
   - Role: ADMIN
   - Status: ACTIVE
2. Initial Departments:
   - Hardware, Software, Network, Access Management
3. Seed Agents & Users: Provides deterministic accounts for automated testing and capability verification.
4. 