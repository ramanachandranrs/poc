"""
fetch_distances.py
------------------
Fetches real road distances between all 30 dealer cities using
OpenRouteService Matrix API, then saves city_distances.json
and patches main.py with the CITY_DISTANCES dict.

Usage:
    python fetch_distances.py YOUR_API_KEY
"""

import sys
import json
import requests

API_KEY = sys.argv[1] if len(sys.argv) > 1 else "PASTE_YOUR_KEY_HERE"

CITIES = {
    "Ahmedabad":     [72.5714, 23.0225],
    "Bengaluru":     [77.5946, 12.9716],
    "Bhopal":        [77.4126, 23.2599],
    "Bhubaneswar":   [85.8245, 20.2961],
    "Chennai":       [80.2707, 13.0827],
    "Coimbatore":    [76.9558, 11.0168],
    "Delhi":         [77.2090, 28.6139],
    "Gurugram":      [77.0266, 28.4595],
    "Guwahati":      [91.7362, 26.1445],
    "Hyderabad":     [78.4867, 17.3850],
    "Indore":        [75.8577, 22.7196],
    "Jaipur":        [75.7873, 26.9124],
    "Jodhpur":       [73.0243, 26.2389],
    "Kochi":         [76.2673,  9.9312],
    "Kolkata":       [88.3639, 22.5726],
    "Lucknow":       [80.9462, 26.8467],
    "Ludhiana":      [75.8573, 30.9010],
    "Madurai":       [78.1198,  9.9252],
    "Mumbai":        [72.8777, 19.0760],
    "Mysuru":        [76.6394, 12.2958],
    "Nagpur":        [79.0882, 21.1458],
    "Patna":         [85.1376, 25.5941],
    "Pune":          [73.8567, 18.5204],
    "Raipur":        [81.6296, 21.2514],
    "Ranchi":        [85.3096, 23.3441],
    "Siliguri":      [88.3953, 26.7271],
    "Surat":         [72.8311, 21.1702],
    "Varanasi":      [82.9739, 25.3176],
    "Vijayawada":    [80.6480, 16.5062],
    "Visakhapatnam": [83.2185, 17.6868],
}

city_names = list(CITIES.keys())
coords = [CITIES[name] for name in city_names]

print(f"Fetching distance matrix for {len(city_names)} cities ({len(city_names)**2 - len(city_names)} pairs)...")

url = "https://api.openrouteservice.org/v2/matrix/driving-car"
headers = {
    "Authorization": API_KEY,
    "Content-Type": "application/json",
}
payload = {
    "locations": coords,
    "metrics": ["distance"],
    "units": "km",
}

resp = requests.post(url, headers=headers, json=payload, timeout=120)
resp.raise_for_status()
data = resp.json()
distances = data["distances"]

CITY_DISTANCES = {}
for i, origin in enumerate(city_names):
    for j, dest in enumerate(city_names):
        if i == j:
            continue
        km = distances[i][j]
        if km is None:
            continue
        CITY_DISTANCES[(origin, dest)] = int(round(km))

# Save JSON for reference
json_out = {f"{o} -> {d}": km for (o, d), km in CITY_DISTANCES.items()}
with open("city_distances.json", "w", encoding="utf-8") as f:
    json.dump(json_out, f, indent=2, ensure_ascii=False)
print(f"Saved city_distances.json ({len(CITY_DISTANCES)} pairs)")

# Print as Python dict ready to paste into main.py
print("\n=== CITY_DISTANCES dict for main.py ===")
print("CITY_DISTANCES = {")
for (o, d), km in sorted(CITY_DISTANCES.items()):
    print(f'    ("{o}", "{d}"): {km},')
print("}")
print("\nDone. Copy the dict above into main.py or run patch_main.py")
