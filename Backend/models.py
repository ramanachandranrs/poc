from datetime import date
from typing import Optional, List

from pydantic import BaseModel
import os
from sqlalchemy import Date, Float, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///dealer_network.db")
engine = create_engine(DATABASE_URL, echo=False)


class Base(DeclarativeBase):
    pass


class Dealer(Base):
    __tablename__ = "dealers"
    dealer_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    dealer_name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(80))
    dealer_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    zone: Mapped[str] = mapped_column(String(30), index=True)


class Warehouse(Base):
    __tablename__ = "warehouses"
    warehouse_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    warehouse_type: Mapped[str] = mapped_column(String(30))
    parent_warehouse_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("warehouses.warehouse_id"), nullable=True
    )
    zone: Mapped[str] = mapped_column(String(30), index=True)
    city: Mapped[str] = mapped_column(String(80))


class Part(Base):
    __tablename__ = "parts"
    part_number: Mapped[str] = mapped_column(String(40), primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String(160))
    inventory_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    category_group: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    unit_of_measurement: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    mrp_base: Mapped[float] = mapped_column(Float)
    critical_flag: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer)
    min_order_qty: Mapped[int] = mapped_column(Integer)


class Customer(Base):
    __tablename__ = "customers"
    customer_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    contact: Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    ownership_history: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class Vehicle(Base):
    __tablename__ = "vehicles"
    chassis_number: Mapped[str] = mapped_column(String(40), primary_key=True, index=True)
    engine_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("customers.customer_id"), nullable=True, index=True
    )
    model_code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    variant_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    fuel_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    transmission_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    model_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stock_arrival_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    dealer_id: Mapped[Optional[str]] = mapped_column(ForeignKey("dealers.dealer_id"), nullable=True, index=True)


class JobCard(Base):
    __tablename__ = "job_cards"
    job_card_number: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    date_in: Mapped[date] = mapped_column(Date, index=True)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    chassis_number: Mapped[Optional[str]] = mapped_column(
        ForeignKey("vehicles.chassis_number"), nullable=True, index=True
    )
    customer_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("customers.customer_id"), nullable=True, index=True
    )
    service_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    odometer_reading: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    visit_reason: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)


class JobCardLineItem(Base):
    __tablename__ = "job_card_line_items"
    line_item_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    job_card_number: Mapped[str] = mapped_column(
        ForeignKey("job_cards.job_card_number"), index=True
    )
    part_number: Mapped[str] = mapped_column(ForeignKey("parts.part_number"), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    inventory_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    quantity_consumed: Mapped[float] = mapped_column(Float, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    billed_amount: Mapped[float] = mapped_column(Float, default=0)
    tax_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class SOQTransaction(Base):
    __tablename__ = "soq_transactions"
    transaction_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    warehouse_id: Mapped[str] = mapped_column(ForeignKey("warehouses.warehouse_id"), index=True)
    part_number: Mapped[str] = mapped_column(ForeignKey("parts.part_number"), index=True)
    system_suggested_qty: Mapped[int] = mapped_column(Integer, default=0)
    manager_modified_qty: Mapped[int] = mapped_column(Integer, default=0)
    fulfillment_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    priority_flag: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)


class DemandRecord(Base):
    __tablename__ = "demand_records"
    demand_id: Mapped[str] = mapped_column(String(24), primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    day: Mapped[int] = mapped_column(Integer)
    day_of_week: Mapped[int] = mapped_column(Integer)
    week_of_year: Mapped[int] = mapped_column(Integer)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    dealer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    zone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    warehouse_id: Mapped[str] = mapped_column(ForeignKey("warehouses.warehouse_id"), index=True)
    part_number: Mapped[str] = mapped_column(ForeignKey("parts.part_number"), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    inventory_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    category_group: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    unit_of_measurement: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    vehicle_model: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    variant_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    fuel_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    promotion_flag: Mapped[int] = mapped_column(Integer, default=0)
    recall_flag: Mapped[int] = mapped_column(Integer, default=0)
    new_vehicle_flag: Mapped[int] = mapped_column(Integer, default=0)
    demand_qty: Mapped[int] = mapped_column(Integer, default=0)
    on_hand_qty: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, default=0)
    min_order_qty: Mapped[int] = mapped_column(Integer, default=0)
    soq_suggested_qty: Mapped[int] = mapped_column(Integer, default=0)
    manager_modified_qty: Mapped[int] = mapped_column(Integer, default=0)
    fulfillment_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    sales_value: Mapped[float] = mapped_column(Float, default=0)
    stockout_flag: Mapped[int] = mapped_column(Integer, default=0)


class DailyTrend(Base):
    __tablename__ = "daily_trends"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    inventory_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    total_demand_qty: Mapped[int] = mapped_column(Integer, default=0)
    avg_unit_price: Mapped[float] = mapped_column(Float, default=0)
    total_sales_value: Mapped[float] = mapped_column(Float, default=0)
    stockout_count: Mapped[int] = mapped_column(Integer, default=0)


class Route(Base):
    __tablename__ = "routes"
    route_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    route_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    origin_id: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)
    origin_city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    destination_id: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)
    destination_city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    primary_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    std_transit_days_rail: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    std_transit_days_road: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    std_transit_days_air: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    base_freight_rail: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    base_freight_road: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    base_freight_air: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    active: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)


