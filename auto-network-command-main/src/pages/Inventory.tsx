import { motion } from "framer-motion";
import { Car, AlertTriangle, Clock } from "lucide-react";
import { useInventory } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const Inventory = () => {
  const { data, loading } = useInventory();

  if (loading) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Vehicle Inventory</h2>
        <p className="text-sm text-muted-foreground mt-1">Wipro DMS — Real-time stock overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((vehicle, i) => {
          const aging = vehicle.days_in_inventory > 60;
          return (
            <motion.div
              key={vehicle.vin}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`glass card-hover rounded-xl p-5 ${aging ? "glow-border-amber" : "glow-blue"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${aging ? "bg-neon-amber/10" : "bg-primary/10"}`}>
                    <Car className={`h-5 w-5 ${aging ? "text-neon-amber" : "text-primary"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{vehicle.model}</h3>
                    <p className="text-xs text-muted-foreground">{vehicle.variant}</p>
                  </div>
                </div>
                {aging && (
                  <span className="flex items-center gap-1 rounded-full bg-neon-amber/10 px-2.5 py-1 text-[10px] font-semibold text-neon-amber uppercase tracking-wide">
                    <AlertTriangle className="h-3 w-3" /> Aging
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VIN</span>
                  <span className="text-foreground font-mono text-[11px]">{vehicle.vin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color</span>
                  <span className="text-foreground">{vehicle.color}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Days in Inventory</span>
                  <span className={`flex items-center gap-1 font-semibold ${aging ? "text-neon-amber" : "text-foreground"}`}>
                    <Clock className="h-3 w-3" /> {vehicle.days_in_inventory}
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

export default Inventory;
