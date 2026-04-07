from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

import models

app = FastAPI(
    title="Automotive Dealer Network AI Copilot API",
    description="Relational APIs backed by realistic synthetic CSV/XLSX datasets",
)

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


@app.get("/api/v1/wipro/inventory", response_model=List[models.InventoryResponse])
def get_inventory(
    dealer_id: Optional[str] = None,
    zone: Optional[str] = None,
    days_in_inventory_gt: Optional[int] = Query(None, alias="days_in_inventory_gt"),
    limit: int = Query(250, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            models.Vehicle.chassis_number,
            models.Vehicle.model_code,
            models.Vehicle.variant_id,
            models.Vehicle.fuel_type,
            models.JobCard.dealer_id,
            models.Dealer.dealer_name,
            func.max(func.julianday("now") - func.julianday(models.JobCard.date_in)).label(
                "days_in_inventory"
            ),
        )
        .join(models.JobCard, models.JobCard.chassis_number == models.Vehicle.chassis_number)
        .join(models.Dealer, models.Dealer.dealer_id == models.JobCard.dealer_id)
        .group_by(
            models.Vehicle.chassis_number,
            models.Vehicle.model_code,
            models.Vehicle.variant_id,
            models.Vehicle.fuel_type,
            models.JobCard.dealer_id,
            models.Dealer.dealer_name,
        )
    )

    if dealer_id is not None:
        query = query.filter(models.JobCard.dealer_id == dealer_id.upper().strip())
    if zone is not None:
        query = query.filter(models.Dealer.zone == zone.strip())
    if days_in_inventory_gt is not None:
        query = query.having(
            func.max(func.julianday("now") - func.julianday(models.JobCard.date_in))
            > days_in_inventory_gt
        )

    rows = query.order_by(func.max(models.JobCard.date_in).asc()).limit(limit).all()
    response = []
    for row in rows:
        days = int(row.days_in_inventory or 0)
        response.append(
            models.InventoryResponse(
                vin=row.chassis_number,
                dealer_id=row.dealer_id,
                dealer_name=row.dealer_name,
                model=row.model_code or "Unknown",
                variant=row.variant_id or "Unknown",
                fuel_type=row.fuel_type,
                days_in_inventory=days,
                status="Aging" if days > 60 else "Available",
            )
        )
    return response


