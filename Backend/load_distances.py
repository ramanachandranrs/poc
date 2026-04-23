"""
load_distances.py
-----------------
Loads real road distances (from city_distances.json) into the
routes table in dealer_network.db.
Existing routes are preserved; city-pair routes are upserted.
"""
import json
from sqlalchemy import text
from sqlalchemy.orm import Session
from models import engine

with open("city_distances.json", encoding="utf-8") as f:
    raw = json.load(f)  # keys like "Chennai -> Pune": 915

with Session(engine) as db:
    # Remove old city-pair routes (keep warehouse/logistics routes)
    db.execute(text("""
        DELETE FROM routes
        WHERE route_type = 'city_pair'
    """))

    inserted = 0
    for key, km in raw.items():
        origin, dest = key.split(" -> ")
        route_id = f"CP_{origin[:4].upper()}_{dest[:4].upper()}"
        db.execute(text("""
            INSERT OR REPLACE INTO routes
                (route_id, route_type, origin_city, destination_city, distance_km, active)
            VALUES
                (:route_id, 'city_pair', :origin, :dest, :km, 'Y')
        """), {"route_id": route_id, "origin": origin, "dest": dest, "km": km})
        inserted += 1

    db.commit()
    print(f"Inserted {inserted} city-pair routes into routes table.")

    total = db.execute(text("SELECT COUNT(*) FROM routes")).scalar()
    print(f"Total routes in DB: {total}")
