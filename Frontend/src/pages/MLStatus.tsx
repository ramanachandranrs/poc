import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, RefreshCw, CheckCircle2, AlertTriangle, Clock,
  PlayCircle, Activity, Database, TrendingUp, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

const API_BASE = "http://127.0.0.1:8000/api/v1";

interface RetrainStatus {
  status: "idle" | "running" | "success" | "error";
  message: string;
  timestamp: string | null;
  metrics: {
    variants_trained?: number;
    dealer_variant_combos?: number;
    avg_mape?: number;
    avg_mae?: number;
    training_rows?: number;
    generated_at?: string;
  };
}

interface SchedulerStatus {
  running: boolean;
  baseline_count: number;
  current_count: number;
  new_rows_since_baseline: number;
  retrain_threshold: number;
  poll_interval_seconds: number;
  min_retrain_interval_hours: number;
  last_retrain: string | null;
}

interface MLStatusResponse {
  retrain: RetrainStatus;
  scheduler: SchedulerStatus;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const statusConfig = {
  idle:    { color: "text-muted-foreground",  bg: "bg-muted/40",           icon: Clock,        label: "Idle" },
  running: { color: "text-neon-amber",         bg: "bg-neon-amber/10",      icon: RefreshCw,    label: "Running" },
  success: { color: "text-emerald-400",        bg: "bg-emerald-500/10",     icon: CheckCircle2, label: "Success" },
  error:   { color: "text-neon-red",           bg: "bg-neon-red/10",        icon: AlertTriangle,label: "Error" },
};

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-neon-purple rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

const MLStatus = () => {
  const { role } = useRole();
  const isAdmin = role === "mother_warehouse";

  const [mlData, setMlData]   = useState<MLStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ml/status`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MLStatusResponse = await res.json();
      setMlData(json);
    } catch {
      // silently ignore — backend might not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5 s while running
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleTrigger = async () => {
    if (!isAdmin) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch(`${API_BASE}/ml/retrain`, {
        method: "POST",
        headers: authHeaders(),
      });
      const json = await res.json();
      setTriggerMsg(json.message ?? "Retraining started.");
      fetchStatus();
    } catch (e) {
      setTriggerMsg("Failed to trigger retraining. Check backend.");
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/40 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const retrain   = mlData?.retrain;
  const scheduler = mlData?.scheduler;
  const cfg       = statusConfig[retrain?.status ?? "idle"];
  const StatusIcon = cfg.icon;
  const confidence = retrain?.metrics.avg_mape != null
    ? Math.max(0, 100 - retrain.metrics.avg_mape).toFixed(1)
    : null;
  const newRowsPct = scheduler
    ? Math.min((scheduler.new_rows_since_baseline / scheduler.retrain_threshold) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ML Auto-Retraining</h2>
          <p className="text-sm text-muted-foreground mt-1">
            XGBoost · Two-stage demand forecasting · Auto-triggered on new data
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleTrigger}
            disabled={triggering || retrain?.status === "running"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-sm font-medium transition-colors disabled:opacity-40"
          >
            {triggering || retrain?.status === "running"
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Training…</>
              : <><PlayCircle className="h-4 w-4" /> Trigger Retrain</>}
          </button>
        )}
      </div>

      {/* Trigger message banner */}
      <AnimatePresence>
        {triggerMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl p-3 flex items-center gap-2 text-sm text-primary border border-primary/20"
          >
            <Zap className="h-4 w-4 shrink-0" />
            {triggerMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retrain status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-xl p-5 border ${
            retrain?.status === "running" ? "border-neon-amber/30" :
            retrain?.status === "success" ? "border-emerald-500/30" :
            retrain?.status === "error"   ? "border-neon-red/30"   : "border-border/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Retrain Status</span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className={`h-3 w-3 ${retrain?.status === "running" ? "animate-spin" : ""}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{retrain?.message ?? "No status yet."}</p>
          {retrain?.timestamp && (
            <p className="text-[11px] text-muted-foreground mt-2">
              {new Date(retrain.timestamp).toLocaleString("en-IN")}
            </p>
          )}
        </motion.div>

        {/* Forecast confidence */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Forecast Confidence</span>
            <Brain className="h-4 w-4 text-muted-foreground/50" />
          </div>
          {confidence ? (
            <>
              <p className={`text-3xl font-bold ${parseFloat(confidence) >= 70 ? "text-emerald-400" : parseFloat(confidence) >= 50 ? "text-neon-amber" : "text-neon-red"}`}>
                {confidence}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Based on avg MAPE {retrain?.metrics.avg_mape?.toFixed(1)}% across {retrain?.metrics.variants_trained} variants</p>
              <div className="mt-3">
                <ProgressBar pct={parseFloat(confidence)} />
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          )}
        </motion.div>

        {/* Scheduler */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Auto-Scheduler</span>
            <div className={`h-2 w-2 rounded-full ${scheduler?.running ? "bg-neon-green animate-pulse" : "bg-muted"}`} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {scheduler?.running ? "Active" : "Stopped"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {scheduler?.new_rows_since_baseline ?? 0} / {scheduler?.retrain_threshold ?? 50} new rows
          </p>
          <div className="mt-2">
            <ProgressBar pct={newRowsPct} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Triggers retrain at {scheduler?.retrain_threshold} new rows · polls every {scheduler?.poll_interval_seconds}s
          </p>
        </motion.div>
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">How Auto-Retraining Works</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {[
            { step: "1", icon: Database,   title: "New Data Detected",     desc: `Every ${scheduler?.poll_interval_seconds ?? 60}s, the scheduler counts new rows in vehicle_sales` },
            { step: "2", icon: Zap,        title: "Threshold Triggered",   desc: `When ≥${scheduler?.retrain_threshold ?? 50} new rows accumulate, retraining is queued automatically` },
            { step: "3", icon: Brain,      title: "XGBoost Retrained",     desc: "Two-stage classifier + regressor retrained per variant with fresh lag & rolling features" },
            { step: "4", icon: TrendingUp, title: "Forecast Refreshed",    desc: "30-day dealer × variant forecasts regenerated and served live via the API" },
          ].map((s) => (
            <div key={s.step} className="bg-muted/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                <s.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="font-semibold text-foreground">{s.title}</p>
              </div>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Last run metrics — collapsible */}
      {retrain?.status === "success" && retrain.metrics.variants_trained && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-foreground">Last Retrain Results</span>
            </div>
            {showMetrics ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showMetrics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-5 border-t border-border/50"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
                  {[
                    { label: "Variants Trained",      value: retrain.metrics.variants_trained },
                    { label: "Dealer-Variant Combos", value: retrain.metrics.dealer_variant_combos },
                    { label: "Training Rows",         value: retrain.metrics.training_rows?.toLocaleString("en-IN") },
                    { label: "Avg MAPE",              value: `${retrain.metrics.avg_mape?.toFixed(1)}%` },
                    { label: "Avg MAE",               value: retrain.metrics.avg_mae?.toFixed(2) },
                  ].map((m) => (
                    <div key={m.label} className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{m.value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Non-admin notice */}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground text-center">
          Manual retraining trigger is available to Admin users only.
        </p>
      )}
    </div>
  );
};

export default MLStatus;
