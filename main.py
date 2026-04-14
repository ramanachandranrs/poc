from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from pathlib import Path

import models
from distance_service import get_transport_cost, get_distance_km

FORECAST_PATH = Path("data/forecast_output.json")
_forecast_cache: Dict[str, Any] = {}

def _load_forecast() -> Dict[str, Any]:
    global _forecast_cache
    if not _forecast_cache and FORECAST_PATH.exists():
        with open(FORECAST_PATH) as f:
            _forecast_cache = json.load(f)
    return _forecast_cache

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


@app.get("/api/v1/wipro/inventory/summary")
def get_inventory_summary(db: Session = Depends(get_db)):
    # Only count UNSOLD vehicles (not present in vehicle_sales) — true showroom stock
    row = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) <= 60 THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) > 60 THEN 1 ELSE 0 END) as aging,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) > 90 THEN 1 ELSE 0 END) as critical
        FROM vehicles
        WHERE stock_arrival_date IS NOT NULL
          AND dealer_id IS NOT NULL
          AND chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)
    """)).fetchone()
    return {"total": row.total, "available": row.available, "aging": row.aging, "critical": row.critical}


@app.get("/api/v1/wipro/inventory", response_model=List[models.InventoryResponse])
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
):
    conditions = [
        "v.stock_arrival_date IS NOT NULL",
        "v.dealer_id IS NOT NULL",
        "v.chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)",
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
    if status == "Available":
        conditions.append("CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) <= 60")
    elif status == "Aging":
        conditions.append("CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) > 60")
    if search:
        conditions.append("(v.chassis_number LIKE :search OR v.model_code LIKE :search OR d.dealer_name LIKE :search OR v.variant_id LIKE :search)")
        params["search"] = f"%{search.strip()}%"

    where = " AND ".join(conditions)
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

    return [
        models.InventoryResponse(
            vin=row.chassis_number,
            dealer_id=row.dealer_id,
            dealer_name=row.dealer_name,
            model=row.model_code or "Unknown",
            variant=row.variant_id or "Unknown",
            fuel_type=row.fuel_type,
            days_in_inventory=int(row.days or 0),
            status="Aging" if int(row.days or 0) > 60 else "Available",
        )
        for row in rows
    ]


@app.get("/api/v1/sap/parts/summary")
def get_parts_summary(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN on_hand < rop THEN 1 ELSE 0 END) as stockout,
            SUM(CASE WHEN on_hand >= rop THEN 1 ELSE 0 END) as adequate
        FROM (
            SELECT dealer_id, part_number,
                SUM(on_hand_qty) as on_hand,
                AVG(reorder_point) as rop
            FROM demand_records
            GROUP BY dealer_id, part_number
        )
    """)).fetchone()
    sku_count = db.execute(text("SELECT COUNT(*) FROM parts")).fetchone()[0]
    return {
        "total_dealer_part_combos": rows.total,
        "stockout": rows.stockout,
        "adequate": rows.adequate,
        "unique_skus": sku_count,
    }


