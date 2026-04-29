from fastapi.testclient import TestClient
from main import app
import models
from sqlalchemy.orm import Session

client = TestClient(app)

def test_token_endpoint():
    # Verify user exists and get password from credentials.csv if possible or just use what we know
    # From credentials.csv: dlr_maruti_dlr001@maruti.com / snwqhRN4
    response = client.post("/token", data={"username": "dlr_maruti_dlr001@maruti.com", "password": "snwqhRN4"})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_token_endpoint()
