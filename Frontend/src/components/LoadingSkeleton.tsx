const LoadingSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-16 rounded-lg bg-muted/50 animate-pulse-soft"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

export default LoadingSkeleton;
