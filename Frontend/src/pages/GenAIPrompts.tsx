import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, AlertTriangle, Train, Package,
  Copy, Check, ChevronDown, ChevronUp, Flame,
} from "lucide-react";
import { useB2CPrompts, useOperationalAlerts, type B2CPrompt, type OperationalAlert } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import PageLoader from "@/components/PageLoader";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const SEVERITY_STYLE: Record<string, string> = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  High:     "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Medium:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

const BUCKET_STYLE: Record<string, string> = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  Aging:    "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Watch:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy Prompt"}
    </button>
  );
}

// ── B2C Card ──────────────────────────────────────────────────────────────────

function B2CCard({ item, index }: { item: B2CPrompt; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{item.model} {item.variant}</span>
            {item.fuel_type && (
              <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">{item.fuel_type}</span>
            )}
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${BUCKET_STYLE[item.age_bucket] ?? "bg-muted/40 text-muted-foreground"}`}>
              {item.age_bucket}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{item.dealer_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Discount offer</p>
          <p className="font-bold text-emerald-400 text-sm">₹{fmt(item.discount_estimate)}</p>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Days in Showroom</p>
          <p className={`font-semibold ${item.days_in_inventory >= 90 ? "text-neon-red" : "text-neon-amber"}`}>
            {item.days_in_inventory} days
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">VIN</p>
          <p className="font-mono text-[11px] text-foreground">{item.vin}</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        <CopyButton text={item.prompt} />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs transition-colors ml-auto"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide" : "Preview"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 px-4 py-3"
          >
            <pre className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-mono">
              {item.prompt}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ item, index }: { item: OperationalAlert; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = item.alert_type === "stockout" ? Package : Train;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`rounded-lg p-2 shrink-0 ${item.severity === "Critical" ? "bg-neon-red/10" : "bg-neon-amber/10"}`}>
          <Icon className={`h-4 w-4 ${item.severity === "Critical" ? "text-neon-red" : "text-neon-amber"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{item.subject}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${SEVERITY_STYLE[item.severity]}`}>
              {item.severity}
            </span>
            <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {item.alert_type.replace("_", " ")}
            </span>
            {item.dealer_id && (
              <span className="text-[10px] text-muted-foreground font-mono">{item.dealer_id}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-3 text-xs">
        {item.alert_type === "stockout" && (
          <>
            <div>
              <p className="text-muted-foreground">SKU</p>
              <p className="font-mono text-foreground">{item.part_sku}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantity Gap</p>
              <p className="font-semibold text-neon-red">{item.quantity_gap} units below ROP</p>
            </div>
          </>
        )}
        {item.alert_type === "transit_delay" && (
          <>
            <div>
              <p className="text-muted-foreground">Shipment ID</p>
              <p className="font-mono text-foreground">{item.shipment_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Delay</p>
              <p className="font-semibold text-neon-red">{item.delay_days?.toFixed(0)} days late</p>
            </div>
          </>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        <CopyButton text={item.prompt} />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-1.5 text-xs transition-colors ml-auto"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide" : "Preview"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 px-4 py-3"
          >
            <pre className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-mono">
              {item.prompt}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const GenAIPrompts = () => {
  const [tab, setTab] = useState<"b2c" | "alerts">("b2c");
  const [minDays, setMinDays] = useState(60);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [alertTypeFilter, setAlertTypeFilter] = useState("All");

  const { data: b2c,    loading: b2cLoading }    = useB2CPrompts(minDays);
  const { data: alerts, loading: alertsLoading } = useOperationalAlerts();

  const loading = b2cLoading || alertsLoading;
  if (loading) return <PageLoader icon={MessageSquare} title="AI Copilot Prompts" message="Drafting outreach & alert templates..." rows={6} />;


  const filteredAlerts = alerts.filter(a => {
    const matchSev  = severityFilter  === "All" || a.severity   === severityFilter;
    const matchType = alertTypeFilter === "All" || a.alert_type === alertTypeFilter;
    return matchSev && matchType;
  });

  const criticalCount = alerts.filter(a => a.severity === "Critical").length;
  const stockoutCount = alerts.filter(a => a.alert_type === "stockout").length;
  const delayCount    = alerts.filter(a => a.alert_type === "transit_delay").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Copilot Prompts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          B2C Customer Outreach · Operational Alerts · Ready-to-use GenAI templates
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "B2C Outreach",      value: b2c.length,     sub: "aging vehicle offers",    icon: MessageSquare },
          { label: "Critical Alerts",   value: criticalCount,  sub: "need immediate action",   icon: AlertTriangle },
          { label: "Stockout Alerts",   value: stockoutCount,  sub: "parts below ROP",         icon: Package },
          { label: "Transit Delays",    value: delayCount,     sub: "shipments overdue",       icon: Train },
        ].map((c, i) => (
          <motion.div key={c.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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

      {/* Hat explanation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Three AI Copilot Hats</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            { hat: "B2B Negotiation", desc: "Dealer-to-dealer transfer requests. Auto-generated from Transfer Utility Score.", page: "Aging Stock page", color: "text-primary" },
            { hat: "B2C Sales",       desc: "Customer outreach for aging inventory. Personalised discount offers per vehicle.", page: "This page → B2C tab", color: "text-emerald-400" },
            { hat: "Operational Alerts", desc: "Logistics delays and critical part stockouts. Escalation messages for managers.", page: "This page → Alerts tab", color: "text-neon-amber" },
          ].map((h) => (
            <div key={h.hat} className="bg-muted/20 rounded-lg p-3 space-y-1">
              <p className={`font-semibold ${h.color}`}>{h.hat}</p>
              <p className="text-muted-foreground leading-relaxed">{h.desc}</p>
              <p className="text-muted-foreground/60 italic">{h.page}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg bg-muted/30 p-1 gap-1">
          {(["b2c", "alerts"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "b2c" ? `B2C Outreach (${b2c.length})` : `Operational Alerts (${alerts.length})`}
            </button>
          ))}
        </div>

        {tab === "b2c" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Min days:</span>
            {[30, 60, 90].map((d) => (
              <button key={d} onClick={() => setMinDays(d)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  minDays === d ? "bg-primary/10 text-primary font-medium" : "bg-muted/30 hover:bg-muted/50"
                }`}
              >{d}+</button>
            ))}
          </div>
        )}

        {tab === "alerts" && (
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Critical", "High", "Medium"].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  severityFilter === s ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >{s}</button>
            ))}
            <div className="w-px h-4 bg-border/50" />
            {["All", "stockout", "transit_delay"].map(t => (
              <button key={t} onClick={() => setAlertTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors capitalize ${
                  alertTypeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >{t === "transit_delay" ? "Transit Delay" : t === "stockout" ? "Stockout" : "All Types"}</button>
            ))}
          </div>
        )}
      </div>

      {/* B2C Tab */}
      {tab === "b2c" && (
        <div className="space-y-3">
          {b2c.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
              No aging vehicles found for the selected threshold.
            </div>
          ) : (
            b2c.map((item, i) => <B2CCard key={item.vin} item={item} index={i} />)
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
              No alerts match your filters.
            </div>
          ) : (
            filteredAlerts.map((item, i) => <AlertCard key={`${item.alert_type}-${i}`} item={item} index={i} />)
          )}
        </div>
      )}
    </div>
  );
};

export default GenAIPrompts;
