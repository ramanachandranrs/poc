import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM vehicles WHERE dealer_id IS NULL')
print("NULL dealer_id:", cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM vehicles WHERE dealer_id IS NOT NULL')
print("Has dealer_id:", cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM vehicles')
print("Total vehicles:", cur.fetchone()[0])

cur.execute("""
SELECT 
  CASE 
    WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) <= 60 THEN 'Available'
    ELSE 'Aging'
  END as status,
  COUNT(*) as cnt
FROM vehicles
WHERE stock_arrival_date IS NOT NULL AND dealer_id IS NOT NULL
GROUP BY status
""")
print("Status distribution:", cur.fetchall())

conn.close()
