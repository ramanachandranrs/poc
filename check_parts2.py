import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

# How many dealer-part combinations exist
cur.execute("""
SELECT COUNT(*) FROM (
    SELECT dealer_id, part_number FROM demand_records GROUP BY dealer_id, part_number
)
""")
print("Unique dealer-part combos:", cur.fetchone()[0])

# Sample per-dealer stock
cur.execute("""
SELECT d.dealer_id, d.dealer_name, p.description, p.category_group,
    SUM(dr.on_hand_qty) as on_hand,
    AVG(dr.reorder_point) as rop,
    AVG(dr.stockout_flag) as stockout_rate
FROM demand_records dr
JOIN parts p ON p.part_number = dr.part_number
JOIN dealers d ON d.dealer_id = dr.dealer_id
GROUP BY dr.dealer_id, dr.part_number
ORDER BY on_hand ASC
LIMIT 10
""")
print("\nSample per-dealer-part stock (lowest on_hand):")
for row in cur.fetchall():
    critical = row[4] < row[5]
    print(f"  {row[1][:20]:<20} | {row[2][:25]:<25} | on_hand={int(row[4])} | ROP={int(row[5])} | {'STOCKOUT' if critical else 'ok'}")

# Count stockouts per dealer
cur.execute("""
SELECT COUNT(*) FROM (
    SELECT dealer_id, part_number
    FROM demand_records
    GROUP BY dealer_id, part_number
    HAVING SUM(on_hand_qty) < AVG(reorder_point)
)
""")
print("\nDealer-part combos below ROP:", cur.fetchone()[0])

conn.close()
