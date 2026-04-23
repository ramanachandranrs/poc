import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Phone, MapPin, Car, Filter, X } from "lucide-react";
import { useCustomers } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatCard from "@/components/StatCard";

const ownershipOptions = ["1st owner", "2nd owner", "3rd owner"];

const ownershipColor: Record<string, string> = {
  "1st owner": "text-neon-green bg-neon-green/10",
  "2nd owner": "text-neon-blue bg-primary/10",
  "3rd owner": "text-neon-amber bg-neon-amber/10",
};

const Customers = () => {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data, loading } = useCustomers({
    search: debouncedSearch || undefined,
    state: stateFilter || undefined,
    ownership: ownershipFilter || undefined,
  });

  const states = useMemo(() => {
    const all = data.map((c) => c.state).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  }, [data]);

  const totalFirst = data.filter((c) => c.ownership_history === "1st owner").length;
  const totalSecond = data.filter((c) => c.ownership_history === "2nd owner").length;
  const withContact = data.filter((c) => c.contact).length;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStateFilter("");
    setOwnershipFilter("");
  };

  const hasFilters = search || stateFilter || ownershipFilter;

  if (loading) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customer Registry</h2>
          <p className="text-sm text-muted-foreground mt-1">Wipro DMS — {data.length} customers loaded</p>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={data.length} icon={Users} accentColor="blue" delay={0} />
        <StatCard title="1st Owners" value={totalFirst} icon={Car} trend="Primary buyers" trendUp accentColor="green" delay={0.1} />
        <StatCard title="2nd Owners" value={totalSecond} icon={Car} trend="Pre-owned segment" accentColor="purple" delay={0.2} />
        <StatCard title="With Contact" value={withContact} icon={Phone} trend="Reachable" trendUp accentColor="amber" delay={0.3} />
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or customer ID..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg bg-muted/40 border border-border/50 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* State filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg bg-muted/40 border border-border/50 pl-8 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none min-w-[160px]"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Ownership filter */}
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
              className="rounded-lg bg-muted/40 border border-border/50 pl-8 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none min-w-[150px]"
            >
              <option value="">All Ownership</option>
              {ownershipOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Customer ID</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Name</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Contact</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Location</th>
                <th className="text-center p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ownership</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                    No customers found matching your filters.
                  </td>
                </tr>
              ) : (
                data.map((customer, i) => (
                  <motion.tr
                    key={customer.customer_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-muted-foreground">{customer.customer_id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.contact ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{customer.contact}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{[customer.city, customer.state].filter(Boolean).join(", ") || "—"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ownershipColor[customer.ownership_history ?? ""] ?? "text-muted-foreground bg-muted"}`}>
                        {customer.ownership_history || "Unknown"}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;
