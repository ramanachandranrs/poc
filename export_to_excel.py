import pandas as pd
from sqlalchemy import create_engine

def export_database():
    print("Connecting to database...")
    engine = create_engine("sqlite:///dealer_network.db")
    
    output_file = 'Mock_Dealer_Data.xlsx'
    
    print(f"Exporting to {output_file}...")
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Wipro Inventory
        df_vehicles = pd.read_sql_table('inventory_vehicles', engine)
        df_vehicles.to_excel(writer, sheet_name='Wipro_Inventory', index=False)
        
        # SAP Parts (joined for easier reading)
        df_spare_parts = pd.read_sql_table('spare_parts', engine)
        df_inventory_parts = pd.read_sql_table('inventory_parts', engine)
        df_parts_combined = pd.merge(df_inventory_parts, df_spare_parts, on='sku')
        # Reorder columns slightly
        cols = ['dealer_id', 'sku', 'part_name', 'category', 'quantity_on_hand', 'unit_cost', 'floorplan_interest_rate']
        df_parts_combined = df_parts_combined[cols]
        df_parts_combined.to_excel(writer, sheet_name='SAP_Parts', index=False)
        
        # Manesar Transit
        df_transit = pd.read_sql_table('shipments', engine)
        df_transit.to_excel(writer, sheet_name='Manesar_Transit', index=False)
        
        # Customer Bookings
        df_bookings = pd.read_sql_table('customer_bookings', engine)
        df_bookings.to_excel(writer, sheet_name='Customer_Bookings', index=False)

    print(f"Success! Data has been exported to {output_file}")

if __name__ == "__main__":
    export_database()
