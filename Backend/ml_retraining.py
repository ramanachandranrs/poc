"""
ml_retraining.py
----------------
Core ML retraining engine.
Pulls vehicle_sales data directly from the SQLite database,
retrains one two-stage XGBoost model per variant, generates
a fresh 30-day forecast, and saves data/forecast_output.json.

Called by retraining_scheduler.py (background) or directly via API.
"""

import json
import logging
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
from sqlalchemy import text

import models

warnings.filterwarnings("ignore")

logger = logging.getLogger("ml_retraining")

OUTPUT_PATH   = Path("data/forecast_output.json")
FORECAST_DAYS = 30
STATUS_PATH   = Path("data/retrain_status.json")

FEATURE_COLS = [
    "dealer_enc", "zone_enc", "type_enc",
    "dow", "dom", "month", "week", "quarter",
    "is_weekend", "is_mth_start", "is_mth_end",
    "lag_1", "lag_7", "lag_14", "lag_30",
    "roll_7", "roll_30", "std_7",
    "promotion_flag", "festive_flag",
    "promo_last_7d",
]


def _update_status(status: str, message: str, metrics: dict | None = None) -> None:
    STATUS_PATH.parent.mkdir(exist_ok=True)
    payload = {
        "status": status,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "metrics": metrics or {},
    }
    with open(STATUS_PATH, "w") as f:
        json.dump(payload, f, indent=2)
    logger.info("[retrain] %s — %s", status, message)


def get_retrain_status() -> dict:
    if STATUS_PATH.exists():
        with open(STATUS_PATH) as f:
            return json.load(f)
    return {"status": "idle", "message": "No retraining has run yet.", "timestamp": None, "metrics": {}}


def _load_data_from_db() -> pd.DataFrame:
    """Pull vehicle_sales + dealer metadata directly from SQLite."""
    engine = models.engine
    with engine.connect() as conn:
        df_sales = pd.read_sql(
            text("""
                SELECT
                    dt.dealer_id,
                    'VXI'          AS variant_id,
                    dt.date        AS date,
                    d.zone,
                    d.dealer_type,
                    dt.total_demand_qty AS units_sold,
                    0              AS festive_flag,
                    0              AS promotion_flag
                FROM daily_trends dt
                JOIN dealers d ON d.dealer_id = dt.dealer_id
                ORDER BY dt.dealer_id, dt.date
            """),
            conn,
            parse_dates=["date"],
        )

    if df_sales.empty:
        raise ValueError("No vehicle_sales data found in the database.")

    # Aggregate to dealer + variant + date (daily unit count)
    df_daily = (
        df_sales.groupby(["dealer_id", "variant_id", "date", "zone", "dealer_type", "festive_flag", "promotion_flag"])
        .agg(units_sold=("units_sold", "sum"))
        .reset_index()
    )
    return df_daily


def _add_features(grp: pd.DataFrame) -> pd.DataFrame:
    grp = grp.copy().sort_values("date")
    grp["dow"]          = grp["date"].dt.dayofweek
    grp["dom"]          = grp["date"].dt.day
    grp["month"]        = grp["date"].dt.month
    grp["week"]         = grp["date"].dt.isocalendar().week.astype(int)
    grp["quarter"]      = grp["date"].dt.quarter
    grp["is_weekend"]   = (grp["dow"] >= 5).astype(int)
    grp["is_mth_start"] = grp["date"].dt.is_month_start.astype(int)
    grp["is_mth_end"]   = grp["date"].dt.is_month_end.astype(int)
    for lag in [1, 7, 14, 30]:
        grp[f"lag_{lag}"] = grp["units_sold"].shift(lag)
    grp["roll_7"]        = grp["units_sold"].shift(1).rolling(7).mean()
    grp["roll_30"]       = grp["units_sold"].shift(1).rolling(30).mean()
    grp["std_7"]         = grp["units_sold"].shift(1).rolling(7).std()
    grp["promo_last_7d"] = grp["promotion_flag"].shift(1).rolling(7).sum().fillna(0)
    return grp.dropna()


