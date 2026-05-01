import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from "recharts";
import { TrendingUp, Brain, Target, Activity } from "lucide-react";
import { useForecastSummary, useForecastVariants } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useRole } from "@/context/RoleContext";

const VARIANT_COLORS: Record<string, string> = {
  LXI:   "hsl(205, 100%, 55%)",
  VXI:   "hsl(270, 80%, 60%)",
  ZXI:   "hsl(160, 70%, 50%)",
  Alpha: "hsl(35, 100%, 55%)",
  Delta: "hsl(0, 80%, 60%)",
  Sigma: "hsl(300, 70%, 60%)",
  AGS:   "hsl(190, 80%, 55%)",
  AT:    "hsl(50, 90%, 55%)",
  MT:    "hsl(120, 60%, 50%)",
};

const getColor = (v: string) => VARIANT_COLORS[v] ?? "hsl(205,100%,55%)";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

function MapeChip({ mape }: { mape: number }) {
  const color =
    mape < 30  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    mape < 60  ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"   :
                 "text-neon-amber bg-neon-amber/10 border-neon-amber/20";
  return (
    <span className={`text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-widest border ${color} shadow-sm`}>
      MAPE {mape.toFixed(1)}%
    </span>
  );
}

const DemandForecast = () => {
  // ── ALL hooks at the top — no early returns before this ──────────────────
  const { role } = useRole();
  const { data: summary, loading: sumLoading, error: sumError } = useForecastSummary();
  const [selectedDealer,  setSelectedDealer]  = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  const { data: forecasts, loading: fcLoading } = useForecastVariants(
    selectedDealer  || undefined,
    selectedVariant || undefined,
  );

  // Derived data — safe because hooks are all above
  const dealers = useMemo(
    () => summary?.all_dealers ?? [],
    [summary]
  );
  const variants = useMemo(
    () => (summary?.variant_totals ?? []).map((v) => v.variant_id),
    [summary]
  );

  const networkChartData = useMemo(() => {
    if (!forecasts.length) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    forecasts.forEach((fc) => {
      fc.daily.forEach((d) => {
        if (!dateMap[d.date]) dateMap[d.date] = {};
        dateMap[d.date][fc.variant_id] =
          (dateMap[d.date][fc.variant_id] || 0) + d.forecast;
      });
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date: date.slice(5), ...vals }));
  }, [forecasts]);

  const variantBarData = useMemo(
    () => (summary?.variant_totals ?? []).map((v) => ({
      variant: v.variant_id,
      demand:  Math.round(v.total_30d),
    })),
    [summary]
  );

  const totalNetwork = useMemo(
    () => (summary?.variant_totals ?? []).reduce((s, v) => s + v.total_30d, 0),
    [summary]
  );

  const activeVariants = selectedVariant ? [selectedVariant] : variants;

  // ── Early returns AFTER all hooks ────────────────────────────────────────
  if (sumLoading) return <LoadingSkeleton rows={8} />;

  if (sumError || !summary) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Could not load forecast data. Make sure the backend is running and&nbsp;
        <code className="text-primary">data/forecast_output.json</code>&nbsp;exists.
      </div>
    );
  }

  const topVariant = summary.variant_totals[0]?.variant_id ?? "N/A";
  const avgMape = summary.top_pairs.length > 0
    ? summary.top_pairs.reduce((s, p) => s + p.model_mape, 0) / summary.top_pairs.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Demand Forecast</h2>
        <p className="text-lg font-bold text-muted-foreground mt-4 tracking-wide uppercase">
          XGBoost · 30-day forward forecast · {summary.total_dealer_variant_combos} dealer-variant combos
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {[
          { label: "Total Demand (30d)", value: fmt(totalNetwork), sub: "units forecasted",  icon: TrendingUp },
          { label: "Top Variant",          value: topVariant,        sub: "highest demand",    icon: Target },
          role === "dealership" 
            ? { label: "Forecast Confidence", value: `${(100 - avgMape).toFixed(1)}%`, sub: "based on historical MAPE", icon: Brain }
            : { label: "Top Dealer",           value: summary.top_pairs[0]?.dealer_name ?? "N/A", sub: "by variant demand", icon: Brain },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-xl p-5 space-y-3 border border-border/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">{c.label}</span>
              <c.icon className="h-5 w-5 text-primary/40" />
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{c.value}</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{c.sub}</p>
          </motion.div>
        ))}
      </div>


      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mt-4">
        <select
          value={selectedDealer}
          onChange={(e) => setSelectedDealer(e.target.value)}
          className="bg-card border border-border/10 rounded-lg px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[200px] cursor-pointer"
        >
          <option value="">All Dealers</option>
          {dealers.map((d) => <option key={d.dealer_id} value={d.dealer_id}>{d.dealer_id} — {d.dealer_name}</option>)}
        </select>
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          className="bg-card border border-border/10 rounded-lg px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[150px] cursor-pointer"
        >
          <option value="">All Variants</option>
          {variants.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {(selectedDealer || selectedVariant) && (
          <button
            onClick={() => { setSelectedDealer(""); setSelectedVariant(""); }}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest px-4 py-2 rounded-lg bg-muted/20 border border-border/10"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Daily area chart — only when filter active */}
      {(selectedDealer || selectedVariant) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border/10 shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">30-Day Daily Forecast</h3>
              <p className="text-sm font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                {selectedDealer ? `Dealer: ${selectedDealer}` : "All dealers"}
                {selectedVariant ? ` · Variant: ${selectedVariant}` : ""}
              </p>
            </div>
            {fcLoading && (
              <span className="text-sm font-black text-primary animate-pulse uppercase tracking-widest">Loading…</span>
            )}
          </div>
          {networkChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={networkChartData}>
                <defs>
                  {activeVariants.map((v) => (
                    <linearGradient key={v} id={`grad_${v}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={getColor(v)} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={getColor(v)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,18%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(215,15%,55%)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "hsl(215,15%,55%)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(225,20%,10%)",
                    border: "1px solid hsl(225,15%,25%)",
                    borderRadius: "12px",
                    color: "hsl(210,40%,93%)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 14, fontWeight: 700, paddingTop: "16px" }} />
                {activeVariants.map((v) => (
                  <Area key={v} type="monotone" dataKey={v}
                    stroke={getColor(v)} fill={`url(#grad_${v})`}
                    strokeWidth={3} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            !fcLoading && (
              <p className="text-sm font-bold text-muted-foreground text-center py-12 uppercase tracking-widest">
                No data for selected filters.
              </p>
            )
          )}
        </motion.div>
      )}

      {/* Variant bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border/10 shadow-sm p-6 border border-border/10 shadow-lg"
      >
        <h3 className="text-2xl font-black text-foreground mb-8">
          Total 30-Day Demand by Variant ({role === "dealership" ? "Dealership" : "Across Scope"})
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={variantBarData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,18%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(215,15%,55%)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="variant" tick={{ fill: "hsl(215,15%,55%)", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{
                background: "hsl(225,20%,10%)",
                border: "1px solid hsl(225,15%,25%)",
                borderRadius: "12px",
                fontSize: 14,
                fontWeight: 700,
              }}
              labelStyle={{ color: "hsl(210,40%,93%)", fontWeight: 800 }}
              itemStyle={{ color: "hsl(210,40%,93%)" }}
              formatter={(v: number) => [`${fmt(v)} units`, "Demand"]}
            />
            <Bar dataKey="demand" radius={[0, 8, 8, 0]} barSize={40}>
              {variantBarData.map((entry) => (
                <Cell key={entry.variant} fill={getColor(entry.variant)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top dealer-variant table — hide for dealership as it's redundant with the bar chart */}
      {role !== "dealership" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl overflow-hidden border border-border/10 shadow-lg"
        >
          <div className="p-6 border-b border-border/50 bg-muted/5">
            <h3 className="text-xl font-bold text-foreground">Top Dealer × Variant Forecasts</h3>
            <p className="text-sm font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">Ranked by 30-day forecasted demand</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border/30 bg-muted/5">
                  {["Rank", "Dealer", "Variant", "30d Forecast", "Model MAPE"].map((h) => (
                    <th key={h} className="text-left px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {(summary?.top_pairs || []).map((p, i) => (
                  <tr
                    key={`${p.dealer_id}-${p.variant_id}`}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-3 text-muted-foreground text-xs font-bold">#{i + 1}</td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{p.dealer_name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/40 ml-2 font-mono tracking-widest">{p.dealer_id}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-border/10"
                        style={{ background: getColor(p.variant_id) + "25", color: getColor(p.variant_id) }}
                      >
                        {p.variant_id}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-foreground text-sm">{fmt(p.total_30d)} units</td>
                    <td className="px-6 py-3"><MapeChip mape={p.model_mape} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DemandForecast;
