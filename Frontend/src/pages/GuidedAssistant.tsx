import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Sparkles, ArrowRightLeft,
  Package, Clock, IndianRupee, RefreshCw, ChevronDown, ChevronUp, Mail,
} from "lucide-react";
import {
  useGuidedRecommendations, callGemini,
  approveRecommendation, rejectRecommendation,
  type GuidedRecommendation,
} from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const PRIORITY_STYLE: Record<string, string> = {
  Critical: "bg-neon-red/10 text-neon-red border border-neon-red/30",
  Medium:   "bg-neon-amber/10 text-neon-amber border border-neon-amber/30",
  Low:      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  Pending:  "bg-muted/40 text-muted-foreground",
  Approved: "bg-emerald-500/10 text-emerald-400",
  Rejected: "bg-neon-red/10 text-neon-red",
};

// ── Recommendation Card ───────────────────────────────────────────────────────

function RecCard({ rec, onRefresh }: { rec: GuidedRecommendation; onRefresh: () => void }) {
  const [status,    setStatus]    = useState(rec.status);
  const [message,   setMessage]   = useState(rec.generated_message || "");
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [rejectBox, setRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailInfo, setEmailInfo]   = useState<string>("");

  const isTransfer = rec.rec_type === "transfer";
  const Icon = isTransfer ? ArrowRightLeft : Package;

  const generateWithGemini = async () => {
    setLoading(true);
    try {
      const endpoint = isTransfer ? "/ai/generate-b2b" : "/ai/generate-alert";
      const payload  = isTransfer
        ? { ...rec.data }
        : { alert_type: "stockout", part_name: rec.data.part_name, ...rec.data };
      const res = await callGemini(endpoint, payload);
      setMessage(res.generated_text);
    } catch (e) {
      setMessage("Failed to generate. Check Vertex AI credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setEmailStatus("sending");
    try {
      const result = await approveRecommendation(rec.id, message);
      setStatus("Approved");
      const email = result?.email as Record<string, unknown> | undefined;
      if (email && !("error" in email)) {
        if (rec.rec_type === "transfer") {
          const sent = (email.source_email_sent || email.target_email_sent) ? "sent" : "error";
          setEmailStatus(sent);
          const srcTo = email.source_to ?? "dealer";
          const tgtTo = email.target_to ?? "dealer";
          setEmailInfo(`Emails dispatched to ${srcTo} (Source Dealer) and ${tgtTo} (Target Dealer)`);
        } else {
          setEmailStatus(email.email_sent ? "sent" : "error");
          setEmailInfo(`Email dispatched to ${email.to ?? "dealer"}`);
        }
      } else {
        setEmailStatus("error");
        setEmailInfo(String((email as Record<string, unknown>)?.error ?? "Email send failed"));
      }
    } catch {
      setEmailStatus("error");
      setEmailInfo("Approval failed. Check backend.");
    }
    onRefresh();
  };

  const handleReject = async () => {
    await rejectRecommendation(rec.id, rejectReason);
    setStatus("Rejected");
    setRejectBox(false);
    onRefresh();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl overflow-hidden border-l-4 ${
        rec.priority === "Critical" ? "border-neon-red" :
        rec.priority === "Medium"   ? "border-neon-amber" : "border-yellow-500"
      }`}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className={`rounded-lg p-2 shrink-0 ${isTransfer ? "bg-primary/10" : "bg-neon-amber/10"}`}>
          <Icon className={`h-4 w-4 ${isTransfer ? "text-primary" : "text-neon-amber"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{rec.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{rec.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${PRIORITY_STYLE[rec.priority]}`}>
            {rec.priority}
          </span>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[status]}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Key data */}
      {isTransfer && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Days in Stock</p>
            <p className="font-semibold text-neon-amber flex items-center gap-1">
              <Clock className="h-3 w-3" />{rec.data.days_in_inventory}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Floorplan Cost</p>
            <p className="font-semibold text-neon-red">₹{fmt(rec.data.floorplan_cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Net Utility</p>
            <p className={`font-semibold ${rec.data.net_utility > 0 ? "text-emerald-400" : "text-neon-red"}`}>
              {rec.data.net_utility > 0 ? "+" : ""}₹{fmt(rec.data.net_utility)}
            </p>
          </div>
        </div>
      )}
      {!isTransfer && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">On Hand</p>
            <p className="font-semibold text-neon-red">{rec.data.qty_on_hand} units</p>
          </div>
          <div>
            <p className="text-muted-foreground">Reorder Point</p>
            <p className="font-semibold text-foreground">{rec.data.reorder_point} units</p>
          </div>
          <div>
            <p className="text-muted-foreground">Order Qty</p>
            <p className="font-semibold text-emerald-400">{rec.data.recommended_order_qty} units</p>
          </div>
        </div>
      )}

      {/* Gemini generate button */}
      {status === "Pending" && (
        <div className="px-4 pb-3">
          <button
            onClick={generateWithGemini}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 w-full justify-center"
          >
            {loading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Drafting AI Message…</>
              : <><Sparkles className="h-3.5 w-3.5" /> Generate AI Message</>
            }
          </button>
        </div>
      )}

      {/* Generated message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3"
          >
            <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AI Generated</span>
              </div>
              <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                {message}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve / Reject */}
      {status === "Pending" && (
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={!message || emailStatus === "sending"}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-30"
          >
            {emailStatus === "sending"
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              : <><CheckCircle2 className="h-3.5 w-3.5" /> Approve & Send Email</>
            }
          </button>
          <button
            onClick={() => setRejectBox(!rejectBox)}
            className="flex items-center gap-1.5 rounded-lg bg-neon-red/10 hover:bg-neon-red/20 text-neon-red px-4 py-2 text-xs font-semibold transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground px-3 py-2 text-xs transition-colors ml-auto"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Raw Data
          </button>
        </div>
      )}

      {/* Email status banner */}
      <AnimatePresence>
        {(emailStatus === "sent" || emailStatus === "error") && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3"
          >
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              emailStatus === "sent"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-neon-red/10 text-neon-red border border-neon-red/20"
            }`}>
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {emailStatus === "sent" ? "✓ Email sent — " : "✗ Email failed — "}
                {emailInfo}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject reason box */}
      <AnimatePresence>
        {rejectBox && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-2"
          >
            <input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              className="w-full bg-muted/40 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-red/50"
            />
            <button
              onClick={handleReject}
              className="rounded-lg bg-neon-red/10 hover:bg-neon-red/20 text-neon-red px-4 py-1.5 text-xs font-semibold transition-colors"
            >
              Confirm Reject
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raw data */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 px-4 py-3"
          >
            <pre className="text-[10px] text-muted-foreground bg-muted/20 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(rec.data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const GuidedAssistant = () => {
  const { data: recs, loading } = useGuidedRecommendations();
  const [tab, setTab] = useState<"pending" | "actioned">("pending");
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate(n => n + 1), []);

  if (loading) return <LoadingSkeleton rows={6} />;

  const pending  = recs.filter(r => r.status === "Pending");
  const actioned = recs.filter(r => r.status !== "Pending");

  const criticalCount  = pending.filter(r => r.priority === "Critical").length;
  const transferCount  = recs.filter(r => r.rec_type === "transfer").length;
  const reorderCount   = recs.filter(r => r.rec_type === "stockout").length;
  const approvedCount  = actioned.filter(r => r.status === "Approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Guided Assistant</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Human-in-the-loop · AI Copilot · Approve or Reject AI recommendations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Review",   value: pending.length,  sub: `${criticalCount} critical`, icon: Clock },
          { label: "Transfer Recs",    value: transferCount,   sub: "vehicle moves",             icon: ArrowRightLeft },
          { label: "Reorder Recs",     value: reorderCount,    sub: "parts below ROP",           icon: Package },
          { label: "Approved Today",   value: approvedCount,   sub: "actions taken",             icon: CheckCircle2 },
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

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">How the Guided Assistant Works</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {[
            { step: "1", title: "AI Surfaces Recommendation", desc: "XGBoost + Heuristic Score identifies the best action" },
            { step: "2", title: "Generate AI Message",       desc: "Click to draft a professional message using the AI Copilot" },
            { step: "3", title: "Human Reviews",              desc: "Manager reads the AI-generated message and context" },
            { step: "4", title: "Approve or Reject",          desc: "Human approves to send email to dealers or rejects with a reason" },
          ].map((s) => (
            <div key={s.step} className="bg-muted/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{s.step}</span>
                <p className="font-semibold text-foreground">{s.title}</p>
              </div>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted/30 p-1 gap-1 w-fit">
        {(["pending", "actioned"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pending" ? `Pending Review (${pending.length})` : `Actioned (${actioned.length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {tab === "pending" && (
          pending.length === 0
            ? <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">All recommendations have been actioned.</div>
            : pending.map(r => <RecCard key={r.id} rec={r} onRefresh={refresh} />)
        )}
        {tab === "actioned" && (
          actioned.length === 0
            ? <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No actioned recommendations yet.</div>
            : actioned.map(r => <RecCard key={r.id} rec={r} onRefresh={refresh} />)
        )}
      </div>
    </div>
  );
};

export default GuidedAssistant;
