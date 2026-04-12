import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowRightLeft, TrendingDown, IndianRupee,
  Clock, Car, ChevronDown, ChevronUp, Copy, Check, Flame,
  Search, X, Filter,
} from "lucide-react";
import {
  useAgingSummary, useAgingVehicles, useTransferRecommendations,
  type TransferRecommendation,
} from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

// ── helpers ──────────────────────────────────────────────────────────────────

const BUCKET_STYLE: Record<string, string> = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  Aging:    "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Watch:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  Fresh:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

const REC_STYLE: Record<string, string> = {
  Transfer: "bg-primary/10 text-primary border border-primary/30",
  Discount: "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Hold:     "bg-muted/40 text-muted-foreground border border-border",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

// ── Prompt Modal ──────────────────────────────────────────────────────────────

function PromptModal({ rec, onClose }: { rec: TransferRecommendation; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rec.ai_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl p-6 max-w-lg w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">AI Copilot Prompt</h3>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${REC_STYLE[rec.recommendation]}`}>
            {rec.recommendation}
          </span>
        </div>
        <pre className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-mono">
          {rec.ai_prompt}
        </pre>
        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 text-sm font-medium transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground px-4 py-2 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Transfer Card ─────────────────────────────────────────────────────────────

function TransferCard({ rec, index }: { rec: TransferRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.04 }}
        className="glass rounded-xl overflow-hidden"
      >
        {/* Header row */}
        <div className="p-4 flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{rec.model}</span>
              <span className="text-xs text-muted-foreground">{rec.variant}</span>
              {rec.fuel_type && (
                <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">
                  {rec.fuel_type}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{rec.vin}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${BUCKET_STYLE[rec.age_bucket]}`}>
              {rec.age_bucket}
            </span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${REC_STYLE[rec.recommendation]}`}>
              {rec.recommendation}
            </span>
          </div>
        </div>

        {/* Transfer route */}
        <div className="px-4 pb-3 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground truncate max-w-[120px]">{rec.source_dealer_name}</span>
          <span className="text-muted-foreground text-[10px]">({rec.source_city})</span>
          <ArrowRightLeft className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[120px]">{rec.target_dealer_name}</span>
          <span className="text-muted-foreground text-[10px]">({rec.target_city})</span>
        </div>

        {/* Key metrics row */}
        <div className="px-4 pb-3 grid grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Days</p>
            <p className={`font-semibold ${rec.days_in_inventory >= 90 ? "text-neon-red" : "text-neon-amber"}`}>
              <Clock className="h-3 w-3 inline mr-0.5" />{rec.days_in_inventory}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Floorplan Cost</p>
            <p className="font-semibold text-neon-red">₹{fmt(rec.total_floorplan_cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Transport</p>
            <p className="font-semibold text-foreground">₹{fmt(rec.transport_cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Net Utility</p>
            <p className={`font-semibold ${rec.net_utility_score > 0 ? "text-emerald-400" : "text-neon-red"}`}>
              {rec.net_utility_score > 0 ? "+" : ""}₹{fmt(rec.net_utility_score)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            onClick={() => setShowPrompt(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Flame className="h-3.5 w-3.5" /> AI Prompt
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs transition-colors ml-auto"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Less" : "Details"}
          </button>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 px-4 py-3 grid grid-cols-2 gap-2 text-xs"
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Value</span>
                <span className="text-foreground">₹{fmt(rec.invoice_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demand Score (30d)</span>
                <span className="text-foreground">{rec.demand_score.toFixed(1)} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Dealer ID</span>
                <span className="font-mono text-foreground">{rec.source_dealer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Dealer ID</span>
                <span className="font-mono text-foreground">{rec.target_dealer_id}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showPrompt && <PromptModal rec={rec} onClose={() => setShowPrompt(false)} />}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AgingStock = () => {
  const [tab, setTab] = useState<"transfers" | "vehicles">("transfers");
  const [minDays, setMinDays] = useState(60);
  const [dealerFilter, setDealerFilter] = useState("All");

  const DEALERS = Array.from({length: 30}, (_, i) => ({
    id: `DLR${String(i+1).padStart(3,"0")}`,
    name: `Maruti Dealer ${String(i+1).padStart(2,"0")}`,
  }));

  // filters for vehicles tab
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [modelFilter,   setModelFilter]   = useState("All");
  const [bucketFilter,  setBucketFilter]  = useState("All");

  // filters for transfers tab
  const [transferSearch, setTransferSearch] = useState("");
  const [recFilter,      setRecFilter]      = useState("All");

  const { data: summary, loading: sumLoading } = useAgingSummary();
  const { data: vehicles, loading: vLoading }  = useAgingVehicles(minDays);
  const { data: transfers, loading: tLoading } = useTransferRecommendations(minDays);

  const loading = sumLoading || vLoading || tLoading;

  const vehicleModels = useMemo(() => ["All", ...Array.from(new Set(vehicles.map(v => v.model))).sort()], [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.toLowerCase();
    return vehicles.filter(v => {
      const matchSearch = !q || v.model.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q) || v.source_dealer_name.toLowerCase().includes(q);
      const matchModel  = modelFilter  === "All" || v.model === modelFilter;
      const matchBucket = bucketFilter === "All" || v.age_bucket === bucketFilter;
      const matchDealer = dealerFilter === "All" || v.source_dealer_id === dealerFilter;
      return matchSearch && matchModel && matchBucket && matchDealer;
    });
  }, [vehicles, vehicleSearch, modelFilter, bucketFilter, dealerFilter]);

  const filteredTransfers = useMemo(() => {
    const q = transferSearch.toLowerCase();
    return transfers.filter(r => {
      const matchSearch = !q || r.model.toLowerCase().includes(q) || r.vin.toLowerCase().includes(q) || r.source_dealer_name.toLowerCase().includes(q) || r.target_dealer_name.toLowerCase().includes(q);
      const matchRec    = recFilter === "All" || r.recommendation === recFilter;
      const matchDealer = dealerFilter === "All" || r.source_dealer_id === dealerFilter || r.target_dealer_id === dealerFilter;
      return matchSearch && matchRec && matchDealer;
    });
  }, [transfers, transferSearch, recFilter, dealerFilter]);

  if (loading) return <LoadingSkeleton rows={8} />;

  const transferCount = transfers.filter(r => r.recommendation === "Transfer").length;
  const discountCount = transfers.filter(r => r.recommendation === "Discount").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Aging Stock Intelligence</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Transfer Utility Scores · Floorplan Burn · AI Copilot Prompts
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Aging (>60d)",
            value: summary?.total_aging ?? 0,
            sub: `${summary?.critical_count ?? 0} critical`,
            icon: AlertTriangle,
            color: "amber",
          },
          {
            label: "Floorplan Burn",
            value: `₹${fmt(summary?.total_floorplan_burn ?? 0)}`,
            sub: "cumulative cost",
            icon: IndianRupee,
            color: "red",
          },
          {
            label: "Transfer Recs",
            value: transferCount,
            sub: `${discountCount} discount recs`,
            icon: ArrowRightLeft,
            color: "blue",
          },
          {
            label: "Avg Days Aging",
            value: summary?.avg_days_aging ?? 0,
            sub: `Top model: ${summary?.top_aging_model ?? "N/A"}`,
            icon: TrendingDown,
            color: "purple",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Min Days + Dealer */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg bg-muted/30 p-1 gap-1">
          {(["transfers", "vehicles"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "transfers" ? "Transfer Recommendations" : "All Aging Vehicles"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={dealerFilter}
            onChange={e => setDealerFilter(e.target.value)}
            className="bg-muted/40 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[160px]"
          >
            <option value="All">All Dealers</option>
            {DEALERS.map(d => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Min days:</span>
            {[30, 60, 90].map((d) => (
              <button key={d} onClick={() => setMinDays(d)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  minDays === d ? "bg-primary/10 text-primary font-medium" : "bg-muted/30 hover:bg-muted/50"
                }`}
              >{d}+</button>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer Recommendations */}
      {tab === "transfers" && (
        <>
          {/* Transfer filter bar */}
          <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input value={transferSearch} onChange={e => setTransferSearch(e.target.value)}
                placeholder="Search VIN, model, dealer…"
                className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {transferSearch && <button onClick={() => setTransferSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {["All", "Transfer", "Discount", "Hold"].map(r => (
                <button key={r} onClick={() => setRecFilter(r)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    recFilter === r ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >{r}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground self-center whitespace-nowrap">
              {filteredTransfers.length} of {transfers.length}
            </p>
          </div>

          <div className="space-y-3">
            {filteredTransfers.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No transfer recommendations match your filters.</div>
            ) : (
              filteredTransfers.map((rec, i) => <TransferCard key={rec.vin} rec={rec} index={i} />)
            )}
          </div>
        </>
      )}

      {/* All Aging Vehicles */}
      {tab === "vehicles" && (
        <>
          {/* Vehicle filter bar */}
          <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)}
                placeholder="Search VIN, model, dealer…"
                className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {vehicleSearch && <button onClick={() => setVehicleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {["All", "Critical", "Aging", "Watch"].map(b => (
                <button key={b} onClick={() => setBucketFilter(b)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    bucketFilter === b ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >{b}</button>
              ))}
            </div>
            <select value={modelFilter} onChange={e => setModelFilter(e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[130px]">
              {vehicleModels.map(m => <option key={m} value={m} className="bg-background">{m === "All" ? "All Models" : m}</option>)}
            </select>
            <p className="text-xs text-muted-foreground self-center whitespace-nowrap">
              {filteredVehicles.length} of {vehicles.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredVehicles.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full glass rounded-xl p-8 text-center text-muted-foreground text-sm">
                  No vehicles match your filters.
                </motion.div>
              ) : (
                filteredVehicles.map((v, i) => (
                  <motion.div key={v.vin} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="glass rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.variant}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${BUCKET_STYLE[v.age_bucket]}`}>
                        {v.age_bucket}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VIN</span>
                        <span className="font-mono text-[11px] text-foreground">{v.vin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dealer</span>
                        <span className="text-foreground">{v.source_dealer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days in Stock</span>
                        <span className={`font-semibold flex items-center gap-1 ${v.days_in_inventory >= 90 ? "text-neon-red" : "text-neon-amber"}`}>
                          <Clock className="h-3 w-3" />{v.days_in_inventory}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Floorplan Cost</span>
                        <span className="font-semibold text-neon-red">₹{fmt(v.total_floorplan_cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Burn</span>
                        <span className="text-foreground">₹{fmt(v.daily_floorplan_cost)}/day</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default AgingStock;
