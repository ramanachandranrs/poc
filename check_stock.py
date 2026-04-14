import sqlite3
conn = sqlite3.connect('dealer_network.db')
cur = conn.cursor()

print('=== TOTAL VEHICLES ===')
cur.execute('SELECT COUNT(*) FROM vehicles')
print('Total VINs:', cur.fetchone()[0])

print('\n=== SOLD (in vehicle_sales) ===')
cur.execute('SELECT COUNT(*) FROM vehicle_sales')
print('Sold:', cur.fetchone()[0])

print('\n=== UNSOLD (NOT in vehicle_sales) ===')
cur.execute("""
    SELECT COUNT(*) FROM vehicles v
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_sales s WHERE s.chassis_number = v.chassis_number)
""")
print('Unsold / True showroom stock:', cur.fetchone()[0])

print('\n=== UNSOLD breakdown by days since arrival (ref: 2025-12-31) ===')
cur.execute("""
    SELECT
        SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) < 30  THEN 1 ELSE 0 END),
        SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) BETWEEN 30 AND 59 THEN 1 ELSE 0 END),
        SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) BETWEEN 60 AND 89 THEN 1 ELSE 0 END),
        SUM(CASE WHEN CAST(julianday('2025-12-31') - julianday(stock_arrival_date) AS INTEGER) >= 90  THEN 1 ELSE 0 END)
    FROM vehicles v
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_sales s WHERE s.chassis_number = v.chassis_number)
""")
r = cur.fetchone()
print(f'  Fresh   (<30d) : {r[0]}')
print(f'  Watch  (30-59d): {r[1]}')
print(f'  Aging  (60-89d): {r[2]}')
print(f'  Critical (90d+): {r[3]}')

print('\n=== Top 10 longest-sitting UNSOLD vehicles ===')
cur.execute("""
    SELECT v.chassis_number, v.model_code, v.variant_id, v.fuel_type, v.dealer_id,
           v.stock_arrival_date,
           CAST(julianday('2025-12-31') - julianday(v.stock_arrival_date) AS INTEGER) as days
    FROM vehicles v
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_sales s WHERE s.chassis_number = v.chassis_number)
    ORDER BY days DESC
    LIMIT 10
""")
for r in cur.fetchall():
    print(r)

print('\n=== vehicle_sales sample (stock_arrival_date present?) ===')
cur.execute('SELECT chassis_number, model_code, sale_date, stock_arrival_date, days_to_sell FROM vehicle_sales LIMIT 5')
for r in cur.fetchall():
    print(r)

conn.close()
