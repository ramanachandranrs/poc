"""
Regenerate a complete Maruti Suzuki dataset with 30 dealers.
Includes 10 assigned flagship dealers and 20 'Unassigned' dealers for onboarding.
"""
import csv, random
from pathlib import Path
from datetime import datetime, timedelta

random.seed(42)
HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── 1. DEALERS (30 total) ──────────────────────────────────────────────────
# 10 Flagship Assigned Dealers
ASSIGNED_DEALERS = [
    ("DLR_001", "Competent Automobiles",    "Delhi",        "Delhi",        "Flagship",  "North"),
    ("DLR_002", "Vitesse Motors",           "Mumbai",       "Maharashtra",  "Flagship",  "West"),
    ("DLR_003", "Popular Maruti",           "Kochi",        "Kerala",       "Premium",   "South"),
    ("DLR_004", "Varun Motors",             "Hyderabad",    "Telangana",    "Premium",   "South"),
    ("DLR_005", "Sai Service",              "Pune",         "Maharashtra",  "Standard",  "West"),
    ("DLR_006", "Bimal Auto",               "Bengaluru",    "Karnataka",    "Premium",   "South"),
    ("DLR_007", "Kalyani Motors",           "Bengaluru",    "Karnataka",    "Standard",  "South"),
    ("DLR_008", "Mandovi Motors",           "Bengaluru",    "Karnataka",    "Standard",  "South"),
    ("DLR_009", "Chowgule Industries",      "Pune",         "Maharashtra",  "Standard",  "West"),
    ("DLR_010", "Machino Techno",           "Kolkata",      "West Bengal",  "Premium",   "East"),
]

# 20 Unassigned Dealers
UNASSIGNED_DEALERS = []
locations = [("Gurugram", "Haryana"), ("Noida", "UP"), ("Surat", "Gujarat"), ("Lucknow", "UP"), ("Jaipur", "Rajasthan"), ("Nagpur", "Maharashtra")]
for i in range(11, 31):
    loc = random.choice(locations)
    UNASSIGNED_DEALERS.append((f"DLR_{i:03d}", f"Maruti Point {i}", loc[0], loc[1], "Standard", "Unassigned"))

ALL_DEALERS = ASSIGNED_DEALERS + UNASSIGNED_DEALERS

with open(DATA_DIR / "dealer_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Dealer_ID", "Dealer_Name", "City", "State", "Dealer_Type", "Zone"])
    for d in ALL_DEALERS:
        w.writerow(d)

# ── 2. CUSTOMERS ─────────────────────────────────────────────────────────────
CUSTOMERS = [f"CUST{i:05d}" for i in range(1, 25001)]
with open(DATA_DIR / "customer_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Customer_ID", "Name", "Email", "Contact", "City", "State", "Zone", "Ownership_History"])
    
    states = ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Haryana"]
    cities = {"Delhi": ["New Delhi"], "Maharashtra": ["Mumbai", "Pune"], "Karnataka": ["Bangalore", "Mysore"], "Tamil Nadu": ["Chennai", "Coimbatore"], "Gujarat": ["Ahmedabad", "Surat"], "Haryana": ["Gurgaon", "Faridabad"]}
    ownerships = ["1st owner", "1st owner", "1st owner", "2nd owner", "3rd owner"] # 60% 1st, 20% 2nd, 20% 3rd
    
    for i in range(1, 25001):
        cid = f"CUST{i:05d}"
        state = random.choice(states)
        city = random.choice(cities[state])
        contact = f"{random.randint(9000000000, 9999999999)}"
        ownership = random.choice(ownerships)
        w.writerow([cid, f"Customer {cid}", f"{cid.lower()}@maruti.com", contact, city, state, "North", ownership])

# ── 3. PARTS ─────────────────────────────────────────────────────────────────
PART_TYPES = [
    ("Brake Pads", "Mechanical", 1850),
    ("Oil Filter", "Consumable", 320),
    ("Air Filter", "Consumable", 450),
    ("Spark Plug", "Electrical", 250),
    ("Clutch Plate", "Mechanical", 3200),
    ("Timing Belt", "Mechanical", 1500),
    ("Alternator", "Electrical", 5600),
    ("Battery", "Electrical", 4500),
    ("Wiper Blades", "Consumable", 600),
    ("Headlight Bulb", "Electrical", 850),
    ("Shock Absorber", "Mechanical", 2800),
    ("Fuel Pump", "Mechanical", 4200),
    ("Radiator", "Mechanical", 6500),
    ("Thermostat", "Mechanical", 1200),
    ("Cabin Air Filter", "Consumable", 550)
]

PARTS = []
for i in range(1, 101):
    pt = random.choice(PART_TYPES)
    PARTS.append((f"PRT_{i:04d}", f"MGP {pt[0]} Type {random.randint(1,5)}", pt[1], pt[2]))

with open(DATA_DIR / "dealer_part_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Part_Number", "Description", "Category_Group", "MRP_Base", "Inventory_Level", "Unit_Of_Measurement"])
    for p in PARTS:
        w.writerow([p[0], p[1], p[2], p[3], "In Stock", "Each"])

# ── 4. VEHICLES & SALES ──────────────────────────────────────────────────────
MODELS = ["Swift", "Baleno", "Alto", "Brezza", "Ertiga", "Dzire", "Celerio", "Ignis", "Grand Vitara"]
VINS = [f"VIN{i:05d}" for i in range(1, 5001)]

