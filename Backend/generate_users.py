import os
import csv
import string
import random
from sqlalchemy.orm import Session
import bcrypt

# Ensure we're running from Backend dir
os.chdir(r"c:\Users\RamanachandranRS\Professional\New folder\poc\Backend")

import models

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def generate_random_password(length=8):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

def run():
    db = Session(models.engine)
    
    # 1. Clear existing users
    db.query(models.AppUser).delete()
    
    csv_data = []
    headers = ["Type", "Name/Code", "Username", "Password", "Zone", "Dealer ID"]
    
    users_to_insert = []
    
    # 2. Mother Warehouse
    admin_pw = "admin123"
    users_to_insert.append(models.AppUser(
        username="admin@maruti.com",
        hashed_password=get_password_hash(admin_pw),
        role=models.UserRole.ADMIN
    ))
    csv_data.append(["Mother Warehouse", "Admin HQ", "admin@maruti.com", admin_pw, "", ""])
    
    # 3. Regional Distributors
    zones = ["North", "East", "West", "South", "Central"]
    for zone in zones:
        pw = generate_random_password()
        username = f"manager_{zone.lower()}@maruti.com"
        users_to_insert.append(models.AppUser(
            username=username,
            hashed_password=get_password_hash(pw),
            role=models.UserRole.MANAGER,
            zone=zone
        ))
        csv_data.append(["Regional Distributor", f"{zone} Region", username, pw, zone, ""])
        
    # 4. Dealerships
    dealers = db.query(models.Dealer).all()
    for d in dealers:
        pw = generate_random_password()
        # Clean up dealer name for username
        safe_name = "".join(c if c.isalnum() else "" for c in d.dealer_name.split()[0].lower())
        username = f"dlr_{safe_name}_{d.dealer_id.lower()}@maruti.com"
        
        users_to_insert.append(models.AppUser(
            username=username,
            hashed_password=get_password_hash(pw),
            role=models.UserRole.USER,
            dealer_id=d.dealer_id,
            zone=d.zone
        ))
        csv_data.append(["Dealership", d.dealer_name, username, pw, d.zone, d.dealer_id])
        
    db.add_all(users_to_insert)
    db.commit()
    db.close()
    
    # 5. Write CSV
    csv_path = r"c:\Users\RamanachandranRS\Professional\New folder\poc\credentials.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(csv_data)
        
    print(f"Successfully generated {len(csv_data)} credentials.")
    print(f"Saved to {csv_path}")

if __name__ == "__main__":
    run()
