import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export interface InventoryItem {
  vin: string;
  dealer_id: string;
  dealer_name: string;
  model: string;
  variant: string;
  fuel_type?: string | null;
  days_in_inventory: number;
  status: string;
}

export interface PartItem {
  sku: string;
  name: string;
  category?: string | null;
  quantity_on_hand: number;
  reorder_point: number;
  unit_price: number;
  stockout_rate: number;
}

export interface TransitItem {
  shipment_id: string;
  origin: string;
  destination: string;
  status: string;
  expected_delivery: string;
  carrier: string;
  items: number;
  delay_days: number;
}

export interface TrendItem {
  month: string;
  inventory: number;
  demand: number;
}

function useApiData<T, R = T>(endpoint: string, transform?: (data: T[]) => R[]): { data: R[]; loading: boolean; error: string | null } {
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
          setData([]);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endpoint]);

  return { data, loading, error };
}

export const useAgingSummary = () => {
  const [data, setData] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/aging/summary`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, []);
  return { data, loading, error };
};

export const useInventory = () => useApiData<any, InventoryItem>("/wipro/inventory", 
  (data) => data.map((v: any) => ({
    vin: v.vin,
    dealer_id: v.dealer_id,
    dealer_name: v.dealer_name,
    model: v.model,
    variant: v.variant,
    fuel_type: v.fuel_type,
    days_in_inventory: v.days_in_inventory,
    status: v.status
  }))
);

export const usePartsList = () => useApiData<any, PartItem>("/sap/parts",
  (data) => data.map((p: any) => ({
    sku: p.sku,
    name: p.part_name,
    category: p.category,
    quantity_on_hand: p.quantity_on_hand,
    reorder_point: p.reorder_point,
    unit_price: p.unit_cost,
    stockout_rate: p.stockout_rate
  }))
);

export const useTransit = () => useApiData<any, TransitItem>("/rail/transit",
  (data) => data.map((t: any) => ({
    shipment_id: t.shipment_id,
    origin: t.origin,
    destination: t.destination,
    status: t.status,
    expected_delivery: String(t.expected_delivery ?? ""),
    carrier: t.carrier,
    items: t.items,
    delay_days: t.delay_days
  }))
);

export interface CustomerItem {
  customer_id: string;
  name: string;
  contact: string | null;
  city: string | null;
  state: string | null;
  ownership_history: string | null;
}

export const useCustomers = (params?: { search?: string; state?: string; city?: string; ownership?: string }) => {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.state) query.set("state", params.state);
  if (params?.city) query.set("city", params.city);
  if (params?.ownership) query.set("ownership", params.ownership);
  const qs = query.toString();
  return useApiData<any, CustomerItem>(`/customers${qs ? `?${qs}` : ""}`,
    (data) => data.map((c: any) => ({
      customer_id: c.customer_id,
      name: c.name,
      contact: c.contact,
      city: c.city,
      state: c.state,
      ownership_history: c.ownership_history,
    }))
  );
};

export const useTrends = () => useApiData<any, TrendItem>("/overview/trends",
  (data) => data.map((t: any) => ({
    month: t.month,
    inventory: t.inventory,
    demand: t.demand
  }))
);

// ── Aging Stock ───────────────────────────────────────────────────────────────

export interface AgingVehicle {
  vin: string;
  model: string;
  variant: string;
  fuel_type: string | null;
  source_dealer_id: string;
  source_dealer_name: string;
  source_city: string;
  days_in_inventory: number;
  age_bucket: "Fresh" | "Watch" | "Aging" | "Critical";
  invoice_value: number;
  daily_floorplan_cost: number;
  total_floorplan_cost: number;
}

export interface TransferRecommendation {
  vin: string;
  model: string;
  variant: string;
  fuel_type: string | null;
  source_dealer_id: string;
  source_dealer_name: string;
  source_city: string;
  target_dealer_id: string;
  target_dealer_name: string;
  target_city: string;
  days_in_inventory: number;
  age_bucket: string;
  invoice_value: number;
  total_floorplan_cost: number;
  transport_cost: number;
  demand_score: number;
  net_utility_score: number;
  recommendation: "Transfer" | "Discount" | "Hold";
  ai_prompt: string;
}

export interface AgingSummary {
  total_aging: number;
  critical_count: number;
  aging_count: number;
  watch_count: number;
  total_floorplan_burn: number;
  top_aging_model: string;
  avg_days_aging: number;
}

export const useAgingVehicles = (minDays = 60) =>
  useApiData<any, AgingVehicle>(`/aging/vehicles?min_days=${minDays}`,
    (data) => data.map((v: any) => ({ ...v }))
  );

export const useTransferRecommendations = (minDays = 60) =>
  useApiData<any, TransferRecommendation>(`/aging/transfers?min_days=${minDays}`,
    (data) => data.map((r: any) => ({ ...r }))
  );

// ── Demand Forecast ───────────────────────────────────────────────────────────

export interface DailyForecastPoint {
  date: string;
  forecast: number;
}

export interface DealerVariantForecast {
  dealer_id: string;
  dealer_name: string;
  variant_id: string;
  total_30d: number;
  model_mape: number;
  daily: DailyForecastPoint[];
}

export interface ForecastSummary {
  generated_at: string;
  forecast_horizon: number;
  total_dealer_variant_combos: number;
  top_pairs: { dealer_id: string; dealer_name: string; variant_id: string; total_30d: number; model_mape: number }[];
  variant_totals: { variant_id: string; total_30d: number }[];
  model_metrics: Record<string, { mae: number; mape: number }>;
}

export const useForecastSummary = () => {
  const [data, setData] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/forecast/summary`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, []);
  return { data, loading, error };
};

export const useForecastVariants = (dealerId?: string, variantId?: string) => {
  const [data, setData] = useState<DealerVariantForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch unless at least one filter is active
    if (!dealerId && !variantId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (dealerId)  params.set("dealer_id",  dealerId);
    if (variantId) params.set("variant_id", variantId);
    const controller = new AbortController();
    fetch(`${API_BASE}/forecast/variants?${params.toString()}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [dealerId, variantId]);

  return { data, loading, error };
};
