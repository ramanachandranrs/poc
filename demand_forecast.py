"""
demand_forecast.py
------------------
Trains one XGBoost model per Variant_ID using vehicle_sales_transactions.csv
(direct vehicle sales signal), generates a 30-day forward forecast for every
Dealer x Variant combo, and saves to data/forecast_output.json.

Run:  python demand_forecast.py
"""

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, f1_score
from xgboost import XGBRegressor, XGBClassifier

warnings.filterwarnings("ignore")

DATA_PATH     = Path(r"C:\Users\BalajiY\Documents\poc\data\vehicle_sales_transactions.csv")
OUTPUT_PATH   = Path("data/forecast_output.json")
FORECAST_DAYS = 30

# ── 1. Load ───────────────────────────────────────────────────────────────────
print("Loading vehicle_sales_transactions.csv …")
df = pd.read_csv(DATA_PATH, parse_dates=["date"])
print(f"  {len(df):,} rows | {df['dealer_id'].nunique()} dealers | "
      f"{df['variant_id'].nunique()} variants")
print(f"  Date range: {df['date'].min().date()} → {df['date'].max().date()}")

# ── 2. Already at Dealer + Variant + Date level ───────────────────────────────
# Sort for lag computation
df = df.sort_values(["dealer_id", "variant_id", "date"]).reset_index(drop=True)

# Encode dealer and zone
le_dealer = LabelEncoder()
le_zone   = LabelEncoder()
df["dealer_enc"] = le_dealer.fit_transform(df["dealer_id"])
df["zone_enc"]   = le_zone.fit_transform(df["zone"].fillna("Unknown"))

# Encode dealer_type (A/B/C volume tiers)
le_type = LabelEncoder()
df["type_enc"] = le_type.fit_transform(df["dealer_type"].fillna("A"))

# ── 3. Feature engineering ────────────────────────────────────────────────────
def add_features(grp: pd.DataFrame) -> pd.DataFrame:
    grp = grp.copy().sort_values("date")
    grp["dow"]          = grp["date"].dt.dayofweek
    grp["dom"]          = grp["date"].dt.day
    grp["month"]        = grp["date"].dt.month
    grp["week"]         = grp["date"].dt.isocalendar().week.astype(int)
    grp["quarter"]      = grp["date"].dt.quarter
    grp["is_weekend"]   = (grp["dow"] >= 5).astype(int)
    grp["is_mth_start"] = grp["date"].dt.is_month_start.astype(int)
    grp["is_mth_end"]   = grp["date"].dt.is_month_end.astype(int)

    # Lag features
    for lag in [1, 7, 14, 30]:
        grp[f"lag_{lag}"] = grp["units_sold"].shift(lag)

    # Rolling stats
    grp["roll_7"]  = grp["units_sold"].shift(1).rolling(7).mean()
    grp["roll_30"] = grp["units_sold"].shift(1).rolling(30).mean()
    grp["std_7"]   = grp["units_sold"].shift(1).rolling(7).std()

    # Promo rolling effect
    grp["promo_last_7d"] = grp["promotion_flag"].shift(1).rolling(7).sum().fillna(0)

    return grp.dropna()

print("Engineering features …")
df_fe = (
    df.groupby(["dealer_id", "variant_id"], group_keys=False)
    .apply(add_features)
    .reset_index(drop=True)
)
print(f"  After feature engineering: {len(df_fe):,} rows")

FEATURE_COLS = [
    "dealer_enc", "zone_enc", "type_enc",
    "dow", "dom", "month", "week", "quarter",
    "is_weekend", "is_mth_start", "is_mth_end",
    "lag_1", "lag_7", "lag_14", "lag_30",
    "roll_7", "roll_30", "std_7",
    "promotion_flag", "festive_flag",
    "promo_last_7d",
]

# ── 4. Train two-stage model per Variant ─────────────────────────────────────
# Stage 1: XGBClassifier  → will there be a sale? (0/1)
# Stage 2: XGBRegressor   → how many units? (trained only on sale days)
variants = df_fe["variant_id"].unique()
classifiers = {}
regressors  = {}
metrics     = {}

