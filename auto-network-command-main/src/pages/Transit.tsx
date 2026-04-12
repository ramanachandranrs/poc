import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train, MapPin, AlertTriangle, CheckCircle2, Clock,
  PackageOpen, Search, X, Filter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTransit, useTransitSummary } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";

const statusConfig: Record<string, { icon: typeof Train; color: string; bg: string }> = {
  "In Transit": { icon: Train,         color: "text-primary",    bg: "bg-primary/10"    },
  "Delivered":  { icon: CheckCircle2,  color: "text-neon-green", bg: "bg-neon-green/10" },
  "Delayed":    { icon: AlertTriangle, color: "text-neon-red",   bg: "bg-neon-red/10"   },
  "Past Due":   { icon: AlertTriangle, color: "text-neon-red",   bg: "bg-neon-red/10"   },
  "Loading":    { icon: PackageOpen,   color: "text-neon-amber", bg: "bg-neon-amber/10" },
};

const MODES = ["Road", "Rail", "Air"];
const ZONES = ["South", "North", "West", "East", "Central"];
const DEALERS = Array.from({length: 30}, (_, i) => ({
  id: `DLR${String(i+1).padStart(3,"0")}`,
  name: `Maruti Dealer ${String(i+1).padStart(2,"0")}`,
}));

const Transit = () => {
  const { data: summary, loading: sumLoading } = useTransitSummary();

  const [search,        setSearch]   = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [statusFilter,  setStatus]   = useState("");
  const [modeFilter,    setMode]     = useState("");
  const [zoneFilter,    setZone]     = useState("");
  const [dealerFilter,  setDealer]   = useState("");
  const [page,          setPage]     = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({
    status:    statusFilter  || undefined,
    search:    debouncedSearch || undefined,
    mode:      modeFilter    || undefined,
    zone:      zoneFilter    || undefined,
    dealer_id: dealerFilter  || undefined,
    page,
  }), [statusFilter, debouncedSearch, modeFilter, zoneFilter, dealerFilter, page]);

  const { data, loading } = useTransit(filters);

  const hasFilters = search || statusFilter || modeFilter || zoneFilter || dealerFilter;
  const clearAll = () => { setSearch(""); setStatus(""); setMode(""); setZone(""); setDealer(""); setPage(1); };
  const handleFilter = (setter: (v: string) => void, val: string) => { setter(val); setPage(1); };
  const toggleStatus = (val: string) => handleFilter(setStatus, statusFilter === val ? "" : val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transit Logistics</h2>
          <p className="text-sm text-muted-foreground mt-1">Manesar Rail — Shipment tracking & delivery timeline</p>
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Stat Cards — clickable */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Shipments" value={summary?.total      ?? 0} icon={Train}         accentColor="blue"   delay={0}   />
          <div onClick={() => toggleStatus("In Transit")}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "In Transit" ? "ring-2 ring-primary/60" : ""}`}>
            <StatCard title="In Transit"     value={summary?.in_transit ?? 0} icon={Train}         accentColor="purple" delay={0.1} />
          </div>
          <div onClick={() => toggleStatus("Delivered")}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Delivered" ? "ring-2 ring-emerald-500/60" : ""}`}>
            <StatCard title="Delivered"      value={summary?.delivered  ?? 0} icon={CheckCircle2}  accentColor="green"  delay={0.2} />
          </div>
          <div onClick={() => toggleStatus("Delayed")}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Delayed" ? "ring-2 ring-neon-red/60" : ""}`}>
            <StatCard title="Delayed / Past Due" value={summary?.delayed ?? 0} icon={AlertTriangle} accentColor="amber" delay={0.3} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search shipment ID, carrier, city…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {["All", "In Transit", "Delivered", "Delayed", "Past Due", "Loading"].map(s => (
            <button key={s} onClick={() => handleFilter(setStatus, s === "All" ? "" : s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                (statusFilter === "" && s === "All") || statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >{s}</button>
          ))}
        </div>

        <select value={modeFilter} onChange={e => handleFilter(setMode, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[120px]">
          <option value="">All Modes</option>
          {MODES.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
        </select>

        <select value={zoneFilter} onChange={e => handleFilter(setZone, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[120px]">
          <option value="">All Zones</option>
          {ZONES.map(z => <option key={z} value={z} className="bg-background">{z}</option>)}
        </select>

        <select value={dealerFilter} onChange={e => handleFilter(setDealer, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[160px]">
          <option value="">All Dealers</option>
          {DEALERS.map(d => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
        </select>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page <span className="text-foreground font-medium">{page}</span> · 50 per page
        </p>
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

      {/* Shipment Cards */}
      {loading ? <LoadingSkeleton rows={6} /> : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {data.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-10 text-center text-muted-foreground text-sm">
                No shipments match your filters.
              </motion.div>
            ) : (
              data.map((shipment, i) => {
                const isAlert = shipment.status === "Delayed" || shipment.status === "Past Due";
                const cfg = statusConfig[shipment.status] || statusConfig["In Transit"];
                const StatusIcon = cfg.icon;
                return (
                  <motion.div key={shipment.shipment_id} layout
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
                    className={`glass card-hover rounded-xl p-5 ${isAlert ? "glow-border-red" : "glow-blue"}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2.5 ${cfg.bg}`}>
                          <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{shipment.shipment_id}</h3>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} ${isAlert ? "animate-pulse-soft" : ""}`}>
                              {shipment.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {shipment.carrier} · {shipment.items} units · Delay {shipment.delay_days} d
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3" /><span>{shipment.origin}</span>
                        </div>
                        <div className="w-12 h-px bg-border relative">
                          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${isAlert ? "bg-neon-red animate-pulse" : "bg-primary"}`} />
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3" /><span>{shipment.destination}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={isAlert ? "text-neon-red font-semibold" : "text-muted-foreground"}>
                          ETA: {shipment.expected_delivery}
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

export default Transit;
