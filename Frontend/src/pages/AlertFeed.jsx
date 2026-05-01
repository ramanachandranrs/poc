import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Check, X, Clock, Sparkles, Filter, ListFilter, Search,
  Zap, RefreshCw, AlertTriangle, Car, Package, Train
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

const API_BASE = "http://127.0.0.1:8000/api/v1";

const fmt = (n) => {
  if (n === null || n === undefined) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
};

const SEV_STYLE = {
  critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  medium:   "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  low:      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-card rounded-xl border border-border/10 shadow-sm overflow-hidden border-l-4 ${
        alert.severity === "critical" ? "border-neon-red" :
        alert.severity === "medium"   ? "border-neon-amber" : "border-yellow-500"
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
  const [dealerCount, setDealerCount] = useState(0);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedDealer, setSelectedDealer] = useState("");
  const [zones, setZones] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (role !== "all" && role !== "mother_warehouse") params.set("role", role);
      if (selectedZone) params.set("zone", selectedZone);
      if (selectedDealer) params.set("dealer_id", selectedDealer);
      
      const token = localStorage.getItem("access_token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/alerts/daily-feed?${params}`, { headers });
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
      // Derive unique dealer count from the alerts
      const uniqueDealers = new Set((json.alerts || []).map(a => a.dealer_id).filter(Boolean));
      setDealerCount(uniqueDealers.size);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [role, selectedZone, selectedDealer]);

  const fetchFilters = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const [zonesRes, dealersRes] = await Promise.all([
        fetch(`${API_BASE}/dealers/zones`, { headers }),
        fetch(`${API_BASE}/dealers`, { headers })
      ]);
      
      const zonesData = await zonesRes.json();
      const dealersData = await dealersRes.json();
      
      if (Array.isArray(zonesData)) setZones(zonesData);
      if (Array.isArray(dealersData)) setDealers(dealersData);
    } catch (err) {
      console.error("Failed to fetch filters", err);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

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
    medium:   alerts.filter((a) => a.severity === "medium").length,
    low:      alerts.filter((a) => a.severity === "low").length,
  };

  const minutesAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    : null;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/10 shadow-sm p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-red/10 border border-neon-red/20">
              <Zap className="h-5 w-5 text-neon-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Action Queue</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-neon-red/10 text-neon-red border border-neon-red/20 font-semibold">
                  {counts.critical} Critical
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neon-amber/10 text-neon-amber border border-neon-amber/20 font-semibold">
                  {counts.medium} Medium
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {counts.low} Low
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground transition-all border border-border/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50 text-foreground hover:bg-muted/50 transition-all shadow-sm"
        >
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Filters</span>
          {(selectedZone || selectedDealer || typeFilter !== "all" || sevFilter !== "all") && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {[selectedZone, selectedDealer, typeFilter !== "all", sevFilter !== "all"].filter(Boolean).length}
            </span>
          )}
        </button>

        <div className="relative flex-1 max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts or dealers..."
            className="w-full rounded-xl bg-card border border-border/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all shadow-sm"
          />
        </div>


      </div>




      {/* Alert feed */}
      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/10 shadow-sm p-12 text-center">
          <Check className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No critical alerts matching your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Network is healthy for these criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {(filtered || []).map((alert) => (
              <AlertCard
                key={alert.alert_id}
                alert={alert}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* Categorized Filter Drawer (Moved to end for Z-Index) */}
      <AnimatePresence>
        {showFilters && (
          <div className="fixed inset-0 z-[2147483647]">
            <style>{`#ai-copilot-button { display: none !important; }`}</style>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 border-l border-border shadow-2xl flex flex-col bg-background text-foreground"
              style={{ 
                backgroundColor: 'hsl(var(--background))', 
                color: 'hsl(var(--foreground))',
                opacity: 1 
              }}
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ListFilter className="h-5 w-5 text-primary" />
                  Filter Options
                </h3>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {(role === "mother_warehouse" || role === "admin") && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regional Isolation</h4>
                    <select 
                      value={selectedZone}
                      onChange={(e) => {
                        setSelectedZone(e.target.value);
                        setSelectedDealer("");
                      }}
                      className="w-full rounded-lg bg-background border border-border/50 p-2.5 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                    >
                      <option value="" className="bg-background text-foreground">All Regions</option>
                      {Array.isArray(zones) && zones.map(z => (
                        <option key={z} value={z} className="bg-background text-foreground">{z}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dealer Scope</h4>
                  <select 
                    value={selectedDealer}
                    onChange={(e) => setSelectedDealer(e.target.value)}
                    className="w-full rounded-lg bg-background border border-border/50 p-2.5 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                  >
                    <option value="" className="bg-background text-foreground">All Dealers</option>
                    {Array.isArray(dealers) && dealers
                      .filter(d => !selectedZone || d.zone === selectedZone)
                      .map(d => (
                        <option key={d.dealer_id} value={d.dealer_id} className="bg-background text-foreground">
                          {d.dealer_name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Alert Category</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {["all", "aging_vehicle", "parts_stockout", "transit_delay"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          typeFilter === t
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted/5 text-muted-foreground hover:bg-muted/20 border border-transparent"
                        }`}
                      >
                        {t === "all" ? "All Categories" : t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Severity Level</h4>
                  <div className="flex flex-wrap gap-2">
                    {["all", "critical", "medium", "low"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSevFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          sevFilter === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/5 text-muted-foreground border-border/50 hover:bg-muted/20"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category: Display Settings */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Display Settings</h4>
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/50 cursor-pointer hover:bg-muted/20 transition-all">
                    <input
                      type="checkbox"
                      checked={showActioned}
                      onChange={(e) => setShowActioned(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-foreground">Include Actioned Alerts</span>
                  </label>
                </div>
              </div>

              <div className="p-4 pb-24 border-t border-border bg-muted/10 shrink-0">
                <button
                  onClick={() => {
                    setSelectedZone("");
                    setSelectedDealer("");
                    setTypeFilter("all");
                    setSevFilter("all");
                    setSearch("");
                  }}
                  className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/50 transition-all mb-3"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
