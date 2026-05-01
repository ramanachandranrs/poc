import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import CountUp from "@/components/CountUp";

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accentColor?: "blue" | "purple" | "red" | "amber" | "green";
  delay?: number;
}

const accentMap = {
  blue: "glow-blue border-neon-blue/20 text-neon-blue",
  purple: "glow-purple border-neon-purple/20 text-neon-purple",
  red: "glow-red border-neon-red/20 text-neon-red",
  amber: "glow-border-amber text-neon-amber",
  green: "border-neon-green/20 text-neon-green",
};

const iconBgMap = {
  blue: "bg-neon-blue/10",
  purple: "bg-neon-purple/10",
  red: "bg-neon-red/10",
  amber: "bg-neon-amber/10",
  green: "bg-neon-green/10",
};

const StatCard = ({ title, value, suffix = "", icon: Icon, trend, trendUp, accentColor = "blue", delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-card rounded-xl p-4 border border-border/10 shadow-sm ${accentMap[accentColor]}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-2">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground tracking-tight leading-none">
            <CountUp end={value} />
          </span>
          {suffix && <span className="text-[10px] font-bold text-muted-foreground ml-1 lowercase">{suffix}</span>}
        </div>
        {trend && (
          <p className={`mt-2 text-xs font-bold ${trendUp ? "text-emerald-500" : "text-neon-red"}`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`rounded-lg p-2.5 ${iconBgMap[accentColor]} border border-white/5`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </motion.div>
);

export default StatCard;
