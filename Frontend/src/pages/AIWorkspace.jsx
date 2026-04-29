import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, AlertTriangle, Train, Package,
  Copy, Check, ChevronDown, ChevronUp, Flame, Sparkles, RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useB2CPrompts, useOperationalAlerts } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import GuidedAssistant from "@/pages/GuidedAssistant";

const API_BASE = "http://127.0.0.1:8000/api/v1";
const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const SEVERITY_STYLE = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  High:     "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Medium:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

const BUCKET_STYLE = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  Aging:    "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Watch:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── B2C Card with "Generate with Gemini" ─────────────────────────────────────
function B2CCard({ item, index }) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState("");

  const generateMessage = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/ai/generate-b2c`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: item.model,
          variant: item.variant,
          fuel_type: item.fuel_type,
          dealer_name: item.dealer_name,
          dealer_city: item.dealer_name,
          days_in_inventory: item.days_in_inventory,
          discount_amount: item.discount_estimate,
        }),
      });
      const json = await res.json();
      setGenerated(json.generated_text || "");
    } catch {
      setGenerated("Generation failed. Check backend connection.");
    } finally {
      setGenerating(false);
    }
  };

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

      {/* Generated message */}
      {generated && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {generated}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={generateMessage}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "Drafting..." : "Generate AI Message"}
        </button>
        {generated && <CopyButton text={generated} />}
      </div>
    </motion.div>
  );
}

// ── Operational Alert Card ────────────────────────────────────────────────────
function OpAlertCard({ item, index }) {
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
          <span className="font-semibold text-foreground text-sm">{item.subject}</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${SEVERITY_STYLE[item.severity]}`}>
              {item.severity}
            </span>
            <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {item.alert_type.replace("_", " ")}
            </span>
            {item.dealer_id && <span className="text-[10px] text-muted-foreground font-mono">{item.dealer_id}</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-3 text-xs">
        {item.alert_type === "stockout" && (
          <>
            <div><p className="text-muted-foreground">SKU</p><p className="font-mono text-foreground">{item.part_sku}</p></div>
            <div><p className="text-muted-foreground">Gap</p><p className="font-semibold text-neon-red">{item.quantity_gap} units below ROP</p></div>
          </>
        )}
        {item.alert_type === "transit_delay" && (
          <>
            <div><p className="text-muted-foreground">Shipment</p><p className="font-mono text-foreground">{item.shipment_id}</p></div>
            <div><p className="text-muted-foreground">Delay</p><p className="font-semibold text-neon-red">{item.delay_days?.toFixed(0)} days late</p></div>
          </>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        <CopyButton text={item.prompt} />
      </div>
    </motion.div>
  );
}

// ── Main AIWorkspace ──────────────────────────────────────────────────────────
export default function AIWorkspace() {
  const [tab, setTab] = useState("queue");
  const [minDays, setMinDays] = useState(60);
  const [sevFilter, setSevFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: b2c,    loading: b2cLoading }    = useB2CPrompts(minDays);
  const { data: alerts, loading: alertsLoading } = useOperationalAlerts();

  const TABS = [
    { id: "queue",   label: "Action Queue",       icon: ShieldCheck },
    { id: "b2c",     label: "B2C Outreach",        icon: MessageSquare },
    { id: "opAlerts",label: "Operational Alerts",  icon: AlertTriangle },
  ];

  const filteredAlerts = (alerts || []).filter((a) => {
    const matchSev  = sevFilter  === "All" || a.severity   === sevFilter;
    const matchType = typeFilter === "All" || a.alert_type === typeFilter;
    return matchSev && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Action Queue · B2C Outreach · Operational Alerts — all in one place
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex rounded-xl bg-muted/20 p-1 gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Action Queue — reuse GuidedAssistant */}
      {tab === "queue" && <GuidedAssistant />}

      {/* B2C Outreach */}
      {tab === "b2c" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Min days in showroom:</span>
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setMinDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  minDays === d ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {d}+ days
              </button>
            ))}
          </div>
          {b2cLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (b2c || []).length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
              No aging vehicles found for the selected threshold.
            </div>
          ) : (
            <div className="space-y-3">
              {(b2c || []).map((item, i) => <B2CCard key={item.vin} item={item} index={i} />)}
            </div>
          )}
        </div>
      )}

      {/* Operational Alerts */}
      {tab === "opAlerts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Critical", "High", "Medium"].map((s) => (
              <button
                key={s}
                onClick={() => setSevFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sevFilter === s ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
            <div className="w-px h-4 bg-border/50" />
            {["All", "stockout", "transit_delay"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                  typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "transit_delay" ? "Transit Delay" : t === "stockout" ? "Stockout" : "All Types"}
              </button>
            ))}
          </div>
          {alertsLoading ? (
            <LoadingSkeleton rows={4} />
          ) : filteredAlerts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
              No alerts match your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((item, i) => (
                <OpAlertCard key={`${item.alert_type}-${i}`} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