@app.get("/api/v1/sap/parts", response_model=List[models.PartsResponse])
def get_sap_parts(
    dealer_id: Optional[str] = None,
    part: Optional[str] = None,
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    demand = db.query(
        models.DemandRecord.part_number,
        func.sum(models.DemandRecord.on_hand_qty).label("on_hand_qty"),
        func.avg(models.DemandRecord.reorder_point).label("reorder_point"),
        func.avg(models.DemandRecord.unit_price).label("unit_cost"),
        func.avg(models.DemandRecord.stockout_flag).label("stockout_rate"),
    )

    if dealer_id:
        demand = demand.filter(models.DemandRecord.dealer_id == dealer_id.upper().strip())
    if part:
        demand = demand.filter(models.DemandRecord.part_number == part.upper().strip())

    demand = demand.group_by(models.DemandRecord.part_number).subquery()

    rows = (
        db.query(
            models.Part.part_number,
            models.Part.description,
            models.Part.category_group,
            func.coalesce(demand.c.on_hand_qty, 0),
            func.coalesce(demand.c.reorder_point, models.Part.reorder_point),
            func.coalesce(demand.c.unit_cost, models.Part.mrp_base),
            func.coalesce(demand.c.stockout_rate, 0),
        )
        .outerjoin(demand, demand.c.part_number == models.Part.part_number)
        .order_by(models.Part.critical_flag.desc(), models.Part.part_number.asc())
        .limit(limit)
        .all()
    )
    return [
        models.PartsResponse(
            sku=row[0],
            part_name=row[1],
            category=row[2],
            quantity_on_hand=int(row[3] or 0),
            reorder_point=int(round(row[4] or 0)),
            unit_cost=round(float(row[5] or 0), 2),
            stockout_rate=round(float(row[6] or 0), 3),
        )
        for row in rows
    ]


@app.get("/api/v1/rail/transit", response_model=List[models.TransitResponse])
def get_transit(
    zone: Optional[str] = None,
    mode: Optional[str] = None,
    limit: int = Query(400, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    query = db.query(models.Shipment)
    if zone:
        query = query.filter(models.Shipment.zone == zone.strip())
    if mode:
        query = query.filter(models.Shipment.transport_mode == mode.strip())
    shipments = query.order_by(models.Shipment.dispatch_date.desc()).limit(limit).all()
    return [
        models.TransitResponse(
            shipment_id=s.shipment_id,
            origin=s.origin_city or (s.origin_name or "Unknown"),
            destination=s.destination_city or (s.destination_name or "Unknown"),
            status=s.status or "Unknown",
            expected_delivery=s.expected_arrival,
            carrier=s.carrier_name or "Unknown",
            items=round(float(s.qty_shipped or 0), 2),
            delay_days=round(float(s.delay_days or 0), 2),
        )
        for s in shipments
    ]


@app.get("/api/v1/overview/trends", response_model=List[models.TrendResponse])
def get_overview_trends(
    dealer_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(
        func.strftime("%Y-%m", models.DailyTrend.date).label("month"),
        func.sum(models.DailyTrend.total_demand_qty).label("demand"),
        func.sum(models.DailyTrend.total_demand_qty + models.DailyTrend.stockout_count).label(
            "inventory"
        ),
    )
    if dealer_id:
        query = query.filter(models.DailyTrend.dealer_id == dealer_id.upper().strip())
    rows = query.group_by("month").order_by("month").all()
    return [
        models.TrendResponse(
            month=row.month,
            inventory=round(float(row.inventory or 0), 2),
            demand=round(float(row.demand or 0), 2),
        )
        for row in rows
    ]


@app.get("/api/v1/customers", response_model=List[models.CustomerResponse])
def get_customers(
    search: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    ownership: Optional[str] = None,
    limit: int = Query(200, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    query = db.query(models.Customer)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            models.Customer.name.ilike(term) | models.Customer.customer_id.ilike(term)
        )
    if state:
        query = query.filter(models.Customer.state.ilike(f"%{state.strip()}%"))
    if city:
        query = query.filter(models.Customer.city.ilike(f"%{city.strip()}%"))
    if ownership:
        query = query.filter(models.Customer.ownership_history == ownership.strip())
    rows = query.order_by(models.Customer.customer_id.asc()).limit(limit).all()
    return [
        models.CustomerResponse(
            customer_id=r.customer_id,
            name=r.name,
            contact=r.contact,
            city=r.city,
            state=r.state,
            ownership_history=r.ownership_history,
        )
        for r in rows
    ]


@app.get("/api/v1/wipro/services", response_model=List[models.JobCardInsight])
def get_service_insights(
    dealer_id: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            models.JobCard.job_card_number,
            models.JobCard.dealer_id,
            models.JobCard.service_type,
            models.JobCard.date_in,
            func.sum(models.JobCardLineItem.billed_amount).label("total_amount"),
        )
        .join(
            models.JobCardLineItem,
            models.JobCardLineItem.job_card_number == models.JobCard.job_card_number,
        )
        .group_by(
            models.JobCard.job_card_number,
            models.JobCard.dealer_id,
            models.JobCard.service_type,
            models.JobCard.date_in,
        )
        .order_by(models.JobCard.date_in.desc())
    )
    if dealer_id:
        query = query.filter(models.JobCard.dealer_id == dealer_id.upper().strip())
    rows = query.limit(limit).all()
    return [
        models.JobCardInsight(
            job_card_number=row.job_card_number,
            dealer_id=row.dealer_id,
            service_type=row.service_type,
            date_in=row.date_in,
            total_amount=round(float(row.total_amount or 0), 2),
        )
        for row in rows
    ]
