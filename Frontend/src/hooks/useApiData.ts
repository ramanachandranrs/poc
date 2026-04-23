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

export interface InventorySummary {
  total: number;
  available: number;
  aging: number;
  critical: number;
}

export const useInventorySummary = () => {
  const [data, setData] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/wipro/inventory/summary`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);
  return { data, loading };
};

export interface InventoryFilters {
  status?: string;
  model?: string;
  fuel_type?: string;
  dealer_id?: string;
  search?: string;
  page?: number;
}

export const useInventory = (filters: InventoryFilters = {}) => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status)    params.set("status",    filters.status);
    if (filters.model)     params.set("model",     filters.model);
    if (filters.fuel_type) params.set("fuel_type", filters.fuel_type);
    if (filters.dealer_id) params.set("dealer_id", filters.dealer_id);
    if (filters.search)    params.set("search",    filters.search);
    params.set("page",  String(filters.page  ?? 1));
    params.set("limit", "50");

    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/wipro/inventory?${params.toString()}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json: any[]) => {
        setData(json.map(v => ({
          vin: v.vin, dealer_id: v.dealer_id, dealer_name: v.dealer_name,
          model: v.model, variant: v.variant, fuel_type: v.fuel_type,
          days_in_inventory: v.days_in_inventory, status: v.status,
        })));
        setLoading(false);
      })
      .catch(err => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [filters.status, filters.model, filters.fuel_type, filters.dealer_id, filters.search, filters.page]);

  return { data, loading, error };
};

export interface PartsSummary {
  total_dealer_part_combos: number;
  stockout: number;
  adequate: number;
  unique_skus: number;
}

export const usePartsSummary = () => {
  const [data, setData] = useState<PartsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/sap/parts/summary`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);
  return { data, loading };
};

export interface PartsFilters {
  status?: string;
  category?: string;
  search?: string;
  dealer_id?: string;
  page?: number;
}

export const usePartsList = (filters: PartsFilters = {}) => {
  const [data, setData] = useState<PartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status)    params.set("status",    filters.status);
    if (filters.category)  params.set("category",  filters.category);
    if (filters.search)    params.set("search",    filters.search);
    if (filters.dealer_id) params.set("dealer_id", filters.dealer_id);
    params.set("page",  String(filters.page ?? 1));
    params.set("limit", "50");

    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/sap/parts?${params.toString()}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json: any[]) => {
        setData(json.map(p => ({
          sku: p.sku, name: p.part_name, category: p.category,
          quantity_on_hand: p.quantity_on_hand, reorder_point: p.reorder_point,
          unit_price: p.unit_cost, stockout_rate: p.stockout_rate,
        })));
        setLoading(false);
      })
      .catch(err => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [filters.status, filters.category, filters.search, filters.dealer_id, filters.page]);

  return { data, loading, error };
};

export interface TransitSummary {
  total: number;
  in_transit: number;
  delivered: number;
  delayed: number;
}

