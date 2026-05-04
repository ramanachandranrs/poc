import { motion } from "framer-motion";
import LoadingSkeleton from "@/components/LoadingSkeleton";

interface PageLoaderProps {
  icon: React.ElementType;
  title: string;
  message: string;
  rows?: number;
  iconColor?: string;
  glowColor?: string;
}

const PageLoader = ({
  icon: Icon,
  title,
  message,
  rows = 4,
  iconColor = "text-primary",
  glowColor = "bg-primary/20",
}: PageLoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] space-y-8 py-12">
      <div className="relative">
        {/* Ambient glow */}
        <div className={`absolute inset-0 ${glowColor} blur-3xl rounded-full animate-pulse`} />

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative rounded-2xl bg-card border border-border/10 px-10 py-8 shadow-2xl flex flex-col items-center gap-4"
        >
          {/* Spinner ring */}
          <div className="relative h-16 w-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary/15 rounded-full"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
            />
            {/* Icon center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className={`h-6 w-6 ${iconColor} animate-pulse`} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5">
            <h3 className="text-xl font-black text-foreground tracking-tight">{title}</h3>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
            >
              {message}
            </motion.p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mt-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                className="h-1.5 w-1.5 rounded-full bg-primary"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Skeleton preview */}
      <div className="w-full max-w-2xl px-4">
        <LoadingSkeleton rows={rows} />
      </div>
    </div>
  );
};

export default PageLoader;
