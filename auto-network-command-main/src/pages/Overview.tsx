import { motion } from "framer-motion";
import { Car, Package, Train, AlertTriangle, TrendingUp, Activity, ShieldAlert } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import { useInventory, usePartsList, useTransit } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const chartData = [
  { month: "Jan", inventory: 320, demand: 280 },
  { month: "Feb", inventory: 290, demand: 310 },
  { month: "Mar", inventory: 340, demand: 295 },
  { month: "Apr", inventory: 280, demand: 330 },
  { month: "May", inventory: 310, demand: 340 },
  { month: "Jun", inventory: 350, demand: 320 },
  { month: "Jul", inventory: 330, demand: 360 },
];

const Overview = () => {
  const { data: inventory, loading: invLoading } = useInventory();
  const { data: parts, loading: partsLoading } = usePartsList();
  const { data: transit, loading: transitLoading } = useTransit();

  const loading = invLoading || partsLoading || transitLoading;

  const agingCount = inventory.filter((v) => v.days_in_inventory > 60).length;
  const stockouts = parts.filter((p) => p.quantity_on_hand === 0 || p.quantity_on_hand < p.reorder_point).length;
  const delayed = transit.filter((t) => t.status === "Delayed" || t.status === "Past Due").length;

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* AI Insights Alert */}
      {(agingCount > 0 || stockouts > 0 || delayed > 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass glow-border-red rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-neon-red mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Insights — Critical Edge Cases Detected</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {agingCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-neon-amber/10 px-3 py-1 text-neon-amber">
                    <AlertTriangle className="h-3 w-3" /> {agingCount} vehicles aging &gt; 60 days
                  </span>
                )}
                {stockouts > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-neon-red/10 px-3 py-1 text-neon-red">
                    <Package className="h-3 w-3" /> {stockouts} parts at/below reorder point
                  </span>
                )}
                {delayed > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-neon-red/10 px-3 py-1 text-neon-red">
                    <Train className="h-3 w-3" /> {delayed} shipments delayed/past due
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vehicles" value={inventory.length} icon={Car} trend="+12% vs last month" trendUp accentColor="blue" delay={0} />
        <StatCard title="Aging Stock" value={agingCount} suffix="units" icon={AlertTriangle} trend="Needs attention" accentColor="amber" delay={0.1} />
        <StatCard title="Parts Alerts" value={stockouts} suffix="items" icon={Package} trend="Below ROP" accentColor="red" delay={0.2} />
        <StatCard title="Active Shipments" value={transit.filter((t) => t.status === "In Transit").length} icon={Train} trend="On schedule" trendUp accentColor="green" delay={0.3} />
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="glass glow-blue rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Inventory vs Projected Demand</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Network-wide 7-month trend analysis</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary font-medium">Live</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="inventoryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(205, 100%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(205, 100%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 18%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(225, 20%, 10%)",
                border: "1px solid hsl(225, 15%, 25%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 93%)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="inventory" stroke="hsl(205, 100%, 55%)" fill="url(#inventoryGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="demand" stroke="hsl(270, 80%, 60%)" fill="url(#demandGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-full bg-secondary" />
            <span className="text-xs text-muted-foreground">Projected Demand</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Overview;