def run_retraining() -> dict:
    """
    Full retraining pipeline. Returns summary metrics dict.
    Raises on fatal errors so the scheduler can log them.
    """
    try:
        from xgboost import XGBClassifier, XGBRegressor
    except ImportError:
        _update_status("error", "xgboost not installed. Run: pip install xgboost")
        raise

    _update_status("running", "Loading sales data from database…")

    # ── 1. Load ──────────────────────────────────────────────────────────────
    df = _load_data_from_db()
    row_count = len(df)
    logger.info("Loaded %d daily rows from DB", row_count)
    _update_status("running", f"Loaded {row_count:,} daily sales rows. Engineering features…")

    # ── 2. Encode ─────────────────────────────────────────────────────────────
    df = df.sort_values(["dealer_id", "variant_id", "date"]).reset_index(drop=True)
    le_dealer = LabelEncoder()
    le_zone   = LabelEncoder()
    le_type   = LabelEncoder()
    df["dealer_enc"] = le_dealer.fit_transform(df["dealer_id"])
    df["zone_enc"]   = le_zone.fit_transform(df["zone"].fillna("Unknown"))
    df["type_enc"]   = le_type.fit_transform(df["dealer_type"].fillna("A"))

    # ── 3. Feature engineering ────────────────────────────────────────────────
    df_fe = (
        df.groupby(["dealer_id", "variant_id"], group_keys=False)
        .apply(_add_features)
        .reset_index(drop=True)
    )

    variants = df_fe["variant_id"].unique()
    _update_status("running", f"Training {len(variants)} XGBoost models (two-stage classifier + regressor)…")

    # ── 4. Train per Variant ──────────────────────────────────────────────────
    classifiers: dict = {}
    regressors: dict  = {}
    metrics: dict     = {}

    for variant in sorted(variants):
        vdf   = df_fe[df_fe["variant_id"] == variant].copy().sort_values("date")
        split = int(len(vdf) * 0.8)
        if split < 10:
            logger.warning("Skipping %s — insufficient data (%d rows)", variant, len(vdf))
            continue

        X_tr = vdf.iloc[:split][FEATURE_COLS]
        y_tr = vdf.iloc[:split]["units_sold"]
        X_te = vdf.iloc[split:][FEATURE_COLS]
        y_te = vdf.iloc[split:]["units_sold"]

        y_tr_bin = (y_tr > 0).astype(int)
        y_te_bin = (y_te > 0).astype(int)

        # Handle case where only one class is present in training data
        if y_tr_bin.nunique() < 2:
            logger.warning("Variant %s has only one class in y_tr_bin. Storing constant prob.", variant)
            single_val = float(y_tr_bin.iloc[0])
            classifiers[variant] = single_val
            sale_prob = np.full(len(X_te), single_val)
            f1 = 0.0
        else:
            clf = XGBClassifier(
                n_estimators=300, learning_rate=0.05, max_depth=5,
                subsample=0.8, colsample_bytree=0.8,
                scale_pos_weight=(y_tr_bin == 0).sum() / max((y_tr_bin == 1).sum(), 1),
                random_state=42, verbosity=0, eval_metric="logloss",
            )
            clf.fit(X_tr, y_tr_bin, eval_set=[(X_te, y_te_bin)], verbose=False)
            sale_prob = clf.predict_proba(X_te)[:, 1]
            sale_pred = (sale_prob >= 0.5).astype(int)
            f1 = f1_score(y_te_bin, sale_pred, zero_division=0)
            classifiers[variant] = clf

        sale_mask_tr = y_tr > 0
        reg = XGBRegressor(
            n_estimators=400, learning_rate=0.05, max_depth=6,
            subsample=0.8, colsample_bytree=0.8,
            min_child_weight=2, random_state=42, verbosity=0,
        )
        reg.fit(
            X_tr[sale_mask_tr], y_tr[sale_mask_tr],
            eval_set=[(X_te[y_te > 0], y_te[y_te > 0])],
            verbose=False,
        )

        qty_pred   = reg.predict(X_te).clip(min=0)
        final_pred = sale_prob * qty_pred

        mae  = float(mean_absolute_error(y_te, final_pred))
        rmse = float(np.sqrt(mean_squared_error(y_te, final_pred)))
        r2   = float(r2_score(y_te, final_pred))
        nz   = y_te.values > 0
        mape = float(np.mean(np.abs(
            (y_te.values[nz] - final_pred[nz]) / y_te.values[nz]
        )) * 100) if nz.sum() > 0 else 0.0
        smape = float(np.mean(
            2 * np.abs(y_te.values - final_pred)
            / (np.abs(y_te.values) + np.abs(final_pred) + 1e-8)
        ) * 100)

        regressors[variant]  = reg
        metrics[variant] = {
            "mae":     round(mae,   2),
            "rmse":    round(rmse,  2),
            "r2":      round(r2,    3),
            "mape":    round(mape,  1),
            "smape":   round(smape, 1),
            "f1_sale": round(f1,    3),
        }
        logger.info("  %s  MAE=%.2f  MAPE=%.1f%%  F1=%.3f", variant, mae, mape, f1)

    if not metrics:
        _update_status("error", "No variants could be trained — check data.")
        raise ValueError("Training produced no models.")

    avg_mape = round(sum(m["mape"] for m in metrics.values()) / len(metrics), 1)
    avg_mae  = round(sum(m["mae"]  for m in metrics.values()) / len(metrics), 2)
    _update_status("running", f"Models trained. Avg MAPE={avg_mape}%. Generating 30-day forecasts…")

    # ── 5. Generate 30-day forecast ───────────────────────────────────────────
    last_date = df_fe["date"].max()
    dealer_name_map = {
        row["dealer_id"]: row["dealer_id"]
        for _, row in df.drop_duplicates("dealer_id").iterrows()
    }

    forecast_records = []
    for variant in sorted(metrics.keys()):
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
                fdate   = last_date + pd.Timedelta(days=i)
                festive = 1 if fdate.month in [10, 11] else 0
                row_feat = {
                    "dealer_enc"    : dealer_enc,
                    "zone_enc"      : zone_enc,
                    "type_enc"      : type_enc,
                    "dow"           : fdate.dayofweek,
                    "dom"           : fdate.day,
                    "month"         : fdate.month,
                    "week"          : fdate.isocalendar()[1],
                    "quarter"       : (fdate.month - 1) // 3 + 1,
                    "is_weekend"    : int(fdate.dayofweek >= 5),
                    "is_mth_start"  : int(fdate.day == 1),
                    "is_mth_end"    : int(fdate.day == pd.Timestamp(fdate.year, fdate.month, 1).days_in_month),
                    "lag_1"         : last_sales[-1],
                    "lag_7"         : last_sales[-7]  if len(last_sales) >= 7  else np.mean(last_sales),
                    "lag_14"        : last_sales[-14] if len(last_sales) >= 14 else np.mean(last_sales),
                    "lag_30"        : last_sales[-30] if len(last_sales) >= 30 else np.mean(last_sales),
                    "roll_7"        : float(np.mean(last_sales[-7:])),
                    "roll_30"       : float(np.mean(last_sales[-30:])),
                    "std_7"         : float(np.std(last_sales[-7:])),
                    "promotion_flag": 0,
                    "festive_flag"  : festive,
                    "promo_last_7d" : float(np.sum(last_promo[-7:])),
                }
                row_df = pd.DataFrame([row_feat])[FEATURE_COLS]
                # Two-stage prediction
                clf_v = classifiers.get(variant)
                if isinstance(clf_v, float):
                    sale_prob = clf_v
                elif clf_v is not None:
                    sale_prob = float(clf_v.predict_proba(row_df)[0, 1])
                else:
                    sale_prob = 1.0 # Fallback
                
                qty       = float(regressors[variant].predict(row_df)[0])
                pred      = max(sale_prob * qty, 0)
                daily_preds.append({"date": fdate.strftime("%Y-%m-%d"), "forecast": round(pred, 2)})
                last_sales = np.append(last_sales, pred)
                last_promo = np.append(last_promo, 0)

            forecast_records.append({
                "dealer_id"  : dealer_id,
                "dealer_name": dealer_name_map.get(dealer_id, dealer_id),
                "variant_id" : variant,
                "total_30d"  : round(sum(p["forecast"] for p in daily_preds), 1),
                "model_mape" : metrics[variant]["mape"],
                "daily"      : daily_preds,
            })

    # ── 6. Save output ────────────────────────────────────────────────────────
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    output = {
        "generated_at"    : datetime.now().isoformat(),
        "forecast_horizon": FORECAST_DAYS,
        "data_source"     : "vehicle_sales (database)",
        "training_rows"   : row_count,
        "model_metrics"   : metrics,
        "forecasts"       : forecast_records,
    }
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    summary = {
        "variants_trained"  : len(metrics),
        "dealer_variant_combos": len(forecast_records),
        "avg_mape"          : avg_mape,
        "avg_mae"           : avg_mae,
        "training_rows"     : row_count,
        "generated_at"      : output["generated_at"],
    }
    _update_status(
        "success",
        f"Retrained {len(metrics)} models. Avg MAPE={avg_mape}% | {len(forecast_records)} forecasts saved.",
        metrics=summary,
    )
    logger.info("[retrain] ✅ Complete — avg MAPE=%.1f%%", avg_mape)
    return summary
