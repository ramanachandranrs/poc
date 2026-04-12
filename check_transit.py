import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM shipments")
print("Total shipments:", cur.fetchone()[0])

cur.execute("""
SELECT status, COUNT(*) as cnt
FROM shipments
GROUP BY status
ORDER BY cnt DESC
""")
print("\nBy status:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.execute("""
SELECT transport_mode, COUNT(*) as cnt
FROM shipments
GROUP BY transport_mode
ORDER BY cnt DESC
""")
print("\nBy transport mode:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.execute("""
SELECT zone, COUNT(*) as cnt
FROM shipments
GROUP BY zone
ORDER BY cnt DESC
""")
print("\nBy zone:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
