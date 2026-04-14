import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

print('=== DELAYED shipments sample ===')
cur.execute("""
    SELECT shipment_id, status, delay_days, expected_arrival, actual_arrival,
           origin_city, destination_city
    FROM shipments
    WHERE status IN ('Delayed', 'Past Due')
    ORDER BY delay_days ASC
    LIMIT 15
""")
for r in cur.fetchall(): print(r)

print()
print('=== delay_days distribution for DELAYED ===')
cur.execute("""
    SELECT delay_days, COUNT(*) as cnt
    FROM shipments
    WHERE status IN ('Delayed', 'Past Due')
    GROUP BY delay_days
    ORDER BY delay_days ASC
    LIMIT 20
""")
for r in cur.fetchall(): print(r)

print()
print('=== Same origin+destination (Pune->Pune)? ===')
cur.execute("""
    SELECT shipment_id, origin_city, destination_city, origin_name, destination_name, status, delay_days
    FROM shipments
    WHERE origin_city = destination_city
    LIMIT 10
""")
for r in cur.fetchall(): print(r)

conn.close()
