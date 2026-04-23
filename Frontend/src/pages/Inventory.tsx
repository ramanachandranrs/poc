import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, AlertTriangle, Clock, Search, X, Filter,
  CheckCircle2, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, ShoppingCart, BarChart2,
} from "lucide-react";
import {
  useInventory, useInventorySummary,
  useSalesSummary, useSalesMonthlyTrend, useSalesByModel,
} from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_OPTIONS = ["All", "Available", "Aging"];
const MODELS = ["Alto","Baleno","Brezza","Celerio","Dzire","Eeco","Fronx","Ignis","Jimny","Swift","WagonR","XL6"];
const FUELS  = ["Petrol","Diesel","CNG","Hybrid"];
const DEALERS = Array.from({ length: 30 }, (_, i) => ({
  id: `DLR${String(i + 1).padStart(3, "0")}`,
  name: `Maruti Dealer ${String(i + 1).padStart(2, "0")}`,
}));

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

const TABS = ["Stock Inventory", "Sales Analytics"] as const;
type Tab = typeof TABS[number];

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Stock Inventory");

  // ── Inventory state ──────────────────────────────────────────────────────
  const { data: summary, loading: sumLoading } = useInventorySummary();
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [modelFilter,  setModel]      = useState("");
  const [fuelFilter,   setFuel]       = useState("");
  const [dealerFilter, setDealer]     = useState("");
  const [page, setPage]               = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({
    status:    statusFilter || undefined,
    model:     modelFilter  || undefined,
    fuel_type: fuelFilter   || undefined,
    dealer_id: dealerFilter || undefined,
    search:    debouncedSearch || undefined,
    page,
  }), [statusFilter, modelFilter, fuelFilter, dealerFilter, debouncedSearch, page]);

  const { data, loading } = useInventory(filters);
  const hasFilters = search || statusFilter || modelFilter || fuelFilter || dealerFilter;
  const clearAll = () => { setSearch(""); setStatus(""); setModel(""); setFuel(""); setDealer(""); setPage(1); };
  const handleFilter = (setter: (v: string) => void, val: string) => { setter(val); setPage(1); };

  // ── Sales state ──────────────────────────────────────────────────────────
  const { data: salesSummary, loading: salesLoading } = useSalesSummary();
  const { data: monthlyTrend, loading: trendLoading }  = useSalesMonthlyTrend();
  const { data: byModel,      loading: modelLoading }  = useSalesByModel();

  const chartMonthly = monthlyTrend.map(r => ({
    month: MONTH_NAMES[r.month],
    "Units Sold": r.units_sold,
    "Avg Days to Sell": r.avg_days_to_sell,
  }));

  const chartModel = byModel.slice(0, 10).map(r => ({
    model: r.model,
    units: r.units_sold,
    revenue: Math.round(r.total_revenue / 1e5),
    avgDays: r.avg_days_to_sell,
  }));

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vehicle Inventory & Sales</h2>
          <p className="text-sm text-muted-foreground mt-1">Wipro DMS — Stock in · Sales out · Full picture</p>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── STOCK INVENTORY TAB ─────────────────────────────────────────── */}
      {activeTab === "Stock Inventory" && (
        <>
          {/* Stat Cards */}
          {sumLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Stock"     value={summary?.total     ?? 0} icon={Car}           accentColor="blue"  delay={0}   />
              <div onClick={() => handleFilter(setStatus, statusFilter === "Available" ? "" : "Available")}
                className={`cursor-pointer rounded-xl transition-all ${statusFilter === "Available" ? "ring-2 ring-emerald-500/60" : ""}`}>
                <StatCard title="Available"     value={summary?.available ?? 0} icon={CheckCircle2}  accentColor="green" delay={0.1} />
              </div>
              <div onClick={() => handleFilter(setStatus, statusFilter === "Aging" ? "" : "Aging")}
                className={`cursor-pointer rounded-xl transition-all ${statusFilter === "Aging" ? "ring-2 ring-neon-amber/60" : ""}`}>
                <StatCard title="Aging (>60d)"  value={summary?.aging     ?? 0} icon={AlertTriangle} accentColor="amber" delay={0.2} />
              </div>
              <StatCard title="Critical (>90d)" value={summary?.critical  ?? 0} icon={Clock}         accentColor="red"   delay={0.3} />
            </div>
          )}

          {/* Filter Bar */}
          <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search VIN, model, dealer, variant…"
                className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => handleFilter(setStatus, s === "All" ? "" : s)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    (statusFilter === "" && s === "All") || statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}>{s}</button>
              ))}
            </div>
            <select value={modelFilter} onChange={e => handleFilter(setModel, e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[130px]">
              <option value="">All Models</option>
              {MODELS.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
            </select>
            <select value={fuelFilter} onChange={e => handleFilter(setFuel, e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[120px]">
              <option value="">All Fuels</option>
              {FUELS.map(f => <option key={f} value={f} className="bg-background">{f}</option>)}
            </select>
            <select value={dealerFilter} onChange={e => handleFilter(setDealer, e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[160px]">
              <option value="">All Dealers</option>
              {DEALERS.map(d => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page <span className="text-foreground font-medium">{page}</span> · 50 per page</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg bg-muted/40 hover:bg-muted/70 disabled:opacity-30 px-3 py-1.5 text-xs text-muted-foreground transition-colors flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.length < 50}
                className="rounded-lg bg-muted/40 hover:bg-muted/70 disabled:opacity-30 px-3 py-1.5 text-xs text-muted-foreground transition-colors flex items-center gap-1">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Vehicle Cards */}
          {loading ? <LoadingSkeleton rows={6} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {data.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="col-span-full glass rounded-xl p-10 text-center text-muted-foreground text-sm">
                    No vehicles match your filters.
                  </motion.div>
                ) : data.map((vehicle, i) => {
                  const aging = vehicle.days_in_inventory > 60;
                  return (
                    <motion.div key={vehicle.vin} layout
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.25) }}
                      className={`glass card-hover rounded-xl p-5 ${aging ? "glow-border-amber" : "glow-blue"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${aging ? "bg-neon-amber/10" : "bg-primary/10"}`}>
                            <Car className={`h-5 w-5 ${aging ? "text-neon-amber" : "text-primary"}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{vehicle.model}</h3>
                            <p className="text-xs text-muted-foreground">{vehicle.variant}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                          aging
                            ? "bg-neon-amber/10 text-neon-amber border border-neon-amber/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {aging ? <><AlertTriangle className="h-3 w-3 inline mr-0.5" />Aging</> : "Available"}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VIN</span>
                          <span className="text-foreground font-mono text-[11px]">{vehicle.vin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dealer</span>
                          <span className="text-foreground">{vehicle.dealer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fuel</span>
                          <span className="text-foreground">{vehicle.fuel_type || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Days in Stock</span>
                          <span className={`flex items-center gap-1 font-semibold ${aging ? "text-neon-amber" : "text-emerald-400"}`}>
                            <Clock className="h-3 w-3" /> {vehicle.days_in_inventory}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ── SALES ANALYTICS TAB ─────────────────────────────────────────── */}
      {activeTab === "Sales Analytics" && (
        <>
          {/* Sales KPI Cards */}
          {salesLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Sold"        value={salesSummary?.total_sales       ?? 0} icon={ShoppingCart} accentColor="green" delay={0}   />
              <StatCard title="Unsold Stock"       value={salesSummary?.total_unsold      ?? 0} icon={Car}          accentColor="amber" delay={0.1} />
              <StatCard title="Sell-Through %"     value={`${salesSummary?.sell_through_pct ?? 0}%`} icon={TrendingUp} accentColor="blue" delay={0.2} />
              <StatCard title="Avg Days to Sell"   value={salesSummary?.avg_days_to_sell  ?? 0} icon={Clock}        accentColor="red"   delay={0.3} />
            </div>
          )}

          {/* Revenue + Finance row */}
          {!salesLoading && salesSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="rounded-lg p-2.5 bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-foreground">{fmt(salesSummary.total_revenue_inr)}</p>
                </div>
              </div>
              <div className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="rounded-lg p-2.5 bg-emerald-500/10">
                  <BarChart2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Finance Taken</p>
                  <p className="text-xl font-bold text-foreground">
                    {salesSummary.finance_count.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({Math.round(salesSummary.finance_count / salesSummary.total_sales * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
              <div className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="rounded-lg p-2.5 bg-neon-amber/10">
                  <TrendingUp className="h-5 w-5 text-neon-amber" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Discount Given</p>
                  <p className="text-xl font-bold text-foreground">{fmt(salesSummary.avg_discount_inr)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Sales Chart */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Sales Volume & Avg Days to Sell</h3>
            {trendLoading ? (
              <div className="h-56 animate-pulse bg-muted/30 rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartMonthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="Units Sold"        stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Avg Days to Sell"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sales by Model Chart */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Units Sold by Model (Top 10)</h3>
            {modelLoading ? (
              <div className="h-56 animate-pulse bg-muted/30 rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartModel} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="model" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    formatter={(val: any, name: string) => name === "revenue" ? [`₹${val}L`, "Revenue"] : [val, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="units"   name="Units Sold"    fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgDays" name="Avg Days"      fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Model table */}
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-right px-4 py-3 font-medium">Units Sold</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Days to Sell</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Discount</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((row, i) => (
                  <tr key={row.model} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{row.model}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{row.units_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(row.total_revenue)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.avg_days_to_sell > 60 ? "text-neon-amber" : "text-foreground"}`}>
                      {row.avg_days_to_sell}d
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(row.avg_discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Inventory;
