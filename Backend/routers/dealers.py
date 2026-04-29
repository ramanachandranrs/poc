from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import models
from .dependencies import get_db
from auth import get_current_active_user, check_role

router = APIRouter(
    prefix="/api/v1/dealers",
    tags=["dealers"],
    dependencies=[Depends(check_role([models.UserRole.ADMIN, models.UserRole.MANAGER]))]
)

class DealerBase(BaseModel):
    dealer_id: str
    dealer_name: str
    city: str
    state: str
    dealer_type: Optional[str] = None
    zone: str

class DealerCreate(DealerBase):
    pass

class DealerUpdate(BaseModel):
    dealer_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    dealer_type: Optional[str] = None
    zone: Optional[str] = None

class DealerResponse(DealerBase):
    class Config:
        orm_mode = True

@router.get("/zones", response_model=List[str])
def get_zones(db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    if current_user.role == models.UserRole.MANAGER:
        return [current_user.zone]
    
    zones = db.query(models.Dealer.zone).distinct().all()
    return [z[0] for z in zones if z[0]]

@router.get("", response_model=List[DealerResponse])
def get_dealers(db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    # Regional distributor can only see their own zone
    if current_user.role == models.UserRole.MANAGER:
        return db.query(models.Dealer).filter(models.Dealer.zone == current_user.zone).all()
    # If admin accesses this
    return db.query(models.Dealer).all()

@router.post("", response_model=DealerResponse)
def create_dealer(dealer: DealerCreate, db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    if current_user.role == models.UserRole.MANAGER and dealer.zone != current_user.zone:
        raise HTTPException(status_code=403, detail="You can only create dealerships in your assigned zone.")
        
    db_dealer = db.query(models.Dealer).filter(models.Dealer.dealer_id == dealer.dealer_id).first()
    if db_dealer:
        raise HTTPException(status_code=400, detail="Dealer ID already exists")
        
    new_dealer = models.Dealer(
        dealer_id=dealer.dealer_id,
        dealer_name=dealer.dealer_name,
        city=dealer.city,
        state=dealer.state,
        dealer_type=dealer.dealer_type,
        zone=dealer.zone
    )
    db.add(new_dealer)
    db.commit()
    db.refresh(new_dealer)
    return new_dealer

@router.put("/{dealer_id}", response_model=DealerResponse)
def update_dealer(dealer_id: str, dealer: DealerUpdate, db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    db_dealer = db.query(models.Dealer).filter(models.Dealer.dealer_id == dealer_id).first()
    if not db_dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
        
    if current_user.role == models.UserRole.MANAGER and db_dealer.zone != current_user.zone:
        raise HTTPException(status_code=403, detail="You can only edit dealerships in your assigned zone.")
        
    if dealer.dealer_name: db_dealer.dealer_name = dealer.dealer_name
    if dealer.city: db_dealer.city = dealer.city
    if dealer.state: db_dealer.state = dealer.state
    if dealer.dealer_type: db_dealer.dealer_type = dealer.dealer_type
    
    # Only Admin (not manager) should ideally change zone, but let's check current user role
    if dealer.zone:
        if current_user.role == models.UserRole.MANAGER:
            if dealer.zone != current_user.zone:
                raise HTTPException(status_code=403, detail="Managers cannot reassign dealers to other zones.")
        db_dealer.zone = dealer.zone
    
    db.commit()
    db.refresh(db_dealer)
    return db_dealer

@router.delete("/{dealer_id}")
def delete_dealer(dealer_id: str, db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    db_dealer = db.query(models.Dealer).filter(models.Dealer.dealer_id == dealer_id).first()
    if not db_dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
        
    if current_user.role == models.UserRole.MANAGER and db_dealer.zone != current_user.zone:
        raise HTTPException(status_code=403, detail="You can only delete dealerships in your assigned zone.")
        
    db.delete(db_dealer)
    db.commit()
    return {"ok": True}
