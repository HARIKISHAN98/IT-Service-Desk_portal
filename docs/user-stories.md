# IT Service Desk Portal — User Stories

## 1. Purpose

This document defines the functional user stories and testable Acceptance Criteria (AC) for the IT Service Desk Portal (V1 MVP). 

The system contains three roles:
- **End User:** Employee who creates tickets and tracks resolutions.
- **Support Agent:** IT employee who investigates and resolves assigned tickets.
- **Admin:** IT administrator who manages agents, departments, triage, and ticket assignments.

---

## 2. V1 Scope & Boundaries

### Included Capabilities
- User self-registration and authentication (JWT).
- Admin-managed provisioning of Support Agents and Departments.
- End User ticket creation with multi-level validation.
- Admin triage, priority override, and manual ticket assignment/reassignment.
- Agent lifecycle handling (`ASSIGNED` ➔ `IN_PROGRESS` ➔ `WAITING_FOR_USER` ➔ `RESOLVED`).
- End User resolution verification (`CLOSED` or rejection back to `IN_PROGRESS`).
- Ticket comments, attachments, and immutable audit history.
- Logical separation of Active and Closed tickets.

### Excluded from V1 (Strictly Out of Scope)
- Multiple Admin accounts or public Admin registration.
- IT Manager role.
- Support Agents creating tickets on behalf of users.
- Automated ticket routing, AI classification, round-robin, or workload balancing.
- SLA timers and automated escalation triggers.
- External email, SMS, or WhatsApp notifications.

---

## 3. End User Stories

### 3.1 Authentication

#### US-EU-001 — Register Account
**As an End User,**  
I want to create my own account,  
So that I can log into the portal and raise IT support requests.

- **Acceptance Criteria:**
  - Public registration is permitted only for the End User role.
  - Required fields: First Name, Last Name, Email, Password, Confirm Password.
  - Email must be unique and properly formatted.
  - Password must be hashed before database storage.

#### US-EU-002 — Login & Logout
**As an End User,**  
I want to log into and out of my account securely,  
So that my access is authenticated and protected.

- **Acceptance Criteria:**
  - Successful login generates and returns a JWT Bearer token.
  - Invalid credentials return a clear `401 Unauthorized` error without exposing internal DB details.
  - Logging out invalidates the active client session and restricts access to protected views.

---

### 3.2 Dashboard & Views

#### US-EU-003 — View Dashboard & Analytics
**As an End User,**  
I want to view high-level summaries and charts of my IT tickets,  
So that I can understand the status distribution of my issues at a glance.

- **Acceptance Criteria:**
  - Displays summary metric cards: *Total Tickets*, *Open Tickets*, *In Progress Tickets*, *Resolved Tickets*.
  - Metric cards only calculate data for tickets created by the logged-in End User.
  - Visual charts include: *Priority Distribution* (Donut) and *Category Distribution* (Bar).
  - Displays a list of recently updated personal tickets.

#### US-EU-004 — Separate Active and Closed Ticket Lists
**As an End User,**  
I want distinct views for my active and closed tickets,  
So that ongoing issues are easy to track without clutter from past records.

- **Acceptance Criteria:**
  - **Active Tickets View:** Displays tickets in `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_USER`, and `RESOLVED` statuses created by the user.
  - **Closed Tickets View:** Displays all historical tickets in `CLOSED` status created by the user.
  - Both views support search (by Ticket ID, Title) and filtering (by Priority, Category, Status).

---

### 3.3 Ticket Lifecycle & Communication

#### US-EU-005 — Create Support Ticket
**As an End User,**  
I want to submit an IT support request,  
So that the support team can investigate and fix my problem.

- **Acceptance Criteria:**
  - User submits: `Title` (Req), `Description` (Req), `Category` (Req), `Priority` (Req), `Attachment` (Opt), `Initial Comment` (Opt).
  - User **cannot** select `Department`, `Ticket Type`, or `Support Agent`.
  - System automatically sets: `Status = OPEN`, `Department = NULL`, `Ticket Type = NULL`, `Assigned Agent = NULL`.
  - Ticket ID is generated automatically.

#### US-EU-006 — View Ticket Details & History
**As an End User,**  
I want to view the complete details and timeline of my ticket,  
So that I can follow its progress, comments, and assignment status.

- **Acceptance Criteria:**
  - Read-only access to full ticket metadata, assigned agent details, and conversation thread.
  - Displays chronological audit history (what changed, who changed it, previous value, new value, timestamp).
  - The user cannot view tickets created by other employees.

