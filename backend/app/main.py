from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine,Base
import app.models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IT Ticketing Potal API",
    version="1.0.0",
    description="Internal IT Ticketing System with RBAC And ticket lifecycle workflows. "
)

app.add_middleware(
    CORSMiddleware,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=["*"],
    allow_credentials=True
)

@app.get("/",tags=["Health"])
def root():
    return {
        "status" : "healthy",
        "message" : "IT Ticketing Potal API is Running"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status":"ok"}


