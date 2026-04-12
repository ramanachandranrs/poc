import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from "recharts";
import { TrendingUp, Brain, Target, Activity } from "lucide-react";
import { useForecastSummary, useForecastVariants } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

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
    mape < 30  ? "text-emerald-400 bg-emerald-500/10" :
    mape < 60  ? "text-yellow-400 bg-yellow-500/10"   :
                 "text-neon-amber bg-neon-amber/10";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color}`}>
      MAPE {mape.toFixed(1)}%
    </span>
  );
}

const DemandForecast = () => {
  // ── ALL hooks at the top — no early returns before this ──────────────────
  const { data: summary, loading: sumLoading, error: sumError } = useForecastSummary();
  const [selectedDealer,  setSelectedDealer]  = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  const { data: forecasts, loading: fcLoading } = useForecastVariants(
    selectedDealer  || undefined,
    selectedVariant || undefined,
  );

  // Derived data — safe because hooks are all above
  const dealers = useMemo(
    () => [...new Set((summary?.top_pairs ?? []).map((p) => p.dealer_id))],
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
  const topDealer  = summary.top_pairs[0]?.dealer_name ?? "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Demand Forecast</h2>
        <p className="text-sm text-muted-foreground mt-1">
          XGBoost · 30-day forward forecast · {summary.total_dealer_variant_combos} dealer-variant combos
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Network Demand (30d)", value: fmt(totalNetwork), sub: "units forecasted",  icon: TrendingUp },
          { label: "Top Variant",          value: topVariant,        sub: "highest demand",    icon: Target },
          { label: "Top Dealer",           value: topDealer,         sub: "by variant demand", icon: Brain },
          { label: "Models Trained",       value: variants.length,   sub: "XGBoost models",    icon: Activity },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Model accuracy chips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">Two-Stage Model Accuracy (Classifier + Regressor) per Variant</p>
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
            Source: {summary.data_source ?? "vehicle_sales_transactions.csv"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {["Variant", "MAE", "RMSE", "R²", "MAPE (non-zero)", "SMAPE", "F1 (sale detect)"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.model_metrics).sort().map(([v, m]) => (
                <tr key={v} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: getColor(v) }} />
                      <span className="font-semibold text-foreground">{v}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-foreground">{m.mae}</td>
                  <td className="px-3 py-2 text-foreground">{m.rmse}</td>
                  <td className="px-3 py-2">
                    <span className={m.r2 > 0.3 ? "text-emerald-400" : "text-yellow-400"}>
                      {m.r2.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-3 py-2"><MapeChip mape={m.mape} /></td>
                  <td className="px-3 py-2">
                    <span className={m.smape < 70 ? "text-emerald-400" : "text-yellow-400"}>
                      {m.smape.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-semibold ${m.f1_sale > 0.85 ? "text-emerald-400" : m.f1_sale > 0.75 ? "text-yellow-400" : "text-neon-amber"}`}>
                      {m.f1_sale.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedDealer}
          onChange={(e) => setSelectedDealer(e.target.value)}
          className="bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Dealers</option>
          {dealers.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          className="bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Variants</option>
          {variants.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {(selectedDealer || selectedVariant) && (
          <button
            onClick={() => { setSelectedDealer(""); setSelectedVariant(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
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
          className="glass glow-blue rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">30-Day Daily Forecast</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDealer ? `Dealer: ${selectedDealer}` : "All dealers"}
                {selectedVariant ? ` · Variant: ${selectedVariant}` : ""}
              </p>
            </div>
            {fcLoading && (
              <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
            )}
          </div>
          {networkChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
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
                <XAxis dataKey="date" tick={{ fill: "hsl(215,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "hsl(215,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(225,20%,10%)",
                    border: "1px solid hsl(225,15%,25%)",
                    borderRadius: "8px",
                    color: "hsl(210,40%,93%)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {activeVariants.map((v) => (
                  <Area key={v} type="monotone" dataKey={v}
                    stroke={getColor(v)} fill={`url(#grad_${v})`}
                    strokeWidth={2} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            !fcLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">
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
        className="glass rounded-xl p-6"
      >
        <h3 className="text-base font-semibold text-foreground mb-4">
          Total 30-Day Demand by Variant (Network-wide)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={variantBarData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,18%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(215,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="variant" tick={{ fill: "hsl(215,15%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip
              contentStyle={{
                background: "hsl(225,20%,10%)",
                border: "1px solid hsl(225,15%,25%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${fmt(v)} units`, "Demand"]}
            />
            <Bar dataKey="demand" radius={[0, 4, 4, 0]}>
              {variantBarData.map((entry) => (
                <Cell key={entry.variant} fill={getColor(entry.variant)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top dealer-variant table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-border/50">
          <h3 className="text-base font-semibold text-foreground">Top Dealer × Variant Forecasts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ranked by 30-day forecasted demand</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["Rank", "Dealer", "Variant", "30d Forecast", "Model MAPE"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.top_pairs.map((p, i) => (
                <tr
                  key={`${p.dealer_id}-${p.variant_id}`}
                  className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{p.dealer_name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{p.dealer_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: getColor(p.variant_id) + "25", color: getColor(p.variant_id) }}
                    >
                      {p.variant_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{fmt(p.total_30d)} units</td>
                  <td className="px-4 py-3"><MapeChip mape={p.model_mape} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default DemandForecast;
