from fastapi.testclient import TestClient
from main import app
import models
from sqlalchemy.orm import Session

client = TestClient(app)

def test_endpoint():
    # Login as admin
    response = client.post("/token", data={"username": "admin@maruti.com", "password": "admin123"})
    token = response.json()["access_token"]
    res = client.get("/api/v1/forecast/summary", headers={"Authorization": f"Bearer {token}"})
    data = res.json()
    print("Admin: Combos =", data.get("total_dealer_variant_combos"))
    
    # Login as manager_north
    response = client.post("/token", data={"username": "manager_north@maruti.com", "password": "ERmHmys1"})
    token = response.json()["access_token"]
    res = client.get("/api/v1/forecast/summary", headers={"Authorization": f"Bearer {token}"})
    data = res.json()
    print("Manager North: Combos =", data.get("total_dealer_variant_combos"))
    
    # Login as DLR001
    response = client.post("/token", data={"username": "dlr_maruti_dlr001@maruti.com", "password": "snwqhRN4"})
    token = response.json()["access_token"]
    res = client.get("/api/v1/forecast/summary", headers={"Authorization": f"Bearer {token}"})
    data = res.json()
    print("DLR001: Combos =", data.get("total_dealer_variant_combos"))

if __name__ == "__main__":
    test_endpoint()