export const useTransitSummary = () => {
  const [data, setData] = useState<TransitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/rail/transit/summary`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);
  return { data, loading };
};

export interface TransitFilters {
  status?: string;
  search?: string;
  zone?: string;
  mode?: string;
  dealer_id?: string;
  page?: number;
}

export const useTransit = (filters: TransitFilters = {}) => {
  const [data, setData] = useState<TransitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status)    params.set("status",    filters.status);
    if (filters.search)    params.set("search",    filters.search);
    if (filters.zone)      params.set("zone",      filters.zone);
    if (filters.mode)      params.set("mode",      filters.mode);
    if (filters.dealer_id) params.set("dealer_id", filters.dealer_id);
    params.set("page",  String(filters.page ?? 1));
    params.set("limit", "50");

    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/rail/transit?${params.toString()}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json: any[]) => {
        setData(json.map(t => ({
          shipment_id: t.shipment_id, origin: t.origin, destination: t.destination,
          status: t.status, expected_delivery: String(t.expected_delivery ?? ""),
          carrier: t.carrier, items: t.items, delay_days: t.delay_days,
        })));
        setLoading(false);
      })
      .catch(err => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [filters.status, filters.search, filters.zone, filters.mode, filters.dealer_id, filters.page]);

  return { data, loading, error };
};

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

// ── GenAI Prompts ─────────────────────────────────────────────────────────────

export interface B2CPrompt {
  vin: string;
  model: string;
  variant: string;
  fuel_type: string | null;
  dealer_name: string;
  days_in_inventory: number;
  age_bucket: string;
  discount_estimate: number;
  prompt: string;
}

export interface OperationalAlert {
  alert_type: "stockout" | "transit_delay";
  severity: "Critical" | "High" | "Medium";
  subject: string;
  dealer_id: string | null;
  part_sku: string | null;
  part_name: string | null;
  shipment_id: string | null;
  delay_days: number | null;
  quantity_gap: number | null;
  prompt: string;
}

export const useB2CPrompts = (minDays = 60) =>
  useApiData<any, B2CPrompt>(`/genai/b2c-prompts?min_days=${minDays}`,
    (data) => data.map((r: any) => ({ ...r }))
  );

export const useOperationalAlerts = () =>
  useApiData<any, OperationalAlert>("/genai/operational-alerts",
    (data) => data.map((r: any) => ({ ...r }))
  );

// ── Week 3: Gemini + Guided Assistant + ROI ───────────────────────────────────

export interface GeminiResponse {
  generated_text: string;
  model: string;
  use_case: string;
}

export interface GuidedRecommendation {
  id: string;
  rec_type: "transfer" | "stockout";
  priority: "Critical" | "Medium" | "Low";
  title: string;
  summary: string;
  status: "Pending" | "Approved" | "Rejected";
  data: Record<string, any>;
  generated_message: string | null;
}

export interface ROIMetric {
  metric: string;
  baseline_value: number;
  ai_value: number;
  improvement: number;
  improvement_pct: number;
  unit: string;
}

export interface ROIReport {
  generated_at: string;
  total_floorplan_saved: number;
  vehicles_recommended_for_transfer: number;
  avg_days_reduction: number;
  stockout_alerts_raised: number;
  metrics: ROIMetric[];
  summary: string;
}

export const useGuidedRecommendations = () =>
  useApiData<any, GuidedRecommendation>("/guided/recommendations",
    (data) => data.map((r: any) => ({ ...r }))
  );

export const useROIReport = () => {
  const [data, setData] = useState<ROIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/roi/report`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, []);
  return { data, loading, error };
};

export async function callGemini(endpoint: string, payload: Record<string, any>): Promise<GeminiResponse> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function approveRecommendation(id: string, message?: string): Promise<{ email?: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/guided/approve/${id}?message=${encodeURIComponent(message || "")}`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function rejectRecommendation(id: string, reason?: string): Promise<void> {
  await fetch(`${API_BASE}/guided/reject/${id}?reason=${encodeURIComponent(reason || "")}`, { method: "POST" });
}

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
  data_source: string;
  top_pairs: { dealer_id: string; dealer_name: string; variant_id: string; total_30d: number; model_mape: number }[];
  variant_totals: { variant_id: string; total_30d: number }[];
  model_metrics: Record<string, { mae: number; rmse: number; r2: number; mape: number; smape: number; f1_sale: number }>;
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

// ── Vehicle Sales ─────────────────────────────────────────────────────────────

export interface SalesSummary {
  total_sales: number;
  total_unsold: number;
  sell_through_pct: number;
  avg_days_to_sell: number;
  total_revenue_inr: number;
  avg_discount_inr: number;
  exchange_count: number;
  finance_count: number;
  festive_count: number;
}

export interface SalesByMonth {
  month: number;
  units_sold: number;
  revenue: number;
  avg_days_to_sell: number;
  avg_discount: number;
}

export interface SalesByModel {
  model: string;
  units_sold: number;
  avg_days_to_sell: number;
  total_revenue: number;
  avg_discount: number;
}

export const useSalesSummary = () => {
  const [data, setData] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/sales/summary`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);
  return { data, loading };
};

export const useSalesMonthlyTrend = (dealerId?: string) => {
  const [data, setData] = useState<SalesByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams();
    if (dealerId) params.set("dealer_id", dealerId);
    const controller = new AbortController();
    fetch(`${API_BASE}/sales/monthly-trend?${params.toString()}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, [dealerId]);
  return { data, loading };
};

export const useSalesByModel = () => {
  const [data, setData] = useState<SalesByModel[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/sales/by-model`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);
  return { data, loading };
};
