from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
import app.crud as crud
from app.schemas import UserCreate, UserResponse, LoginRequest, Token
from app.utils import verify_password, create_access_token
from app.dependencies import get_current_user
from app.models import User, UserRole, UserStatus

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Public self registration endpoint for End-User
    Strictly force the role to END_USER to prevent privilege escalation.
    Support Agent and Admin can not self register here
    """
    existing_user = crud.get_user_by_email(db, user_email = user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    return crud.create_user(db=db, user_in=user_in, role=UserRole.END_USER)

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user with email and password, then return a JWT Bearer Token"""
    user = crud.get_user_by_email(db, user_email=login_data.email)

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Email or Password"
        )

    # Block Inactive accounts
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is Inactive. Please Contact to administrator"
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently logged-in user"""
    return current_user

