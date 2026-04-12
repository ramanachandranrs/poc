import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, AlertTriangle, Clock, Search, X, Filter, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useInventory, useInventorySummary } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";

const STATUS_OPTIONS = ["All", "Available", "Aging"];

const MODELS = [
  "Alto","Baleno","Brezza","Celerio","Dzire","Eeco",
  "Fronx","Ignis","Jimny","Swift","WagonR","XL6",
];
const FUELS = ["Petrol","Diesel","CNG","Hybrid"];
const DEALERS = Array.from({length: 30}, (_, i) => ({
  id: `DLR${String(i+1).padStart(3,"0")}`,
  name: `Maruti Dealer ${String(i+1).padStart(2,"0")}`,
}));

const Inventory = () => {
  const { data: summary, loading: sumLoading } = useInventorySummary();

  const [search,      setSearch]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatus]  = useState("");
  const [modelFilter,  setModel]   = useState("");
  const [fuelFilter,   setFuel]    = useState("");
  const [dealerFilter, setDealer]  = useState("");
  const [page,         setPage]    = useState(1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
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

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val); setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vehicle Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">Wipro DMS — Real-time stock overview</p>
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Stat Cards — always from summary */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Vehicles"  value={summary?.total     ?? 0} icon={Car}           accentColor="blue"   delay={0}   />
          <div
            onClick={() => handleFilterChange(setStatus, statusFilter === "Available" ? "" : "Available")}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Available" ? "ring-2 ring-emerald-500/60" : ""}`}
          >
            <StatCard title="Available"       value={summary?.available ?? 0} icon={CheckCircle2}  accentColor="green"  delay={0.1} />
          </div>
          <div
            onClick={() => handleFilterChange(setStatus, statusFilter === "Aging" ? "" : "Aging")}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Aging" ? "ring-2 ring-neon-amber/60" : ""}`}
          >
            <StatCard title="Aging (>60d)"    value={summary?.aging     ?? 0} icon={AlertTriangle} accentColor="amber"  delay={0.2} />
          </div>
          <div
            onClick={() => { handleFilterChange(setStatus, statusFilter === "Aging" ? "" : "Aging"); }}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Aging" && (summary?.critical ?? 0) > 0 ? "ring-2 ring-neon-red/60" : ""}`}
          >
            <StatCard title="Critical (>90d)" value={summary?.critical  ?? 0} icon={Clock}         accentColor="red"    delay={0.3} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search VIN, model, dealer, variant…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {STATUS_OPTIONS.map(s => (
            <button key={s}
              onClick={() => handleFilterChange(setStatus, s === "All" ? "" : s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                (statusFilter === "" && s === "All") || statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >{s}</button>
          ))}
        </div>

        <select value={modelFilter} onChange={e => handleFilterChange(setModel, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[130px]">
          <option value="">All Models</option>
          {MODELS.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
        </select>

        <select value={fuelFilter} onChange={e => handleFilterChange(setFuel, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[120px]">
          <option value="">All Fuels</option>
          {FUELS.map(f => <option key={f} value={f} className="bg-background">{f}</option>)}
        </select>

        <select value={dealerFilter} onChange={e => handleFilterChange(setDealer, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[160px]">
          <option value="">All Dealers</option>
          {DEALERS.map(d => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
        </select>
      </div>

      {/* Results info + pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page <span className="text-foreground font-medium">{page}</span> · 50 per page
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg bg-muted/40 hover:bg-muted/70 disabled:opacity-30 px-3 py-1.5 text-xs text-muted-foreground transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={data.length < 50}
            className="rounded-lg bg-muted/40 hover:bg-muted/70 disabled:opacity-30 px-3 py-1.5 text-xs text-muted-foreground transition-colors flex items-center gap-1"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {data.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full glass rounded-xl p-10 text-center text-muted-foreground text-sm">
                No vehicles match your filters.
              </motion.div>
            ) : (
              data.map((vehicle, i) => {
                const aging = vehicle.days_in_inventory > 60;
                return (
                  <motion.div
                    key={vehicle.vin}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.25) }}
                    className={`glass card-hover rounded-xl p-5 ${aging ? "glow-border-amber" : "glow-blue"}`}
                  >
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
                        <span className="text-muted-foreground">Vehicle ID</span>
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
                        <span className="text-muted-foreground">Days in Inventory</span>
                        <span className={`flex items-center gap-1 font-semibold ${aging ? "text-neon-amber" : "text-emerald-400"}`}>
                          <Clock className="h-3 w-3" /> {vehicle.days_in_inventory}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Inventory;
