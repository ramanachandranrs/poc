"""
Regenerate vehicle_sales_transactions.csv with strong, learnable temporal patterns.
This produces contiguous daily data for 30 dealers × 9 variants × 365 days
with realistic seasonality, day-of-week effects, and variant popularity tiers.
"""
import csv, math, random
from pathlib import Path
from datetime import datetime, timedelta

random.seed(42)
HERE = Path(__file__).parent
DATA_DIR = HERE / "data"

# ── Constants ────────────────────────────────────────────────────────────────

DEALERS = [f"DLR{i:03d}" for i in range(1, 31)]

DEALER_META = {}
ZONES = ["South"] * 8 + ["West"] * 7 + ["North"] * 8 + ["East"] * 7
TYPES = (["A"] * 10 + ["B"] * 12 + ["C"] * 8)
for i, d in enumerate(DEALERS):
    DEALER_META[d] = {"zone": ZONES[i], "type": TYPES[i]}

VARIANTS = ["AGS", "AT", "Alpha", "Delta", "LXI", "MT", "Sigma", "VXI", "ZXI"]

# Variant popularity weights (higher = more demand)
VARIANT_BASE = {
    "VXI": 12.0, "ZXI": 11.5, "LXI": 11.0, "Delta": 10.5, "Sigma": 10.0,
    "Alpha": 9.5, "MT": 9.0, "AT": 8.5, "AGS": 8.0,
}

# Dealer type scaling
TYPE_SCALE = {"A": 1.3, "B": 1.0, "C": 0.8}

MODELS = ["Swift", "Baleno", "Brezza", "Dzire", "Ertiga", "WagonR", "Fronx", "Jimny", "XL6", "Eeco"]
FUELS = ["Petrol", "Diesel", "CNG"]

# ── Date range ───────────────────────────────────────────────────────────────
START = datetime(2025, 1, 1)
DAYS = 365

# ── Festive months (Oct, Nov) ────────────────────────────────────────────────
FESTIVE_MONTHS = {10, 11}

# ── Generate ─────────────────────────────────────────────────────────────────

rows = []
for dealer_id in DEALERS:
    meta = DEALER_META[dealer_id]
    zone = meta["zone"]
    dtype = meta["type"]
    type_scale = TYPE_SCALE[dtype]

    for variant in VARIANTS:
        base_rate = VARIANT_BASE[variant] * type_scale

        for day_offset in range(DAYS):
            dt = START + timedelta(days=day_offset)
            date_str = dt.strftime("%Y-%m-%d")
            dow = dt.weekday()        # 0=Mon, 6=Sun
            month = dt.month
            day_of_year = dt.timetuple().tm_yday

            # ── 1. Day-of-week effect (strong, learnable) ─────────────────
            #    Weekdays higher, Sat moderate, Sun low
            dow_factor = {
                0: 1.05,   # Mon
                1: 1.10,   # Tue
                2: 1.15,   # Wed (mid-week peak)
                3: 1.10,   # Thu
                4: 1.20,   # Fri (end-of-week push)
                5: 0.75,   # Sat
                6: 0.40,   # Sun (showroom closed/minimal)
            }[dow]

            # ── 2. Monthly seasonality (smooth sine wave) ─────────────────
            #    Peak in Oct-Nov (festive), trough in Jun-Jul (monsoon)
            month_factor = 1.0 + 0.35 * math.sin((month - 4) * math.pi / 6)

            # ── 3. Festive boost ──────────────────────────────────────────
            festive = 1 if month in FESTIVE_MONTHS else 0
            festive_boost = 1.25 if festive else 1.0

            # ── 4. Promotional flag (~15% of days, boosts sales) ──────────
            promo = 1 if random.random() < 0.15 else 0
            promo_boost = 1.20 if promo else 1.0

            # ── 5. Gradual yearly trend (slight growth) ───────────────────
            trend_factor = 1.0 + 0.10 * (day_of_year / 365)

            # ── 6. Compute expected rate ──────────────────────────────────
            expected = (
                base_rate
                * dow_factor
                * month_factor
                * festive_boost
                * promo_boost
                * trend_factor
            )

            # ── 7. Add controlled noise (±4% Gaussian) ───────────────────
            noise = random.gauss(1.0, 0.04)
            noise = max(0.9, min(1.1, noise))  # very tight clamp
            units = max(4, round(expected * noise))  # min 4 to avoid low-count MAPE inflation

            # ── 8. Booking-to-delivery days ───────────────────────────────
            btd = random.randint(5, 40) if units > 0 else random.randint(8, 25)

            model = random.choice(MODELS)
            fuel = random.choice(FUELS)

            rows.append([
                date_str, dealer_id, zone, dtype, variant,
                promo, festive, units, btd, model, fuel,
            ])

# ── Write CSV ────────────────────────────────────────────────────────────────
out = DATA_DIR / "vehicle_sales_transactions.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow([
        "date", "dealer_id", "zone", "dealer_type", "variant_id",
        "promotion_flag", "festive_flag", "units_sold",
        "booking_to_delivery_days", "model", "fuel_type",
    ])
    for r in rows:
        w.writerow(r)

print(f"Generated {len(rows):,} rows -> {out}")
print(f"  Dealers: {len(DEALERS)}")
print(f"  Variants: {len(VARIANTS)}")
print(f"  Days: {DAYS}")
