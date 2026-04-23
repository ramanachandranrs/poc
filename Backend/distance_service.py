"""
distance_service.py
-------------------
Provides real road distances between dealer cities by querying
the routes table. Falls back to straight-line estimate if not found.
"""
from functools import lru_cache
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_distance_km(origin_city: str, dest_city: str, db: Session) -> float:
    """Return road distance in km between two cities from the routes table."""
    if not origin_city or not dest_city or origin_city == dest_city:
        return 0.0

    row = db.execute(text("""
        SELECT distance_km FROM routes
        WHERE origin_city = :origin AND destination_city = :dest
          AND distance_km IS NOT NULL AND distance_km > 0
        LIMIT 1
    """), {"origin": origin_city, "dest": dest_city}).fetchone()

    if row:
        return float(row.distance_km)

    # Try reverse direction
    row = db.execute(text("""
        SELECT distance_km FROM routes
        WHERE origin_city = :dest AND destination_city = :origin
          AND distance_km IS NOT NULL AND distance_km > 0
        LIMIT 1
    """), {"origin": origin_city, "dest": dest_city}).fetchone()

    if row:
        return float(row.distance_km)

    # Fallback: 500 km default
    return 500.0


TRANSPORT_COST_PER_KM = 12  # ₹12/km


def get_transport_cost(origin_city: str, dest_city: str, db: Session) -> float:
    """Return estimated transport cost in INR between two cities."""
    km = get_distance_km(origin_city, dest_city, db)
    return round(max(km, 50) * TRANSPORT_COST_PER_KM, 2)