print(f"\nTraining {len(variants)} two-stage models (Classifier + Regressor) …")
for variant in sorted(variants):
    vdf   = df_fe[df_fe["variant_id"] == variant].copy().sort_values("date")
    split = int(len(vdf) * 0.8)

    X_tr = vdf.iloc[:split][FEATURE_COLS]
    y_tr = vdf.iloc[:split]["units_sold"]
    X_te = vdf.iloc[split:][FEATURE_COLS]
    y_te = vdf.iloc[split:]["units_sold"]

    # ── Stage 1: binary classifier (sale or no sale) ──────────────────────
    y_tr_bin = (y_tr > 0).astype(int)
    y_te_bin = (y_te > 0).astype(int)

    clf = XGBClassifier(
        n_estimators=300, learning_rate=0.05, max_depth=5,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=(y_tr_bin == 0).sum() / max((y_tr_bin == 1).sum(), 1),
        random_state=42, verbosity=0, eval_metric="logloss",
    )
    clf.fit(X_tr, y_tr_bin, eval_set=[(X_te, y_te_bin)], verbose=False)
    sale_prob = clf.predict_proba(X_te)[:, 1]
    sale_pred = (sale_prob >= 0.5).astype(int)
    f1 = f1_score(y_te_bin, sale_pred)

    # ── Stage 2: regressor on sale days only ──────────────────────────────
    sale_mask_tr = y_tr > 0
    X_tr_sale = X_tr[sale_mask_tr]
    y_tr_sale = y_tr[sale_mask_tr]

    reg = XGBRegressor(
        n_estimators=400, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=2, random_state=42, verbosity=0,
    )
    reg.fit(X_tr_sale, y_tr_sale,
            eval_set=[(X_te[y_te > 0], y_te[y_te > 0])],
            verbose=False)

    # ── Combined prediction ───────────────────────────────────────────────
    qty_pred  = reg.predict(X_te).clip(min=0)
    final_pred = sale_prob * qty_pred   # expected value = P(sale) × qty

    mae   = float(mean_absolute_error(y_te, final_pred))
    rmse  = float(np.sqrt(mean_squared_error(y_te, final_pred)))
    r2    = float(r2_score(y_te, final_pred))
    # MAPE on non-zero actuals only
    nz    = y_te.values > 0
    mape  = float(np.mean(np.abs(
        (y_te.values[nz] - final_pred[nz]) / y_te.values[nz]
    )) * 100) if nz.sum() > 0 else 0.0
    smape = float(np.mean(
        2 * np.abs(y_te.values - final_pred)
        / (np.abs(y_te.values) + np.abs(final_pred) + 1e-8)
    ) * 100)

    classifiers[variant] = clf
    regressors[variant]  = reg
    metrics[variant] = {
        "mae":   round(mae,   2),
        "rmse":  round(rmse,  2),
        "r2":    round(r2,    3),
        "mape":  round(mape,  1),
        "smape": round(smape, 1),
        "f1_sale": round(f1, 3),
    }
    print(f"  {variant:<12}  MAE={mae:5.2f}  RMSE={rmse:5.2f}  "
          f"R²={r2:.3f}  MAPE={mape:.1f}%  SMAPE={smape:.1f}%  F1={f1:.3f}")

avg_mae   = round(sum(m["mae"]   for m in metrics.values()) / len(metrics), 2)
avg_mape  = round(sum(m["mape"]  for m in metrics.values()) / len(metrics), 1)
avg_smape = round(sum(m["smape"] for m in metrics.values()) / len(metrics), 1)
print(f"\n  Average  MAE={avg_mae}  MAPE={avg_mape}%  SMAPE={avg_smape}%")

avg_mae  = round(sum(m["mae"]  for m in metrics.values()) / len(metrics), 2)
avg_mape = round(sum(m["mape"] for m in metrics.values()) / len(metrics), 1)
print(f"\n  Average       MAE={avg_mae}  MAPE={avg_mape}%")

