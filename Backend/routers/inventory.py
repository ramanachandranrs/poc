from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import models
from .dependencies import get_db
from auth import get_current_active_user, get_scope_condition

router = APIRouter(
    prefix="/api/v1/wipro/inventory",
    tags=["inventory"],
    responses={404: {"description": "Not found"}},
)

@router.get("/summary")
def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: models.AppUser = Depends(get_current_active_user)
):
    # Pre-calculate cutoff dates to avoid per-row SQL function calls
    from datetime import date, timedelta
    ref_date = date(2025, 12, 31)
    d60 = (ref_date - timedelta(days=60))
    d90 = (ref_date - timedelta(days=90))

    scope = get_scope_condition(current_user, dealer_field="v.dealer_id", zone_field="d.zone")
    row = db.execute(text(f"""
        SELECT
            COUNT(v.chassis_number) as total,
            SUM(CASE WHEN v.stock_arrival_date >= :d60 THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN v.stock_arrival_date < :d60 AND v.stock_arrival_date >= :d90 THEN 1 ELSE 0 END) as aging,
            SUM(CASE WHEN v.stock_arrival_date < :d90 THEN 1 ELSE 0 END) as critical
        FROM vehicles v
        JOIN dealers d ON v.dealer_id = d.dealer_id
        WHERE v.stock_arrival_date IS NOT NULL
          AND v.dealer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM vehicle_sales vs WHERE vs.chassis_number = v.chassis_number)
          AND {scope}
    """), {"d60": d60, "d90": d90}).fetchone()
    return {
        "total": row.total or 0, 
        "available": row.available or 0, 
        "aging": row.aging or 0, 
        "critical": row.critical or 0
    }

@router.get("", response_model=models.PaginatedInventoryResponse)
def get_inventory(
    dealer_id: Optional[str] = None,
    zone: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
    fuel_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.AppUser = Depends(get_current_active_user)
):
    scope = get_scope_condition(current_user, dealer_field="v.dealer_id", zone_field="d.zone")
    conditions = [
        "v.stock_arrival_date IS NOT NULL",
        "v.dealer_id IS NOT NULL",
        "NOT EXISTS (SELECT 1 FROM vehicle_sales vs WHERE vs.chassis_number = v.chassis_number)",
        scope
    ]
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if dealer_id:
        conditions.append("UPPER(v.dealer_id) = UPPER(:dealer_id)")
        params["dealer_id"] = dealer_id.strip()
    if zone:
        conditions.append("d.zone = :zone")
        params["zone"] = zone.strip()
    if model:
        conditions.append("v.model_code = :model")
        params["model"] = model.strip()
    if fuel_type:
        conditions.append("v.fuel_type = :fuel_type")
        params["fuel_type"] = fuel_type.strip()
    from datetime import date, timedelta
    ref_date = date(2025, 12, 31)
    d60 = (ref_date - timedelta(days=60))
    d90 = (ref_date - timedelta(days=90))

    if status == "Available":
        conditions.append("v.stock_arrival_date >= :d60")
        params["d60"] = d60
    elif status == "Aging":
        conditions.append("v.stock_arrival_date < :d60")
        params["d60"] = d60
    elif status == "Critical":
        conditions.append("v.stock_arrival_date < :d90")
        params["d90"] = d90
    if search:
        conditions.append("(v.chassis_number LIKE :search OR v.model_code LIKE :search OR d.dealer_name LIKE :search OR v.variant_id LIKE :search)")
        params["search"] = f"%{search.strip()}%"

    where = " AND ".join(conditions)
    total = db.execute(text(f"SELECT COUNT(*) FROM vehicles v JOIN dealers d ON d.dealer_id = v.dealer_id WHERE {where}"), params).fetchone()[0]
    
    rows = db.execute(text(f"""
        SELECT v.chassis_number, v.model_code, v.variant_id, v.fuel_type,
            d.dealer_id, d.dealer_name, d.zone,
            CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
        FROM vehicles v
        JOIN dealers d ON d.dealer_id = v.dealer_id
        WHERE {where}
        ORDER BY days DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    return models.PaginatedInventoryResponse(
        total=total,
        page=page,
        limit=limit,
        items=[
            models.InventoryResponse(
                vin=row.chassis_number,
                dealer_id=row.dealer_id,
                dealer_name=row.dealer_name,
                model=row.model_code or "Unknown",
                variant=row.variant_id or "Unknown",
                fuel_type=row.fuel_type,
                days_in_inventory=int(row.days or 0),
                status="Critical" if int(row.days or 0) > 90 else ("Aging" if int(row.days or 0) > 60 else "Available"),
            )
            for row in rows
        ]
    )
