from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from pathlib import Path

import models

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
    row = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) <= 60 THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) > 60 THEN 1 ELSE 0 END) as aging,
            SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) > 90 THEN 1 ELSE 0 END) as critical
        FROM vehicles
        WHERE stock_arrival_date IS NOT NULL AND dealer_id IS NOT NULL
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
    conditions = ["v.stock_arrival_date IS NOT NULL", "v.dealer_id IS NOT NULL"]
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
               status, expected_arrival, carrier_name, qty_shipped, delay_days
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
        top_pairs=[
            {
                "dealer_id": r["dealer_id"],
                "dealer_name": r["dealer_name"],
                "variant_id": r["variant_id"],
                "total_30d": r["total_30d"],
                "model_mape": r["model_mape"],
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
    rows = db.execute(
        text("""
            SELECT
                v.chassis_number,
                v.model_code,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            WHERE v.stock_arrival_date IS NOT NULL
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
                j.dealer_id,
                d.dealer_name,
                d.city,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            JOIN (
                SELECT chassis_number, dealer_id
                FROM job_cards
                WHERE (chassis_number, date_in) IN (
                    SELECT chassis_number, MAX(date_in)
                    FROM job_cards
                    GROUP BY chassis_number
                )
            ) j ON j.chassis_number = v.chassis_number
            JOIN dealers d ON d.dealer_id = j.dealer_id
            WHERE v.stock_arrival_date IS NOT NULL
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
    # Get aging vehicles
    aging_rows = db.execute(
        text("""
            SELECT
                v.chassis_number, v.model_code, v.variant_id, v.fuel_type,
                j.dealer_id, d.dealer_name, d.city,
                CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) AS days
            FROM vehicles v
            JOIN (
                SELECT chassis_number, dealer_id
                FROM job_cards
                WHERE (chassis_number, date_in) IN (
                    SELECT chassis_number, MAX(date_in)
                    FROM job_cards
                    GROUP BY chassis_number
                )
            ) j ON j.chassis_number = v.chassis_number
            JOIN dealers d ON d.dealer_id = j.dealer_id
            WHERE v.stock_arrival_date IS NOT NULL
            AND CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) >= :min_days
            ORDER BY days DESC
            LIMIT :lim
        """),
        {"min_days": min_days, "lim": limit},
    ).fetchall()

    # Get all dealers for target matching
    all_dealers = db.query(models.Dealer).all()
    dealer_map = {d.dealer_id: d for d in all_dealers}

    # Get routes for transport cost
    routes = db.query(models.Route).all()
    route_map = {}
    for r in routes:
        key = (r.origin_city or "", r.destination_city or "")
        route_map[key] = r.distance_km or 500

    recommendations = []
    for r in aging_rows:
        total_fp = _floorplan_cost(r.days, AVG_INVOICE_VALUE)

        # Find best target dealer (different from source, highest demand for variant)
        best_target = None
        best_utility = -999_999
        best_transport = 0
        best_demand = 0

        for d in all_dealers:
            if d.dealer_id == r.dealer_id:
                continue
            dist = route_map.get((r.city, d.city), 500)
            transport = _transport_cost(dist)
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
