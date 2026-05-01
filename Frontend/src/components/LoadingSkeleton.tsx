const LoadingSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="space-y-6 animate-fade-in">
    {/* Header Pulse */}
    <div className="space-y-2">
      <div className="h-8 w-64 bg-muted/50 rounded-lg animate-pulse-soft" />
      <div className="h-4 w-96 bg-muted/30 rounded-lg animate-pulse-soft" />
    </div>

    {/* Stat Cards Pulse */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 glass rounded-xl animate-pulse-soft" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>

    {/* Main Content Pulse */}
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-muted/40 animate-pulse-soft"
          style={{ animationDelay: `${(i + 4) * 100}ms` }}
        />
      ))}
    </div>
  </div>
);

export default LoadingSkeleton;
