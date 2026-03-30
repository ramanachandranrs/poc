import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api/v1";

// Fallback mock data for when API is unavailable
const MOCK_INVENTORY = [
  { vin: "1HGBH41JXMN109186", model: "Nexon EV", variant: "Max LR", color: "Pristine White", days_in_inventory: 12, status: "Available" },
  { vin: "2FMDK3GC8EBA12345", model: "Harrier", variant: "XZA+", color: "Ash Grey", days_in_inventory: 45, status: "Available" },
  { vin: "3GNDA13D76S123456", model: "Safari", variant: "Adventure", color: "Cosmic Gold", days_in_inventory: 78, status: "Aging" },
  { vin: "5YJSA1E26MF123456", model: "Punch EV", variant: "Empowered+", color: "Fearless Purple", days_in_inventory: 5, status: "Available" },
  { vin: "1N4AL3AP5JC123456", model: "Curvv", variant: "Accomplished S", color: "Virtual Sunrise", days_in_inventory: 92, status: "Aging" },
  { vin: "JH4KA7660NC123456", model: "Nexon", variant: "Creative+ S", color: "Flame Red", days_in_inventory: 33, status: "Available" },
  { vin: "WVWZZZ3CZWE123456", model: "Tiago", variant: "XZ+", color: "Midnight Plum", days_in_inventory: 67, status: "Aging" },
  { vin: "SALGS2SE4LA123456", model: "Altroz", variant: "Racer", color: "Sprint Blue", days_in_inventory: 21, status: "Available" },
];

const MOCK_PARTS = [
  { sku: "SP-BRK-001", name: "Brake Pad Set (Front)", category: "Brakes", quantity_on_hand: 145, reorder_point: 50, unit_price: 2400 },
  { sku: "SP-FLT-002", name: "Oil Filter", category: "Filters", quantity_on_hand: 0, reorder_point: 100, unit_price: 350 },
  { sku: "SP-BLT-003", name: "Serpentine Belt", category: "Engine", quantity_on_hand: 23, reorder_point: 30, unit_price: 1200 },
  { sku: "SP-SPK-004", name: "Spark Plug Set", category: "Ignition", quantity_on_hand: 200, reorder_point: 75, unit_price: 800 },
  { sku: "SP-SHK-005", name: "Shock Absorber (Rear)", category: "Suspension", quantity_on_hand: 8, reorder_point: 25, unit_price: 3500 },
  { sku: "SP-RAD-006", name: "Radiator Assembly", category: "Cooling", quantity_on_hand: 0, reorder_point: 10, unit_price: 8500 },
  { sku: "SP-CLT-007", name: "Clutch Plate", category: "Transmission", quantity_on_hand: 42, reorder_point: 20, unit_price: 4200 },
  { sku: "SP-WPR-008", name: "Wiper Blade Set", category: "Accessories", quantity_on_hand: 15, reorder_point: 40, unit_price: 650 },
];

const MOCK_TRANSIT = [
  { shipment_id: "SHP-2024-001", origin: "Pune Plant", destination: "Delhi Hub", status: "In Transit", expected_delivery: "2024-03-15", carrier: "Indian Railways", items: 24 },
  { shipment_id: "SHP-2024-002", origin: "Sanand Plant", destination: "Mumbai Depot", status: "Delivered", expected_delivery: "2024-03-10", carrier: "Manesar Rail", items: 18 },
  { shipment_id: "SHP-2024-003", origin: "Pune Plant", destination: "Chennai Hub", status: "Delayed", expected_delivery: "2024-03-08", carrier: "Dedicated Freight", items: 32 },
  { shipment_id: "SHP-2024-004", origin: "Dharwad Plant", destination: "Kolkata Depot", status: "In Transit", expected_delivery: "2024-03-20", carrier: "Indian Railways", items: 15 },
  { shipment_id: "SHP-2024-005", origin: "Sanand Plant", destination: "Hyderabad Hub", status: "Past Due", expected_delivery: "2024-03-05", carrier: "Manesar Rail", items: 28 },
  { shipment_id: "SHP-2024-006", origin: "Pune Plant", destination: "Bengaluru Depot", status: "Loading", expected_delivery: "2024-03-22", carrier: "Dedicated Freight", items: 20 },
];

export interface InventoryItem {
  vin: string;
  model: string;
  variant: string;
  color: string;
  days_in_inventory: number;
  status: string;
}

export interface PartItem {
  sku: string;
  name: string;
  category: string;
  quantity_on_hand: number;
  reorder_point: number;
  unit_price: number;
}

export interface TransitItem {
  shipment_id: string;
  origin: string;
  destination: string;
  status: string;
  expected_delivery: string;
  carrier: string;
  items: number;
}

function useApiData<T, R = T>(endpoint: string, fallback: R[], transform?: (data: T[]) => R[]): { data: R[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { 
        setData(transform ? transform(json) : json as unknown as R[]); 
        setLoading(false); 
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setData(fallback);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endpoint]);

  return { data, loading, error };
}

export const useInventory = () => useApiData<any, InventoryItem>("/wipro/inventory", MOCK_INVENTORY, 
  (data) => data.map((v: any) => ({
    vin: v.vin,
    model: v.model,
    variant: v.variant,
    color: v.color,
    days_in_inventory: v.days_in_inventory,
    status: v.status
  }))
);

export const usePartsList = () => useApiData<any, PartItem>("/sap/parts", MOCK_PARTS,
  (data) => data.map((p: any) => ({
    sku: p.sku,
    name: p.part_name,
    category: p.category,
    quantity_on_hand: p.quantity_on_hand,
    reorder_point: 20, // Mock ROP for logic triggering
    unit_price: p.unit_cost
  }))
);

export const useTransit = () => useApiData<any, TransitItem>("/rail/transit", MOCK_TRANSIT,
  (data) => data.map((t: any) => ({
    shipment_id: `SHP-2024-00${t.shipment_id}`,
    origin: t.origin,
    destination: `Dealer ${t.destination_dealer_id}`,
    status: t.status,
    expected_delivery: String(t.expected_delivery_date),
    carrier: "Manesar Rail",
    items: 24
  }))
);
