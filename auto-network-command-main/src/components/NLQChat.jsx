import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles, ChevronDown } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000/api/v1";

const STARTERS = [
  "Which dealers have critical aging stock today?",
  "Show all parts with zero stock",
  "What is the total floorplan burn this month?",
  "Which shipments are most overdue?",
  "Top 5 fastest selling variants?",
  "Compare dealer performance by zone",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function MiniChart({ data, chartType }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const keys = Object.keys(data[0]).filter((k) => typeof data[0][k] === "number");
  const labelKey = Object.keys(data[0]).find((k) => typeof data[0][k] === "string") || keys[0];
  const valueKey = keys[0];
  if (!valueKey) return null;

  if (chartType === "bar") {
    return (
      <div className="mt-2 rounded-lg bg-muted/20 p-2">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.slice(0, 8)}>
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Bar dataKey={valueKey} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (chartType === "line") {
    return (
      <div className="mt-2 rounded-lg bg-muted/20 p-2">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data.slice(0, 12)}>
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Line dataKey={valueKey} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (chartType === "table") {
    const cols = Object.keys(data[0]);
    return (
      <div className="mt-2 overflow-x-auto rounded-lg bg-muted/20">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/30">
              {cols.map((c) => (
                <th key={c} className="px-2 py-1 text-left text-muted-foreground font-medium capitalize">
                  {c.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 6).map((row, i) => (
              <tr key={i} className="border-b border-border/10">
                {cols.map((c) => (
                  <td key={c} className="px-2 py-1 text-foreground/80">
                    {typeof row[c] === "number" ? row[c].toLocaleString("en-IN") : String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 6 && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">+{data.length - 6} more rows</p>
        )}
      </div>
    );
  }
  return null;
}

export default function NLQChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [open, messages]);

  const send = async (question) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/nlq/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, session_id: sessionId }),
      });
      const json = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.answer,
          data: json.data,
          chart_type: json.chart_type,
          follow_ups: json.follow_ups || [],
        },
      ]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Is the backend running on port 8000?", follow_ups: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button — plain button, no animation wrapper to avoid render issues */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Copilot"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderRadius: "9999px",
            background: "hsl(var(--primary, 210 100% 50%))",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "12px 20px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(37,99,235,0.45)",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <Bot style={{ width: 20, height: 20, flexShrink: 0 }} />
          <span>AI Copilot</span>
          {unread > 0 && (
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", color: "#2563eb", fontSize: 10, fontWeight: 700,
            }}>
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 99999, width: 380, height: 560, background: "#0f1117", border: "1px solid rgba(255,255,255,0.08)" }}
            className="flex flex-col rounded-2xl shadow-2xl overflow-hidden"          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0" style={{ background: "#161b27" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">AI Copilot</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Ask anything about the dealer network</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground/80 hover:bg-muted/40 hover:text-foreground hover:border-primary/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mr-2 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/40 text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.data && (
                      <MiniChart data={msg.data} chartType={msg.chart_type} />
                    )}
                    {msg.role === "assistant" && msg.follow_ups?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.follow_ups.map((q, j) => (
                          <button
                            key={j}
                            onClick={() => send(q)}
                            className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-muted/40">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3 shrink-0" style={{ background: "#161b27" }}>
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about inventory, parts, transit..."
                  className="flex-1 rounded-xl bg-muted/30 border border-border/40 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/50 transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