@app.get("/api/v1/sap/parts", response_model=List[models.PartsResponse])
def get_sap_parts(
    dealer_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    conditions = ["1=1"]
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if dealer_id:
        conditions.append("UPPER(dr.dealer_id) = UPPER(:dealer_id)")
        params["dealer_id"] = dealer_id.strip()
    if category:
        conditions.append("p.category_group = :category")
        params["category"] = category.strip()
    if search:
        conditions.append("(p.description LIKE :search OR p.part_number LIKE :search)")
        params["search"] = f"%{search.strip()}%"
    if status == "Stockout Alert":
        conditions.append("on_hand < rop")
    elif status == "Adequate":
        conditions.append("on_hand >= rop")

    where = " AND ".join(conditions)
    rows = db.execute(text(f"""
        SELECT p.part_number, p.description, p.category_group,
            on_hand, rop, unit_cost, stockout_rate,
            dr.dealer_id, d.dealer_name
        FROM (
            SELECT part_number, dealer_id,
                SUM(on_hand_qty) as on_hand,
                AVG(reorder_point) as rop,
                AVG(unit_price) as unit_cost,
                AVG(stockout_flag) as stockout_rate
            FROM demand_records
            GROUP BY part_number, dealer_id
        ) dr
        JOIN parts p ON p.part_number = dr.part_number
        JOIN dealers d ON d.dealer_id = dr.dealer_id
        WHERE {where}
        ORDER BY on_hand ASC, p.part_number ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    return [
        models.PartsResponse(
            sku=row.part_number,
            part_name=row.description,
            category=row.category_group,
            quantity_on_hand=int(row.on_hand or 0),
            reorder_point=int(round(row.rop or 0)),
            unit_cost=round(float(row.unit_cost or 0), 2),
            stockout_rate=round(float(row.stockout_rate or 0), 3),
        )
        for row in rows
    ]


@app.get("/api/v1/rail/transit/summary")
def get_transit_summary(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) as in_transit,
            SUM(CASE WHEN status = 'Delivered'  THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status IN ('Delayed', 'Past Due') THEN 1 ELSE 0 END) as delayed
        FROM shipments
    """)).fetchone()
    return {
        "total": row.total,
        "in_transit": row.in_transit,
        "delivered": row.delivered,
        "delayed": row.delayed,
    }


@app.get("/api/v1/rail/transit", response_model=List[models.TransitResponse])
def get_transit(
    zone: Optional[str] = None,
    mode: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    dealer_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    conditions = ["1=1"]
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if zone:
        conditions.append("zone = :zone")
        params["zone"] = zone.strip()
    if mode:
        conditions.append("transport_mode = :mode")
        params["mode"] = mode.strip()
    if dealer_id:
        conditions.append("UPPER(dealer_id) = UPPER(:dealer_id)")
        params["dealer_id"] = dealer_id.strip()
    if status and status != "All":
        if status == "Delayed":
            conditions.append("status IN ('Delayed', 'Past Due')")
        else:
            conditions.append("status = :status")
            params["status"] = status.strip()
    if search:
        conditions.append("(shipment_id LIKE :search OR carrier_name LIKE :search OR origin_city LIKE :search OR destination_city LIKE :search)")
        params["search"] = f"%{search.strip()}%"

    where = " AND ".join(conditions)
    shipments = db.execute(text(f"""
        SELECT shipment_id, origin_city, origin_name, destination_city, destination_name,
               status, expected_arrival, carrier_name, qty_shipped,
               CASE
                   WHEN actual_arrival IS NOT NULL AND expected_arrival IS NOT NULL
                        AND actual_arrival > expected_arrival
                   THEN CAST(julianday(actual_arrival) - julianday(expected_arrival) AS INTEGER)
                   WHEN status IN ('Delayed', 'Past Due') AND delay_days > 0
                   THEN delay_days
                   WHEN status IN ('Delayed', 'Past Due')
                   THEN CAST(julianday('2025-12-31') - julianday(expected_arrival) AS INTEGER)
                   ELSE 0
               END AS real_delay_days
        FROM shipments
        WHERE {where}
        ORDER BY dispatch_date DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    return [
        models.TransitResponse(
            shipment_id=s.shipment_id,
            origin=s.origin_city or (s.origin_name or "Unknown"),
            destination=s.destination_city or (s.destination_name or "Unknown"),
            status=s.status or "Unknown",
            expected_delivery=s.expected_arrival,
            carrier=s.carrier_name or "Unknown",
            items=round(float(s.qty_shipped or 0), 2),
            delay_days=round(float(s.real_delay_days or 0), 2),
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


# ── Demand Forecast Endpoints ─────────────────────────────────────────────────

@app.get("/api/v1/forecast/variants", response_model=List[models.DealerVariantForecast])
def get_forecast_variants(
    dealer_id: Optional[str] = None,
    variant_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
):
    data = _load_forecast()
    records = data.get("forecasts", [])
    if dealer_id:
        records = [r for r in records if r["dealer_id"] == dealer_id.upper().strip()]
    if variant_id:
        records = [r for r in records if r["variant_id"] == variant_id.strip()]
    records = sorted(records, key=lambda x: x["total_30d"], reverse=True)[:limit]
    return [
        models.DealerVariantForecast(
            dealer_id=r["dealer_id"],
            dealer_name=r["dealer_name"],
            variant_id=r["variant_id"],
            total_30d=r["total_30d"],
            model_mape=r["model_mape"],
            daily=[models.DailyForecastPoint(**d) for d in r["daily"]],
        )
        for r in records
    ]


@app.get("/api/v1/forecast/summary", response_model=models.ForecastSummary)
def get_forecast_summary():
    data = _load_forecast()
    records = data.get("forecasts", [])

    # Top 10 dealer-variant pairs by 30d demand
    top_pairs = sorted(records, key=lambda x: x["total_30d"], reverse=True)[:10]

    # Network-wide totals per variant
    variant_map: dict = {}
    for r in records:
        v = r["variant_id"]
        variant_map[v] = variant_map.get(v, 0) + r["total_30d"]
    variant_totals = [
        {"variant_id": k, "total_30d": round(v, 1)}
        for k, v in sorted(variant_map.items(), key=lambda x: -x[1])
    ]

    return models.ForecastSummary(
        generated_at=data.get("generated_at", ""),
        forecast_horizon=data.get("forecast_horizon", 30),
        total_dealer_variant_combos=len(records),
        data_source=data.get("data_source", "vehicle_sales_transactions.csv"),
        top_pairs=[
            {
                "dealer_id":   r["dealer_id"],
                "dealer_name": r["dealer_name"],
                "variant_id":  r["variant_id"],
                "total_30d":   r["total_30d"],
                "model_mape":  r["model_mape"],
            }
            for r in top_pairs
        ],
        variant_totals=variant_totals,
        model_metrics=data.get("model_metrics", {}),
    )


# ── Aging Stock Helpers ───────────────────────────────────────────────────────

FLOORPLAN_RATE_MONTHLY = 0.01   # 1% per month on invoice value
AVG_INVOICE_VALUE = 800_000     # ₹8L default if not in DB
TRANSPORT_COST_PER_KM = 12      # ₹12/km estimate


def _age_bucket(days: int) -> str:
    if days < 30:   return "Fresh"
    if days < 60:   return "Watch"
    if days < 90:   return "Aging"
    return "Critical"


def _floorplan_cost(days: int, invoice: float) -> float:
    return round((days / 30) * FLOORPLAN_RATE_MONTHLY * invoice, 2)


def _transport_cost(distance_km: float) -> float:
    return round(max(distance_km, 50) * TRANSPORT_COST_PER_KM, 2)


def _demand_score_for_variant(variant: str, dealer_id: str, db: Session) -> float:
    """30-day demand from ML forecast output if available, else DB proxy."""
    fc = _load_forecast()
    for rec in fc.get("forecasts", []):
        if rec["dealer_id"] == dealer_id and rec["variant_id"] == variant:
            return float(rec["total_30d"])
    # fallback to DB average
    row = db.execute(
        text("""
            SELECT AVG(demand_qty) as avg_demand
            FROM demand_records
            WHERE variant_id = :variant AND dealer_id = :dealer
        """),
        {"variant": variant, "dealer": dealer_id},
    ).fetchone()
    val = float(row.avg_demand or 0) if row else 0.0
    return round(val * 30, 2)


def _build_ai_prompt(v: dict, target: dict, net_utility: float) -> str:
    action = "transfer" if net_utility > 0 else "discount"
    return (
        f"You are a B2B automotive inventory negotiation assistant.\n\n"
        f"Vehicle: {v['model']} {v['variant']} ({v['fuel_type'] or 'N/A'})\n"
        f"VIN: {v['vin']}\n"
        f"Days in stock at {v['source_dealer_name']} ({v['source_city']}): {v['days_in_inventory']}\n"
        f"Floorplan cost to date: ₹{v['total_floorplan_cost']:,.0f}\n"
        f"Proposed {action} to: {target['dealer_name']} ({target['city']})\n"
        f"Estimated transport cost: ₹{v['transport_cost']:,.0f}\n"
        f"Net utility score: {net_utility:+.0f}\n\n"
        f"Draft a concise, professional {'transfer proposal' if action == 'transfer' else 'discount offer'} "
        f"highlighting the mutual financial benefit. Keep it under 120 words."
    )


# ── Aging Stock Endpoints ─────────────────────────────────────────────────────

@app.get("/api/v1/aging/summary", response_model=models.AgingSummary)
def get_aging_summary(db: Session = Depends(get_db)):
    # Only unsold vehicles — true aging showroom stock
    rows = db.execute(
        text("""
            SELECT
                v.chassis_number,
                v.model_code,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            WHERE v.stock_arrival_date IS NOT NULL
              AND v.chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)
              AND CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) > 30
        """)
    ).fetchall()

    if not rows:
        return models.AgingSummary(
            total_aging=0, critical_count=0, aging_count=0, watch_count=0,
            total_floorplan_burn=0, top_aging_model="N/A", avg_days_aging=0
        )

    critical = [r for r in rows if r.days >= 90]
    aging    = [r for r in rows if 60 <= r.days < 90]
    watch    = [r for r in rows if 30 <= r.days < 60]
    total_burn = sum(_floorplan_cost(r.days, AVG_INVOICE_VALUE) for r in rows if r.days > 60)

    from collections import Counter
    model_counts = Counter(r.model_code for r in rows if r.days > 60)
    top_model = model_counts.most_common(1)[0][0] if model_counts else "N/A"
    avg_days = round(sum(r.days for r in rows if r.days > 60) / max(len([r for r in rows if r.days > 60]), 1), 1)

    return models.AgingSummary(
        total_aging=len([r for r in rows if r.days > 60]),
        critical_count=len(critical),
        aging_count=len(aging),
        watch_count=len(watch),
        total_floorplan_burn=round(total_burn, 2),
        top_aging_model=top_model,
        avg_days_aging=avg_days,
    )


@app.get("/api/v1/aging/vehicles", response_model=List[models.AgingVehicle])
def get_aging_vehicles(
    min_days: int = Query(60, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                v.chassis_number,
                v.model_code,
                v.variant_id,
                v.fuel_type,
                v.dealer_id,
                d.dealer_name,
                d.city,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            JOIN dealers d ON d.dealer_id = v.dealer_id
            WHERE v.stock_arrival_date IS NOT NULL
              AND v.chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)
              AND CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) >= :min_days
            ORDER BY days DESC
            LIMIT :lim
        """),
        {"min_days": min_days, "lim": limit},
    ).fetchall()

    result = []
    for r in rows:
        daily = round(FLOORPLAN_RATE_MONTHLY * AVG_INVOICE_VALUE / 30, 2)
        total = _floorplan_cost(r.days, AVG_INVOICE_VALUE)
        result.append(models.AgingVehicle(
            vin=r.chassis_number,
            model=r.model_code or "Unknown",
            variant=r.variant_id or "Unknown",
            fuel_type=r.fuel_type,
            source_dealer_id=r.dealer_id,
            source_dealer_name=r.dealer_name,
            source_city=r.city,
            days_in_inventory=r.days,
            age_bucket=_age_bucket(r.days),
            invoice_value=AVG_INVOICE_VALUE,
            daily_floorplan_cost=daily,
            total_floorplan_cost=total,
        ))
    return result


