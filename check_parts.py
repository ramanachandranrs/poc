import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM parts')
print("Total unique parts (SKUs):", cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM demand_records')
print("Total demand records:", cur.fetchone()[0])

cur.execute("""
SELECT category_group, COUNT(*) as cnt
FROM parts
GROUP BY category_group
ORDER BY cnt DESC
""")
print("\nParts by category:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.execute("""
SELECT 
    p.part_number,
    p.description,
    p.category_group,
    COALESCE(SUM(d.on_hand_qty), 0) as total_on_hand,
    p.reorder_point
FROM parts p
LEFT JOIN demand_records d ON d.part_number = p.part_number
GROUP BY p.part_number
ORDER BY total_on_hand ASC
LIMIT 5
""")
print("\nLowest stock parts:")
for row in cur.fetchall():
    print(f"  {row[1]} | on_hand={row[3]} | ROP={row[4]}")

conn.close()
