from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, UserStatus, UserRole
from app.utils import decode_access_token

# OAuth2 scheme for swagger UI and Header Extration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Database session Dependency
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication Dependncy :- Validates Token and Returns Active user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User :
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate":"Bearer"},
    )           

    payloads = decode_access_token(token)
    if payloads is None:
        raise credentials_exception

    user_id = payloads.get("sub")

    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return user

# RBAC : only Admin
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# RBAC : supoort agent or admin
def require_agent_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.SUPPORT_AGENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support Agent or Admin Privileges required"
        )
    return current_user
