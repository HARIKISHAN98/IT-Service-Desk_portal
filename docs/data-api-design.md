# Data Model & API Specification (docs/data-api-design.md)

## 1. Database Schema Overview

### 1.1 Enums
* **UserRole**: ADMIN, SUPPORT_AGENT, END_USER
* **UserStatus**: ACTIVE, INACTIVE
* **DepartmentStatus**: ACTIVE, INACTIVE
* **TicketCategory**: HARDWARE, SOFTWARE, NETWORK, ACCESS_MANAGEMENT, OTHER
* **TicketType**: INCIDENT, TASK
* **TicketPriority**: LOW, MEDIUM, HIGH, CRITICAL
* **TicketStatus**: OPEN, ASSIGNED, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED

---

### 1.2 Table Definitions

#### users
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Unique user identifier |
| first_name | Varchar(50) | Not Null | User first name |
| last_name | Varchar(50) | Not Null | User last name |
| email | Varchar(255) | Unique, Not Null, Indexed | Login email |
| password_hash | Varchar(255) | Not Null | Hashed password |
| phone | Varchar(20) | Nullable | Optional contact number |
| role | Enum(UserRole) | Not Null, Default: END_USER | Authorization role |
| status | Enum(UserStatus)| Not Null, Default: ACTIVE | Account status |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Last updated timestamp |

#### support_agent_profiles
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Profile ID |
| user_id | Integer | Foreign Key (users.id), Unique, Not Null | One-to-One with users table |
| department_ids | JSON / Array | Not Null | List of department IDs agent handles |
| ticket_types | JSON / Array | Not Null | Allowed ticket types (INCIDENT, TASK) |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Profile creation timestamp |
| updated_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Last updated timestamp |

#### departments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Department ID |
| name | Varchar(100) | Unique, Not Null | Department name |
| description | Text | Nullable | Details of department scope |
| status | Enum(DepartmentStatus) | Not Null, Default: ACTIVE | Active/Inactive state |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Department creation timestamp |
| updated_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Last updated timestamp |

#### tickets
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Ticket ID |
| ticket_key | Varchar(20) | Unique, Not Null, Indexed | Human-readable ID (e.g., TKT-0001) |
| title | Varchar(255) | Not Null | Summary of the issue |
| description | Text | Not Null | Detailed issue description |
| category | Enum(TicketCategory)| Not Null | User-selected issue domain |
| priority | Enum(TicketPriority)| Not Null | Issue urgency level |
| status | Enum(TicketStatus) | Not Null, Default: OPEN | Current lifecycle state |
| ticket_type | Enum(TicketType) | Nullable | Triage type (INCIDENT, TASK) |
| department_id | Integer | Foreign Key (departments.id), Nullable | Handling department |
| created_by_id | Integer | Foreign Key (users.id), Not Null | End user who raised the ticket |
| assigned_agent_id| Integer | Foreign Key (users.id), Nullable | Support agent assigned |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Ticket creation timestamp |
| updated_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Last update timestamp |

#### comments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Comment ID |
| ticket_id | Integer | Foreign Key (tickets.id), Not Null | Associated ticket |
| author_id | Integer | Foreign Key (users.id), Not Null | User who posted the comment |
| body | Text | Not Null | Comment text content |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Posted timestamp |

#### attachments
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | Attachment ID |
| ticket_id | Integer | Foreign Key (tickets.id), Not Null | Associated ticket |
| uploader_id | Integer | Foreign Key (users.id), Not Null | User who uploaded file |
| file_name | Varchar(255) | Not Null | Original file name |
| file_path | Varchar(500) | Not Null | Server disk storage path |
| file_size | Integer | Not Null | File size in bytes |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Upload timestamp |

#### ticket_history
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | Integer | Primary Key, Auto Increment | History log ID |
| ticket_id | Integer | Foreign Key (tickets.id), Not Null | Target ticket |
| changed_by_id| Integer | Foreign Key (users.id), Not Null | User who made the change |
| field_name | Varchar(50) | Not Null | Modified field (status, assigned_agent_id, etc.) |
| old_value | Text | Nullable | Previous value |
| new_value | Text | Nullable | Updated value |
| created_at | Timestamp | Not Null, Default: CURRENT_TIMESTAMP | Audit log timestamp |

