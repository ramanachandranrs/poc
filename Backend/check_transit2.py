import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

print('=== DELAYED with real delay calculation ===')
cur.execute("""
    SELECT shipment_id, status, expected_arrival, actual_arrival,
        CASE
            WHEN actual_arrival IS NOT NULL AND expected_arrival IS NOT NULL
                 AND actual_arrival > expected_arrival
            THEN CAST(julianday(actual_arrival) - julianday(expected_arrival) AS INTEGER)
            WHEN status IN ('Delayed', 'Past Due') AND delay_days > 0
            THEN delay_days
            WHEN status IN ('Delayed', 'Past Due')
            THEN CAST(julianday('2025-12-31') - julianday(expected_arrival) AS INTEGER)
            ELSE 0
        END AS real_delay
    FROM shipments
    WHERE status IN ('Delayed', 'Past Due')
    ORDER BY real_delay DESC
    LIMIT 15
""")
for r in cur.fetchall(): print(r)
conn.close()
