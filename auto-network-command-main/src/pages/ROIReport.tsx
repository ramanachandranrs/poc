import { motion } from "framer-motion";
import {
  TrendingDown, IndianRupee, Package, Car,
  ArrowDown, CheckCircle2, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useROIReport } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const fmt = (n: number, unit: string) => {
  if (unit === "₹") return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n)} ${unit}`;
};

const METRIC_ICONS: Record<string, any> = {
  "Average Days in Inventory":          TrendingDown,
  "Total Floorplan Interest Cost":      IndianRupee,
  "Parts Stockout Incidents":           Package,
  "Vehicles Recommended for Transfer":  Car,
};

const ROIReport = () => {
  const { data: report, loading, error } = useROIReport();

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error || !report) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Could not load ROI report. Make sure the backend is running.
    </div>
  );

  const chartData = report.metrics.map(m => ({
    name: m.metric.split(" ").slice(0, 3).join(" "),
    Baseline: m.baseline_value,
    "With AI": m.ai_value,
    unit: m.unit,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">ROI Impact Report</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Week 1 Baseline vs AI Copilot Projected Impact · Gemini 2.5 Flash + XGBoost
        </p>
      </div>

      {/* Hero summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass glow-blue rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">AI Copilot Projected Impact</p>
            <p className="text-3xl font-bold text-foreground">
              ₹{new Intl.NumberFormat("en-IN").format(report.total_floorplan_saved)}
            </p>
            <p className="text-sm text-emerald-400 mt-1">projected floorplan interest saved</p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-2xl">
              {report.summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.metrics.map((m, i) => {
          const Icon = METRIC_ICONS[m.metric] ?? CheckCircle2;
          const isReduction = m.metric !== "Vehicles Recommended for Transfer";
          const improved = m.improvement_pct > 0;
          return (
            <motion.div key={m.metric}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{m.metric}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                  improved ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/40 text-muted-foreground"
                }`}>
                  {improved && <ArrowDown className="h-3 w-3" />}
                  {m.improvement_pct.toFixed(1)}% {isReduction ? "reduction" : "increase"}
                </span>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Week 1 Baseline</p>
                  <p className="text-lg font-bold text-foreground">{fmt(m.baseline_value, m.unit)}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">With AI Copilot</p>
                  <p className="text-lg font-bold text-emerald-400">{fmt(m.ai_value, m.unit)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Improvement</span>
                  <span className="text-emerald-400 font-semibold">
                    {m.unit === "₹" ? `₹${new Intl.NumberFormat("en-IN").format(m.improvement)}` : `${m.improvement} ${m.unit}`}
                  </span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(m.improvement_pct, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Comparison bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-base font-semibold text-foreground mb-4">
          Baseline vs AI Copilot — Side by Side
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData.slice(0, 3)} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,18%)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(215,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(225,20%,10%)",
                border: "1px solid hsl(225,15%,25%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Bar dataKey="Baseline"  fill="hsl(215,15%,35%)" radius={[4,4,0,0]} />
            <Bar dataKey="With AI"   fill="hsl(160,70%,50%)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-full bg-muted/60" />
            <span className="text-xs text-muted-foreground">Week 1 Baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">With AI Copilot</span>
          </div>
        </div>
      </motion.div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vehicles for Transfer",  value: report.vehicles_recommended_for_transfer, unit: "vehicles", color: "text-primary" },
          { label: "Avg Days Reduction",     value: report.avg_days_reduction,                unit: "days",     color: "text-emerald-400" },
          { label: "Stockout Alerts Raised", value: report.stockout_alerts_raised,            unit: "alerts",   color: "text-neon-amber" },
          { label: "Floorplan Saved",        value: `₹${new Intl.NumberFormat("en-IN", { notation: "compact" }).format(report.total_floorplan_saved)}`, unit: "", color: "text-emerald-400" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.07 }}
            className="glass rounded-xl p-4 text-center space-y-1"
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ROIReport;
