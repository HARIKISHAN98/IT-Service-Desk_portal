from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
import app.crud as crud
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.dependencies import get_current_user, require_admin
from app.models import User

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100):
    return crud.get_departments(db=db, skip=skip, limit=limit)

@router.post("/",response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_new_department(dept_in: DepartmentCreate, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    existing_dept = crud.get_department_by_name(db=db, name=dept_in.name)
    if existing_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name already Exist"
        )
    return crud.create_department(db=db, department_in=dept_in)
 
@router.patch("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db), 
    current_admin: User = Depends(require_admin)
):
    # 1. Check if department exists
    db_dept = crud.get_department_by_id(db=db, department_id=department_id)
    if not db_dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # 2. Check duplicate name only when a new, changed name is sent
    if dept_in.name and dept_in.name.strip() != db_dept.name:
        existing_dept = crud.get_department_by_name(db=db, name=dept_in.name.strip())
        
        # Nested inside the block so it only evaluates when a new name was queried
        if existing_dept and existing_dept.id != department_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department with '{dept_in.name}' already exists"
            )

    # 3. Apply safe update
    return crud.update_department(db=db, db_department=db_dept, department_in=dept_in)



