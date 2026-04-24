from sqlalchemy.orm import Session
import models

def get_db():
    db = Session(models.engine)
    try:
        yield db
    finally:
        db.close()
