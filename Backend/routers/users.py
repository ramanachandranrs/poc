from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import models
from .dependencies import get_db
from auth import get_current_active_user, check_role, get_password_hash

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    dependencies=[Depends(check_role([models.UserRole.ADMIN]))]
)

class UserCreate(BaseModel):
    username: str
    password: str
    role: models.UserRole
    zone: Optional[str] = None
    dealer_id: Optional[str] = None

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[models.UserRole] = None
    zone: Optional[str] = None
    dealer_id: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: models.UserRole
    zone: Optional[str] = None
    dealer_id: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.AppUser).all()

@router.post("", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.AppUser).filter(models.AppUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    if user.role == models.UserRole.USER:
        if not user.zone:
            raise HTTPException(status_code=400, detail="Zone is required for Dealerships.")
        if not user.dealer_id:
            raise HTTPException(status_code=400, detail="Dealer ID is required for Dealerships.")
            
        dealer = db.query(models.Dealer).filter(models.Dealer.dealer_id == user.dealer_id).first()
        if dealer:
            dealer.zone = user.zone
    
    new_user = models.AppUser(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role=user.role,
        zone=user.zone,
        dealer_id=user.dealer_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Validation & Syncing for Dealership Role
    target_role = user.role if user.role else db_user.role
    if target_role == models.UserRole.USER:
        target_zone = user.zone if user.zone is not None else db_user.zone
        target_dealer_id = user.dealer_id if user.dealer_id is not None else db_user.dealer_id
        
        if not target_zone:
            raise HTTPException(status_code=400, detail="Zone is required for Dealerships.")
        if not target_dealer_id:
            raise HTTPException(status_code=400, detail="Dealer ID is required for Dealerships.")
            
        if target_dealer_id and target_zone:
            dealer = db.query(models.Dealer).filter(models.Dealer.dealer_id == target_dealer_id).first()
            if dealer:
                dealer.zone = target_zone

    if user.password:
        db_user.hashed_password = get_password_hash(user.password)
    if user.role:
        db_user.role = user.role
    if user.zone is not None:
        db_user.zone = user.zone
    if user.dealer_id is not None:
        db_user.dealer_id = user.dealer_id
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"ok": True}
