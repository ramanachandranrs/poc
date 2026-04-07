import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { usePartsList } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const Parts = () => {
  const { data, loading } = usePartsList();

  if (loading) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Spare Parts & ROP</h2>
        <p className="text-sm text-muted-foreground mt-1">SAP B1 — Supply chain metrics & reorder alerts</p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">SKU</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Part Name</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Category</th>
                <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Qty on Hand</th>
                <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">ROP</th>
                <th className="text-center p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((part, i) => {
                const critical = part.quantity_on_hand === 0 || part.quantity_on_hand < part.reorder_point;
                return (
                  <motion.tr
                    key={part.sku}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${critical ? "bg-neon-red/5" : ""}`}
                  >
                    <td className="p-4 font-mono text-xs text-muted-foreground">{part.sku}</td>
                    <td className="p-4 font-medium text-foreground">{part.name}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{part.category}</span>
                    </td>
                    <td className={`p-4 text-right font-semibold ${critical ? "text-neon-red" : "text-foreground"}`}>
                      {part.quantity_on_hand}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">{part.reorder_point}</td>
                    <td className="p-4 text-center">
                      {critical ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-red/10 px-3 py-1 text-[10px] font-bold text-neon-red uppercase tracking-wider glow-border-red animate-pulse-soft">
                          <AlertOctagon className="h-3 w-3" /> Stockout Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-green/10 px-3 py-1 text-[10px] font-medium text-neon-green uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3" /> Adequate
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Parts;
