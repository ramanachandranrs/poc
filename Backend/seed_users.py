import os
from sqlalchemy.orm import Session
import models
from auth import get_password_hash

def seed_users():
    db = Session(models.engine)
    try:
        # Create tables if they don't exist
        models.Base.metadata.create_all(models.engine)

        # Check if users already exist
        if db.query(models.AppUser).count() > 0:
            print("Users already seeded.")
            return

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
                username="dealer_delhi_1@maruti.com",
                hashed_password=get_password_hash("secret123"),
                role=models.UserRole.USER,
                dealer_id="DLR001" # Make sure this matches an existing dealer or it might cause issues later, DLR001 is common in mock data
            )
        ]

        # Let's dynamically find a valid dealer_id for the dealer user just to be safe
        first_dealer = db.query(models.Dealer).first()
        if first_dealer:
            users_to_seed[2].dealer_id = first_dealer.dealer_id
            print(f"Assigned dealer_id {first_dealer.dealer_id} to dealer user.")

        db.add_all(users_to_seed)
        db.commit()
        print("Successfully seeded users.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
