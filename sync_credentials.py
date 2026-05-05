import sys
import os
import csv
from sqlalchemy.orm import Session

# Add Backend to path to import models
sys.path.append(os.path.join(os.getcwd(), 'Backend'))
import models

def sync():
    db = Session(models.engine)
    try:
        dealers = {d.dealer_id: d for d in db.query(models.Dealer).all()}
        users = db.query(models.AppUser).all()
        
        type_map = {
            'mother_warehouse': 'Mother Warehouse',
            'regional_distributor': 'Regional Distributor',
            'dealership': 'Dealership'
        }
        
        with open('credentials.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Type', 'Name/Code', 'Username', 'Password', 'Zone', 'Dealer ID'])
            
            for u in users:
                # Handle enum or string role
                role_val = u.role.value if hasattr(u.role, 'value') else str(u.role).split('.')[-1].lower()
                row_type = type_map.get(role_val, role_val)
                
                if role_val == 'mother_warehouse' or role_val == 'admin':
                    name = 'Admin HQ'
                elif role_val == 'regional_distributor' or role_val == 'manager':
                    name = f"{u.zone} Region"
                else:
                    dealer = dealers.get(u.dealer_id)
                    name = dealer.dealer_name if dealer else u.username
                
                writer.writerow([
                    row_type,
                    name,
                    u.username,
                    'secret123',
                    u.zone or '',
                    u.dealer_id or ''
                ])
        print(f"Successfully synced {len(users)} users to credentials.csv")
    finally:
        db.close()

if __name__ == "__main__":
    sync()
