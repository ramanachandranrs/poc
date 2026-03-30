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
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`glass card-hover rounded-xl p-5 ${accentMap[accentColor]}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">
            <CountUp end={value} />
          </span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trendUp ? "text-neon-green" : "text-neon-red"}`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`rounded-lg p-2.5 ${iconBgMap[accentColor]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </motion.div>
);

export default StatCard;
