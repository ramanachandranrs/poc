import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_trends():
    # Login as admin
    login_data = {"username": "admin@maruti.com", "password": "admin123"}
    r = requests.post(f"{BASE_URL}/token", data=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
    
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get trends
    r = requests.get(f"{BASE_URL}/api/v1/overview/trends", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Data: {json.dumps(r.json()[:3], indent=2)} ... total {len(r.json())} items")

if __name__ == "__main__":
    test_trends()
