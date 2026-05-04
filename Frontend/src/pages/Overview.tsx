import { motion } from "framer-motion";
import { Car, Package, Train, AlertTriangle, Activity, ShieldAlert } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { useInventorySummary, usePartsSummary, useTransitSummary, useTrends } from "@/hooks/useApiData";
import PageLoader from "@/components/PageLoader";

import { useRole } from "@/context/RoleContext";

const Overview = () => {
  const { role } = useRole();
  const navigate = useNavigate();
  const { data: invSummary,     loading: invLoading }     = useInventorySummary();
  const { data: partsSummary,   loading: partsLoading }   = usePartsSummary();
  const { data: transitSummary, loading: transitLoading } = useTransitSummary();
  const { data: trends,         loading: trendsLoading }  = useTrends();

  const loading = invLoading || partsLoading || transitLoading || trendsLoading;

  const agingCount  = invSummary?.aging     ?? 0;
  const stockouts   = partsSummary?.stockout ?? 0;
  const delayed     = transitSummary?.delayed ?? 0;
  const inTransit   = transitSummary?.in_transit ?? 0;
  const totalVehicles = invSummary?.total ?? 0;

  if (loading) return <PageLoader icon={Activity} title="Network Overview" message="Loading dealer network data..." rows={4} />;


  return (
    <div className="space-y-6">
      {/* AI Insights Alert */}
      {(agingCount > 0 || stockouts > 0 || delayed > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 border border-neon-red/10 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-red/10 border border-neon-red/20 shrink-0">
              <ShieldAlert className="h-5 w-5 text-neon-red" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight leading-none">Critical Edge Cases Detected</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {agingCount > 0 && (
                  <span onClick={() => navigate("/aging")} className="flex items-center gap-2 rounded-lg bg-neon-amber/10 border border-neon-amber/20 px-3 py-1 text-[10px] font-bold text-neon-amber uppercase tracking-widest shadow-sm cursor-pointer hover:bg-neon-amber/20 transition-colors">
                    <AlertTriangle className="h-3 w-3" /> <span>{agingCount}</span> vehicles aging &gt; 60 days
                  </span>
                )}
                {stockouts > 0 && (
                  <span onClick={() => navigate("/parts")} className="flex items-center gap-2 rounded-lg bg-neon-red/10 border border-neon-red/20 px-3 py-1 text-[10px] font-bold text-neon-red uppercase tracking-widest shadow-sm cursor-pointer hover:bg-neon-red/20 transition-colors">
                    <Package className="h-3 w-3" /> <span>{stockouts}</span> parts below ROP
                  </span>
                )}
                {delayed > 0 && (
                  <span onClick={() => navigate("/transit")} className="flex items-center gap-2 rounded-lg bg-neon-red/10 border border-neon-red/20 px-3 py-1 text-[10px] font-bold text-neon-red uppercase tracking-widest shadow-sm cursor-pointer hover:bg-neon-red/20 transition-colors">
                    <Train className="h-3 w-3" /> {delayed} shipments delayed
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate("/inventory")} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard title="Total Vehicles" value={totalVehicles} icon={Car} accentColor="blue" delay={0} />
        </div>
        <div onClick={() => navigate("/aging")} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard title="Aging Stock" value={agingCount} suffix="units" icon={AlertTriangle} accentColor="amber" delay={0.1} />
        </div>
        <div onClick={() => navigate("/parts")} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard title="Parts Alerts" value={stockouts} suffix="items" icon={Package} accentColor="red" delay={0.2} />
        </div>
        <div onClick={() => navigate("/transit")} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard title="Active Shipments" value={inTransit} icon={Train} accentColor="green" delay={0.3} />
        </div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-card rounded-xl p-6 border border-border/10 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Inventory vs Projected Demand</h3>
            <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
              {role === "mother_warehouse" ? "Network-wide" : role === "regional_distributor" ? "Regional" : "Dealership"} 7-month trend analysis
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Live</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trends}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 18%)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(225, 20%, 10%)",
                border: "1px solid hsl(225, 15%, 25%)",
                borderRadius: "12px",
                color: "hsl(210, 40%, 93%)",
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
              }}
            />
            <Area type="monotone" dataKey="inventory" stroke="hsl(205, 100%, 55%)" fill="url(#inventoryGrad)" strokeWidth={4} />
            <Area type="monotone" dataKey="demand" stroke="hsl(270, 80%, 60%)" fill="url(#demandGrad)" strokeWidth={4} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-10 mt-8">
          <div className="flex items-center gap-4">
            <div className="h-2 w-6 rounded-full bg-[#1e90ff]" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 w-6 rounded-full bg-[#8a2be2]" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projected</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Overview;
