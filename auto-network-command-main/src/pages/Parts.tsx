import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon, CheckCircle2, Search, X, Filter,
  Package, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { usePartsList, usePartsSummary } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";

const STATUS_OPTIONS = ["All", "Stockout Alert", "Adequate"];
const CATEGORIES = [
  "High-Velocity Workshop Consumables",
  "Micro-Components",
  "Periodic Maintenance Kits",
  "Mid-Level Components",
  "Macro-Components",
];
const DEALERS = Array.from({length: 30}, (_, i) => ({
  id: `DLR${String(i+1).padStart(3,"0")}`,
  name: `Maruti Dealer ${String(i+1).padStart(2,"0")}`,
}));

const Parts = () => {
  const { data: summary, loading: sumLoading } = usePartsSummary();

  const [search,         setSearch]    = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [statusFilter,   setStatus]    = useState("");
  const [categoryFilter, setCategory]  = useState("");
  const [dealerFilter,   setDealer]    = useState("");
  const [page,           setPage]      = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({
    status:   statusFilter  || undefined,
    category: categoryFilter || undefined,
    search:   debouncedSearch || undefined,
    dealer_id: dealerFilter || undefined,
    page,
  }), [statusFilter, categoryFilter, debouncedSearch, dealerFilter, page]);

  const { data, loading } = usePartsList(filters);

  const hasFilters = search || statusFilter || categoryFilter || dealerFilter;
  const clearAll = () => { setSearch(""); setStatus(""); setCategory(""); setDealer(""); setPage(1); };
  const handleFilter = (setter: (v: string) => void, val: string) => { setter(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Spare Parts & ROP</h2>
          <p className="text-sm text-muted-foreground mt-1">SAP B1 — Supply chain metrics & reorder alerts</p>
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
          <StatCard title="Unique SKUs"         value={summary?.unique_skus ?? 0}              icon={Package}       accentColor="blue"   delay={0}   />
          <StatCard title="Dealer-Part Combos"  value={summary?.total_dealer_part_combos ?? 0} icon={Filter}        accentColor="purple" delay={0.1} />
          <div
            onClick={() => { handleFilter(setStatus, statusFilter === "Adequate" ? "" : "Adequate"); }}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Adequate" ? "ring-2 ring-emerald-500/60" : ""}`}
          >
            <StatCard title="Adequate"  value={summary?.adequate ?? 0} icon={CheckCircle2}  accentColor="green" delay={0.2} />
          </div>
          <div
            onClick={() => { handleFilter(setStatus, statusFilter === "Stockout Alert" ? "" : "Stockout Alert"); }}
            className={`cursor-pointer transition-all rounded-xl ${statusFilter === "Stockout Alert" ? "ring-2 ring-neon-red/60" : ""}`}
          >
            <StatCard title="Stockout Alert" value={summary?.stockout ?? 0} icon={AlertTriangle} accentColor="red" delay={0.3} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU or part name…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => handleFilter(setStatus, s === "All" ? "" : s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                (statusFilter === "" && s === "All") || statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >{s}</button>
          ))}
        </div>

        <select value={categoryFilter} onChange={e => handleFilter(setCategory, e.target.value)}
          className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[220px]">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-background">{c}</option>)}
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

      {/* Table */}
      {loading ? <LoadingSkeleton rows={8} /> : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">SKU</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Part Name</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Category</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Qty on Hand</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">ROP</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No parts match your filters.</td></tr>
                ) : (
                  data.map((part, i) => {
                    const critical = part.quantity_on_hand === 0 || part.quantity_on_hand < part.reorder_point;
                    return (
                      <motion.tr key={`${part.sku}-${i}`}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.25) }}
                        className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${critical ? "bg-neon-red/5" : ""}`}
                      >
                        <td className="p-4 font-mono text-xs text-muted-foreground">{part.sku}</td>
                        <td className="p-4 font-medium text-foreground">{part.name}</td>
                        <td className="p-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{part.category}</span>
                        </td>
                        <td className={`p-4 text-right font-semibold ${critical ? "text-neon-red" : "text-foreground"}`}>
                          {part.quantity_on_hand}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">{part.reorder_point}</td>
                        <td className="p-4 text-center">
                          {critical ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-red/10 px-3 py-1 text-[10px] font-bold text-neon-red uppercase tracking-wider glow-border-red animate-pulse-soft">
                              <AlertOctagon className="h-3 w-3" /> Stockout Alert
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-green/10 px-3 py-1 text-[10px] font-medium text-neon-green uppercase tracking-wider">
                              <CheckCircle2 className="h-3 w-3" /> Adequate
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parts;
