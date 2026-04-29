import bcrypt
import models
from sqlalchemy.orm import Session

def test_login(username, password):
    db = Session(models.engine)
    user = db.query(models.AppUser).filter(models.AppUser.username == username).first()
    if not user:
        print(f"User {username} not found")
        return
    
    print(f"Hash in DB: {user.hashed_password}")
    is_valid = bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8'))
    print(f"Password '{password}' is valid: {is_valid}")
    db.close()

if __name__ == "__main__":
    test_login("dlr_maruti_dlr001@maruti.com", "qLS5TUl8")
