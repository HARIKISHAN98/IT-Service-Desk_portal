# IT Service Desk Portal — Workflows

## 1. Purpose

This document defines the core business workflows and state machines for the IT Service Desk Portal (V1 MVP). It establishes:
- How tickets transition across their lifecycle.
- Role-based permissions and boundaries for every action.
- Side effects, audit trails, and data persistence rules.

---

## 2. User Roles & Boundaries

The V1 system enforces three distinct user roles:

- **End User:** Employee who creates tickets, tracks their own issues, responds to agent queries, and confirms resolutions.
- **Support Agent:** IT specialist who handles assigned tickets, investigates issues, requests user clarifications, and marks tickets as resolved.
- **Admin:** System administrator who triages tickets (assigns Department, Ticket Type, and Agent), manages master records, and oversees full platform activity.

---

## 3. Ticket Creation Workflow

Only **End Users** can create tickets in V1.

### 3.1 Input Data Scope
- **Provided by End User:**
  - `Title` (Required)
  - `Description` (Required)
  - `Category` (Required)
  - `Priority` (Required)
  - `Attachment` (Optional)
  - `Initial Comment` (Optional)
- **Restricted (System/Admin determined only):**
  - `Department` = `NULL`
  - `Ticket Type` = `NULL`
  - `Assigned Agent` = `NULL`

### 3.2 Creation Lifecycle Diagram

[ End User ]
     │
     ▼
[ Submit Form ]
     │
     ▼
[ Frontend Validation ] ──(Fails)──► [ Show UI Error ]
     │ (Passes)
     ▼
[ API Request: POST /api/v1/tickets ]
     │
     ▼
[ Backend / Pydantic Validation ] ──(Fails)──► [ Return 422 Unprocessable Entity ]
     │ (Passes)
     ▼
[ Business Rule Validation ] ──(Fails)──► [ Return 400 Bad Request ]
     │ (Passes)
     ▼
[ DB Commit & Audit Log ]
     │
     ▼
[ Ticket Initialized: Status = OPEN ]

---

## 4. Multi-Layer Validation Strategy

Data integrity is protected at three independent boundaries:

1. Frontend Validation (UX Layer)
   - Required field completeness
   - Client-side length, file size, and mime-type checks

2. Backend Validation (Security & Business Logic)
   - Schema validation via Pydantic
   - Role & token verification (JWT)
   - Business state machine validation

3. Database Constraints (Persistence Layer)
   - NOT NULL constraints
   - Foreign Key integrity (User ID, Department ID)
   - Enum status checks

---

## 5. Initial Ticket State

Upon successful creation, the record initializes with:

| Attribute | Initial Value | Mutability / Note |
| :--- | :--- | :--- |
| `Status` | `OPEN` | Set automatically by system |
| `Department` | `NULL` | Assigned only by Admin |
| `Ticket Type`| `NULL` | Assigned only by Admin |
| `Assigned Agent` | `NULL` | Assigned only by Admin |
| `Created By` | `Current User ID` | Immutable audit field |

---

## 6. Admin Ticket Triage & Assignment

When an `OPEN` ticket arrives, the Admin must triage and assign it.

### 6.1 Assignment Sequence
1. Admin opens the unassigned ticket.
2. Admin determines and selects the **Department**.
3. Admin determines and selects the **Ticket Type** (`INCIDENT` or `TASK`).
4. Admin reviews and optionally overrides the initial **Priority**.
5. System dynamically filters the **Support Agent** dropdown to only show agents who are:
   - `Status == ACTIVE`
   - Configured to handle the selected Department
   - Configured to handle the selected Ticket Type
6. Admin selects the Agent and submits the assignment.

### 6.2 State Transition
- Status: `OPEN` ➔ `ASSIGNED`
- Department: `NULL` ➔ `[Selected Department]`
- Ticket Type: `NULL` ➔ `[Selected Type]`
- Agent: `NULL` ➔ `[Selected Agent]`

---

## 7. Support Agent Workflow & Capabilities

Support Agents interact only with tickets assigned directly to them.

[ Agent Queue ]
     │
     ├── TKT-101 (ASSIGNED) ────────► [ Agent clicks "Start Work" ] ──► (IN_PROGRESS)
     │
     ├── TKT-102 (IN_PROGRESS) ─────► [ Needs logs from User ]     ──► (WAITING_FOR_USER)
     │
     └── TKT-103 (IN_PROGRESS) ─────► [ Fix applied & verified ]   ──► (RESOLVED)

### 7.1 Allowed Status Transitions for Agents
- `ASSIGNED` ➔ `IN_PROGRESS`
- `IN_PROGRESS` ➔ `WAITING_FOR_USER`
- `IN_PROGRESS` ➔ `RESOLVED`

*Note: Support Agents cannot close tickets directly or reassign them to other agents.*

---

## 8. Clarification Workflow (WAITING_FOR_USER)