#### US-EU-007 — Respond to Clarification Requests (`WAITING_FOR_USER`)
**As an End User,**  
I want to reply to an agent's request for information,  
So that the ticket can automatically resume progress.

- **Acceptance Criteria:**
  - User can post comments and attach supporting screenshots/logs.
  - **Automated State Transition:** Submitting a comment or attachment while status is `WAITING_FOR_USER` automatically transitions status to `IN_PROGRESS`.
  - State change is recorded in ticket history.

#### US-EU-008 — Confirm or Reject Ticket Resolution
**As an End User,**  
I want to confirm whether a fix worked or reject it if the issue persists,  
So that tickets are only finalized upon my approval.

- **Acceptance Criteria:**
  - When status is `RESOLVED`, the user is presented with two actions:
    - **Confirm Resolution:** Transitions status to `CLOSED`. The ticket becomes permanently read-only and immutable.
    - **Issue Not Resolved:** Transitions status back to `IN_PROGRESS`. The assigned agent resumes work.
  - Both actions log an audit entry in ticket history.

---

## 4. Support Agent Stories

### 4.1 Authentication & Workspace

#### US-SA-001 — Agent Login & Queue
**As a Support Agent,**  
I want to log in using Admin-provisioned credentials,  
So that I can access tickets assigned directly to me.

- **Acceptance Criteria:**
  - Agents cannot self-register; credentials are provided by the Admin.
  - Agents with `Status = INACTIVE` are blocked from logging in.
  - Agent workspace displays only tickets where `assigned_agent_id == current_user.id`.
  - Agent cannot view or interact with tickets assigned to other agents.

#### US-SA-002 — Agent Dashboard & Segregation
**As a Support Agent,**  
I want to view my workload metrics and separated active/closed queues,  
So that I can prioritize my daily tasks effectively.

- **Acceptance Criteria:**
  - Summary cards show counts for *My Assigned*, *In Progress*, *Waiting for User*, and *Resolved*.
  - **Active Queue:** Shows currently assigned non-closed tickets.
  - **Closed Queue:** Shows historical tickets resolved by this agent that are now `CLOSED`.

---

### 4.2 Ticket Handling & Resolution

#### US-SA-003 — Start Working on a Ticket
**As a Support Agent,**  
I want to transition an assigned ticket to `IN_PROGRESS`,  
So that the user and Admin know the issue is being actively investigated.

- **Acceptance Criteria:**
  - Allowed from status: `ASSIGNED` ➔ `IN_PROGRESS`.
  - Agent must be the designated assignee.
  - State transition is saved and logged in history.

#### US-SA-004 — Request User Information (`WAITING_FOR_USER`)
**As a Support Agent,**  
I want to mark a ticket as `WAITING_FOR_USER` when blocked by missing details,  
So that the user knows their input is required.

- **Acceptance Criteria:**
  - Allowed from status: `IN_PROGRESS` ➔ `WAITING_FOR_USER`.
  - Prompts the agent to include an explanatory comment.
  - State transition is saved and logged in history.

#### US-SA-005 — Mark Ticket as Resolved
**As a Support Agent,**  
I want to transition a ticket to `RESOLVED` with a resolution comment,  
So that the End User can verify and confirm the solution.

- **Acceptance Criteria:**
  - Allowed from status: `IN_PROGRESS` ➔ `RESOLVED`.
  - Agent must provide a resolution summary comment.
  - Agents **cannot** mark tickets directly as `CLOSED`.

#### US-SA-006 — Agent Comments and Attachments
**As a Support Agent,**  
I want to post comments and upload troubleshooting guides/logs,  
So that I can communicate directly with the End User.

- **Acceptance Criteria:**
  - Agent can add comments and upload attachments to assigned tickets.
  - All messages and file links appear chronologically in the ticket detail view.

---

## 5. Admin Stories

### 5.1 Dashboard & Global Visibility

#### US-AD-001 — Admin Dashboard & System Analytics
**As an Admin,**  
I want a consolidated overview of all tickets across the organization,  
So that I can monitor service desk load and bottlenecks.

- **Acceptance Criteria:**
  - Summary metrics display totals for all tickets across the organization (*Total*, *Open*, *In Progress*, *Resolved*).
  - Visual charts display *Status Distribution* (Donut) and *Department Distribution* (Bar).
  - Separate views available for *All Active Tickets* and *All Closed Tickets*.

#### US-AD-002 — Global Ticket Search & Filter
**As an Admin,**  
I want to search and filter across all company tickets,  
So that I can locate any request quickly.