# ── 5. Generate 30-day forward forecast per Dealer x Variant ─────────────────
print("\nGenerating 30-day forecasts …")
forecast_records = []
last_date = df_fe["date"].max()

# Build dealer name map
dealer_name_map = {row["dealer_id"]: f"Maruti Dealer {row['dealer_id'][-2:]}"
                   for _, row in df.drop_duplicates("dealer_id").iterrows()}

for variant in sorted(variants):
    for dealer_id in sorted(df["dealer_id"].unique()):
        subset = df_fe[
            (df_fe["variant_id"] == variant) &
            (df_fe["dealer_id"]  == dealer_id)
        ].sort_values("date")

        if len(subset) < 30:
            continue

        dealer_enc = int(subset["dealer_enc"].iloc[0])
        zone_enc   = int(subset["zone_enc"].iloc[0])
        type_enc   = int(subset["type_enc"].iloc[0])
        last_sales = subset["units_sold"].values.copy().astype(float)
        last_promo = subset["promotion_flag"].values.copy().astype(float)

        daily_preds = []
        for i in range(1, FORECAST_DAYS + 1):
            fdate = last_date + pd.Timedelta(days=i)
            festive = 1 if fdate.month in [10, 11] else 0
            row = {
                "dealer_enc"   : dealer_enc,
                "zone_enc"     : zone_enc,
                "type_enc"     : type_enc,
                "dow"          : fdate.dayofweek,
                "dom"          : fdate.day,
                "month"        : fdate.month,
                "week"         : fdate.isocalendar()[1],
                "quarter"      : (fdate.month - 1) // 3 + 1,
                "is_weekend"   : int(fdate.dayofweek >= 5),
                "is_mth_start" : int(fdate.day == 1),
                "is_mth_end"   : int(fdate.day == pd.Timestamp(fdate.year, fdate.month, 1).days_in_month),
                "lag_1"        : last_sales[-1],
                "lag_7"        : last_sales[-7]  if len(last_sales) >= 7  else np.mean(last_sales),
                "lag_14"       : last_sales[-14] if len(last_sales) >= 14 else np.mean(last_sales),
                "lag_30"       : last_sales[-30] if len(last_sales) >= 30 else np.mean(last_sales),
                "roll_7"       : float(np.mean(last_sales[-7:])),
                "roll_30"      : float(np.mean(last_sales[-30:])),
                "std_7"        : float(np.std(last_sales[-7:])),
                "promotion_flag": 0,
                "festive_flag" : festive,
                "promo_last_7d": float(np.sum(last_promo[-7:])),
            }
            row_df = pd.DataFrame([row])[FEATURE_COLS]
            # Two-stage prediction
            sale_prob = float(classifiers[variant].predict_proba(row_df)[0, 1])
            qty       = float(regressors[variant].predict(row_df)[0])
            pred      = max(sale_prob * qty, 0)

            daily_preds.append({"date": fdate.strftime("%Y-%m-%d"), "forecast": round(pred, 2)})
            last_sales = np.append(last_sales, pred)
            last_promo = np.append(last_promo, 0)

        total_30d = round(sum(p["forecast"] for p in daily_preds), 1)
        forecast_records.append({
            "dealer_id"  : dealer_id,
            "dealer_name": dealer_name_map.get(dealer_id, dealer_id),
            "variant_id" : variant,
            "total_30d"  : total_30d,
            "model_mape" : metrics[variant]["mape"],
            "daily"      : daily_preds,
        })

# ── 6. Save ───────────────────────────────────────────────────────────────────
OUTPUT_PATH.parent.mkdir(exist_ok=True)
output = {
    "generated_at"    : pd.Timestamp.now().isoformat(),
    "forecast_horizon": FORECAST_DAYS,
    "data_source"     : "vehicle_sales_transactions.csv",
    "model_metrics"   : metrics,
    "forecasts"       : forecast_records,
}
with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=2)

print(f"\n✅ Saved {len(forecast_records)} dealer-variant forecasts → {OUTPUT_PATH}")
print(f"   Avg MAE: {avg_mae}  |  Avg MAPE: {avg_mape}%  |  Avg SMAPE: {avg_smape}%")
