import sys
import os
import bcrypt

# Ensure the root backend directory is in the Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)

from app.database import SessionLocal, engine, Base
from app.models import (
    User, UserRole, UserStatus,
    Department,
    Ticket, TicketStatus, TicketPriority, TicketCategory,
    Comment,
    TicketHistory
)


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def seed_database():
    print("--- [1/5] Initializing Database Tables ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # -------------------------------------------------------------
        # 1. SEED IT DEPARTMENTS
        # -------------------------------------------------------------
        print("\n--- [2/5] Seeding IT Departments ---")
        department_data = [
            {"name": "IT Hardware", "description": "Laptops, monitors, keyboards, docks, and device replacements."},
            {"name": "Software & Applications", "description": "OS issues, IDE licenses, Docker, corporate tools, and VPN."},
            {"name": "Network & Infrastructure", "description": "Wi-Fi connectivity, office LAN, firewalls, and DNS."},
            {"name": "Identity & Access Management", "description": "SSO, password resets, GitHub/AWS permissions, and badge access."}
        ]

        dept_map = {}
        for d in department_data:
            dept = db.query(Department).filter(Department.name == d["name"]).first()
            if not dept:
                dept = Department(name=d["name"], description=d["description"])
                db.add(dept)
                db.flush()
                print(f"  ✓ Created Dept: {d['name']}")
            dept_map[d["name"]] = dept

        # -------------------------------------------------------------
        # 2. SEED USERS (first_name, last_name, email, password_hash, role, status)
        # -------------------------------------------------------------
        print("\n--- [3/5] Seeding Users ---")
        users_to_seed = [
            {
                "email": "admin@example.com",
                "first_name": "Super",
                "last_name": "Admin",
                "role": UserRole.ADMIN,
                "password": "Password@123"
            },
            {
                "email": "agent.hardware@example.com",
                "first_name": "Rohan",
                "last_name": "Sharma",
                "role": UserRole.SUPPORT_AGENT,
                "password": "Password@123"
            },
            {
                "email": "agent.software@example.com",
                "first_name": "Priya",
                "last_name": "Verma",
                "role": UserRole.SUPPORT_AGENT,
                "password": "Password@123"
            },
            {
                "email": "user.alex@example.com",
                "first_name": "Alex",
                "last_name": "Mercer",
                "role": UserRole.END_USER,
                "password": "Password@123"
            },
            {
                "email": "user.sarah@example.com",
                "first_name": "Sarah",
                "last_name": "Connor",
                "role": UserRole.END_USER,
                "password": "Password@123"
            }
        ]

        user_map = {}
        for u in users_to_seed:
            user = db.query(User).filter(User.email == u["email"]).first()
            if not user:
                user = User(
                    email=u["email"],
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    status=UserStatus.ACTIVE
                )
                db.add(user)
                db.flush()
                print(f"  ✓ Created {u['role'].value}: {u['email']}")
            user_map[u["email"]] = user

        # -------------------------------------------------------------
        # 3. SEED TICKETS (Using valid TicketCategory: HARDWARE, SOFTWARE, NETWORK, ACCESS_MANAGEMENT, OTHER)
        # -------------------------------------------------------------
        print("\n--- [4/5] Seeding Tickets ---")
        tickets_to_seed = [
            {
                "ticket_key": "TICK-1001",
                "title": "MacBook Pro Secondary Monitor Flickering & Dock Freezes",
                "description": "When connected to the CalDigit Thunderbolt dock, the second 4K monitor flickers and the laptop randomly freezes during screen share.",
                "category": TicketCategory.HARDWARE,
                "priority": TicketPriority.HIGH,
                "status": TicketStatus.IN_PROGRESS,
                "department_id": dept_map["IT Hardware"].id,
                "created_by_id": user_map["user.alex@example.com"].id,
                "assigned_agent_id": user_map["agent.hardware@example.com"].id
            },
            {
                "ticket_key": "TICK-1002",
                "title": "Docker Desktop Pro License Key Expired",
                "description": "Getting license activation popup on workstation. Blocked from building corporate multi-arch container images.",
                "category": TicketCategory.SOFTWARE,
                "priority": TicketPriority.CRITICAL,
                "status": TicketStatus.OPEN,
                "department_id": dept_map["Software & Applications"].id,
                "created_by_id": user_map["user.alex@example.com"].id,
                "assigned_agent_id": None
            },
            {
                "ticket_key": "TICK-1003",
                "title": "VPN Frequent Disconnects on Office 3rd Floor Wi-Fi",
                "description": "GlobalProtect VPN connection drops consistently every 15 minutes when connected to 'Corp-Office-5G' access point near conference room 3A.",
                "category": TicketCategory.NETWORK,
                "priority": TicketPriority.MEDIUM,
                "status": TicketStatus.RESOLVED,
                "department_id": dept_map["Network & Infrastructure"].id,
                "created_by_id": user_map["user.sarah@example.com"].id,
                "assigned_agent_id": user_map["agent.software@example.com"].id
            },
            {
                "ticket_key": "TICK-1004",
                "title": "Request GitHub Organization & AWS Staging Read-Access",
                "description": "New joiner in Design/UX team. Need read-only access to front-end repositories and Figma staging S3 asset bucket.",
                "category": TicketCategory.ACCESS_MANAGEMENT,
                "priority": TicketPriority.LOW,
                "status": TicketStatus.CLOSED,
                "department_id": dept_map["Identity & Access Management"].id,
                "created_by_id": user_map["user.sarah@example.com"].id,
                "assigned_agent_id": user_map["admin@example.com"].id
            }
        ]

        ticket_map = {}
        for t in tickets_to_seed:
            ticket = db.query(Ticket).filter(Ticket.ticket_key == t["ticket_key"]).first()
            if not ticket:
                ticket = Ticket(**t)
                db.add(ticket)
                db.flush()
                print(f"  ✓ Created Ticket: [{t['ticket_key']}] {t['title'][:40]}...")

                # Auto-generate initial history log
                history = TicketHistory(
                    ticket_id=ticket.id,
                    changed_by_id=t["created_by_id"],
                    field_name="status",
                    old_value=None,
                    new_value=t["status"].value
                )
                db.add(history)
            ticket_map[t["ticket_key"]] = ticket

        # -------------------------------------------------------------
        # 4. SEED COMMENTS (Only: ticket_id, author_id, body)
        # -------------------------------------------------------------
        print("\n--- [5/5] Seeding Comments ---")
        comments_to_seed = [
            {
                "ticket_id": ticket_map["TICK-1001"].id,
                "author_id": user_map["agent.hardware@example.com"].id,
                "body": "Hi Alex, please bring the laptop to IT Support Desk (Desk 4B) today around 2 PM so we can re-flash the dock firmware."
            },
            {
                "ticket_id": ticket_map["TICK-1001"].id,
                "author_id": user_map["user.alex@example.com"].id,
                "body": "Thanks Rohan, I will visit the IT bay at 2:30 PM with the dock."
            },
            {
                "ticket_id": ticket_map["TICK-1001"].id,
                "author_id": user_map["agent.hardware@example.com"].id,
                "body": "Inspecting dock firmware and power delivery. Will replace with spare unit #Dock-09 if issue persists."
            },
            {
                "ticket_id": ticket_map["TICK-1003"].id,
                "author_id": user_map["agent.software@example.com"].id,
                "body": "The 3rd-floor AP-03 channel conflict has been resolved and firmware updated. VPN connections are stable now."
            }
        ]

        for c in comments_to_seed:
            existing_comment = db.query(Comment).filter(
                Comment.ticket_id == c["ticket_id"],
                Comment.body == c["body"]
            ).first()

            if not existing_comment:
                new_comment = Comment(**c)
                db.add(new_comment)
                print(f"  ✓ Added Comment on Ticket #{c['ticket_id']}")

        # -------------------------------------------------------------
        # 5. COMMIT TRANSACTION
        # -------------------------------------------------------------
        db.commit()
        print("\n" + "=" * 60)
        print("  Database Seeding Completed Successfully! ")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n[!] Seeding Failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
    