When an agent needs additional reproduction steps or log files from the End User:

( IN_PROGRESS )
       │
       ▼ [ Agent sets WAITING_FOR_USER + Posts comment ]
( WAITING_FOR_USER )
       │
       ▼ [ End User posts reply comment or upload ]
( IN_PROGRESS )  ◄── (Automatic system transition upon user reply)

1. Agent updates ticket status to `WAITING_FOR_USER` and adds a clarifying comment.
2. End User sees the status badge and responds with a comment or attachment.
3. **Automated Resume Rule:** The backend automatically transitions the ticket status from `WAITING_FOR_USER` back to `IN_PROGRESS` as soon as the End User posts their response.

---

## 9. Resolution & Confirmation Workflow

Agents cannot directly close tickets; resolution requires confirmation from the ticket creator.

                     ( RESOLVED )
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
  [ User Confirms Fix ]       [ Issue Not Resolved ]
            │                           │
            ▼                           ▼
       ( CLOSED )                ( IN_PROGRESS )
  [ Read-Only / Archived ]     [ Agent Resumes Work ]

### 9.1 Confirmation Actions
- **User Confirms Resolution:**
  - Status transitions: `RESOLVED` ➔ `CLOSED`
  - Ticket becomes read-only.
- **User Rejects Resolution:**
  - Status transitions: `RESOLVED` ➔ `IN_PROGRESS`
  - Ticket re-enters the active agent working queue.

---

## 10. Admin Reassignment Workflow

Only Admins can reassign active tickets.

[ Ticket in IN_PROGRESS / WAITING_FOR_USER / ASSIGNED ]
                         │
                         ▼ (Admin selects new qualified Agent)
              [ Previous Agent unlinked ]
                         │
                         ▼
           Status Resets to: ( ASSIGNED )
                         │
                         ▼
        [ New Agent must click "Start Work" ]
                         │
                         ▼
                  ( IN_PROGRESS )

- When reassigned, the previous agent immediately loses queue visibility.
- Status resets to `ASSIGNED` to ensure the new assignee explicitly acknowledges the ticket.

---

## 11. Complete Ticket State Machine Summary

                      ┌──────────────────────────────────────┐
                      │                                      │
                      ▼                                      │
 ( OPEN ) ──► ( ASSIGNED ) ──► ( IN_PROGRESS ) ◄──► ( WAITING_FOR_USER )
                      ▲               │
                      │               ▼
                      │         ( RESOLVED )
                      │               │
                      ├───────────────┼───────────────┐
                      │ (Reassign)    │ (Reopen)      │ (Confirm)
                      │               │               │
                 [ Admin ]            ▼               ▼
                               ( IN_PROGRESS )   ( CLOSED )

---

## 12. Ticket History & Audit Trail

Every state change or assignment modification creates an append-only, immutable history record:

| Field | Description |
| :--- | :--- |
| `ticket_id` | Associated Ticket ID |
| `changed_by_user_id` | User ID who triggered the action |
| `field_name` | Name of the field that changed (`status`, `ticket_type`, `department_id`, `assigned_agent_id`, etc.) |
| `old_value` | Previous state/value representation |
| `new_value` | New state/value representation |
| `created_at` | Exact UTC timestamp |

---

## 13. Active vs. Closed Ticket Separation

To maintain high UI performance and clear operational focus, active tickets and closed tickets are partitioned logically:

| Role | Active Tickets View | Closed Tickets View |
| :--- | :--- | :--- |
| **End User** | All non-closed tickets created by the user | Closed tickets created by the user |
| **Support Agent** | Active tickets currently assigned to the agent | Tickets previously resolved by the agent |
| **Admin** | All active tickets across the entire organization | All closed historical tickets across the organization |

*Closed tickets remain permanent historical records and cannot be edited, reassigned, or deleted.*

---

## 14. Access Control Matrix

| Capability | End User | Support Agent | Admin |
| :--- | :---: | :---: | :---: |
| Create Ticket | Yes | No | No |
| View Own / Assigned Tickets | Yes (Own) | Yes (Assigned) | Yes (All) |
| View Other Agents' Tickets | No | No | Yes |
| Triage & Assign Tickets | No | No | Yes |
| Change Status to `IN_PROGRESS` / `RESOLVED` | No | Yes | Yes |
| Confirm Resolution / Close Ticket | Yes | No | No |
| Add Comments & Attachments | Yes | Yes | Yes |
| View Full Ticket Audit History | Yes (Own) | Yes (Assigned) | Yes (All) |
| Manage Departments & Agent Accounts | No | No | Yes |

---

## 15. V1 MVP Explicit Boundaries

The following features are strictly **out of scope** for V1:
- Multi-Admin account creation workflow.
- Automatic ticket assignment (Round-robin, workload balancing, AI routing).
- Automated SLA breach escalation timers.
- Email, SMS, or WhatsApp external notifications.
- Ticket creation by agents on behalf of end users.

```