---

## 2. API Design & Endpoint Contracts

### 2.1 Global Standards
* **Base URL**: `/api/v1`
* **Auth Scheme**: Bearer Token (`Authorization: Bearer <jwt_token>`)
* **Standard Status Codes**:
  * `200 OK`: Request succeeded.
  * `201 Created`: Resource successfully created.
  * `400 Bad Request`: Validation failure or invalid lifecycle transition.
  * `401 Unauthorized`: Authentication missing or token invalid.
  * `403 Forbidden`: Role not authorized for action.
  * `404 Not Found`: Resource does not exist.

---

### 2.2 Module 1: Authentication & User Management

#### `POST /api/v1/auth/register`
* **Access**: Public
* **Request Body**:
```json
{
  "first_name": "Amit",
  "last_name": "Kumar",
  "email": "amit.kumar@company.com",
  "password": "SecurePassword123"
}
```
* **Response (201 Created)**:
```json
{
  "id": 12,
  "first_name": "Amit",
  "last_name": "Kumar",
  "email": "amit.kumar@company.com",
  "role": "END_USER"
}
```

#### `POST /api/v1/auth/login`
* **Access**: Public
* **Request Body**:
```json
{
  "email": "amit.kumar@company.com",
  "password": "SecurePassword123"
}
```
* **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": 12,
    "email": "amit.kumar@company.com",
    "role": "END_USER",
    "first_name": "Amit",
    "last_name": "Kumar"
  }
}
```

#### `GET /api/v1/auth/me`
* **Access**: Authenticated users
* **Response (200 OK)**:
```json
{
  "id": 12,
  "first_name": "Amit",
  "last_name": "Kumar",
  "email": "amit.kumar@company.com",
  "role": "END_USER",
  "status": "ACTIVE"
}
```

#### `POST /api/v1/users/agents`
* **Access**: ADMIN
* **Request Body**:
```json
{
  "first_name": "Rahul",
  "last_name": "Sharma",
  "email": "rahul.sharma@company.com",
  "password": "AgentSecurePassword123",
  "department_ids": [1, 3],
  "ticket_types": ["INCIDENT", "TASK"]
}
```
* **Response (201 Created)**:
```json
{
  "id": 5,
  "first_name": "Rahul",
  "last_name": "Sharma",
  "email": "rahul.sharma@company.com",
  "role": "SUPPORT_AGENT",
  "status": "ACTIVE",
  "department_ids": [1, 3],
  "ticket_types": ["INCIDENT", "TASK"],
  "created_at": "2026-08-28T14:00:00Z"
}
```

#### `GET /api/v1/users/agents`
* **Access**: ADMIN
* **Query Parameters**:
  * department_id (optional, integer)
  * ticket_type (optional, string)
  * status (optional, string, default: ACTIVE)
* **Response (200 OK)**:
```json
[
  {
    "id": 5,
    "first_name": "Rahul",
    "last_name": "Sharma",
    "email": "rahul.sharma@company.com",
    "role": "SUPPORT_AGENT",
    "status": "ACTIVE",
    "departments": [{ "id": 1, "name": "Hardware" }],
    "ticket_types": ["INCIDENT", "TASK"]
  }
]
```

---

### 2.3 Module 2: Department Management

#### `POST /api/v1/departments`
* **Access**: ADMIN
* **Request Body**:
```json
{
  "name": "Network & Infrastructure",
  "description": "Issues related to WiFi, VPN, routers, and internal servers"
}
```
* **Response (201 Created)**:
```json
{
  "id": 3,
  "name": "Network & Infrastructure",
  "description": "Issues related to WiFi, VPN, routers, and internal servers",
  "status": "ACTIVE",
  "created_at": "2026-08-28T14:30:00Z"
}
```

#### `GET /api/v1/departments`
* **Access**: Authenticated users
* **Query Parameters**:
  * status (optional, string, default: ACTIVE)
* **Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Hardware",
    "description": "Laptops, monitors, and peripherals",
    "status": "ACTIVE",
    "created_at": "2026-08-28T10:00:00Z"
  },
  {
    "id": 3,
    "name": "Network & Infrastructure",
    "description": "Issues related to WiFi, VPN, routers, and internal servers",
    "status": "ACTIVE",
    "created_at": "2026-08-28T14:30:00Z"
  }
]
```

