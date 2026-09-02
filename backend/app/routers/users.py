from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db, require_admin
import app.crud as crud
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.models import User, UserRole, UserStatus

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse,status_code=status.HTTP_201_CREATED)
def create_agent(user_in: UserCreate,db: Session = Depends(get_db),current_admin: User = Depends(require_admin)):
    """Only the Support Agent Profile will be created,This API can call by Admin only"""
    user = crud.get_user_by_email(db=db, user_email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exist"
        )

    return crud.create_user(db = db, user_in = user_in, role=UserRole.SUPPORT_AGENT) 

@router.get("/", response_model=List[UserResponse])
def get_users(
        skip: int = 0, 
        limit : int = 100, 
        role: Optional[UserRole] = None,
        db: Session = Depends(get_db),
        current_admin: User = Depends(require_admin)
    ):
    """
    Fetch non-admin users directory (Admin Only)
    - Admin are strictly exclude at db level
    - Supports filtering via role query param (?role=SUPPORT_AGENT or ?role=END_USER)
    """
    return crud.get_users(db=db, skip=skip, limit=limit, role=role)

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):

    # 1. Fetch the target user first
    db_user = crud.get_user_by_id(db=db, user_id = user_id)        
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 2. END_USER & SUPPORT_AGENT Rule: Can ONLY update themselves
    if current_user.role != UserRole.ADMIN:
        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this profile"
            )

        # prevent non-admin from changing the status even if they sent in the body
        user_in.status = None

    # 3. ADMIN Rule: Can update self, any END_USER, any SUPPORT_AGENT, but NOT other ADMINs
    else:
        if db_user.role == UserRole.ADMIN and db_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin can not modify other admins accounts"
            )
    # 4. Perform update safely
    return crud.update_user(db=db, db_user=db_user, user_in=user_in)    