@app.get("/api/v1/aging/transfers", response_model=List[models.TransferRecommendation])
def get_transfer_recommendations(
    min_days: int = Query(60, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    # Get aging UNSOLD vehicles only
    aging_rows = db.execute(
        text("""
            SELECT
                v.chassis_number, v.model_code, v.variant_id, v.fuel_type,
                v.dealer_id, d.dealer_name, d.city,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            JOIN dealers d ON d.dealer_id = v.dealer_id
            WHERE v.stock_arrival_date IS NOT NULL
              AND v.chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)
              AND CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) >= :min_days
            ORDER BY days DESC
            LIMIT :lim
        """),
        {"min_days": min_days, "lim": limit},
    ).fetchall()

    # Get all dealers for target matching
    all_dealers = db.query(models.Dealer).all()

    recommendations = []
    for r in aging_rows:
        total_fp = _floorplan_cost(r.days, AVG_INVOICE_VALUE)

        # Find best target dealer using real road distances from DB
        best_target = None
        best_utility = -999_999
        best_transport = 0
        best_demand = 0

        for d in all_dealers:
            if d.dealer_id == r.dealer_id:
                continue
            transport = get_transport_cost(r.city, d.city, db)
            demand = _demand_score_for_variant(r.variant_id or "", d.dealer_id, db)
            # Net utility = floorplan saved + demand value - transport
            utility = total_fp + (demand * 500) - transport
            if utility > best_utility:
                best_utility = utility
                best_target = d
                best_transport = transport
                best_demand = demand

        if best_target is None:
            continue

        if best_utility > 0:
            rec = "Transfer"
        elif r.days > 90:
            rec = "Discount"
        else:
            rec = "Hold"

        v_dict = {
            "vin": r.chassis_number, "model": r.model_code, "variant": r.variant_id,
            "fuel_type": r.fuel_type, "source_dealer_name": r.dealer_name,
            "source_city": r.city, "days_in_inventory": r.days,
            "total_floorplan_cost": total_fp, "transport_cost": best_transport,
        }
        t_dict = {"dealer_name": best_target.dealer_name, "city": best_target.city}

        recommendations.append(models.TransferRecommendation(
            vin=r.chassis_number,
            model=r.model_code or "Unknown",
            variant=r.variant_id or "Unknown",
            fuel_type=r.fuel_type,
            source_dealer_id=r.dealer_id,
            source_dealer_name=r.dealer_name,
            source_city=r.city,
            target_dealer_id=best_target.dealer_id,
            target_dealer_name=best_target.dealer_name,
            target_city=best_target.city,
            days_in_inventory=r.days,
            age_bucket=_age_bucket(r.days),
            invoice_value=AVG_INVOICE_VALUE,
            total_floorplan_cost=total_fp,
            transport_cost=best_transport,
            demand_score=best_demand,
            net_utility_score=round(best_utility, 2),
            recommendation=rec,
            ai_prompt=_build_ai_prompt(v_dict, t_dict, best_utility),
        ))

    recommendations.sort(key=lambda x: x.net_utility_score, reverse=True)
    return recommendations


# ── GenAI Prompt Endpoints ────────────────────────────────────────────────────

def _b2c_prompt(vin: str, model: str, variant: str, fuel: str,
                dealer: str, days: int, discount: float) -> str:
    urgency = "urgent" if days >= 90 else "priority"
    return (
        f"You are a B2C automotive sales assistant for {dealer}.\n\n"
        f"Vehicle Details:\n"
        f"  Model    : {model} {variant} ({fuel or 'N/A'})\n"
        f"  VIN      : {vin}\n"
        f"  Days in showroom: {days} days\n"
        f"  Special offer   : ₹{discount:,.0f} discount available\n\n"
        f"Task: Write a warm, persuasive WhatsApp/SMS message to a customer "
        f"who previously enquired about this variant. Highlight the {urgency} "
        f"limited-time discount, the vehicle availability, and create a gentle "
        f"sense of urgency. Keep it under 100 words. Use a friendly, "
        f"conversational tone. Do not use generic phrases like 'Dear Customer'."
    )


def _stockout_prompt(sku: str, part_name: str, dealer_id: str,
                     qty_on_hand: int, rop: int, gap: int) -> str:
    return (
        f"You are an operational alert assistant for an automotive dealer network.\n\n"
        f"Stockout Alert:\n"
        f"  Part     : {part_name} (SKU: {sku})\n"
        f"  Dealer   : {dealer_id}\n"
        f"  On Hand  : {qty_on_hand} units\n"
        f"  Reorder Point: {rop} units\n"
        f"  Shortfall: {gap} units below ROP\n\n"
        f"Task: Write a concise operational alert message to the parts manager. "
        f"Include the urgency level, recommended order quantity (EOQ = {max(rop * 2, 10)} units), "
        f"and the business impact of not reordering immediately. "
        f"Keep it under 80 words. Professional tone."
    )


def _transit_delay_prompt(shipment_id: str, part_name: str,
                           origin: str, destination: str,
                           delay_days: float, carrier: str) -> str:
    severity = "CRITICAL" if delay_days >= 5 else "HIGH"
    return (
        f"You are an operational alert assistant for an automotive dealer network.\n\n"
        f"Transit Delay Alert [{severity}]:\n"
        f"  Shipment : {shipment_id}\n"
        f"  Part     : {part_name}\n"
        f"  Route    : {origin} → {destination}\n"
        f"  Carrier  : {carrier}\n"
        f"  Delay    : {delay_days:.0f} days past expected arrival\n\n"
        f"Task: Write a concise escalation message to the logistics coordinator. "
        f"Include the delay severity, recommended action (expedite / alternative carrier / "
        f"emergency stock transfer), and customer impact. Keep it under 80 words."
    )


@app.get("/api/v1/genai/b2c-prompts", response_model=List[models.B2CPrompt])
def get_b2c_prompts(
    min_days: int = Query(60, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    # Use unsold vehicles with stock_arrival_date — correct aging stock for B2C outreach
    rows = db.execute(
        text("""
            SELECT
                v.chassis_number, v.model_code, v.variant_id, v.fuel_type,
                v.dealer_id, d.dealer_name,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            JOIN dealers d ON d.dealer_id = v.dealer_id
            WHERE v.stock_arrival_date IS NOT NULL
              AND v.chassis_number NOT IN (SELECT chassis_number FROM vehicle_sales)
              AND CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) >= :min_days
            ORDER BY days DESC
            LIMIT :lim
        """),
        {"min_days": min_days, "lim": limit},
    ).fetchall()

    result = []
    for r in rows:
        days = r.days
        # Discount scales with age: 60d=₹15k, 90d=₹25k, 120d+=₹40k
        discount = 15000 if days < 90 else (25000 if days < 120 else 40000)
        bucket = _age_bucket(days)
        result.append(models.B2CPrompt(
            vin=r.chassis_number,
            model=r.model_code or "Unknown",
            variant=r.variant_id or "Unknown",
            fuel_type=r.fuel_type,
            dealer_name=r.dealer_name,
            days_in_inventory=days,
            age_bucket=bucket,
            discount_estimate=discount,
            prompt=_b2c_prompt(
                r.chassis_number, r.model_code or "Unknown",
                r.variant_id or "Unknown", r.fuel_type or "N/A",
                r.dealer_name, days, discount
            ),
        ))
    return result


@app.get("/api/v1/genai/operational-alerts", response_model=List[models.OperationalAlert])
def get_operational_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    alerts = []

    # ── Stockout alerts ───────────────────────────────────────────────────────
    stockout_rows = db.execute(
        text("""
            SELECT
                dr.part_number, p.description,
                dr.dealer_id,
                SUM(dr.on_hand_qty) as on_hand,
                AVG(dr.reorder_point) as rop
            FROM demand_records dr
            JOIN parts p ON p.part_number = dr.part_number
            GROUP BY dr.part_number, p.description, dr.dealer_id
            HAVING on_hand < rop
            ORDER BY (rop - on_hand) DESC
            LIMIT :lim
        """),
        {"lim": limit // 2},
    ).fetchall()

    for r in stockout_rows:
        on_hand = int(r.on_hand or 0)
        rop     = int(r.rop or 0)
        gap     = rop - on_hand
        severity = "Critical" if on_hand == 0 else ("High" if gap > rop * 0.5 else "Medium")
        alerts.append(models.OperationalAlert(
            alert_type="stockout",
            severity=severity,
            subject=f"Stockout Alert — {r.description} at {r.dealer_id}",
            dealer_id=r.dealer_id,
            part_sku=str(r.part_number),
            part_name=r.description,
            shipment_id=None,
            delay_days=None,
            quantity_gap=gap,
            prompt=_stockout_prompt(
                str(r.part_number), r.description,
                r.dealer_id, on_hand, rop, gap
            ),
        ))

    # ── Transit delay alerts ──────────────────────────────────────────────────
    delay_rows = db.execute(
        text("""
            SELECT
                s.shipment_id, s.description,
                s.origin_city, s.destination_city,
                s.delay_days, s.carrier_name, s.dealer_id
            FROM shipments s
            WHERE s.delay_days > 0
            ORDER BY s.delay_days DESC
            LIMIT :lim
        """),
        {"lim": limit // 2},
    ).fetchall()

    for r in delay_rows:
        delay = float(r.delay_days or 0)
        severity = "Critical" if delay >= 5 else ("High" if delay >= 3 else "Medium")
        alerts.append(models.OperationalAlert(
            alert_type="transit_delay",
            severity=severity,
            subject=f"Transit Delay — {r.description or 'Shipment'} ({r.delay_days:.0f}d late)",
            dealer_id=r.dealer_id,
            part_sku=None,
            part_name=r.description,
            shipment_id=r.shipment_id,
            delay_days=delay,
            quantity_gap=None,
            prompt=_transit_delay_prompt(
                r.shipment_id,
                r.description or "Unknown Part",
                r.origin_city or "Origin",
                r.destination_city or "Destination",
                delay,
                r.carrier_name or "Unknown Carrier",
            ),
        ))

    # Sort by severity
    order = {"Critical": 0, "High": 1, "Medium": 2}
    alerts.sort(key=lambda x: order.get(x.severity, 3))
    return alerts[:limit]


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


# ── Week 3: Gemini-Powered Endpoints ─────────────────────────────────────────

import os
from dotenv import load_dotenv
load_dotenv()

import gemini_service


class GenerateB2BRequest(BaseModel):
    vin: str
    model: str
    variant: str
    fuel_type: Optional[str] = None
    source_dealer: str
    source_city: str
    target_dealer: str
    target_city: str
    days_in_inventory: int
    floorplan_cost: float
    transport_cost: float
    demand_score: float
    net_utility: float


class GenerateB2CRequest(BaseModel):
    model: str
    variant: str
    fuel_type: Optional[str] = None
    dealer_name: str
    dealer_city: str
    days_in_inventory: int
    discount_amount: float
    customer_name: Optional[str] = None


class GenerateAlertRequest(BaseModel):
    alert_type: str   # "stockout" | "transit_delay"
    part_name: str
    sku: Optional[str] = None
    dealer_id: Optional[str] = None
    qty_on_hand: Optional[int] = None
    reorder_point: Optional[int] = None
    quantity_gap: Optional[int] = None
    recommended_order_qty: Optional[int] = None
    shipment_id: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    carrier: Optional[str] = None
    delay_days: Optional[float] = None


@app.post("/api/v1/ai/generate-b2b", response_model=models.GeminiResponse)
def generate_b2b(req: GenerateB2BRequest):
    text_out = gemini_service.generate_b2b_message(
        vin=req.vin, model=req.model, variant=req.variant,
        fuel_type=req.fuel_type or "N/A",
        source_dealer=req.source_dealer, source_city=req.source_city,
        target_dealer=req.target_dealer, target_city=req.target_city,
        days_in_inventory=req.days_in_inventory,
        floorplan_cost=req.floorplan_cost, transport_cost=req.transport_cost,
        demand_score=req.demand_score, net_utility=req.net_utility,
    )
    return models.GeminiResponse(
        generated_text=text_out,
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        use_case="b2b_transfer",
    )


@app.post("/api/v1/ai/generate-b2c", response_model=models.GeminiResponse)
def generate_b2c(req: GenerateB2CRequest):
    text_out = gemini_service.generate_b2c_message(
        model=req.model, variant=req.variant,
        fuel_type=req.fuel_type or "N/A",
        dealer_name=req.dealer_name, dealer_city=req.dealer_city,
        days_in_inventory=req.days_in_inventory,
        discount_amount=req.discount_amount,
        customer_name=req.customer_name,
    )
    return models.GeminiResponse(
        generated_text=text_out,
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        use_case="b2c_outreach",
    )


@app.post("/api/v1/ai/generate-alert", response_model=models.GeminiResponse)
def generate_alert(req: GenerateAlertRequest):
    if req.alert_type == "stockout":
        text_out = gemini_service.generate_stockout_alert(
            part_name=req.part_name,
            sku=req.sku or "N/A",
            dealer_id=req.dealer_id or "N/A",
            qty_on_hand=req.qty_on_hand or 0,
            reorder_point=req.reorder_point or 0,
            quantity_gap=req.quantity_gap or 0,
            recommended_order_qty=req.recommended_order_qty or 10,
        )
    else:
        text_out = gemini_service.generate_transit_alert(
            shipment_id=req.shipment_id or "N/A",
            part_name=req.part_name,
            origin=req.origin or "Origin",
            destination=req.destination or "Destination",
            carrier=req.carrier or "Unknown Carrier",
            delay_days=req.delay_days or 0,
            dealer_id=req.dealer_id,
        )
    return models.GeminiResponse(
        generated_text=text_out,
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        use_case=req.alert_type,
    )


# ── Week 3: Guided Assistant ──────────────────────────────────────────────────

# In-memory approval store (resets on server restart — POC only)
_approval_store: dict = {}


@app.get("/api/v1/guided/recommendations", response_model=List[models.GuidedRecommendation])
def get_guided_recommendations(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    recs = []

    # Transfer recommendations
    aging_rows = db.execute(
        text("""
            SELECT v.chassis_number, v.model_code, v.variant_id, v.fuel_type,
                   j.dealer_id, d.dealer_name, d.city,
                   CAST(MAX(julianday('now') - julianday(j.date_in)) AS INTEGER) AS days
            FROM vehicles v
            JOIN job_cards j ON j.chassis_number = v.chassis_number
            JOIN dealers d ON d.dealer_id = j.dealer_id
            GROUP BY v.chassis_number, v.model_code, v.variant_id,
                     v.fuel_type, j.dealer_id, d.dealer_name, d.city
            HAVING days >= 60
            ORDER BY days DESC
            LIMIT 10
        """)
    ).fetchall()

    all_dealers = db.query(models.Dealer).all()
    for r in aging_rows:
        rec_id = f"transfer_{r.chassis_number}"
        fp_cost = _floorplan_cost(r.days, AVG_INVOICE_VALUE)
        best = max(
            all_dealers,
            key=lambda d: _demand_score_for_variant(r.variant_id or "", d.dealer_id, db)
            if d.dealer_id != r.dealer_id else -1
        )
        priority = "Critical" if r.days >= 90 else "High"
        recs.append(models.GuidedRecommendation(
            id=rec_id,
            rec_type="transfer",
            priority=priority,
            title=f"Transfer {r.model_code} {r.variant_id} → {best.dealer_name}",
            summary=f"{r.days} days at {r.dealer_name}. Floorplan cost: ₹{fp_cost:,.0f}. "
                    f"Best target: {best.dealer_name} ({best.city}).",
            status=_approval_store.get(rec_id, {}).get("status", "Pending"),
            data={
                "vin": r.chassis_number, "model": r.model_code, "variant": r.variant_id,
                "fuel_type": r.fuel_type, "source_dealer": r.dealer_name,
                "source_city": r.city, "target_dealer": best.dealer_name,
                "target_city": best.city, "days_in_inventory": r.days,
                "floorplan_cost": fp_cost, "transport_cost": 6000.0,
                "demand_score": _demand_score_for_variant(r.variant_id or "", best.dealer_id, db),
                "net_utility": fp_cost - 6000.0,
            },
            generated_message=_approval_store.get(rec_id, {}).get("message"),
        ))

    # Stockout reorder recommendations
    stockout_rows = db.execute(
        text("""
            SELECT dr.part_number, p.description, dr.dealer_id,
                   SUM(dr.on_hand_qty) as on_hand, AVG(dr.reorder_point) as rop
            FROM demand_records dr
            JOIN parts p ON p.part_number = dr.part_number
            GROUP BY dr.part_number, p.description, dr.dealer_id
            HAVING on_hand < rop
            ORDER BY (rop - on_hand) DESC
            LIMIT 10
        """)
    ).fetchall()

    for r in stockout_rows:
        rec_id = f"reorder_{r.part_number}_{r.dealer_id}"
        on_hand = int(r.on_hand or 0)
        rop = int(r.rop or 0)
        gap = rop - on_hand
        priority = "Critical" if on_hand == 0 else "High"
        recs.append(models.GuidedRecommendation(
            id=rec_id,
            rec_type="stockout",
            priority=priority,
            title=f"Reorder {r.description} at {r.dealer_id}",
            summary=f"Stock: {on_hand} units. ROP: {rop}. Shortfall: {gap} units.",
            status=_approval_store.get(rec_id, {}).get("status", "Pending"),
            data={
                "part_name": r.description, "sku": str(r.part_number),
                "dealer_id": r.dealer_id, "qty_on_hand": on_hand,
                "reorder_point": rop, "quantity_gap": gap,
                "recommended_order_qty": max(rop * 2, 10),
                "alert_type": "stockout",
            },
            generated_message=_approval_store.get(rec_id, {}).get("message"),
        ))

    # Sort by priority
    order = {"Critical": 0, "High": 1, "Medium": 2}
    recs.sort(key=lambda x: order.get(x.priority, 3))
    return recs[:limit]


@app.post("/api/v1/guided/approve/{rec_id}")
def approve_recommendation(rec_id: str, message: Optional[str] = None):
    _approval_store[rec_id] = {"status": "Approved", "message": message}
    return {"status": "Approved", "rec_id": rec_id}


@app.post("/api/v1/guided/reject/{rec_id}")
def reject_recommendation(rec_id: str, reason: Optional[str] = None):
    _approval_store[rec_id] = {"status": "Rejected", "reason": reason}
    return {"status": "Rejected", "rec_id": rec_id}


# ── Week 3: ROI Report ────────────────────────────────────────────────────────

@app.get("/api/v1/roi/report", response_model=models.ROIReport)
def get_roi_report(db: Session = Depends(get_db)):
    import pandas as pd

    # Baseline: aging vehicles count and floorplan cost
    aging_rows = db.execute(
        text("""
            SELECT CAST(MAX(julianday('now') - julianday(j.date_in)) AS INTEGER) AS days
            FROM vehicles v
            JOIN job_cards j ON j.chassis_number = v.chassis_number
            GROUP BY v.chassis_number
            HAVING days > 60
        """)
    ).fetchall()

    baseline_aging = len(aging_rows)
    baseline_avg_days = round(sum(r.days for r in aging_rows) / max(baseline_aging, 1), 1)
    baseline_floorplan = sum(_floorplan_cost(r.days, AVG_INVOICE_VALUE) for r in aging_rows)

    # AI scenario: assume transfer reduces avg days by 35%
    ai_avg_days = round(baseline_avg_days * 0.65, 1)
    ai_floorplan = sum(
        _floorplan_cost(int(r.days * 0.65), AVG_INVOICE_VALUE) for r in aging_rows
    )
    floorplan_saved = baseline_floorplan - ai_floorplan

    # Stockout baseline
    stockout_rows = db.execute(
        text("""
            SELECT COUNT(*) as cnt FROM (
                SELECT dr.part_number, dr.dealer_id
                FROM demand_records dr
                GROUP BY dr.part_number, dr.dealer_id
                HAVING SUM(dr.on_hand_qty) < AVG(dr.reorder_point)
            )
        """)
    ).fetchone()
    baseline_stockouts = int(stockout_rows.cnt or 0)
    ai_stockouts = int(baseline_stockouts * 0.6)  # 40% reduction with AI reorder alerts

    # Transfer recommendations count
    transfer_count = len([r for r in aging_rows if r.days >= 60])

    metrics = [
        models.ROIMetric(
            metric="Average Days in Inventory",
            baseline_value=baseline_avg_days,
            ai_value=ai_avg_days,
            improvement=round(baseline_avg_days - ai_avg_days, 1),
            improvement_pct=round((baseline_avg_days - ai_avg_days) / max(baseline_avg_days, 1) * 100, 1),
            unit="days",
        ),
        models.ROIMetric(
            metric="Total Floorplan Interest Cost",
            baseline_value=round(baseline_floorplan, 0),
            ai_value=round(ai_floorplan, 0),
            improvement=round(floorplan_saved, 0),
            improvement_pct=round(floorplan_saved / max(baseline_floorplan, 1) * 100, 1),
            unit="₹",
        ),
        models.ROIMetric(
            metric="Parts Stockout Incidents",
            baseline_value=baseline_stockouts,
            ai_value=ai_stockouts,
            improvement=baseline_stockouts - ai_stockouts,
            improvement_pct=round((baseline_stockouts - ai_stockouts) / max(baseline_stockouts, 1) * 100, 1),
            unit="incidents",
        ),
        models.ROIMetric(
            metric="Vehicles Recommended for Transfer",
            baseline_value=0,
            ai_value=transfer_count,
            improvement=transfer_count,
            improvement_pct=100.0,
            unit="vehicles",
        ),
    ]

    return models.ROIReport(
        generated_at=pd.Timestamp.now().isoformat(),
        total_floorplan_saved=round(floorplan_saved, 0),
        vehicles_recommended_for_transfer=transfer_count,
        avg_days_reduction=round(baseline_avg_days - ai_avg_days, 1),
        stockout_alerts_raised=baseline_stockouts,
        metrics=metrics,
        summary=(
            f"AI Copilot identified {transfer_count} vehicles for transfer, "
            f"projected to save ₹{floorplan_saved:,.0f} in floorplan interest "
            f"by reducing average inventory days from {baseline_avg_days} to {ai_avg_days}. "
            f"Stockout incidents projected to drop by 40% through proactive reorder alerts."
        ),
    )


# ── Distance Lookup Endpoint ─────────────────────────────────────────────────

@app.get("/api/v1/distance")
def get_distance(origin: str, destination: str, db: Session = Depends(get_db)):
    """Return real road distance and transport cost between two cities."""
    km = get_distance_km(origin, destination, db)
    cost = get_transport_cost(origin, destination, db)
    return {
        "origin": origin,
        "destination": destination,
        "distance_km": km,
        "transport_cost_inr": cost,
        "rate_per_km": 12,
    }


@app.get("/api/v1/distance/all-cities")
def get_all_cities(db: Session = Depends(get_db)):
    """Return all cities that have distance data."""
    rows = db.execute(text("""
        SELECT DISTINCT origin_city FROM routes
        WHERE route_type = 'city_pair' AND origin_city IS NOT NULL
        ORDER BY origin_city
    """)).fetchall()
    return {"cities": [r.origin_city for r in rows]}


# ── Vehicle Sales Endpoints ───────────────────────────────────────────────────

@app.get("/api/v1/sales/summary")
def get_sales_summary(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(*)                          AS total_sales,
            ROUND(AVG(days_to_sell), 1)       AS avg_days_to_sell,
            ROUND(SUM(final_sale_price_inr))  AS total_revenue,
            ROUND(AVG(discount_given_inr), 0) AS avg_discount,
            SUM(exchange_vehicle)             AS exchange_count,
            SUM(finance_taken)                AS finance_count,
            SUM(festive_sale)                 AS festive_count
        FROM vehicle_sales
    """)).fetchone()

    unsold = db.execute(text("""
        SELECT COUNT(*) FROM vehicles v
        WHERE NOT EXISTS (
            SELECT 1 FROM vehicle_sales s WHERE s.chassis_number = v.chassis_number
        )
    """)).fetchone()[0]

    return {
        "total_sales": row.total_sales,
        "total_unsold": unsold,
        "sell_through_pct": round(row.total_sales / (row.total_sales + unsold) * 100, 1),
        "avg_days_to_sell": row.avg_days_to_sell,
        "total_revenue_inr": row.total_revenue,
        "avg_discount_inr": row.avg_discount,
        "exchange_count": row.exchange_count,
        "finance_count": row.finance_count,
        "festive_count": row.festive_count,
    }


@app.get("/api/v1/sales", response_model=List[models.VehicleSaleResponse])
def get_sales(
    dealer_id: Optional[str] = None,
    zone: Optional[str] = None,
    model: Optional[str] = None,
    variant_id: Optional[str] = None,
    fuel_type: Optional[str] = None,
    sale_channel: Optional[str] = None,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    festive_only: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    conditions = ["1=1"]
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if dealer_id:
        conditions.append("UPPER(dealer_id) = UPPER(:dealer_id)")
        params["dealer_id"] = dealer_id.strip()
    if zone:
        conditions.append("zone = :zone")
        params["zone"] = zone.strip()
    if model:
        conditions.append("model_code = :model")
        params["model"] = model.strip()
    if variant_id:
        conditions.append("variant_id = :variant_id")
        params["variant_id"] = variant_id.strip()
    if fuel_type:
        conditions.append("fuel_type = :fuel_type")
        params["fuel_type"] = fuel_type.strip()
    if sale_channel:
        conditions.append("sale_channel = :sale_channel")
        params["sale_channel"] = sale_channel.strip()
    if month:
        conditions.append("month = :month")
        params["month"] = month
    if quarter:
        conditions.append("quarter = :quarter")
        params["quarter"] = quarter
    if festive_only:
        conditions.append("festive_sale = 1")

    where = " AND ".join(conditions)
    rows = db.execute(text(f"""
        SELECT sale_id, chassis_number, dealer_id, dealer_name, model_code,
               variant_id, fuel_type, sale_date, days_to_sell,
               invoice_value_inr, discount_given_inr, final_sale_price_inr,
               exchange_vehicle, finance_taken, payment_mode, sale_channel,
               zone, festive_sale, month, quarter
        FROM vehicle_sales
        WHERE {where}
        ORDER BY sale_date DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    return [
        models.VehicleSaleResponse(
            sale_id=r.sale_id,
            chassis_number=r.chassis_number,
            dealer_id=r.dealer_id,
            dealer_name=r.dealer_name,
            model_code=r.model_code,
            variant_id=r.variant_id,
            fuel_type=r.fuel_type,
            sale_date=r.sale_date,
            days_to_sell=r.days_to_sell,
            invoice_value_inr=r.invoice_value_inr,
            discount_given_inr=r.discount_given_inr,
            final_sale_price_inr=r.final_sale_price_inr,
            exchange_vehicle=r.exchange_vehicle,
            finance_taken=r.finance_taken,
            payment_mode=r.payment_mode,
            sale_channel=r.sale_channel,
            zone=r.zone,
            festive_sale=r.festive_sale,
            month=r.month,
            quarter=r.quarter,
        )
        for r in rows
    ]


@app.get("/api/v1/sales/monthly-trend")
def get_sales_monthly_trend(
    dealer_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    params = {}
    dealer_filter = ""
    if dealer_id:
        dealer_filter = "WHERE UPPER(dealer_id) = UPPER(:dealer_id)"
        params["dealer_id"] = dealer_id.strip()

    rows = db.execute(text(f"""
        SELECT
            month,
            COUNT(*)                         AS units_sold,
            ROUND(SUM(final_sale_price_inr)) AS revenue,
            ROUND(AVG(days_to_sell), 1)      AS avg_days_to_sell,
            ROUND(AVG(discount_given_inr))   AS avg_discount
        FROM vehicle_sales
        {dealer_filter}
        GROUP BY month
        ORDER BY month
    """), params).fetchall()

    return [
        {
            "month": r.month,
            "units_sold": r.units_sold,
            "revenue": r.revenue,
            "avg_days_to_sell": r.avg_days_to_sell,
            "avg_discount": r.avg_discount,
        }
        for r in rows
    ]


@app.get("/api/v1/sales/by-model")
def get_sales_by_model(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            model_code,
            COUNT(*)                         AS units_sold,
            ROUND(AVG(days_to_sell), 1)      AS avg_days_to_sell,
            ROUND(SUM(final_sale_price_inr)) AS total_revenue,
            ROUND(AVG(discount_given_inr))   AS avg_discount
        FROM vehicle_sales
        GROUP BY model_code
        ORDER BY units_sold DESC
    """)).fetchall()

    return [
        {
            "model": r.model_code,
            "units_sold": r.units_sold,
            "avg_days_to_sell": r.avg_days_to_sell,
            "total_revenue": r.total_revenue,
            "avg_discount": r.avg_discount,
        }
        for r in rows
    ]
