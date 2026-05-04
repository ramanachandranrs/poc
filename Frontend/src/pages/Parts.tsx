import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon, CheckCircle2, Search, X, Filter,
  Package, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { usePartsList, usePartsSummary } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import PageLoader from "@/components/PageLoader";
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

  const { data: paginatedData, loading } = usePartsList(filters);
  const parts = paginatedData.items || [];
  const totalCount = paginatedData.total || 0;
  const totalPages = Math.ceil(totalCount / 50);

  const hasFilters = search || statusFilter || categoryFilter || dealerFilter;
  const fmt = (n: any) => {
    if (n === null || n === undefined) return "0";
    return new Intl.NumberFormat("en-IN").format(n);
  };
  const clearAll = () => { setSearch(""); setStatus(""); setCategory(""); setDealer(""); setPage(1); };
  const handleFilter = (setter: (v: string) => void, val: string) => { setter(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Spare Parts & ROP</h2>
          <p className="text-xs text-muted-foreground mt-1">SAP B1 — Supply chain metrics & reorder alerts</p>
        </div>
        <button 
          onClick={() => {}} 
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground transition-all border border-border/10"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stat Cards — always from summary */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card rounded-xl border border-border/10 shadow-sm h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div onClick={clearAll}
            className={`cursor-pointer transition-all rounded-2xl ${!statusFilter ? "ring-2 ring-primary/60" : "hover:scale-[1.02]"}`}>
            <StatCard title="Unique SKUs"         value={summary?.unique_skus ?? 0}              icon={Package}       accentColor="blue"   delay={0}   />
          </div>
          <div onClick={clearAll}
            className={`cursor-pointer transition-all rounded-2xl ${!statusFilter ? "ring-2 ring-primary/60" : "hover:scale-[1.02]"}`}>
            <StatCard title="Dealer-Part Combos"  value={summary?.total_dealer_part_combos ?? 0} icon={Filter}        accentColor="purple" delay={0.1} />
          </div>
          <div
            onClick={() => { handleFilter(setStatus, statusFilter === "Adequate" ? "" : "Adequate"); }}
            className={`cursor-pointer transition-all rounded-2xl ${statusFilter === "Adequate" ? "ring-2 ring-emerald-500/60" : "hover:scale-[1.02]"}`}
          >
            <StatCard title="Adequate"  value={summary?.adequate ?? 0} icon={CheckCircle2}  accentColor="green" delay={0.2} />
          </div>
          <div
            onClick={() => { handleFilter(setStatus, statusFilter === "Stockout Alert" ? "" : "Stockout Alert"); }}
            className={`cursor-pointer transition-all rounded-2xl ${statusFilter === "Stockout Alert" ? "ring-2 ring-neon-red/60" : "hover:scale-[1.02]"}`}
          >
            <StatCard title="Stockout Alert" value={summary?.stockout ?? 0} icon={AlertTriangle} accentColor="red" delay={0.3} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border/10 shadow-sm p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search part name, SKU, dealer…"
            className="w-full bg-muted/40 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select value={statusFilter} onChange={e => handleFilter(setStatus, e.target.value)}
            className="bg-muted/40 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[140px] cursor-pointer">
            <option value="">All Statuses</option>
            <option value="Stockout Alert">Stockout Alert</option>
            <option value="Adequate">Adequate Stock</option>
          </select>
          <select value={categoryFilter} onChange={e => handleFilter(setCategory, e.target.value)}
            className="bg-muted/40 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[140px] cursor-pointer">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={dealerFilter} onChange={e => handleFilter(setDealer, e.target.value)}
            className="bg-muted/40 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[140px] cursor-pointer">
            <option value="">All Dealers</option>
            {DEALERS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-muted-foreground font-medium">
          Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span> · <span className="text-foreground font-black">{totalCount.toLocaleString()}</span> items
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-xl bg-card hover:bg-muted/70 disabled:opacity-30 px-4 py-2.5 text-sm font-bold text-muted-foreground transition-all flex items-center gap-2 border border-border/40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-xl bg-card hover:bg-muted/70 disabled:opacity-30 px-4 py-2.5 text-sm font-bold text-muted-foreground transition-all flex items-center gap-2 border border-border/40">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table Section */}
      {loading && parts.length === 0 ? (
        <PageLoader icon={Package} title="Spare Parts Registry" message="Fetching SAP B1 inventory data..." rows={6} />
      ) : loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="bg-card rounded-xl border border-border/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/10 bg-muted/5">
                  <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">SKU</th>
                  <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Part Name</th>
                  <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Category</th>
                  <th className="text-right p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Qty on Hand</th>
                  <th className="text-right p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">ROP</th>
                  <th className="text-center p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Status</th>
                  <th className="text-center p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">AI Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {parts.length === 0 ? (
                  <tr><td colSpan={7} className="p-16 text-center text-muted-foreground text-base font-medium">No parts match your filters.</td></tr>
                ) : (
                  parts.map((part, i) => {
                    const critical = part.quantity_on_hand === 0 || part.quantity_on_hand < part.reorder_point;
                    return (
                      <motion.tr key={`${part.sku}-${i}`}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.25) }}
                        className={`transition-colors hover:bg-muted/30 group ${critical ? "bg-neon-red/5" : ""}`}
                      >
                        <td className="p-5 font-mono text-xs text-muted-foreground/60">{part.sku}</td>
                        <td className="p-5 font-bold text-foreground text-base group-hover:text-primary transition-colors">{part.name}</td>
                        <td className="p-5">
                          <span className="rounded-full bg-muted/50 px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{part.category}</span>
                        </td>
                        <td className={`p-5 text-right font-black text-lg ${critical ? "text-neon-red" : "text-foreground"}`}>
                          {part.quantity_on_hand}
                        </td>
                        <td className="p-5 text-right text-muted-foreground font-bold text-sm">{part.reorder_point}</td>
                        <td className="p-5 text-center">
                          {critical ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-neon-red/10 px-4 py-2 text-xs font-black text-neon-red uppercase tracking-widest border border-neon-red/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse-soft">
                              <AlertOctagon className="h-4 w-4" /> Stockout Alert
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-neon-green/10 px-4 py-2 text-xs font-bold text-neon-green uppercase tracking-widest border border-neon-green/20">
                              <CheckCircle2 className="h-4 w-4" /> Adequate
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          {(() => {
                            const gap = part.reorder_point - part.quantity_on_hand;
                            const eoq = Math.max(Math.ceil(part.reorder_point * 1.5), 10);
                            if (part.quantity_on_hand === 0) return (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-neon-red tracking-tight">🚨 Order {eoq} units NOW</span>
                                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Zero stock — critical</span>
                              </span>
                            );
                            if (gap > 0) return (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-neon-amber tracking-tight">⚠ Order {eoq} units</span>
                                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{gap} below ROP</span>
                              </span>
                            );
                            const buffer = part.quantity_on_hand - part.reorder_point;
                            if (buffer < part.reorder_point * 0.3) return (
                              <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Monitor — low buffer</span>
                            );
                            return <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">No action needed</span>;
                          })()}
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
