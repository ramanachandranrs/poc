from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models

app = FastAPI(title="Automotive Dealer Network AI Copilot API", description="Mock APIs for Wipro DMS, SAP B1, and Manesar Rail")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = Session(models.engine)
    try:
        yield db
    finally:
        db.close()

@app.get("/api/v1/wipro/inventory", response_model=List[models.InventoryVehicleSchema])
def get_inventory(
    dealer_id: Optional[int] = None,
    days_in_inventory_gt: Optional[int] = Query(None, alias="days_in_inventory_gt", description="Filter for days_in_inventory > X"),
    db: Session = Depends(get_db)
):
    query = db.query(models.InventoryVehicle)
    if dealer_id is not None:
        query = query.filter(models.InventoryVehicle.dealer_id == dealer_id)
    if days_in_inventory_gt is not None:
        query = query.filter(models.InventoryVehicle.days_in_inventory > days_in_inventory_gt)
    return query.all()

@app.get("/api/v1/wipro/bookings", response_model=List[models.CustomerBookingSchema])
def get_bookings(db: Session = Depends(get_db)):
    """Returns pending customer bookings."""
    return db.query(models.CustomerBooking).filter(models.CustomerBooking.status == "Pending").all()

@app.get("/api/v1/sap/parts")
def get_sap_parts(db: Session = Depends(get_db)):
    """Returns current spare parts inventory and associated floorplan holding costs."""
    results = db.query(models.InventoryPart, models.SparePart).join(
        models.SparePart, models.InventoryPart.sku == models.SparePart.sku
    ).all()
    
    response = []
    for inv_part, sp_part in results:
        response.append({
            "id": inv_part.id,
            "dealer_id": inv_part.dealer_id,
            "sku": sp_part.sku,
            "part_name": sp_part.part_name,
            "category": sp_part.category,
            "unit_cost": sp_part.unit_cost,
            "quantity_on_hand": inv_part.quantity_on_hand,
            "floorplan_interest_rate": inv_part.floorplan_interest_rate,
            "holding_cost": round(sp_part.unit_cost * inv_part.quantity_on_hand * (inv_part.floorplan_interest_rate / 100), 2)
        })
    return response

@app.get("/api/v1/rail/transit", response_model=List[models.ShipmentSchema])
def get_transit(db: Session = Depends(get_db)):
    """Returns live transit statuses and ETAs for inbound vehicles."""
    return db.query(models.Shipment).all()
