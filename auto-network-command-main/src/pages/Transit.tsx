import { motion } from "framer-motion";
import { Train, MapPin, AlertTriangle, CheckCircle2, Clock, PackageOpen } from "lucide-react";
import { useTransit } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const statusConfig: Record<string, { icon: typeof Train; color: string; bg: string }> = {
  "In Transit": { icon: Train, color: "text-primary", bg: "bg-primary/10" },
  "Delivered": { icon: CheckCircle2, color: "text-neon-green", bg: "bg-neon-green/10" },
  "Delayed": { icon: AlertTriangle, color: "text-neon-red", bg: "bg-neon-red/10" },
  "Past Due": { icon: AlertTriangle, color: "text-neon-red", bg: "bg-neon-red/10" },
  "Loading": { icon: PackageOpen, color: "text-neon-amber", bg: "bg-neon-amber/10" },
};

const Transit = () => {
  const { data, loading } = useTransit();

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Transit Logistics</h2>
        <p className="text-sm text-muted-foreground mt-1">Manesar Rail — Shipment tracking & delivery timeline</p>
      </div>

      <div className="space-y-4">
        {data.map((shipment, i) => {
          const isAlert = shipment.status === "Delayed" || shipment.status === "Past Due";
          const cfg = statusConfig[shipment.status] || statusConfig["In Transit"];
          const StatusIcon = cfg.icon;

          return (
            <motion.div
              key={shipment.shipment_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`glass card-hover rounded-xl p-5 ${isAlert ? "glow-border-red" : "glow-blue"}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 ${cfg.bg}`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{shipment.shipment_id}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} ${isAlert ? "animate-pulse-soft" : ""}`}>
                        {shipment.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {shipment.carrier} · {shipment.items} units · Delay {shipment.delay_days} d
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{shipment.origin}</span>
                  </div>
                  <div className="w-12 h-px bg-border relative">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${isAlert ? "bg-neon-red animate-pulse" : "bg-primary"}`} />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{shipment.destination}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className={isAlert ? "text-neon-red font-semibold" : "text-muted-foreground"}>
                    ETA: {shipment.expected_delivery}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Transit;
