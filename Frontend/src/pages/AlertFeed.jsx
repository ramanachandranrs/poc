import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Check, X, Clock, Sparkles, Filter, ListFilter, Search,
  Zap, RefreshCw, AlertTriangle, Car, Package, Train, Bell, Info, TrendingDown,
  ArrowRight, ShieldCheck, Activity
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useAlertFeed } from "@/hooks/useApiData";

const API_BASE = "http://127.0.0.1:8000/api/v1";

const fmt = (n) => {
  if (n === null || n === undefined) return "0";
  return new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 0 
  }).format(n);
};

const SEV_STYLE = {
  critical: "bg-neon-red/10 text-neon-red border-neon-red/30 glow-red",
  medium:   "bg-neon-amber/10 text-neon-amber border-neon-amber/30 glow-border-amber",
  low:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const TYPE_ICON = {
  aging_vehicle:  Car,
  parts_stockout: Package,
  transit_delay:  Train,
};

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card/50 rounded-2xl p-6 border border-border/10 animate-pulse flex gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted/20 shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/4 rounded bg-muted/20" />
            <div className="h-6 w-3/4 rounded bg-muted/30" />
            <div className="h-4 w-1/2 rounded bg-muted/10" />
          </div>
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

  const isCritical = alert.severity === "critical";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className={`group relative bg-card rounded-2xl border transition-all duration-300 ${
        isCritical ? "border-neon-red/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]" : "border-border/10"
      } hover:border-primary/30 overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${
        alert.severity === "critical" ? "bg-neon-red" :
        alert.severity === "medium"   ? "bg-neon-amber" : "bg-emerald-500"
      }`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${SEV_STYLE[alert.severity]}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${SEV_STYLE[alert.severity]}`}>
                {isCritical && <span className="inline-block w-1.5 h-1.5 rounded-full bg-neon-red animate-pulse mr-1.5" />}
                {alert.severity}
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                {alert.type.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto font-medium">
                {alert.timestamp || "Active Now"}
              </span>
            </div>

            <h3 className="text-base font-bold text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors">
              {alert.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/80 leading-relaxed">
              {alert.summary}
            </p>

            {/* Impact Metrics */}
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Financial Impact</span>
                <div className="flex items-center gap-1.5 text-neon-red font-bold text-sm">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>{fmt(alert.financial_impact_inr)} / day</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Dealer Location</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  {alert.dealer_name}
                </span>
              </div>
            </div>

            {/* AI Recommendation Message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-5 relative"
                >
                  <div className="absolute -top-3 right-3 px-2 py-1 bg-primary/20 text-primary rounded-md text-[9px] font-bold uppercase tracking-widest border border-primary/30 z-10">
                    AI recommendation
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm text-foreground/90 leading-relaxed italic relative overflow-hidden group/msg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                    <Sparkles className="absolute bottom-2 right-2 h-4 w-4 text-primary/20" />
                    "{message}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Bar */}
            <div className="mt-6 pt-4 border-t border-border/10 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {status === "pending" ? (
                  <>
                    <button
                      onClick={generateMessage}
                      disabled={generating}
                      className="group/btn relative flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
                      
                      {generating ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 transition-transform group-hover/btn:rotate-12" />
                      )}
                      <span className="relative z-10">{generating ? "Crafting..." : message ? "Regenerate" : "Generate Solution"}</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={!message}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve & Execute
                    </button>

                    <button
                      onClick={() => setRejectBox(!rejectBox)}
                      className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border/30 px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-neon-red/10 hover:text-neon-red hover:border-neon-red/20"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </>
                ) : (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs ${
                    status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-neon-red/10 text-neon-red border-neon-red/20"
                  }`}>
                    {status === "approved" ? <ShieldCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {status === "approved" ? "Actioned Successfully" : "Request Dismissed"}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setSnoozeOpen(!snoozeOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30 border border-border/10 text-muted-foreground hover:bg-muted/50 transition-colors"
                    title="Snooze for later"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  {snoozeOpen && (
                    <div className="absolute bottom-full mb-2 right-0 z-20 w-40 glass rounded-xl border border-border/50 shadow-2xl overflow-hidden p-1">
                      {[
                        { label: "1 hour", ms: 3600000 },
                        { label: "4 hours", ms: 14400000 },
                        { label: "Tomorrow", ms: 86400000 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => handleSnooze(opt.ms)}
                          className="block w-full px-3 py-2 text-left hover:bg-primary/10 rounded-lg text-xs font-medium text-foreground transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`flex h-9 items-center gap-2 px-3 rounded-xl bg-muted/30 border border-border/10 text-muted-foreground hover:bg-muted/50 transition-all ${expanded ? "bg-primary/5 text-primary" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">Details</span>
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Reject Box */}
            <AnimatePresence>
              {rejectBox && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex gap-2"
                >
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide a reason for dismissal..."
                    className="flex-1 rounded-xl bg-muted/30 border border-border/20 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <button
                    onClick={handleReject}
                    className="rounded-xl bg-neon-red text-white px-5 py-2 text-xs font-bold hover:bg-neon-red/90 transition-all shadow-lg shadow-neon-red/20"
                  >
                    Confirm
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Detailed Data */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 rounded-xl bg-black/20 p-4 border border-border/5"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 flex items-center gap-2">
                      <Info className="h-3 w-3" /> Raw Entity Metadata
                    </span>
                    <button className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Copy JSON</button>
                  </div>
                  <pre className="text-[10px] text-muted-foreground/70 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 custom-scrollbar">
                    {JSON.stringify(alert.entity_detail, null, 2)}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AlertFeed() {
  const { role } = useRole();
  const [typeFilter, setTypeFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showActioned, setShowActioned] = useState(false);
  const [actioned, setActioned] = useState({});
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedDealer, setSelectedDealer] = useState("");
  const [zones, setZones] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data, loading, refetch } = useAlertFeed({
    role,
    zone: selectedZone,
    dealer_id: selectedDealer
  });

  const alerts = useMemo(() => {
    if (!data?.alerts) return [];
    const snoozed = JSON.parse(localStorage.getItem("snoozed_alerts") || "{}");
    const now = Date.now();
    return data.alerts.filter(a => !snoozed[a.alert_id] || snoozed[a.alert_id] < now);
  }, [data]);

  const totalImpact = data?.total_financial_impact_inr || 0;
  const dealerCount = useMemo(() => {
    if (!data?.alerts) return 0;
    return new Set(data.alerts.map(a => a.dealer_id).filter(Boolean)).size;
  }, [data]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers = { "Authorization": `Bearer ${token}` };
        const [zRes, dRes] = await Promise.all([
          fetch(`${API_BASE}/dealers/zones`, { headers }),
          fetch(`${API_BASE}/dealers`, { headers })
        ]);
        setZones(await zRes.json());
        setDealers(await dRes.json());
      } catch (err) { console.error(err); }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const interval = setInterval(refetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleAction = (alertId, action) => {
    setActioned((prev) => ({ ...prev, [alertId]: action }));
  };

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const isActioned = !!actioned[a.alert_id];
      if (!showActioned && isActioned) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (sevFilter !== "all" && a.severity !== sevFilter) return false;
      if (search && !a.dealer_name?.toLowerCase().includes(search.toLowerCase()) &&
          !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [alerts, actioned, showActioned, typeFilter, sevFilter, search]);

  const counts = useMemo(() => ({
    critical: alerts.filter((a) => a.severity === "critical").length,
    medium:   alerts.filter((a) => a.severity === "medium").length,
    low:      alerts.filter((a) => a.severity === "low").length,
    actioned: Object.keys(actioned).length,
  }), [alerts, actioned]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
      {/* Intelligence Briefing Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-neon-blue/10 blur-[100px]" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Today's Intelligence</h1>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-1">
                    <Activity className="h-3 w-3 text-emerald-500" />
                    System operational. {alerts.length} active anomalies detected across the network.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Revenue at Risk</p>
                  <p className="text-2xl font-black text-neon-red tracking-tight">{fmt(totalImpact)}</p>
                </div>
                <div className="w-px h-10 bg-border/20" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Affected Dealers</p>
                  <p className="text-2xl font-black text-foreground tracking-tight">{dealerCount}</p>
                </div>
                <div className="w-px h-10 bg-border/20" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Action Rate</p>
                  <p className="text-2xl font-black text-emerald-500 tracking-tight">
                    {alerts.length > 0 ? Math.round((counts.actioned / alerts.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button
                onClick={refetch}
                className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-white/10 active:scale-95"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Analyzing..." : "Refresh Intelligence"}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/20 border border-white/5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Engine</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anomalies by title or dealer..."
              className="w-full rounded-2xl bg-card border border-border/40 pl-12 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all shadow-sm hover:border-border/60"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-card border border-border/40 text-sm font-bold text-foreground hover:bg-muted/50 transition-all shadow-sm active:scale-95"
          >
            <Filter className="h-4 w-4 text-primary" />
            Filter Intelligence
            {(selectedZone || selectedDealer || typeFilter !== "all" || sevFilter !== "all") && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-black">
                {[selectedZone, selectedDealer, typeFilter !== "all", sevFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/40 shadow-sm">
          {["all", "critical", "medium"].map((s) => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                sevFilter === s 
                ? (s === "critical" ? "bg-neon-red text-white" : s === "medium" ? "bg-neon-amber text-white" : "bg-primary text-white") 
                : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Feed */}
      <div className="space-y-4">
        {loading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/30 rounded-[2rem] border border-dashed border-border/50 py-24 text-center"
          >
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 mb-6">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Clear Skies</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              No active anomalies found for the current selection. Your network is operating within optimal parameters.
            </p>
            <button 
              onClick={() => {
                setTypeFilter("all");
                setSevFilter("all");
                setSearch("");
                setSelectedDealer("");
                setSelectedZone("");
              }}
              className="mt-8 text-xs font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto"
            >
              Reset all filters <ArrowRight className="h-3 w-3" />
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
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

      {/* Categorized Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <div className="fixed inset-0 z-[2147483647]">
            <style>{`#ai-copilot-button { display: none !important; }`}</style>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[400px] border-l border-border/50 shadow-2xl flex flex-col bg-card"
            >
              <div className="p-8 border-b border-border/10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black flex items-center gap-3">
                    <ListFilter className="h-6 w-6 text-primary" />
                    Filters
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Refine your intelligence feed</p>
                </div>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="p-3 hover:bg-muted rounded-2xl transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {(role === "mother_warehouse" || role === "admin") && (
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Regional Scope</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <select 
                        value={selectedZone}
                        onChange={(e) => {
                          setSelectedZone(e.target.value);
                          setSelectedDealer("");
                        }}
                        className="w-full rounded-xl bg-muted/20 border border-border/20 p-4 text-sm font-bold focus:outline-none focus:border-primary/50 text-foreground appearance-none cursor-pointer"
                      >
                        <option value="">All Regions</option>
                        {Array.isArray(zones) && zones.map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Dealer Isolation</h4>
                  <select 
                    value={selectedDealer}
                    onChange={(e) => setSelectedDealer(e.target.value)}
                    className="w-full rounded-xl bg-muted/20 border border-border/20 p-4 text-sm font-bold focus:outline-none focus:border-primary/50 text-foreground appearance-none cursor-pointer"
                  >
                    <option value="">All Dealerships</option>
                    {Array.isArray(dealers) && dealers
                      .filter(d => !selectedZone || d.zone === selectedZone)
                      .map(d => (
                        <option key={d.dealer_id} value={d.dealer_id}>
                          {d.dealer_name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Anomaly Category</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {["all", "aging_vehicle", "parts_stockout", "transit_delay"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`text-left px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                          typeFilter === t
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-muted/10 text-muted-foreground hover:bg-muted/30 border-transparent"
                        }`}
                      >
                        {t === "all" ? "All Categories" : t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Display Settings</h4>
                  <label className="flex items-center gap-4 p-5 rounded-2xl bg-muted/10 border border-border/20 cursor-pointer hover:bg-muted/20 transition-all">
                    <div className={`h-6 w-11 rounded-full p-1 transition-colors ${showActioned ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${showActioned ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      checked={showActioned}
                      onChange={(e) => setShowActioned(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm font-bold text-foreground">Include resolved alerts</span>
                  </label>
                </div>
              </div>

              <div className="p-8 border-t border-border/10 space-y-3">
                <button
                  onClick={() => {
                    setSelectedZone("");
                    setSelectedDealer("");
                    setTypeFilter("all");
                    setSevFilter("all");
                    setSearch("");
                  }}
                  className="w-full py-4 rounded-2xl border border-border/30 text-muted-foreground text-xs font-black uppercase tracking-widest hover:bg-muted/50 transition-all"
                >
                  Clear all parameters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  Apply & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
