import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Package, Train, Car, Zap, RefreshCw,
  ChevronDown, ChevronUp, Check, X, Clock, Sparkles,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

const API_BASE = "http://127.0.0.1:8000/api/v1";

const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const SEV_STYLE = {
  critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  high:     "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  medium:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

const TYPE_ICON = {
  aging_vehicle:  Car,
  parts_stockout: Package,
  transit_delay:  Train,
};

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted/40" />
          <div className="h-4 w-2/3 rounded bg-muted/30" />
          <div className="h-3 w-1/2 rounded bg-muted/20" />
        </div>
      ))}
    </div>
  );
}

function AlertCard({ alert, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(alert.gemini_message || "");
  const [status, setStatus] = useState(alert.status || "pending");
  const [rejectBox, setRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const Icon = TYPE_ICON[alert.type] || AlertTriangle;

  const generateMessage = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/generate-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alert.alert_id, alert_data: alert }),
      });
      const json = await res.json();
      setMessage(json.message);
    } catch {
      setMessage("Failed to generate message. Check backend connection.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    setStatus("approved");
    onAction(alert.alert_id, "approved");
  };

  const handleReject = () => {
    setStatus("rejected");
    setRejectBox(false);
    onAction(alert.alert_id, "rejected");
  };

  const handleSnooze = (duration) => {
    const until = Date.now() + duration;
    const snoozed = JSON.parse(localStorage.getItem("snoozed_alerts") || "{}");
    snoozed[alert.alert_id] = until;
    localStorage.setItem("snoozed_alerts", JSON.stringify(snoozed));
    setStatus("snoozed");
    setSnoozeOpen(false);
    onAction(alert.alert_id, "snoozed");
  };

  if (status === "snoozed") return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`glass rounded-xl overflow-hidden border-l-4 ${
        alert.severity === "critical" ? "border-neon-red" :
        alert.severity === "high"     ? "border-neon-amber" : "border-yellow-500"
      }`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 shrink-0 ${SEV_STYLE[alert.severity]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${SEV_STYLE[alert.severity]}`}>
                {alert.severity}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {alert.type.replace(/_/g, " ")}
              </span>
              {status === "approved" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  ✓ Approved
                </span>
              )}
              {status === "rejected" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-red/10 text-neon-red border border-neon-red/20 font-semibold">
                  ✗ Rejected
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground leading-snug">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.summary}</p>
          </div>
        </div>

        {/* Impact + action row */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-neon-red font-semibold">₹{fmt(alert.financial_impact_inr)}/day impact</span>
            <span className="text-muted-foreground">{alert.dealer_name}</span>
          </div>
          <span className="text-xs text-primary font-medium">Action: {alert.action_label}</span>
        </div>

        {/* Generated message preview */}
        {message && (
          <div className="mt-3 rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {message}
          </div>
        )}

        {/* Action buttons */}
        {status === "pending" && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={generateMessage}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {generating ? "Generating..." : "Generate AI Message"}
            </button>
            <button
              onClick={handleApprove}
              disabled={!message}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
            >
              <Check className="h-3 w-3" /> Approve & Send
            </button>
            <button
              onClick={() => setRejectBox(!rejectBox)}
              className="flex items-center gap-1.5 rounded-lg bg-neon-red/10 hover:bg-neon-red/20 text-neon-red px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <X className="h-3 w-3" /> Reject
            </button>
            <div className="relative">
              <button
                onClick={() => setSnoozeOpen(!snoozeOpen)}
                className="flex items-center gap-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Clock className="h-3 w-3" /> Snooze
              </button>
              {snoozeOpen && (
                <div className="absolute bottom-full mb-1 left-0 z-10 glass rounded-lg border border-border/50 shadow-lg overflow-hidden text-xs">
                  {[
                    { label: "1 hour", ms: 3600000 },
                    { label: "4 hours", ms: 14400000 },
                    { label: "Tomorrow morning", ms: 86400000 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleSnooze(opt.ms)}
                      className="block w-full px-4 py-2 text-left hover:bg-muted/40 text-foreground/80 whitespace-nowrap"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject reason input */}
        {rejectBox && (
          <div className="mt-2 flex gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 rounded-lg bg-muted/30 border border-border/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleReject}
              className="rounded-lg bg-neon-red/20 text-neon-red px-3 py-1.5 text-xs font-medium hover:bg-neon-red/30 transition-colors"
            >
              Confirm
            </button>
          </div>
        )}

        {/* Expand entity details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full justify-center border-t border-border/20 pt-2"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide details" : "Show entity details"}
        </button>

        {expanded && (
          <div className="mt-2 rounded-lg bg-muted/10 p-2 text-[10px] text-muted-foreground font-mono">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(alert.entity_detail, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AlertFeed() {
  const { role } = useRole();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalImpact, setTotalImpact] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showActioned, setShowActioned] = useState(false);
  const [actioned, setActioned] = useState({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (role !== "all") params.set("role", role);
      const res = await fetch(`${API_BASE}/alerts/daily-feed?${params}`);
      const json = await res.json();

      // Filter out snoozed
      const snoozed = JSON.parse(localStorage.getItem("snoozed_alerts") || "{}");
      const now = Date.now();
      const active = (json.alerts || []).filter(
        (a) => !snoozed[a.alert_id] || snoozed[a.alert_id] < now
      );

      setAlerts(active);
      setTotalImpact(json.total_financial_impact_inr || 0);
      setLastUpdated(new Date());
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAction = (alertId, action) => {
    setActioned((prev) => ({ ...prev, [alertId]: action }));
  };

  const filtered = alerts.filter((a) => {
    const isActioned = !!actioned[a.alert_id];
    if (!showActioned && isActioned) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (sevFilter !== "all" && a.severity !== sevFilter) return false;
    if (search && !a.dealer_name?.toLowerCase().includes(search.toLowerCase()) &&
        !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high:     alerts.filter((a) => a.severity === "high").length,
    medium:   alerts.filter((a) => a.severity === "medium").length,
  };

  const minutesAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    : null;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass glow-border-red rounded-xl p-4"
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neon-red" />
              <h2 className="text-sm font-bold text-foreground">Today's Action Queue</h2>
            </div>
            <p className="mt-1 text-lg font-bold text-neon-red">
              ₹{fmt(totalImpact)} at risk today across 30 dealers
            </p>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-red/10 text-neon-red border border-neon-red/20 font-semibold">
                {counts.critical} Critical
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-amber/10 text-neon-amber border border-neon-amber/20 font-semibold">
                {counts.high} High
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold">
                {counts.medium} Medium
              </span>
              {minutesAgo !== null && (
                <span className="text-[10px] text-muted-foreground">
                  Last updated {minutesAgo === 0 ? "just now" : `${minutesAgo}m ago`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Type pills */}
        <div className="flex gap-1 flex-wrap">
          {["all", "aging_vehicle", "parts_stockout", "transit_delay"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t === "all" ? "All" : t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
        {/* Severity pills */}
        <div className="flex gap-1 flex-wrap">
          {["all", "critical", "high", "medium"].map((s) => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                sevFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dealer..."
          className="rounded-lg bg-muted/30 border border-border/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-40"
        />
        {/* Show actioned toggle */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showActioned}
            onChange={(e) => setShowActioned(e.target.checked)}
            className="rounded"
          />
          Show Actioned
        </label>
      </div>

      {/* Alert feed */}
      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Check className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No critical alerts matching your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Network is healthy for these criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((alert) => (
              <AlertCard
                key={alert.alert_id}
                alert={alert}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
