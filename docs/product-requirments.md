# IT Service Desk Portal — Product Requirements Document (PRD)

## 1. Problem Statement

In many organizations, employees report IT issues through scattered channels like email, instant messaging (WhatsApp/Slack), and verbal phone calls. This leads to critical operational bottlenecks:
- **No Central Visibility:** Tickets get lost or forgotten in overflowing inboxes and chat threads.
- **Unclear Prioritization:** Urgent hardware or network blockers compete blindly with routine inquiries.
- **Assignment Confusion:** Multiple agents duplicate efforts or assume someone else is handling an issue.
- **Zero Accountability:** Lack of resolution tracking, status updates, or audit history for compliance.

The **IT Service Desk Portal** resolves this by introducing a single, centralized web application to streamline the intake, triage, assignment, communication, and resolution of all IT support requests.

---

## 2. Product Vision & Goals

The goal of the IT Service Desk Portal (V1 MVP) is to establish a standardized, transparent ticket lifecycle between employees and the IT support team:
- **For Employees (End Users):** A self-service portal to raise tickets, attach logs/screenshots, monitor real-time progress, and verify issue resolution.
- **For Support Agents:** A dedicated workspace to manage assigned workload, communicate with users, and resolve technical issues.
- **For Administrators (Admin):** A central control center to triage tickets, enforce department routing, assign qualified agents, and monitor organization-wide support metrics.

---

## 3. User Roles & Personas

| Role | Description | Provisioning / Access | Core Responsibility |
| :--- | :--- | :--- | :--- |
| **End User** | Internal company employee | Public self-registration & login | Raises IT tickets, responds to agent queries, and confirms resolutions. |
| **Support Agent** | IT support engineer / technician | Created strictly by Admin (No self-registration) | Investigates and resolves tickets assigned by the Admin. |
| **Admin** | IT manager / system administrator | Provisioned via database seed (Single Admin in V1) | Triages tickets, manages master data (agents, departments), and oversees system operations. |

---

## 4. System Capabilities by Role

### 4.1 End User

#### Authentication & Account
- Self-register with name, email, and password.
- Log in and log out securely via JWT authentication.

#### Personal Dashboard
- **Metric Cards:** Summary counts for *Total Tickets*, *Open Tickets*, *In Progress Tickets*, and *Resolved Tickets*.
- **Visual Analytics:** *Ticket Priority Distribution* (Donut Chart) and *Ticket Category Distribution* (Bar Chart).
- **Recent Tickets:** Quick-access list of recent personal tickets.

#### Ticket Management & Tracking
- **Create Ticket:** Submit issue details with `Title`, `Description`, `Category`, `Priority`, optional `Attachment`, and optional `Initial Comment`.
- **Restricted Fields:** End Users *cannot* select Department, Ticket Type, or Assignee.
- **View Segregation:** Separate views for **Active Tickets** (ongoing) and **Closed Tickets** (historical archive).
- **Search & Filter:** Search by Ticket ID or Title; filter by Status, Priority, and Category.

#### Communication & Lifecycle Actions
- Post comments and upload additional attachments during ticket investigation.
- **Respond to Information Requests:** When a ticket is in `WAITING_FOR_USER`, posting a comment or attachment automatically transitions the status back to `IN_PROGRESS`.
- **Resolution Verification:** When a ticket is `RESOLVED`, the user can:
  - **Confirm Resolution:** Transitions ticket to `CLOSED` (ticket becomes permanently read-only).
  - **Issue Not Resolved:** Reopens the ticket back to `IN_PROGRESS`.

---

### 4.2 Support Agent

#### Authentication & Workspace
- Log in using Admin-provisioned credentials.
- Inactive agents (`INACTIVE`) are blocked from authenticating.

#### Agent Dashboard & Queue
- **Workload Summary:** Metric counts for *My Assigned*, *In Progress*, *Waiting for User*, and *Resolved*.
- **Queue Views:** Dedicated queues for *Active Assigned Tickets* and *Past Resolved/Closed Tickets*.
- **Restricted Visibility:** Agents can only access tickets assigned directly to them; tickets assigned to other agents are completely inaccessible.

#### Ticket Handling & Resolution
- **Start Work:** Transition ticket from `ASSIGNED` ➔ `IN_PROGRESS`.
- **Request Information:** Transition ticket from `IN_PROGRESS` ➔ `WAITING_FOR_USER` with an explanatory comment.
- **Resolve Issue:** Transition ticket from `IN_PROGRESS` ➔ `RESOLVED` with a mandatory resolution comment.
- **Restrictions:** Support Agents *cannot* mark tickets directly as `CLOSED` or reassign tickets to other agents.

