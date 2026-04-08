"""
demand_forecast.py
------------------
Trains one XGBoost model per Variant_ID using demand_clean.csv,
generates a 30-day forward forecast for every Dealer x Variant combo,
and saves the result to data/forecast_output.json.

Run:  python demand_forecast.py
"""

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

DATA_PATH    = Path(r"C:\Users\BalajiY\Documents\poc\data\demand_clean.csv")
OUTPUT_PATH  = Path("data/forecast_output.json")
FORECAST_DAYS = 30

# ── 1. Load ───────────────────────────────────────────────────────────────────
print("Loading demand_clean.csv …")
df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
print(f"  {len(df):,} rows | {df['Dealer_ID'].nunique()} dealers | "
      f"{df['Variant_ID'].nunique()} variants")

# ── 2. Aggregate to Dealer + Variant + Date daily demand ─────────────────────
daily = (
    df.groupby(["Date", "Dealer_ID", "Variant_ID"])
    .agg(
        demand          = ("Demand_Qty",      "sum"),
        on_hand         = ("On_Hand_Qty",     "mean"),
        promo           = ("Promotion_Flag",  "max"),
        recall          = ("Recall_Flag",     "max"),
        new_vehicle     = ("New_Vehicle_Flag","max"),
        stockout        = ("Stockout_Flag",   "sum"),
        avg_price       = ("Unit_Price",      "mean"),
    )
    .reset_index()
    .sort_values(["Dealer_ID", "Variant_ID", "Date"])
)

# Encode Dealer_ID as integer feature
le_dealer = LabelEncoder()
daily["dealer_enc"] = le_dealer.fit_transform(daily["Dealer_ID"])

# ── 3. Feature engineering ────────────────────────────────────────────────────
def add_features(grp: pd.DataFrame) -> pd.DataFrame:
    grp = grp.copy().sort_values("Date")
    grp["dow"]          = grp["Date"].dt.dayofweek
    grp["dom"]          = grp["Date"].dt.day
    grp["month"]        = grp["Date"].dt.month
    grp["week"]         = grp["Date"].dt.isocalendar().week.astype(int)
    grp["is_weekend"]   = (grp["dow"] >= 5).astype(int)
    grp["is_mth_start"] = grp["Date"].dt.is_month_start.astype(int)
    grp["is_mth_end"]   = grp["Date"].dt.is_month_end.astype(int)
    for lag in [1, 7, 14, 30]:
        grp[f"lag_{lag}"] = grp["demand"].shift(lag)
    grp["roll_7"]  = grp["demand"].shift(1).rolling(7).mean()
    grp["roll_30"] = grp["demand"].shift(1).rolling(30).mean()
    grp["std_7"]   = grp["demand"].shift(1).rolling(7).std()
    return grp.dropna()

print("Engineering features …")
daily = (
    daily.groupby(["Dealer_ID", "Variant_ID"], group_keys=False)
    .apply(add_features)
    .reset_index(drop=True)
)

FEATURE_COLS = [
    "dealer_enc", "dow", "dom", "month", "week",
    "is_weekend", "is_mth_start", "is_mth_end",
    "lag_1", "lag_7", "lag_14", "lag_30",
    "roll_7", "roll_30", "std_7",
    "promo", "recall", "new_vehicle", "stockout", "avg_price",
]

# ── 4. Train one model per Variant ────────────────────────────────────────────
variants   = daily["Variant_ID"].unique()
models     = {}
metrics    = {}

