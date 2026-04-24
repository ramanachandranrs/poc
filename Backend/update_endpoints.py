import os

main_py_path = r"c:\Users\RamanachandranRS\Professional\New folder\poc\Backend\main.py"
with open(main_py_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Parts Summary
old_parts_summary = """@app.get("/api/v1/sap/parts/summary")
def get_parts_summary(db: Session = Depends(get_db)):
    rows = db.execute(text(\"\"\"
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN on_hand < rop THEN 1 ELSE 0 END) as stockout,
            SUM(CASE WHEN on_hand >= rop THEN 1 ELSE 0 END) as adequate
        FROM (
            SELECT dealer_id, part_number,
                SUM(on_hand_qty) as on_hand,
                AVG(reorder_point) as rop
            FROM demand_records
            GROUP BY dealer_id, part_number
        )
    \"\"\")).fetchone()
    sku_count = db.execute(text("SELECT COUNT(*) FROM parts")).fetchone()[0]
    return {
        "total_dealer_part_combos": rows.total,
        "stockout": rows.stockout,
        "adequate": rows.adequate,
        "unique_skus": sku_count,
    }"""

new_parts_summary = """@app.get("/api/v1/sap/parts/summary")
def get_parts_summary(db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    scope = get_scope_condition(current_user, dealer_field="dr.dealer_id", zone_field="d.zone")
    rows = db.execute(text(f\"\"\"
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN on_hand < rop THEN 1 ELSE 0 END) as stockout,
            SUM(CASE WHEN on_hand >= rop THEN 1 ELSE 0 END) as adequate
        FROM (
            SELECT dr.dealer_id, dr.part_number,
                SUM(dr.on_hand_qty) as on_hand,
                AVG(dr.reorder_point) as rop
            FROM demand_records dr
            JOIN dealers d ON d.dealer_id = dr.dealer_id
            WHERE {scope}
            GROUP BY dr.dealer_id, dr.part_number
        )
    \"\"\")).fetchone()
    sku_count = db.execute(text("SELECT COUNT(*) FROM parts")).fetchone()[0]
    return {
        "total_dealer_part_combos": rows.total or 0,
        "stockout": rows.stockout or 0,
        "adequate": rows.adequate or 0,
        "unique_skus": sku_count,
    }"""
content = content.replace(old_parts_summary, new_parts_summary)

# 2. Update Transit Summary
old_transit_summary = """@app.get("/api/v1/rail/transit/summary")
def get_transit_summary(db: Session = Depends(get_db)):
    row = db.execute(text(\"\"\"
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) as in_transit,
            SUM(CASE WHEN status = 'Delivered'  THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status IN ('Delayed', 'Past Due') THEN 1 ELSE 0 END) as delayed
        FROM shipments
    \"\"\")).fetchone()
    return {
        "total": row.total,
        "in_transit": row.in_transit,
        "delivered": row.delivered,
        "delayed": row.delayed,
    }"""

new_transit_summary = """@app.get("/api/v1/rail/transit/summary")
def get_transit_summary(db: Session = Depends(get_db), current_user: models.AppUser = Depends(get_current_active_user)):
    scope = get_scope_condition(current_user, dealer_field="dealer_id", zone_field="zone")
    row = db.execute(text(f\"\"\"
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) as in_transit,
            SUM(CASE WHEN status = 'Delivered'  THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status IN ('Delayed', 'Past Due') THEN 1 ELSE 0 END) as delayed
        FROM shipments
        WHERE {scope}
    \"\"\")).fetchone()
    return {
        "total": row.total or 0,
        "in_transit": row.in_transit or 0,
        "delivered": row.delivered or 0,
        "delayed": row.delayed or 0,
    }"""
content = content.replace(old_transit_summary, new_transit_summary)

with open(main_py_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated main.py endpoints")