---

### 2.4 Module 3: Ticket Management

#### `POST /api/v1/tickets`
* **Access**: END_USER
* **Request Body**:
```json
{
  "title": "VPN connection drops every 10 minutes",
  "description": "Whenever I connect to the client VPN, the session terminates abruptly.",
  "category": "NETWORK",
  "priority": "HIGH"
}
```
* **Response (201 Created)**:
```json
{
  "id": 1,
  "ticket_key": "TKT-0001",
  "title": "VPN connection drops every 10 minutes",
  "description": "Whenever I connect to the client VPN, the session terminates abruptly.",
  "category": "NETWORK",
  "priority": "HIGH",
  "status": "OPEN",
  "ticket_type": null,
  "department": null,
  "created_by": {
    "id": 12,
    "name": "Amit Kumar"
  },
  "assigned_agent": null,
  "created_at": "2026-08-28T15:00:00Z",
  "updated_at": "2026-08-28T15:00:00Z"
}
```

#### `GET /api/v1/tickets`
* **Access**: Authenticated users (Scope isolated by role: End User sees own tickets; Agent sees assigned tickets; Admin sees all)
* **Query Parameters**:
  * status (optional, string)
  * priority (optional, string)
  * category (optional, string)
  * department_id (optional, integer)
  * search (optional, string)
  * page (optional, default: 1)
  * limit (optional, default: 15)
* **Response (200 OK)**:
```json
{
  "total": 45,
  "page": 1,
  "limit": 15,
  "total_pages": 3,
  "items": [
    {
      "id": 1,
      "ticket_key": "TKT-0001",
      "title": "VPN connection drops every 10 minutes",
      "category": "NETWORK",
      "priority": "HIGH",
      "status": "OPEN",
      "ticket_type": null,
      "department": null,
      "created_by": {
        "id": 12,
        "name": "Amit Kumar"
      },
      "assigned_agent": null,
      "created_at": "2026-08-28T15:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/tickets/metrics`
* **Access**: Authenticated users (Role-filtered aggregate stats for dashboard cards)
* **Response (200 OK)**:
```json
{
  "total": 24,
  "open": 5,
  "assigned": 2,
  "in_progress": 10,
  "waiting_for_user": 2,
  "resolved": 3,
  "closed": 2
}
```

#### `GET /api/v1/tickets/{id}`
* **Access**: Ticket creator, assigned agent, or admin
* **Response (200 OK)**:
```json
{
  "id": 1,
  "ticket_key": "TKT-0001",
  "title": "VPN connection drops every 10 minutes",
  "description": "Whenever I connect to the client VPN, the session terminates abruptly.",
  "category": "NETWORK",
  "priority": "HIGH",
  "status": "ASSIGNED",
  "ticket_type": "INCIDENT",
  "department": {
    "id": 3,
    "name": "Network & Infrastructure"
  },
  "created_by": {
    "id": 12,
    "first_name": "Amit",
    "last_name": "Kumar",
    "email": "amit.kumar@company.com"
  },
  "assigned_agent": {
    "id": 5,
    "first_name": "Rahul",
    "last_name": "Sharma",
    "email": "rahul.sharma@company.com"
  },
  "attachments": [
    {
      "id": 101,
      "file_name": "vpn_log.txt",
      "file_path": "uploads/vpn_log_101.txt",
      "file_size": 245600,
      "created_at": "2026-08-28T17:15:00Z"
    }
  ],
  "created_at": "2026-08-28T15:00:00Z",
  "updated_at": "2026-08-28T15:30:00Z"
}
```