with open(DATA_DIR / "vehicle_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Chassis_Number", "Engine_Number", "Model_Code", "Variant_ID", "Color", "Fuel_Type", "Transmission_Type", "Model_Year"])
    for vin in VINS:
        model = random.choice(MODELS)
        w.writerow([vin, f"ENG-{vin}", model, "VXI", random.choice(["Arctic White", "Midnight Black", "Magma Grey"]), random.choice(["Petrol", "CNG"]), random.choice(["Manual", "Automatic"]), 2024])

# Weighted model popularity for non-uniformity
MODEL_WEIGHTS = {
    "Brezza": 0.22, "Swift": 0.18, "Baleno": 0.15, "Ertiga": 0.12, 
    "Alto": 0.10, "Dzire": 0.08, "Celerio": 0.06, "Ignis": 0.05, "Grand Vitara": 0.04
}
MODEL_LIST = list(MODEL_WEIGHTS.keys())
MODEL_PROBS = list(MODEL_WEIGHTS.values())

# Variants
VARIANTS = ["AGS", "AT", "Alpha", "Delta", "LXI", "MT", "Sigma", "VXI", "ZXI"]

with open(DATA_DIR / "vehicle_sales.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["sale_id", "chassis_number", "dealer_id", "customer_id", "sale_date", "month", "quarter", "year", "final_sale_price_inr", "days_to_sell", "discount_given_inr", "finance_taken", "exchange_vehicle", "model_code", "variant_id"])
    for i in range(2500):
        # Pick model based on weights for realistic distribution
        model = random.choices(MODEL_LIST, weights=MODEL_PROBS)[0]
        variant = random.choice(VARIANTS)
        vin = VINS[i]
        
        sdate = datetime(2025, random.randint(1, 12), random.randint(1, 28))
        
        # Model-specific aging (e.g., SUVs sell faster than hatchbacks in this simulation)
        if model in ["Brezza", "Grand Vitara"]:
            days_to_sell = random.randint(5, 45)
        elif model in ["Alto", "Celerio"]:
            days_to_sell = random.randint(40, 90)
        else:
            days_to_sell = random.randint(20, 70)

        discount = random.randint(5000, 45000)
        finance = 1 if random.random() < 0.65 else 0
        exchange = 1 if random.random() < 0.30 else 0
        w.writerow([f"SAL{i:06d}", vin, random.choice(ALL_DEALERS)[0], random.choice(CUSTOMERS), sdate.strftime("%Y-%m-%d"), sdate.month, 1, 2025, random.randint(500000, 1500000), days_to_sell, discount, finance, exchange, model, variant])

# ── 5. DEMAND & TRENDS ───────────────────────────────────────────────────────
with open(DATA_DIR / "demand_clean.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Demand_ID", "Date", "Year", "Month", "Day", "Day_of_Week", "Week_of_Year", "Dealer_ID", "Dealer_Name", "Zone", "Warehouse_ID", "Part_Number", "Description", "Inventory_Level", "Category_Group", "Unit_Of_Measurement", "Vehicle_Model", "Variant_ID", "Fuel_Type", "Promotion_Flag", "Recall_Flag", "New_Vehicle_Flag", "Demand_Qty", "On_Hand_Qty", "Reorder_Point", "Min_Order_Qty", "SOQ_Suggested_Qty", "Manager_Modified_Qty", "Fulfillment_Status", "Unit_Price", "Sales_Value", "Stockout_Flag"])
    for i in range(25000):
        d = random.choice(ALL_DEALERS)
        p = random.choice(PARTS)
        sdate = datetime(2025, random.randint(1, 12), random.randint(1, 28))
        variant = random.choice(VARIANTS)
        
        # 10% chance of stockout
        is_stockout = random.random() < 0.10
        rop = random.randint(10, 50)
        on_hand = random.randint(0, rop - 1) if is_stockout else random.randint(rop, rop + 50)
        
        w.writerow([f"DMD{i:05d}", sdate.strftime("%Y-%m-%d"), 2025, sdate.month, sdate.day, sdate.weekday(), 1, d[0], d[1], d[5], "WH001", p[0], p[1], "Standard", p[2], "Each", random.choice(MODELS), variant, "Petrol", 0, 0, 0, random.randint(1, 20), on_hand, rop, 5, 10, 10, "Fulfilled", p[3], p[3] * random.randint(1, 5), 1 if is_stockout else 0])

import math
with open(DATA_DIR / "daily_trend_agg.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Date", "Dealer_ID", "Inventory_Level", "Total_Demand_Qty", "Avg_Unit_Price", "Total_Sales_Value", "Stockout_Count"])
    # Generate 1 trend row per dealer per day for 90 days
    base_date = datetime(2025, 1, 1)
    for day_offset in range(90):
        sdate = base_date + timedelta(days=day_offset)
        # Add seasonal wave (Sine curve) for non-uniformity
        seasonal_multiplier = 1.0 + 0.3 * math.sin(day_offset * (math.pi / 45))
        for d in ALL_DEALERS:
            demand = int(random.randint(20, 250) * seasonal_multiplier)
            w.writerow([sdate.strftime("%Y-%m-%d"), d[0], "Standard", demand, 1200, demand * 1200, random.randint(0, 3)])

with open(DATA_DIR / "Customer_Bookings.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["booking_id", "dealer_id", "requested_model", "requested_variant", "date_booked", "status"])
    for i in range(500):
        sdate = datetime(2025, random.randint(1, 12), random.randint(1, 28))
        w.writerow([f"BOK{i:05d}", random.choice(ALL_DEALERS)[0], random.choice(MODELS), random.choice(VARIANTS), sdate.strftime("%Y-%m-%d"), random.choice(["Confirmed", "Pending", "Delivered"])])

print("DONE: 30 Dealers generated. Realistic datasets constructed (100 Parts, 5000 Vehicles, 25k Customers, 25k Demand Records, 500 Bookings).")
