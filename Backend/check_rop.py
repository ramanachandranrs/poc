import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

# Check ROP values in parts master table
cur.execute("""
SELECT category_group, MIN(reorder_point), MAX(reorder_point), AVG(reorder_point)
FROM parts
GROUP BY category_group
""")
print("ROP in parts master table by category:")
for row in cur.fetchall():
    print(f"  {row[0]}: min={row[1]}, max={row[2]}, avg={round(row[3],1)}")

# Check ROP values in demand_records
cur.execute("""
SELECT category_group, MIN(reorder_point), MAX(reorder_point), AVG(reorder_point)
FROM demand_records
GROUP BY category_group
""")
print("\nROP in demand_records by category:")
for row in cur.fetchall():
    print(f"  {row[0]}: min={row[1]}, max={row[2]}, avg={round(row[3],1)}")

# Check what the API actually returns (coalesce logic)
cur.execute("""
SELECT p.part_number, p.description, p.category_group,
    p.reorder_point as parts_rop,
    AVG(d.reorder_point) as demand_rop
FROM parts p
LEFT JOIN demand_records d ON d.part_number = p.part_number
GROUP BY p.part_number
LIMIT 10
""")
print("\nSample - parts_rop vs demand_rop:")
for row in cur.fetchall():
    print(f"  {row[1][:30]:<30} | parts_rop={row[3]} | demand_rop={round(row[4],1) if row[4] else 'NULL'}")

conn.close()
