import requests
import pandas as pd
import random

BASE_URL = "http://127.0.0.1:8000"

def compute_part_metrics():
    print("--- Fetching Sap Parts Data ---")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/sap/parts")
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch parts data: {e}")
        return

    parts_data = response.json()
    if not parts_data:
        print("No parts data returned.")
        return

    df_parts = pd.DataFrame(parts_data)
    
    # Compute ROP = (Demand Rate x Lead Time) + Safety Stock
    # For this baseline, mock a daily demand rate between 1-5, lead time 7 days, safety stock 10
    
    # We will compute these dynamically per row
    df_parts['mock_daily_demand'] = [random.randint(1, 5) for _ in range(len(df_parts))]
    df_parts['lead_time_days'] = 7
    df_parts['safety_stock'] = 10

    df_parts['rop'] = (df_parts['mock_daily_demand'] * df_parts['lead_time_days']) + df_parts['safety_stock']
    
    # Flag SKUs at risk of stockout
    df_parts['at_risk'] = df_parts['quantity_on_hand'] <= df_parts['rop']
    
    at_risk_df = df_parts[df_parts['at_risk']]
    print("\n--- SKUs at Risk of Stockout ---")
    if not at_risk_df.empty:
        # Select relevant columns to display
        display_cols = ['dealer_id', 'sku', 'part_name', 'quantity_on_hand', 'rop', 'mock_daily_demand']
        print(at_risk_df[display_cols].to_string(index=False))
    else:
        print("No SKUs currently at risk of stockout.")


def compute_inventory_metrics():
    print("\n--- Fetching Wipro Inventory Data ---")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/wipro/inventory")
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch inventory data: {e}")
        return

    inventory_data = response.json()
    if not inventory_data:
        print("No inventory data returned.")
        return

    df_inventory = pd.DataFrame(inventory_data)
    
    if df_inventory.empty:
        print("Inventory is empty.")
        return
        
    # Filter for vehicles sitting > 60 days
    df_aging = df_inventory[df_inventory['days_in_inventory'] > 60]
    
    if df_aging.empty:
        print("No vehicles aging > 60 days.")
        return
    
    # Sort by days in inventory descending
    df_aging_sorted = df_aging.sort_values(by='days_in_inventory', ascending=False)
    
    # Get top 5
    top_5_aging = df_aging_sorted.head(5)
    
    print("\n--- Top 5 Longest Sitting Vehicles (> 60 days) ---")
    display_cols = ['vin', 'dealer_id', 'model', 'variant', 'color', 'days_in_inventory']
    print(top_5_aging[display_cols].to_string(index=False))

if __name__ == "__main__":
    compute_part_metrics()
    compute_inventory_metrics()
