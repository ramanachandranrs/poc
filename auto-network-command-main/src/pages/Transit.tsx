import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Train, MapPin, AlertTriangle, CheckCircle2, Clock, PackageOpen, Search, X, Filter } from "lucide-react";
import { useTransit } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";

const statusConfig: Record<string, { icon: typeof Train; color: string; bg: string }> = {
  "In Transit": { icon: Train,         color: "text-primary",      bg: "bg-primary/10"      },
  "Delivered":  { icon: CheckCircle2,  color: "text-neon-green",   bg: "bg-neon-green/10"   },
  "Delayed":    { icon: AlertTriangle, color: "text-neon-red",     bg: "bg-neon-red/10"     },
  "Past Due":   { icon: AlertTriangle, color: "text-neon-red",     bg: "bg-neon-red/10"     },
  "Loading":    { icon: PackageOpen,   color: "text-neon-amber",   bg: "bg-neon-amber/10"   },
};

const STATUS_OPTIONS = ["All", "In Transit", "Delivered", "Delayed", "Past Due", "Loading"];

const Transit = () => {
  const { data, loading } = useTransit();
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");

  const cities = useMemo(() => {
    const all = data.flatMap((s) => [s.origin, s.destination]).filter(Boolean);
    return ["All", ...Array.from(new Set(all)).sort()];
  }, [data]);

  const [cityFilter, setCity] = useState("All");

  const filtered = useMemo(() => {
    return data.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.shipment_id.toLowerCase().includes(q) ||
        s.carrier.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || s.status === statusFilter;
      const matchCity   = cityFilter === "All" || s.origin === cityFilter || s.destination === cityFilter;
      return matchSearch && matchStatus && matchCity;
    });
  }, [data, search, statusFilter, cityFilter]);

  const hasFilters = search || statusFilter !== "All" || cityFilter !== "All";
  const clearAll   = () => { setSearch(""); setStatus("All"); setCity("All"); };

  const delayed   = data.filter((s) => s.status === "Delayed" || s.status === "Past Due").length;
  const inTransit = data.filter((s) => s.status === "In Transit").length;
  const delivered = data.filter((s) => s.status === "Delivered").length;

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transit Logistics</h2>
          <p className="text-sm text-muted-foreground mt-1">Manesar Rail — Shipment tracking & delivery timeline</p>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Shipments" value={data.length}  icon={Train}         accentColor="blue"   delay={0}   />
        <StatCard title="In Transit"      value={inTransit}    icon={Train}         accentColor="purple" delay={0.1} />
        <StatCard title="Delivered"       value={delivered}    icon={CheckCircle2}  accentColor="green"  delay={0.2} />
        <StatCard title="Delayed / Past Due" value={delayed}   icon={AlertTriangle} accentColor="amber"  delay={0.3} />
      </div>

      {/* Filter Bar */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shipment ID, carrier, city…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* City select */}
        <select
          value={cityFilter}
          onChange={(e) => setCity(e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[140px]"
        >
          {cities.map((c) => (
            <option key={c} value={c} className="bg-background">{c === "All" ? "All Cities" : c}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="text-foreground font-medium">{filtered.length}</span> of {data.length} shipments
      </p>

      {/* Shipment Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-10 text-center text-muted-foreground text-sm"
            >
              No shipments match your filters.
            </motion.div>
          ) : (
            filtered.map((shipment, i) => {
              const isAlert = shipment.status === "Delayed" || shipment.status === "Past Due";
              const cfg = statusConfig[shipment.status] || statusConfig["In Transit"];
              const StatusIcon = cfg.icon;

              return (
                <motion.div
                  key={shipment.shipment_id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
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
                        <MapPin className="h-3 w-3" />
                        <span>{shipment.origin}</span>
                      </div>
                      <div className="w-12 h-px bg-border relative">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${isAlert ? "bg-neon-red animate-pulse" : "bg-primary"}`} />
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{shipment.destination}</span>
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
    </div>
  );
};

export default Transit;