#### `PATCH /api/v1/tickets/{id}` (Triage & Assignment)
* **Access**: ADMIN
* **Request Body**:
```json
{
  "department_id": 3,
  "ticket_type": "INCIDENT",
  "assigned_agent_id": 5
}
```
* **Side-effects**: Status updates to ASSIGNED, audit entry inserted into ticket_history.
* **Response (200 OK)**:
```json
{
  "id": 1,
  "ticket_key": "TKT-0001",
  "title": "VPN connection drops every 10 minutes",
  "category": "NETWORK",
  "priority": "HIGH",
  "status": "ASSIGNED",
  "ticket_type": "INCIDENT",
  "department_id": 3,
  "assigned_agent_id": 5,
  "updated_at": "2026-08-28T15:30:00Z"
}
```

#### `PATCH /api/v1/tickets/{id}/status` (Lifecycle Transition)
* **Access**: Role-restricted per state machine transition rules
* **Request Body**:
```json
{
  "status": "RESOLVED",
  "comment": "Replaced network cable and verified throughput."
}
```
* **Side-effects**: Audit record written to ticket_history.
* **Response (200 OK)**:
```json
{
  "id": 1,
  "ticket_key": "TKT-0001",
  "status": "RESOLVED",
  "updated_at": "2026-08-28T18:00:00Z"
}
```

---

### 2.5 Module 4: Comments, Attachments & History

#### `POST /api/v1/tickets/{id}/comments`
* **Access**: Ticket creator, assigned agent, or admin
* **Request Body**:
```json
{
  "body": "I have uploaded the diagnostic log file."
}
```
* **Side-effects**: If current status is WAITING_FOR_USER and commenter is END_USER, status automatically flips to IN_PROGRESS.
* **Response (201 Created)**:
```json
{
  "id": 205,
  "ticket_id": 1,
  "author": {
    "id": 12,
    "name": "Amit Kumar",
    "role": "END_USER"
  },
  "body": "I have uploaded the diagnostic log file.",
  "created_at": "2026-08-28T17:05:00Z"
}
```

#### `GET /api/v1/tickets/{id}/comments`
* **Access**: Ticket creator, assigned agent, or admin
* **Response (200 OK)**:
```json
[
  {
    "id": 205,
    "ticket_id": 1,
    "author": {
      "id": 12,
      "name": "Amit Kumar",
      "role": "END_USER"
    },
    "body": "I have uploaded the diagnostic log file.",
    "created_at": "2026-08-28T17:05:00Z"
  }
]
```

#### `POST /api/v1/tickets/{id}/attachments`
* **Access**: Ticket creator, assigned agent, or admin
* **Content-Type**: multipart/form-data
* **Payload**: file: UploadFile (Allowed: .txt, .pdf, .png, .jpg, .jpeg, .log; Max size: 5 MB)
* **Response (201 Created)**:
```json
{
  "id": 101,
  "ticket_id": 1,
  "file_name": "vpn_log.txt",
  "file_size": 245600,
  "created_at": "2026-08-28T17:15:00Z"
}
```

#### `GET /api/v1/tickets/{id}/history`
* **Access**: Ticket creator, assigned agent, or admin
* **Response (200 OK)**:
```json
[
  {
    "id": 101,
    "ticket_id": 1,
    "changed_by": {
      "id": 12,
      "name": "Amit Kumar",
      "role": "END_USER"
    },
    "field_name": "status",
    "old_value": null,
    "new_value": "OPEN",
    "created_at": "2026-08-28T10:00:00Z"
  },
  {
    "id": 102,
    "ticket_id": 1,
    "changed_by": {
      "id": 1,
      "name": "Admin",
      "role": "ADMIN"
    },
    "field_name": "status",
    "old_value": "OPEN",
    "new_value": "ASSIGNED",
    "created_at": "2026-08-28T10:15:00Z"
  }
]
```

```