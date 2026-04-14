import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

print('=== Total routes ===')
cur.execute('SELECT COUNT(*) FROM routes')
print(cur.fetchone()[0])

print('\n=== Sample routes with distance ===')
cur.execute('SELECT origin_city, destination_city, distance_km FROM routes WHERE distance_km > 0 LIMIT 15')
for r in cur.fetchall(): print(r)

print('\n=== Routes with missing/zero distance ===')
cur.execute('SELECT COUNT(*) FROM routes WHERE distance_km IS NULL OR distance_km = 0')
print(cur.fetchone()[0])

print('\n=== Dealer cities ===')
cur.execute('SELECT DISTINCT city FROM dealers ORDER BY city')
for r in cur.fetchall(): print(r[0])

print('\n=== Do dealer city pairs exist in routes? ===')
cur.execute("""
    SELECT d1.city as from_city, d2.city as to_city,
           r.distance_km
    FROM dealers d1
    JOIN dealers d2 ON d1.dealer_id != d2.dealer_id
    LEFT JOIN routes r ON r.origin_city = d1.city AND r.destination_city = d2.city
    WHERE d1.dealer_id = 'DLR001'
    LIMIT 10
""")
for r in cur.fetchall(): print(r)

conn.close()