---

### 4.3 Administrator (Admin)

#### Global Dashboard & Monitoring
- Organization-wide metrics: *Total*, *Open*, *In Progress*, and *Resolved* tickets across all departments.
- System analytics: *Ticket Status Distribution* (Donut) and *Department Distribution* (Bar).
- Global list of all active and closed tickets.

#### Ticket Triage & Manual Assignment
- Review incoming `OPEN` tickets.
- Determine and set **Ticket Type** (`INCIDENT` or `TASK`).
- Determine and set **Department**.
- Review and adjust **Priority** if necessary.
- **Dynamic Qualified Assignment:** System filters the Support Agent dropdown to show only agents who are:
  - Currently `ACTIVE`
  - Associated with the chosen Department
  - Associated with the chosen Ticket Type
- Assigning an agent transitions the ticket from `OPEN` ➔ `ASSIGNED`.

#### Ticket Reassignment
- Admin can reassign an ongoing ticket to a different qualified agent.
- Reassignment unlinks the previous agent and automatically resets the status back to `ASSIGNED`.

#### Master Data Management
- **Support Agent Management:**
  - Create agent accounts (Name, Email, Phone, initial password).
  - Map agents to multiple Departments and Ticket Types.
  - Activate or deactivate agents (`ACTIVE` / `INACTIVE`).
- **Department Management:**
  - Create departments with unique names and descriptions.
  - Activate or deactivate departments (`ACTIVE` / `INACTIVE`).
  - Inactive departments are hidden from triage dropdowns but preserved in historical tickets.

---

## 5. Core Business Rules & Policies

### 5.1 Ticket Lifecycle Rules
1. **Creation Baseline:** Newly created tickets always initialize as `Status = OPEN`, `Department = NULL`, `Ticket Type = NULL`, and `Agent = NULL`.
2. **Assignment Prerequisites:** A ticket cannot transition to `ASSIGNED` without a valid Department, Ticket Type, and qualified Active Agent.
3. **Auto-Resume Rule:** When a ticket is in `WAITING_FOR_USER`, any reply (comment or attachment) from the ticket creator automatically moves the ticket to `IN_PROGRESS`.
4. **Resolution Authority:** Agents can only mark a ticket as `RESOLVED`. Only the ticket creator (End User) can transition a ticket to `CLOSED`.
5. **Reassignment State Reset:** Reassigning a ticket to a new agent always resets its status to `ASSIGNED`, requiring the new assignee to explicitly start work (`IN_PROGRESS`).
6. **Immutability of Closed Tickets:** Once a ticket reaches `CLOSED`, it becomes an immutable historical record. It cannot be edited, reassigned, commented on, or deleted.

### 5.2 Deactivation & Data Integrity Policies
1. **Non-Destructive Deactivation:** Users and Departments are soft-deactivated (`INACTIVE`), never physically deleted from the database.
2. **Agent Deactivation Side Effect:** When an agent is marked `INACTIVE`, their active tickets become unassigned and await Admin reassignment.
3. **Audit Trail Completeness:** Every change to status, priority, department, ticket type, or assignee generates a permanent, chronological history entry.

---

## 6. V1 MVP Scope Matrix

| Feature / Capability | In V1 | Future (V2+) |
| :--- | :---: | :---: |
| End User Self-Registration & Login (JWT) | YES | - |
| Admin-Managed Support Agent Creation | YES | - |
| Single Seed Admin Setup | YES | - |
| Multi-Admin Support & Creation Workflows | NO | YES |
| IT Manager Role & Granular Permissions | NO | YES |
| End User Ticket Creation & Dashboard | YES | - |
| Admin Manual Triage & Capability-Based Routing | YES | - |
| Automatic Assignment / Round-Robin / AI | NO | YES |
| Multi-Status Lifecycle & Auto-Resume Trigger | YES | - |
| Threaded Comments & File Attachments | YES | - |
| Complete Immutable Audit History Logging | YES | - |
| Logical Partitioning of Active / Closed Views | YES | - |
| Email / SMS / WhatsApp External Notifications | NO | YES |
| SLA Timers & Automated Escalation Policies | NO | YES |
| Agents Creating Tickets on Behalf of Users | NO | YES |

---

## 7. High-Level Lifecycle State Diagram

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
  ( CLOSED ) [ Immutable / Archived Record ]

  