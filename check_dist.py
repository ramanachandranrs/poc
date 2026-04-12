import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()
cur.execute("""
SELECT 
  CASE 
    WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) < 30 THEN 'Fresh'
    WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) < 60 THEN 'Watch'
    WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) < 90 THEN 'Aging'
    ELSE 'Critical'
  END as bucket,
  COUNT(*) as cnt,
  MIN(CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER)) as min_days,
  MAX(CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER)) as max_days
FROM vehicles
WHERE stock_arrival_date IS NOT NULL
GROUP BY bucket
""")
for row in cur.fetchall():
    print(row)
conn.close()
