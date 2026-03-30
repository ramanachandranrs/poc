import random
from faker import Faker
from sqlalchemy.orm import Session
from models import engine, Base, Dealer, InventoryVehicle, CustomerBooking, SparePart, InventoryPart, Shipment

fake = Faker()

def generate_data():
    # Make sure we create all tables
    Base.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Clear existing data just in case
        session.query(Shipment).delete()
        session.query(InventoryPart).delete()
        session.query(SparePart).delete()
        session.query(CustomerBooking).delete()
        session.query(InventoryVehicle).delete()
        session.query(Dealer).delete()
        session.commit()

        # 1. Generate 10 Dealers
        dealers = []
        for i in range(1, 11):
            dealer = Dealer(
                name=f"Dealer {chr(64+i)}" if i <= 4 else fake.company()[:100],  # A, B, C, D for edge cases
                location=fake.city(),
                capacity=random.randint(50, 200)
            )
            dealers.append(dealer)
        session.add_all(dealers)
        session.commit()
        
        dealer_ids = [d.id for d in dealers]
        dealer_a_id = dealers[0].id
        dealer_b_id = dealers[1].id
        dealer_c_id = dealers[2].id
        dealer_d_id = dealers[3].id

        # 2. Vehicle Models (5 models, 3 variants each)
        models = ["SedanX", "SUV-Y", "Hatch-Z", "Truck-T", "EV-E"]
        variants = ["Standard", "Premium", "Luxury"]
        colors = ["Red", "Blue", "Black", "White", "Silver"]

        # Generate InventoryVehicles
        vehicles = []
        aging_vehicles = []
        for d_id in dealer_ids:
            num_vehicles = random.randint(10, 30)
            for _ in range(num_vehicles):
                model = random.choice(models)
                variant = random.choice(variants)
                
                # Check for Edge Case: 15% overall aging stock > 60 days
                # Let's target dealer A and B heavily for aging stock
                if d_id in [dealer_a_id, dealer_b_id] and random.random() < 0.4:
                    days_in_inventory = random.randint(61, 120)
                else:
                    days_in_inventory = random.randint(1, 59)
                
                vehicle = InventoryVehicle(
                    vin=fake.unique.vin(),
                    dealer_id=d_id,
                    model=model,
                    variant=variant,
                    color=random.choice(colors),
                    days_in_inventory=days_in_inventory,
                    status="Available"
                )
                vehicles.append(vehicle)
                if days_in_inventory > 60 and d_id in [dealer_a_id, dealer_b_id]:
                    aging_vehicles.append(vehicle)

        session.add_all(vehicles)
        session.commit()

        # 3. Mismatched Customer Bookings
        bookings = []
        # Create bookings at Dealer C and D for the aging vehicles generated at Dealer A and B
        for idx, aging_veh in enumerate(aging_vehicles):
            if random.random() < 0.5: # 50% chance to create a mismatch booking
                dest_dealer = dealer_c_id if idx % 2 == 0 else dealer_d_id
                booking = CustomerBooking(
                    dealer_id=dest_dealer,
                    requested_model=aging_veh.model,
                    requested_variant=aging_veh.variant,
                    date_booked=fake.date_between(start_date="-30d", end_date="today"),
                    status="Pending"
                )
                bookings.append(booking)
        
        # Adding some random normal bookings
        for d_id in dealer_ids:
            for _ in range(random.randint(1, 5)):
                booking = CustomerBooking(
                    dealer_id=d_id,
                    requested_model=random.choice(models),
                    requested_variant=random.choice(variants),
                    date_booked=fake.date_between(start_date="-30d", end_date="today"),
                    status="Completed" if random.random() < 0.7 else "Pending"
                )
                bookings.append(booking)
                
        session.add_all(bookings)
        session.commit()

        # 4. Spare Parts (50 SKUs)
        categories = ["Engine", "Brakes", "Suspension", "Electrical", "Body"]
        critical_parts = ["Brake Pads", "Oil Filter", "Spark Plug"]
        
        parts = []
        for i in range(50):
            if i < len(critical_parts):
                part_name = critical_parts[i]
                category = "Brakes" if "Brake" in part_name else "Engine"
            else:
                part_name = f"Part {fake.word().capitalize()}"
                category = random.choice(categories)

            part = SparePart(
                sku=f"SKU-{fake.unique.random_int(min=1000, max=9999)}",
                part_name=part_name,
                category=category,
                unit_cost=round(random.uniform(10.0, 500.0), 2)
            )
            parts.append(part)
        session.add_all(parts)
        session.commit()

        # 5. Inventory Parts
        stockout_dealers = random.sample(dealer_ids, 3) # Select 3 random dealers for stockout
        inventory_parts = []
        
        for p in parts:
            for d_id in dealer_ids:
                # Add edge cases: Set quantity_on_hand to 0 for critical parts at 3 dealers
                if p.part_name in critical_parts and d_id in stockout_dealers:
                    qty = 0
                else:
                    qty = random.randint(5, 100)
                    
                inv_part = InventoryPart(
                    dealer_id=d_id,
                    sku=p.sku,
                    quantity_on_hand=qty,
                    floorplan_interest_rate=round(random.uniform(1.5, 5.0), 2)
                )
                inventory_parts.append(inv_part)
                
        session.add_all(inventory_parts)
        session.commit()

        # 6. Shipments
        shipments = []
        for _ in range(20):
            status = "In Transit"
            expected_date = fake.date_between(start_date="-5d", end_date="+10d")
            
            # 10% past due shipments
            if random.random() < 0.1:
                expected_date = fake.date_between(start_date="-10d", end_date="-1d")
                status = "Delayed"
                
            shipment = Shipment(
                vin=fake.unique.vin(),
                origin="Manesar Rail",
                destination_dealer_id=random.choice(dealer_ids),
                status=status,
                expected_delivery_date=expected_date
            )
            shipments.append(shipment)
            
        session.add_all(shipments)
        session.commit()
    
    print("Synthetic data generated successfully, including specified edge cases!")

if __name__ == "__main__":
    generate_data()
