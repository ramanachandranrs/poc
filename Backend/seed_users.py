import os
from sqlalchemy.orm import Session
import models
from auth import get_password_hash

def seed_users():
    db = Session(models.engine)
    try:
        # Create tables if they don't exist
        models.Base.metadata.create_all(models.engine)

        # Clear existing users to avoid duplicates during this expansion
        db.query(models.AppUser).delete()

        # 1. Add Admin and Regional Managers
        users_to_seed = [
            models.AppUser(
                username="admin@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.ADMIN,
            ),
            models.AppUser(
                username="north_manager@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.MANAGER,
                zone="North"
            ),
            models.AppUser(
                username="west_manager@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.MANAGER,
                zone="West"
            ),
            models.AppUser(
                username="south_manager@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.MANAGER,
                zone="South"
            ),
            models.AppUser(
                username="east_manager@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.MANAGER,
                zone="East"
            )
        ]

        # 2. Add a user for EVERY dealer in the database
        all_dealers = db.query(models.Dealer).all()
        for dealer in all_dealers:
            clean_name = "".join(c if c.isalnum() else "_" for c in dealer.dealer_name.lower()).strip("_")
            username = f"user_{clean_name}@{dealer.dealer_id.lower()}.com"
            
            users_to_seed.append(
                models.AppUser(
                    username=username,
                    hashed_password=get_password_hash("secret123"),
                    role=models.UserRole.USER,
                    dealer_id=dealer.dealer_id
                )
            )

        db.add_all(users_to_seed)
        db.commit()
        print(f"Successfully seeded {len(users_to_seed)} users (1 Admin, 4 Managers, {len(all_dealers)} Dealers).")

    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
