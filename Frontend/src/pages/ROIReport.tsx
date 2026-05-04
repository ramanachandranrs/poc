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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 py-12">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-2xl bg-card border border-border/10 p-8 shadow-2xl flex flex-col items-center"
        >
          <div className="relative h-16 w-16 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary/20 rounded-full"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">AI Copilot Analysis</h3>
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2"
          >
            Generating ROI report...
          </motion.p>
        </motion.div>
      </div>
      <div className="w-full max-w-2xl px-4">
        <LoadingSkeleton rows={4} />
      </div>
    </div>
  );
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
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">ROI Impact Report</h2>
        <p className="text-base text-muted-foreground mt-1.5 font-medium">
          Week 1 Baseline vs AI Copilot Projected Impact
        </p>
      </div>

      {/* Hero summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/10 shadow-sm p-6"
      >
        <div className="flex items-start gap-5">
          <div className="rounded-2xl bg-primary/10 p-4 shadow-inner">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">AI Copilot Projected Impact</p>
            <p className="text-4xl font-black text-foreground tracking-tight">
              ₹{new Intl.NumberFormat("en-IN").format(report.total_floorplan_saved)}
            </p>
            <p className="text-lg font-bold text-emerald-400 mt-2">projected floorplan interest saved</p>
            <p className="text-base text-muted-foreground mt-5 leading-relaxed max-w-3xl font-medium">
              {report.summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {report.metrics.map((m, i) => {
          const Icon = METRIC_ICONS[m.metric] ?? CheckCircle2;
          const isReduction = m.metric !== "Vehicles Recommended for Transfer";
          const improved = m.improvement_pct > 0;
          return (
            <motion.div key={m.metric}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-xl border border-border/10 shadow-sm p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-bold text-foreground">{m.metric}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider ${
                  improved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-muted/40 text-muted-foreground"
                }`}>
                  {improved && <ArrowDown className="h-3.5 w-3.5" />}
                  {m.improvement_pct.toFixed(1)}% {isReduction ? "reduction" : "increase"}
                </span>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/20 rounded-xl p-4 border border-border/20">
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Week 1 Baseline</p>
                  <p className="text-xl font-extrabold text-foreground">{fmt(m.baseline_value, m.unit)}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">With AI Copilot</p>
                  <p className="text-xl font-extrabold text-emerald-400">{fmt(m.ai_value, m.unit)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span>Improvement</span>
                  <span className="text-emerald-400 font-black">
                    {m.unit === "₹" ? `₹${new Intl.NumberFormat("en-IN").format(m.improvement)}` : `${m.improvement} ${m.unit}`}
                  </span>
                </div>
                <div className="bg-card rounded-xl border border-border/10 shadow-sm overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(m.improvement_pct, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
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
        className="bg-card rounded-xl border border-border/10 shadow-sm p-8"
      >
        <h3 className="text-lg font-bold text-foreground mb-6">
          Baseline vs AI Copilot — Side by Side
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData.slice(0, 3)} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.1)' }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar dataKey="Baseline"  fill="hsl(var(--muted-foreground) / 0.4)" radius={[6,6,0,0]} />
            <Bar dataKey="With AI"   fill="hsl(var(--success))" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-8 mt-6">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-6 rounded-full bg-muted-foreground/30" />
            <span className="text-sm font-bold text-muted-foreground">Week 1 Baseline</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-6 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-muted-foreground">With AI Copilot</span>
          </div>
        </div>
      </motion.div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Vehicles for Transfer",  value: report.vehicles_recommended_for_transfer, unit: "vehicles", color: "text-primary" },
          { label: "Avg Days Reduction",     value: report.avg_days_reduction,                unit: "days",     color: "text-emerald-400" },
          { label: "Stockout Alerts Raised", value: report.stockout_alerts_raised,            unit: "alerts",   color: "text-neon-amber" },
          { label: "Floorplan Saved",        value: `₹${new Intl.NumberFormat("en-IN", { notation: "compact" }).format(report.total_floorplan_saved)}`, unit: "", color: "text-emerald-400" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.07 }}
            className="bg-card rounded-xl border border-border/10 shadow-sm p-5 flex flex-col items-center justify-center gap-1"
          >
            <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ROIReport;
