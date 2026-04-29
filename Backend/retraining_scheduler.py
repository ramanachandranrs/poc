"""
retraining_scheduler.py
-----------------------
Background thread that watches for new vehicle_sales inserts
and triggers auto-retraining when enough new data accumulates.

Strategy:
  - On startup, record current sales count as baseline.
  - Every POLL_INTERVAL_SECONDS, compare count to baseline.
  - If NEW_ROWS_THRESHOLD new rows detected → trigger retrain.
  - After retrain, update baseline + invalidate forecast cache.
  - Debounce: never retrain more than once every MIN_RETRAIN_INTERVAL_HOURS.
"""

import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Callable, Optional

from sqlalchemy import text

import models

logger = logging.getLogger("retrain_scheduler")

# ── Configuration ─────────────────────────────────────────────────────────────
POLL_INTERVAL_SECONDS    = 60          # check DB every 60 s
NEW_ROWS_THRESHOLD       = 50          # trigger if ≥50 new sales inserted
MIN_RETRAIN_INTERVAL_HOURS = 1         # never retrain more than once per hour

_scheduler_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_last_retrain_time: Optional[datetime] = None
_baseline_count: int = 0
_cache_invalidator: Optional[Callable] = None  # injected from main.py


def _get_sales_count() -> int:
    """Return total rows in vehicle_sales table."""
    try:
        with models.engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM vehicle_sales"))
            return result.scalar() or 0
    except Exception as e:
        logger.error("Error counting sales rows: %s", e)
        return 0


def _do_retrain() -> None:
    """Run retraining in the current thread and invalidate forecast cache."""
    global _last_retrain_time
    try:
        logger.info("[scheduler] Starting auto-retrain…")
        from ml_retraining import run_retraining
        summary = run_retraining()
        _last_retrain_time = datetime.now()
        logger.info("[scheduler] Retrain complete: %s", summary)

        # Invalidate the in-memory forecast cache in main.py
        if _cache_invalidator:
            _cache_invalidator()
            logger.info("[scheduler] Forecast cache invalidated.")

    except Exception as e:
        logger.error("[scheduler] Retrain failed: %s", e, exc_info=True)


def _scheduler_loop() -> None:
    global _baseline_count

    logger.info("[scheduler] Starting. Baseline sales count: %d", _baseline_count)

    while not _stop_event.is_set():
        time.sleep(POLL_INTERVAL_SECONDS)
        if _stop_event.is_set():
            break

        try:
            current_count = _get_sales_count()
            new_rows = current_count - _baseline_count

            if new_rows >= NEW_ROWS_THRESHOLD:
                now = datetime.now()
                # Debounce check
                if _last_retrain_time and (now - _last_retrain_time) < timedelta(hours=MIN_RETRAIN_INTERVAL_HOURS):
                    logger.info(
                        "[scheduler] %d new rows detected but debounced (last retrain %s ago).",
                        new_rows,
                        now - _last_retrain_time,
                    )
                else:
                    logger.info(
                        "[scheduler] %d new sales rows detected (threshold=%d). Triggering retrain…",
                        new_rows, NEW_ROWS_THRESHOLD,
                    )
                    _do_retrain()
                    # Update baseline AFTER successful retrain
                    _baseline_count = _get_sales_count()
            else:
                logger.debug("[scheduler] %d new rows (need %d). No retrain.", new_rows, NEW_ROWS_THRESHOLD)

        except Exception as e:
            logger.error("[scheduler] Loop error: %s", e, exc_info=True)

    logger.info("[scheduler] Stopped.")


def start_scheduler(cache_invalidator: Optional[Callable] = None) -> None:
    """Start the background scheduler thread. Call once on app startup."""
    global _scheduler_thread, _stop_event, _baseline_count, _cache_invalidator

    _cache_invalidator = cache_invalidator
    _baseline_count    = _get_sales_count()
    _stop_event.clear()

    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        name="ml-retrain-scheduler",
        daemon=True,   # auto-dies when main process exits
    )
    _scheduler_thread.start()
    logger.info("[scheduler] Started (baseline=%d rows, threshold=%d, poll=%ds).",
                _baseline_count, NEW_ROWS_THRESHOLD, POLL_INTERVAL_SECONDS)


def stop_scheduler() -> None:
    """Signal the scheduler to stop (called on app shutdown)."""
    _stop_event.set()
    if _scheduler_thread and _scheduler_thread.is_alive():
        _scheduler_thread.join(timeout=5)
    logger.info("[scheduler] Shutdown complete.")


def get_scheduler_status() -> dict:
    """Return current scheduler state for the API status endpoint."""
    return {
        "running"             : _scheduler_thread is not None and _scheduler_thread.is_alive(),
        "baseline_count"      : _baseline_count,
        "current_count"       : _get_sales_count(),
        "new_rows_since_baseline": _get_sales_count() - _baseline_count,
        "retrain_threshold"   : NEW_ROWS_THRESHOLD,
        "poll_interval_seconds": POLL_INTERVAL_SECONDS,
        "min_retrain_interval_hours": MIN_RETRAIN_INTERVAL_HOURS,
        "last_retrain"        : _last_retrain_time.isoformat() if _last_retrain_time else None,
    }
