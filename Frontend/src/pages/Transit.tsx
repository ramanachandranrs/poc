import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train, MapPin, AlertTriangle, CheckCircle2, Clock,
  PackageOpen, Search, X, Filter, ChevronLeft, ChevronRight, RefreshCw,
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
  const fmt = (n: any) => {
    if (n === null || n === undefined) return "0";
    return new Intl.NumberFormat("en-IN").format(n);
  };
  const clearAll = () => { setSearch(""); setStatus(""); setMode(""); setZone(""); setDealer(""); setPage(1); };
  const toggleStatus = (val: string) => handleFilter(setStatus, statusFilter === val ? "" : val);
  const handleFilter = (setter: (v: string) => void, val: string) => { setter(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Transit Logistics</h2>
          <p className="text-xs text-muted-foreground mt-1">Real-time GPS tracking · ETA predictions · Supply chain visibility</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground transition-all border border-border/10"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stat Cards — clickable */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card rounded-xl border border-border/10 shadow-sm h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Shipments" value={summary?.total      ?? 0} icon={Train}         accentColor="blue"   delay={0}   />
          <div onClick={() => toggleStatus("In Transit")}
            className={`cursor-pointer transition-all rounded-2xl ${statusFilter === "In Transit" ? "ring-2 ring-primary/60" : ""}`}>
            <StatCard title="In Transit"     value={summary?.in_transit ?? 0} icon={Train}         accentColor="purple" delay={0.1} />
          </div>
          <div onClick={() => toggleStatus("Delivered")}
            className={`cursor-pointer transition-all rounded-2xl ${statusFilter === "Delivered" ? "ring-2 ring-emerald-500/60" : ""}`}>
            <StatCard title="Delivered"      value={summary?.delivered  ?? 0} icon={CheckCircle2}  accentColor="green"  delay={0.2} />
          </div>
          <div onClick={() => toggleStatus("Delayed")}
            className={`cursor-pointer transition-all rounded-2xl ${statusFilter === "Delayed" ? "ring-2 ring-neon-red/60" : ""}`}>
            <StatCard title="Delayed / Past Due" value={summary?.delayed ?? 0} icon={AlertTriangle} accentColor="amber" delay={0.3} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border/10 shadow-sm p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search model, dealer, VIN…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <select value={dealerFilter} onChange={e => handleFilter(setDealer, e.target.value)}
          className="bg-muted/40 rounded-lg px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[180px]">
          <option value="">All Dealers</option>
          {DEALERS.map(d => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
        </select>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Page <span className="text-foreground font-bold">{page}</span> · 50 per page
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg bg-muted/40 hover:bg-muted/70 disabled:opacity-30 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Prev
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
                className="bg-card rounded-xl border border-border/10 shadow-sm p-10 text-center text-muted-foreground text-sm">
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
                    className={`glass card-hover rounded-2xl p-6 ${isAlert ? "glow-border-red" : "glow-blue"}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className={`rounded-2xl p-4 shadow-inner ${cfg.bg}`}>
                          <StatusIcon className={`h-7 w-7 ${cfg.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-foreground tracking-tight">{shipment.shipment_id}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest border border-border/10 ${cfg.bg} ${cfg.color} ${isAlert ? "animate-pulse-soft shadow-[0_0_10px_rgba(239,68,68,0.2)]" : ""}`}>
                              {shipment.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-muted-foreground/80 mt-1">
                            {shipment.carrier} · <span className="text-foreground">{shipment.items} units</span> · Delay <span className={shipment.delay_days > 0 ? "text-neon-red" : ""}>{shipment.delay_days} d</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Origin</span>
                          <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/10">
                            <MapPin className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-bold text-foreground">{shipment.origin}</span>
                          </div>
                        </div>
                        <div className="flex items-center mt-4">
                          <div className={`h-0.5 w-10 ${isAlert ? "bg-neon-red/40" : "bg-primary/30"}`} />
                          <svg width="14" height="14" viewBox="0 0 10 10" className={isAlert ? "text-neon-red" : "text-primary"} fill="currentColor">
                            <path d="M0 3.5h7L5 1l1.5-1L10 5 6.5 9 5 8l2-2.5H0z" />
                          </svg>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Dest</span>
                          <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/10">
                            <MapPin className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-bold text-foreground">{shipment.destination}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm bg-muted/10 px-4 py-3 rounded-xl border border-border/10">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={`font-black uppercase tracking-wider ${isAlert ? "text-neon-red" : "text-muted-foreground"}`}>
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