class Carrier(Base):
    __tablename__ = "carriers"
    carrier_code: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    carrier_name: Mapped[str] = mapped_column(String(120))
    mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    coverage_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    service_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    parent_group: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    geographic_coverage: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    price_range: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    transit_days_range: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    on_time_pct: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    suitable_for: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)


class Shipment(Base):
    __tablename__ = "shipments"
    shipment_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    leg: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    po_reference: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    part_number: Mapped[Optional[str]] = mapped_column(
        ForeignKey("parts.part_number"), nullable=True, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    category_group: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    qty_shipped: Mapped[float] = mapped_column(Float, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    shipment_value: Mapped[float] = mapped_column(Float, default=0)
    origin_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    origin_id: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)
    origin_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    origin_city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    destination_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    destination_id: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)
    destination_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    destination_city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    dealer_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("dealers.dealer_id"), nullable=True, index=True
    )
    zone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    transport_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    carrier_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    carrier_code: Mapped[Optional[str]] = mapped_column(
        ForeignKey("carriers.carrier_code"), nullable=True, index=True
    )
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    freight_cost_inr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dispatch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    expected_arrival: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    actual_arrival: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    transit_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delay_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    emergency_flag: Mapped[int] = mapped_column(Integer, default=0)
    critical_part: Mapped[int] = mapped_column(Integer, default=0)
    demand_date_ref: Mapped[Optional[date]] = mapped_column(Date, nullable=True)


class VehicleSale(Base):
    __tablename__ = "vehicle_sales"
    sale_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    chassis_number: Mapped[str] = mapped_column(ForeignKey("vehicles.chassis_number"), index=True)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    dealer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(ForeignKey("customers.customer_id"), nullable=True, index=True)
    model_code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    variant_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    fuel_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    transmission_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sale_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    stock_arrival_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    days_to_sell: Mapped[int] = mapped_column(Integer, default=0)
    invoice_value_inr: Mapped[float] = mapped_column(Float, default=0)
    discount_given_inr: Mapped[float] = mapped_column(Float, default=0)
    final_sale_price_inr: Mapped[float] = mapped_column(Float, default=0)
    exchange_vehicle: Mapped[int] = mapped_column(Integer, default=0)
    finance_taken: Mapped[int] = mapped_column(Integer, default=0)
    insurance_bundled: Mapped[int] = mapped_column(Integer, default=0)
    accessories_value_inr: Mapped[float] = mapped_column(Float, default=0)
    sales_executive_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sale_channel: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    zone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    dealer_type: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    festive_sale: Mapped[int] = mapped_column(Integer, default=0)
    promotion_active: Mapped[int] = mapped_column(Integer, default=0)
    month: Mapped[int] = mapped_column(Integer, default=0)
    quarter: Mapped[int] = mapped_column(Integer, default=0)
    year: Mapped[int] = mapped_column(Integer, default=2025)


class Booking(Base):
    __tablename__ = "bookings"
    booking_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.dealer_id"), index=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.customer_id"), index=True)
    requested_model: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    requested_variant: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    date_booked: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class VehicleSaleResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    sale_id: str
    chassis_number: str
    dealer_id: str
    dealer_name: Optional[str]
    model_code: Optional[str]
    variant_id: Optional[str]
    fuel_type: Optional[str]
    sale_date: Optional[date]
    days_to_sell: int
    invoice_value_inr: float
    discount_given_inr: float
    final_sale_price_inr: float
    exchange_vehicle: int
    finance_taken: int
    payment_mode: Optional[str]
    sale_channel: Optional[str]
    zone: Optional[str]
    festive_sale: int
    month: int
    quarter: int


class CustomerResponse(BaseModel):
    customer_id: str
    name: str
    contact: Optional[str]
    city: Optional[str]
    state: Optional[str]
    ownership_history: Optional[str]


class PaginatedCustomerResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[CustomerResponse]




class InventoryResponse(BaseModel):
    vin: str
    dealer_id: str
    dealer_name: str
    model: str
    variant: str
    fuel_type: Optional[str]
    days_in_inventory: int
    status: str

class PaginatedInventoryResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[InventoryResponse]


class PartsResponse(BaseModel):
    sku: str
    part_name: str
    category: Optional[str]
    quantity_on_hand: int
    reorder_point: int
    unit_cost: float
    stockout_rate: float


class PaginatedPartsResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[PartsResponse]


class TransitResponse(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    status: str
    expected_delivery: Optional[str]
    carrier: str
    items: float
    delay_days: float

class PaginatedTransitResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[TransitResponse]


class TrendResponse(BaseModel):
    month: str
    inventory: float
    demand: float


class JobCardInsight(BaseModel):
    job_card_number: str
    dealer_id: str
    service_type: Optional[str]
    date_in: date
    total_amount: float


# ── Aging Stock Models ────────────────────────────────────────────────────────

class AgingVehicle(BaseModel):
    vin: str
    model: str
    variant: str
    fuel_type: Optional[str]
    source_dealer_id: str
    source_dealer_name: str
    source_city: str
    days_in_inventory: int
    age_bucket: str          # Fresh / Watch / Aging / Critical
    invoice_value: float
    daily_floorplan_cost: float
    total_floorplan_cost: float


class TransferRecommendation(BaseModel):
    vin: str
    model: str
    variant: str
    fuel_type: Optional[str]
    source_dealer_id: str
    source_dealer_name: str
    source_city: str
    target_dealer_id: str
    target_dealer_name: str
    target_city: str
    days_in_inventory: int
    age_bucket: str
    invoice_value: float
    total_floorplan_cost: float
    transport_cost: float
    demand_score: float
    net_utility_score: float
    recommendation: str      # Transfer / Discount / Hold
    ai_prompt: str


class AgingSummary(BaseModel):
    total_aging: int
    critical_count: int
    aging_count: int
    watch_count: int
    total_floorplan_burn: float
    top_aging_model: str
    avg_days_aging: float


# ── GenAI Prompt Models ───────────────────────────────────────────────────────

class B2CPrompt(BaseModel):
    vin: str
    model: str
    variant: str
    fuel_type: Optional[str]
    dealer_name: str
    days_in_inventory: int
    age_bucket: str
    discount_estimate: float
    prompt: str


class OperationalAlert(BaseModel):
    alert_type: str          # "stockout" | "transit_delay"
    severity: str            # "Critical" | "High" | "Medium"
    subject: str
    dealer_id: Optional[str]
    part_sku: Optional[str]
    part_name: Optional[str]
    shipment_id: Optional[str]
    delay_days: Optional[float]
    quantity_gap: Optional[int]
    prompt: str


# ── Week 3 Models ─────────────────────────────────────────────────────────────

class GeminiRequest(BaseModel):
    context: dict


class GeminiResponse(BaseModel):
    generated_text: str
    model: str
    use_case: str


class GuidedRecommendation(BaseModel):
    id: str
    rec_type: str            # "transfer" | "reorder" | "stockout" | "transit_delay"
    priority: str            # "Critical" | "High" | "Medium"
    title: str
    summary: str
    status: str              # "Pending" | "Approved" | "Rejected"
    data: dict               # raw data for Gemini generation
    generated_message: Optional[str]


class ROIMetric(BaseModel):
    metric: str
    baseline_value: float
    ai_value: float
    improvement: float
    improvement_pct: float
    unit: str


class ROIReport(BaseModel):
    generated_at: str
    total_floorplan_saved: float
    vehicles_recommended_for_transfer: int
    avg_days_reduction: float
    stockout_alerts_raised: int
    metrics: List[ROIMetric]
    summary: str


# ── Demand Forecast Models ────────────────────────────────────────────────────

class DailyForecastPoint(BaseModel):
    date: str
    forecast: float


class DealerVariantForecast(BaseModel):
    model_config = {"protected_namespaces": ()}
    dealer_id: str
    dealer_name: str
    variant_id: str
    total_30d: float
    model_mape: float
    daily: List[DailyForecastPoint]


class ForecastSummary(BaseModel):
    model_config = {"protected_namespaces": ()}
    generated_at: str
    forecast_horizon: int
    total_dealer_variant_combos: int
    data_source: Optional[str]
    top_pairs: List[dict]
    variant_totals: List[dict]
    model_metrics: dict
    all_dealers: List[dict] = []

import enum
from sqlalchemy import Enum as SQLEnum

class UserRole(str, enum.Enum):
    ADMIN = "mother_warehouse"
    MANAGER = "regional_distributor"
    USER = "dealership"

class AppUser(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.USER)
    
    zone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    dealer_id: Mapped[Optional[str]] = mapped_column(ForeignKey("dealers.dealer_id"), nullable=True)



if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Database tables created successfully.")
