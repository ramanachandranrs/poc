import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

cur.execute("""
SELECT d.dealer_id, d.dealer_name, COUNT(s.shipment_id) as shipment_count
FROM dealers d
LEFT JOIN shipments s ON s.dealer_id = d.dealer_id
GROUP BY d.dealer_id, d.dealer_name
ORDER BY d.dealer_id
""")
print("Dealer shipment counts:")
for row in cur.fetchall():
    status = "NO SHIPMENTS" if row[2] == 0 else f"{row[2]} shipments"
    print(f"  {row[0]} {row[1]}: {status}")

conn.close()