print(f"\nTraining {len(variants)} XGBoost models …")
for variant in variants:
    vdf = daily[daily["Variant_ID"] == variant].copy()
    split = int(len(vdf) * 0.8)
    X_tr, y_tr = vdf.iloc[:split][FEATURE_COLS], vdf.iloc[:split]["demand"]
    X_te, y_te = vdf.iloc[split:][FEATURE_COLS], vdf.iloc[split:]["demand"]

    model = XGBRegressor(
        n_estimators=400, learning_rate=0.05, max_depth=5,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbosity=0,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    preds = model.predict(X_te).clip(min=0)

    mae  = float(np.mean(np.abs(y_te.values - preds)))
    mape = float(np.mean(np.abs((y_te.values - preds) / np.maximum(y_te.values, 1))) * 100)
    models[variant] = model
    metrics[variant] = {"mae": round(mae, 2), "mape": round(mape, 1)}
    print(f"  {variant:<12}  MAE={mae:6.1f}  MAPE={mape:.1f}%")

# ── 5. Generate 30-day forward forecast per Dealer x Variant ─────────────────
print("\nGenerating 30-day forecasts …")
forecast_records = []
last_date = daily["Date"].max()

for variant in variants:
    for dealer_id in daily["Dealer_ID"].unique():
        subset = daily[
            (daily["Variant_ID"] == variant) &
            (daily["Dealer_ID"]  == dealer_id)
        ].sort_values("Date")

        if len(subset) < 30:
            continue

        dealer_enc = int(subset["dealer_enc"].iloc[0])
        last_demand = subset["demand"].values.copy()
        last_price  = float(subset["avg_price"].iloc[-1])

        daily_preds = []
        for i in range(1, FORECAST_DAYS + 1):
            fdate = last_date + pd.Timedelta(days=i)
            row = {
                "dealer_enc"  : dealer_enc,
                "dow"         : fdate.dayofweek,
                "dom"         : fdate.day,
                "month"       : fdate.month,
                "week"        : fdate.isocalendar()[1],
                "is_weekend"  : int(fdate.dayofweek >= 5),
                "is_mth_start": int(fdate.day == 1),
                "is_mth_end"  : int(fdate.day == pd.Timestamp(fdate.year, fdate.month, 1).days_in_month),
                "lag_1"       : last_demand[-1],
                "lag_7"       : last_demand[-7]  if len(last_demand) >= 7  else np.mean(last_demand),
                "lag_14"      : last_demand[-14] if len(last_demand) >= 14 else np.mean(last_demand),
                "lag_30"      : last_demand[-30] if len(last_demand) >= 30 else np.mean(last_demand),
                "roll_7"      : float(np.mean(last_demand[-7:])),
                "roll_30"     : float(np.mean(last_demand[-30:])),
                "std_7"       : float(np.std(last_demand[-7:])),
                "promo"       : 0,
                "recall"      : 0,
                "new_vehicle" : 0,
                "stockout"    : 0,
                "avg_price"   : last_price,
            }
            pred = float(models[variant].predict(
                pd.DataFrame([row])[FEATURE_COLS]
            )[0])
            pred = max(pred, 0)
            daily_preds.append({"date": fdate.strftime("%Y-%m-%d"), "forecast": round(pred, 2)})
            last_demand = np.append(last_demand, pred)

        total_30d = round(sum(p["forecast"] for p in daily_preds), 1)
        forecast_records.append({
            "dealer_id"    : dealer_id,
            "dealer_name"  : subset["Dealer_ID"].iloc[0],  # same as ID here
            "variant_id"   : variant,
            "total_30d"    : total_30d,
            "daily"        : daily_preds,
            "model_mape"   : metrics[variant]["mape"],
        })

# Enrich dealer_name from original df
dealer_name_map = df.drop_duplicates("Dealer_ID").set_index("Dealer_ID")
if "Dealer_Name" in df.columns:
    dealer_name_map = df.drop_duplicates("Dealer_ID").set_index("Dealer_ID")["Dealer_Name"].to_dict()
    for rec in forecast_records:
        rec["dealer_name"] = dealer_name_map.get(rec["dealer_id"], rec["dealer_id"])

# ── 6. Save output ────────────────────────────────────────────────────────────
OUTPUT_PATH.parent.mkdir(exist_ok=True)
output = {
    "generated_at"    : pd.Timestamp.now().isoformat(),
    "forecast_horizon": FORECAST_DAYS,
    "model_metrics"   : metrics,
    "forecasts"       : forecast_records,
}
with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=2)

print(f"\n✅ Saved {len(forecast_records)} dealer-variant forecasts → {OUTPUT_PATH}")
print(f"   Variants: {list(variants)}")