- **Acceptance Criteria:**
  - Search by Ticket ID, Title, Description, or Creator Email.
  - Multi-filter by Status, Priority, Category, Department, Ticket Type, and Assigned Agent.

---

### 5.2 Triage & Assignment

#### US-AD-003 — Triage and Assign Ticket
**As an Admin,**  
I want to set the Department, Ticket Type, Priority, and Assignee for `OPEN` tickets,  
So that tickets are routed to qualified support staff.

- **Acceptance Criteria:**
  - Admin selects **Department** and **Ticket Type** (`INCIDENT` or `TASK`).
  - Admin can optionally adjust ticket **Priority**.
  - **Dynamic Filtering:** Support Agent dropdown only displays agents who are:
    - `Status == ACTIVE`
    - Qualified for the selected Department
    - Qualified for the selected Ticket Type
  - On assignment submission:
    - Status transitions from `OPEN` ➔ `ASSIGNED`.
    - Ticket becomes visible in the selected Agent's queue.
    - Each assigned field change is logged individually in ticket history.

#### US-AD-004 — Reassign Ticket
**As an Admin,**  
I want to reassign an active ticket to a different qualified agent,  
So that work continues seamlessly if an agent is unavailable.

- **Acceptance Criteria:**
  - Only Admins can execute reassignment.
  - System unlinks the previous agent and assigns the new agent.
  - **Status Reset:** Status automatically resets to `ASSIGNED` (the new agent must click "Start Work").
  - Previous agent immediately loses access to the ticket.
  - Reassignment details and status reset are recorded in history.

---

### 5.3 Agent & Department Master Data Management

#### US-AD-005 — Create Support Agent
**As an Admin,**  
I want to provision new Support Agent accounts with capability mappings,  
So that new IT staff can handle tickets.

- **Acceptance Criteria:**
  - Required fields: First Name, Last Name, Email (unique), Phone, Password, one or more Departments, one or more Ticket Types.
  - Default status is `ACTIVE`.
  - Passwords are encrypted/hashed before persistence.

#### US-AD-006 — Manage Support Agent Status
**As an Admin,**  
I want to activate or deactivate Support Agents,  
So that inactive agents do not receive new tickets.

- **Acceptance Criteria:**
  - Deactivated agents (`INACTIVE`) cannot log in and are omitted from assignment dropdowns.
  - Active tickets assigned to a deactivated agent become unassigned and await reassignment.
  - Deactivation does not delete agent records, past comments, or historical closed tickets.

#### US-AD-007 — Manage Departments
**As an Admin,**  
I want to create and manage Departments,  
So that tickets and agent capabilities are organized cleanly.

- **Acceptance Criteria:**
  - Admin can create departments with unique names and descriptions. Initial status is `ACTIVE`.
  - Admin can toggle department status (`ACTIVE` / `INACTIVE`).
  - `INACTIVE` departments cannot be selected for new ticket triage.
  - Departments cannot be physically deleted if referenced by historical tickets.

---

## 6. System Audit & History Stories

#### US-SYS-001 — Immutable Audit Log
**As a System Auditor / Admin,**  
I want all ticket changes recorded chronologically in an immutable log,  
So that full accountability is maintained for every request.

- **Acceptance Criteria:**
  - History captures: `ticket_id`, `changed_by_user_id`, `field_name`, `old_value`, `new_value`, and `created_at` (UTC).
  - Explicit tracking for: Creation, Assignment, Reassignment, Status Changes, Priority Changes, Department Changes, and Resolution Confirmation/Rejection.
  - Audit history records are read-only and permanently retained even when a ticket is `CLOSED`.

---

## 7. Cross-Role Ticket State Machine Reference

```text
[ End User ]
     │
     ▼
  ( OPEN ) ───────────────[ Admin Assigns ]───────────────┐
     │                                                    │
     │                                                    ▼
     │                                              ( ASSIGNED )
     │                                                    │
     │                                        [ Agent Starts Work ]
     │                                                    │
     ▼                                                    ▼
( IN_PROGRESS ) ◄──[ User Replies ]── ( WAITING_FOR_USER )
     │                                        ▲
     │                                        │
     │                               [ Agent Needs Info ]
     │                                        │
     ├────────────────────────────────────────┘
     │
[ Agent Resolves ]
     │
     ▼
 ( RESOLVED ) ───[ User: Issue Not Resolved ]───► ( IN_PROGRESS )
     │
[ User: Confirm Resolution ]
     │
     ▼
  ( CLOSED ) [ Read-Only / Archived ]

  