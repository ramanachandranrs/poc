from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from models import (
    Base,
    Carrier,
    Customer,
    DailyTrend,
    Dealer,
    DemandRecord,
    JobCard,
    JobCardLineItem,
    Part,
    Route,
    SOQTransaction,
    Shipment,
    Vehicle,
    Warehouse,
    engine,
)

DATA_DIR = Path(__file__).parent / "data"
LOGISTICS_FILE = DATA_DIR / "logistics_data.xlsx"


def clean_str(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    txt = str(value).strip()
    return txt if txt else None


def clean_id(value: Any) -> str | None:
    txt = clean_str(value)
    return txt.upper() if txt else None


def to_int(value: Any, default: int = 0) -> int:
    if value is None or pd.isna(value) or str(value).strip() == "":
        return default
    return int(float(value))


def to_float(value: Any, default: float = 0.0, digits: int = 2) -> float:
    if value is None or pd.isna(value) or str(value).strip() == "":
        return default
    return round(float(value), digits)


def to_date(value: Any):
    if value is None or pd.isna(value) or str(value).strip() == "":
        return None
    return pd.to_datetime(value, errors="coerce").date()


def read_csv(name: str) -> pd.DataFrame:
    path = DATA_DIR / name
    return pd.read_csv(path)


def read_xlsx_table(sheet_name: str) -> pd.DataFrame:
    raw = pd.read_excel(LOGISTICS_FILE, sheet_name=sheet_name, header=None)
    header_row = raw.iloc[1].tolist()
    data = raw.iloc[2:].copy()
    data.columns = header_row
    data = data.dropna(how="all")
    data = data.dropna(axis=1, how="all")
    return data


def load_data():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    quality = {"duplicate_pk": [], "orphan_fk": [], "invalid_type": []}

    with Session(engine) as session:
        # Masters first
        dealers_df = read_csv("dealer_master.csv")
        dealer_ids = set()
        for row in dealers_df.to_dict(orient="records"):
            dealer_id = clean_id(row.get("Dealer_ID"))
            if not dealer_id:
                quality["invalid_type"].append("dealers:missing_dealer_id")
                continue
            if dealer_id in dealer_ids:
                quality["duplicate_pk"].append(f"dealers:{dealer_id}")
                continue
            dealer_ids.add(dealer_id)
            session.add(
                Dealer(
                    dealer_id=dealer_id,
                    dealer_name=clean_str(row.get("Dealer_Name")) or dealer_id,
                    city=clean_str(row.get("City")) or "Unknown",
                    state=clean_str(row.get("State")) or "Unknown",
                    dealer_type=clean_str(row.get("Dealer_Type")),
                    zone=clean_str(row.get("Zone")) or "Unknown",
                )
            )

        warehouses_df = read_csv("warehouse_master.csv")
        warehouse_ids = set()
        for row in warehouses_df.to_dict(orient="records"):
            warehouse_id = clean_id(row.get("Warehouse_ID"))
            if not warehouse_id:
                quality["invalid_type"].append("warehouses:missing_warehouse_id")
                continue
            if warehouse_id in warehouse_ids:
                quality["duplicate_pk"].append(f"warehouses:{warehouse_id}")
                continue
            warehouse_ids.add(warehouse_id)
            session.add(
                Warehouse(
                    warehouse_id=warehouse_id,
                    warehouse_type=clean_str(row.get("Warehouse_Type")) or "Unknown",
                    parent_warehouse_id=clean_id(row.get("Parent_Warehouse_ID")),
                    zone=clean_str(row.get("Zone")) or "Unknown",
                    city=clean_str(row.get("City")) or "Unknown",
                )
            )

        parts_df = read_csv("dealer_part_master.csv")
        part_ids = set()
        for row in parts_df.to_dict(orient="records"):
            part_number = clean_id(row.get("Part_Number"))
            if not part_number:
                quality["invalid_type"].append("parts:missing_part_number")
                continue
            if part_number in part_ids:
                quality["duplicate_pk"].append(f"parts:{part_number}")
                continue
            part_ids.add(part_number)
            session.add(
                Part(
                    part_number=part_number,
                    description=clean_str(row.get("Description")) or part_number,
                    inventory_level=clean_str(row.get("Inventory_Level")),
                    category_group=clean_str(row.get("Category_Group")),
                    unit_of_measurement=clean_str(row.get("Unit_Of_Measurement")),
                    mrp_base=to_float(row.get("MRP_Base")),
                    critical_flag=to_int(row.get("Critical_Flag")),
                    reorder_point=to_int(row.get("Reorder_Point")),
                    min_order_qty=to_int(row.get("Min_Order_Qty")),
                )
            )

        customers_df = read_csv("customer_master.csv")
        customer_ids = set()
        for row in customers_df.to_dict(orient="records"):
            customer_id = clean_id(row.get("Customer_ID"))
            if not customer_id:
                quality["invalid_type"].append("customers:missing_customer_id")
                continue
            if customer_id in customer_ids:
                quality["duplicate_pk"].append(f"customers:{customer_id}")
                continue
            customer_ids.add(customer_id)
            session.add(
                Customer(
                    customer_id=customer_id,
                    name=clean_str(row.get("Name")) or customer_id,
                    contact=clean_str(row.get("Contact")),
                    city=clean_str(row.get("City")),
                    state=clean_str(row.get("State")),
                    ownership_history=clean_str(row.get("Ownership_History")),
                )
            )

        vehicles_df = read_csv("vehicle_master.csv")
        vehicle_ids = set()
        for row in vehicles_df.to_dict(orient="records"):
            chassis = clean_id(row.get("Chassis_Number"))
            customer_id = clean_id(row.get("Customer_ID"))
            if not chassis:
                quality["invalid_type"].append("vehicles:missing_chassis")
                continue
            if chassis in vehicle_ids:
                quality["duplicate_pk"].append(f"vehicles:{chassis}")
                continue
            if customer_id and customer_id not in customer_ids:
                quality["orphan_fk"].append(f"vehicles.customer_id:{customer_id}")
                customer_id = None
            vehicle_ids.add(chassis)
            session.add(
                Vehicle(
                    chassis_number=chassis,
                    engine_number=clean_id(row.get("Engine_Number")),
                    customer_id=customer_id,
                    model_code=clean_str(row.get("Model_Code")),
                    variant_id=clean_str(row.get("Variant_ID")),
                    fuel_type=clean_str(row.get("Fuel_Type")),
                    transmission_type=clean_str(row.get("Transmission_Type")),
                    model_year=to_int(row.get("Model_Year"), default=0) or None,
                )
            )
        session.flush()

        # Transactions
        job_cards_df = read_csv("job_card_header.csv")
        job_card_ids = set()
        for row in job_cards_df.to_dict(orient="records"):
            jc = clean_id(row.get("Job_Card_Number"))
            dealer_id = clean_id(row.get("Dealer_ID"))
            if not jc or not dealer_id or dealer_id not in dealer_ids:
                quality["orphan_fk"].append(f"job_cards.dealer:{dealer_id}")
                continue
            if jc in job_card_ids:
                quality["duplicate_pk"].append(f"job_cards:{jc}")
                continue
            job_card_ids.add(jc)
            chassis = clean_id(row.get("Chassis_Number"))
            customer_id = clean_id(row.get("Customer_ID"))
            if chassis and chassis not in vehicle_ids:
                quality["orphan_fk"].append(f"job_cards.chassis:{chassis}")
                chassis = None
            if customer_id and customer_id not in customer_ids:
                quality["orphan_fk"].append(f"job_cards.customer:{customer_id}")
                customer_id = None
            session.add(
                JobCard(
                    job_card_number=jc,
                    date_in=to_date(row.get("Date_In")),
                    dealer_id=dealer_id,
                    chassis_number=chassis,
                    customer_id=customer_id,
                    service_type=clean_str(row.get("Service_Type")),
                    odometer_reading=to_int(row.get("Odometer_Reading"), default=0),
                    visit_reason=clean_str(row.get("Visit_Reason")),
                )
            )

        line_items_df = read_csv("job_card_line_items.csv")
        line_item_ids = set()
        for row in line_items_df.to_dict(orient="records"):
            line_id = clean_id(row.get("Line_Item_ID"))
            jc = clean_id(row.get("Job_Card_Number"))
            part = clean_id(row.get("Part_Number"))
            if not line_id or not jc or not part:
                quality["invalid_type"].append("line_items:missing_key")
                continue
            if line_id in line_item_ids:
                quality["duplicate_pk"].append(f"line_items:{line_id}")
                continue
            if jc not in job_card_ids:
                quality["orphan_fk"].append(f"line_items.job_card:{jc}")
                continue
            if part not in part_ids:
                quality["orphan_fk"].append(f"line_items.part:{part}")
                continue
            line_item_ids.add(line_id)
            session.add(
                JobCardLineItem(
                    line_item_id=line_id,
                    job_card_number=jc,
                    part_number=part,
                    description=clean_str(row.get("Description")),
                    inventory_level=clean_str(row.get("Inventory_Level")),
                    quantity_consumed=to_float(row.get("Quantity_Consumed")),
                    unit_price=to_float(row.get("Unit_Price")),
                    billed_amount=to_float(row.get("Billed_Amount")),
                    tax_code=clean_str(row.get("Tax_Code")),
                )
            )

        soq_df = read_csv("aos_soq_log.csv")
        soq_ids = set()
        for row in soq_df.to_dict(orient="records"):
            tx = clean_id(row.get("Transaction_ID"))
            dealer = clean_id(row.get("Dealer_ID"))
            warehouse = clean_id(row.get("Warehouse_ID"))
            part = clean_id(row.get("Part_Number"))
            if not tx:
                continue
            if tx in soq_ids:
                quality["duplicate_pk"].append(f"soq:{tx}")
                continue
            if dealer not in dealer_ids or warehouse not in warehouse_ids or part not in part_ids:
                quality["orphan_fk"].append(f"soq:{tx}")
                continue
            soq_ids.add(tx)
            session.add(
                SOQTransaction(
                    transaction_id=tx,
                    date=to_date(row.get("Date")),
                    dealer_id=dealer,
                    warehouse_id=warehouse,
                    part_number=part,
                    system_suggested_qty=to_int(row.get("System_Suggested_Qty")),
                    manager_modified_qty=to_int(row.get("Manager_Modified_Qty")),
                    fulfillment_status=clean_str(row.get("Fulfillment_Status")),
                    priority_flag=clean_str(row.get("Priority_Flag")),
                )
            )

        demand_df = read_csv("demand_clean.csv")
        demand_ids = set()
        for row in demand_df.to_dict(orient="records"):
            demand_id = clean_id(row.get("Demand_ID"))
            dealer = clean_id(row.get("Dealer_ID"))
            warehouse = clean_id(row.get("Warehouse_ID"))
            part = clean_id(row.get("Part_Number"))
            if not demand_id:
                continue
            if demand_id in demand_ids:
                quality["duplicate_pk"].append(f"demand:{demand_id}")
                continue
            if dealer not in dealer_ids or warehouse not in warehouse_ids or part not in part_ids:
                quality["orphan_fk"].append(f"demand:{demand_id}")
                continue
            demand_ids.add(demand_id)
            session.add(
                DemandRecord(
                    demand_id=demand_id,
                    date=to_date(row.get("Date")),
                    year=to_int(row.get("Year")),
                    month=to_int(row.get("Month")),
                    day=to_int(row.get("Day")),
                    day_of_week=to_int(row.get("Day_of_Week")),
                    week_of_year=to_int(row.get("Week_of_Year")),
                    dealer_id=dealer,
                    dealer_name=clean_str(row.get("Dealer_Name")),
                    zone=clean_str(row.get("Zone")),
                    warehouse_id=warehouse,
                    part_number=part,
                    description=clean_str(row.get("Description")),
                    inventory_level=clean_str(row.get("Inventory_Level")),
                    category_group=clean_str(row.get("Category_Group")),
                    unit_of_measurement=clean_str(row.get("Unit_Of_Measurement")),
                    vehicle_model=clean_str(row.get("Vehicle_Model")),
                    variant_id=clean_str(row.get("Variant_ID")),
                    fuel_type=clean_str(row.get("Fuel_Type")),
                    promotion_flag=to_int(row.get("Promotion_Flag")),
                    recall_flag=to_int(row.get("Recall_Flag")),
                    new_vehicle_flag=to_int(row.get("New_Vehicle_Flag")),
                    demand_qty=to_int(row.get("Demand_Qty")),
                    on_hand_qty=to_int(row.get("On_Hand_Qty")),
                    reorder_point=to_int(row.get("Reorder_Point")),
                    min_order_qty=to_int(row.get("Min_Order_Qty")),
                    soq_suggested_qty=to_int(row.get("SOQ_Suggested_Qty")),
                    manager_modified_qty=to_int(row.get("Manager_Modified_Qty")),
                    fulfillment_status=clean_str(row.get("Fulfillment_Status")),
                    unit_price=to_float(row.get("Unit_Price")),
                    sales_value=to_float(row.get("Sales_Value")),
                    stockout_flag=to_int(row.get("Stockout_Flag")),
                )
            )

        trend_df = read_csv("daily_trend_agg.csv")
        for row in trend_df.to_dict(orient="records"):
            dealer = clean_id(row.get("Dealer_ID"))
            if dealer not in dealer_ids:
                quality["orphan_fk"].append(f"trend.dealer:{dealer}")
                continue
            session.add(
                DailyTrend(
                    date=to_date(row.get("Date")),
                    dealer_id=dealer,
                    inventory_level=clean_str(row.get("Inventory_Level")),
                    total_demand_qty=to_int(row.get("Total_Demand_Qty")),
                    avg_unit_price=to_float(row.get("Avg_Unit_Price"), digits=4),
                    total_sales_value=to_float(row.get("Total_Sales_Value")),
                    stockout_count=to_int(row.get("Stockout_Count")),
                )
            )

        # Logistics workbook
        routes_df = read_xlsx_table("Route_Master")
        route_ids = set()
        for row in routes_df.to_dict(orient="records"):
            route_id = clean_id(row.get("Route_ID"))
            if not route_id:
                continue
            if route_id in route_ids:
                quality["duplicate_pk"].append(f"route:{route_id}")
                continue
            route_ids.add(route_id)
            session.add(
                Route(
                    route_id=route_id,
                    route_type=clean_str(row.get("Route_Type")),
                    origin_id=clean_id(row.get("Origin_ID")),
                    origin_city=clean_str(row.get("Origin_City")),
                    destination_id=clean_id(row.get("Destination_ID")),
                    destination_city=clean_str(row.get("Destination_City")),
                    primary_mode=clean_str(row.get("Primary_Mode")),
                    distance_km=to_float(row.get("Distance_KM")),
                    std_transit_days_rail=to_float(row.get("Std_Transit_Days_Rail")),
                    std_transit_days_road=to_float(row.get("Std_Transit_Days_Road")),
                    std_transit_days_air=to_float(row.get("Std_Transit_Days_Air")),
                    base_freight_rail=to_float(row.get("Base_Freight_Rail")),
                    base_freight_road=to_float(row.get("Base_Freight_Road")),
                    base_freight_air=to_float(row.get("Base_Freight_Air")),
                    active=clean_str(row.get("Active")),
                )
            )

        carriers_df = read_xlsx_table("Carrier_Master")
        carrier_ids = set()
        for row in carriers_df.to_dict(orient="records"):
            code = clean_id(row.get("Carrier_Code"))
            if not code:
                continue
            if code in carrier_ids:
                quality["duplicate_pk"].append(f"carrier:{code}")
                continue
            carrier_ids.add(code)
            session.add(
                Carrier(
                    carrier_code=code,
                    carrier_name=clean_str(row.get("Carrier_Name")) or code,
                    mode=clean_str(row.get("Mode")),
                    coverage_type=clean_str(row.get("Coverage_Type")),
                    service_type=clean_str(row.get("Service_Type")),
                    parent_group=clean_str(row.get("Parent_Group")),
                    geographic_coverage=clean_str(row.get("Geographic_Coverage")),
                    price_range=clean_str(row.get("Price_Range")),
                    transit_days_range=clean_str(row.get("Transit_Days_Range")),
                    on_time_pct=clean_str(row.get("On_Time_Pct")),
                    status=clean_str(row.get("Status")),
                    suitable_for=clean_str(row.get("Suitable_For")),
                )
            )

        shipments_df = read_xlsx_table("Shipment_Log")
        shipment_ids = set()
        for row in shipments_df.to_dict(orient="records"):
            shipment_id = clean_id(row.get("Shipment_ID"))
            if not shipment_id:
                continue
            if shipment_id in shipment_ids:
                quality["duplicate_pk"].append(f"shipment:{shipment_id}")
                continue
            shipment_ids.add(shipment_id)
            part = clean_id(row.get("Part_Number"))
            dealer = clean_id(row.get("Dealer_ID"))
            carrier = clean_id(row.get("Carrier_Code"))
            if part and part not in part_ids:
                part = None
                quality["orphan_fk"].append(f"shipment.part:{shipment_id}")
            if dealer and dealer not in dealer_ids:
                dealer = None
                quality["orphan_fk"].append(f"shipment.dealer:{shipment_id}")
            if carrier and carrier not in carrier_ids:
                carrier = None
                quality["orphan_fk"].append(f"shipment.carrier:{shipment_id}")
            session.add(
                Shipment(
                    shipment_id=shipment_id,
                    leg=clean_str(row.get("Leg")),
                    po_reference=clean_str(row.get("PO_Reference")),
                    part_number=part,
                    description=clean_str(row.get("Description")),
                    category_group=clean_str(row.get("Category_Group")),
                    qty_shipped=to_float(row.get("Qty_Shipped")),
                    unit_price=to_float(row.get("Unit_Price")),
                    shipment_value=to_float(row.get("Shipment_Value")),
                    origin_type=clean_str(row.get("Origin_Type")),
                    origin_id=clean_id(row.get("Origin_ID")),
                    origin_name=clean_str(row.get("Origin_Name")),
                    origin_city=clean_str(row.get("Origin_City")),
                    destination_type=clean_str(row.get("Destination_Type")),
                    destination_id=clean_id(row.get("Destination_ID")),
                    destination_name=clean_str(row.get("Destination_Name")),
                    destination_city=clean_str(row.get("Destination_City")),
                    dealer_id=dealer,
                    zone=clean_str(row.get("Zone")),
                    transport_mode=clean_str(row.get("Transport_Mode")),
                    carrier_name=clean_str(row.get("Carrier_Name")),
                    carrier_code=carrier,
                    distance_km=to_float(row.get("Distance_KM")),
                    weight_kg=to_float(row.get("Weight_KG")),
                    freight_cost_inr=to_float(row.get("Freight_Cost_INR")),
                    dispatch_date=to_date(row.get("Dispatch_Date")),
                    expected_arrival=to_date(row.get("Expected_Arrival")),
                    actual_arrival=to_date(row.get("Actual_Arrival")),
                    transit_days=to_float(row.get("Transit_Days")),
                    delay_days=to_float(row.get("Delay_Days")),
                    status=clean_str(row.get("Status")),
                    emergency_flag=to_int(row.get("Emergency_Flag")),
                    critical_part=to_int(row.get("Critical_Part")),
                    demand_date_ref=to_date(row.get("Demand_Date_Ref")),
                )
            )

        session.commit()

    report = Path(__file__).parent / "ingestion_quality_report.txt"
    with report.open("w", encoding="utf-8") as fp:
        fp.write("INGESTION QUALITY REPORT\n")
        for key in ["duplicate_pk", "orphan_fk", "invalid_type"]:
            fp.write(f"\n[{key}] count={len(quality[key])}\n")
            for issue in quality[key][:200]:
                fp.write(f"- {issue}\n")

    with Session(engine) as session:
        counts = {}
        for table in [
            "dealers",
            "warehouses",
            "parts",
            "customers",
            "vehicles",
            "job_cards",
            "job_card_line_items",
            "soq_transactions",
            "demand_records",
            "daily_trends",
            "routes",
            "carriers",
            "shipments",
        ]:
            counts[table] = session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one()
    print("Data loaded from existing CSV/XLSX sources.")
    print(counts)


if __name__ == "__main__":
    load_data()
