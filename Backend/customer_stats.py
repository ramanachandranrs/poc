import models
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, text

def get_customer_stats():
    db = Session(models.engine)
    
    # 1. Total unique customers
    total_customers = db.query(models.Customer).count()
    print(f"Total Customers in Master: {total_customers}")
    
    # 2. Breakup by Dealer (Any interaction)
    # We'll use a SQL UNION to get all (customer, dealer) pairs from interactions
    dealer_breakup = db.execute(text("""
        SELECT dealer_id, COUNT(DISTINCT customer_id) as count
        FROM (
            SELECT customer_id, dealer_id FROM vehicles
            UNION
            SELECT customer_id, dealer_id FROM vehicle_sales
            UNION
            SELECT customer_id, dealer_id FROM job_cards
            UNION
            SELECT customer_id, dealer_id FROM bookings
        )
        GROUP BY dealer_id
        ORDER BY count DESC
    """)).fetchall()
    
    print("\nCustomer Count by Dealership:")
    for row in dealer_breakup[:10]: # Top 10
        print(f"  {row.dealer_id}: {row.count}")
    print(f"  ... (Total dealers: {len(dealer_breakup)})")

    # 3. Breakup by Zone
    zone_breakup = db.execute(text("""
        SELECT d.zone, COUNT(DISTINCT i.customer_id) as count
        FROM (
            SELECT customer_id, dealer_id FROM vehicles
            UNION
            SELECT customer_id, dealer_id FROM vehicle_sales
            UNION
            SELECT customer_id, dealer_id FROM job_cards
            UNION
            SELECT customer_id, dealer_id FROM bookings
        ) i
        JOIN dealers d ON i.dealer_id = d.dealer_id
        GROUP BY d.zone
        ORDER BY count DESC
    """)).fetchall()
    
    print("\nCustomer Count by Region (Zone):")
    for row in zone_breakup:
        print(f"  {row.zone}: {row.count}")
    
    db.close()

if __name__ == "__main__":
    get_customer_stats()
