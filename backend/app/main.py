from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import Base, engine
from app.routers import auth, users, departments, tickets, comments, attachments

# create db table automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IT Ticketing Portal API",
    version="1.0.0",
    description="Full-featured Helpdesk REST API with strict RBAC, audit logs, and file uploads"
)

# CORS Middleware Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Mount static folder for file upload
UPLOAD_DIR =  os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include all API Routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(tickets.router)
app.include_router(comments.router)
app.include_router(attachments.router)

@app.get("/",tags=["Health"])
def health_check():
    return {
        "status" : "healthy",
        "service" : "Customer Support Ticketing API"
    }

