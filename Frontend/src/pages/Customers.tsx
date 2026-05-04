import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Phone, MapPin, Car, Filter, X } from "lucide-react";
import { useCustomers } from "@/hooks/useApiData";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import PageLoader from "@/components/PageLoader";
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

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: paginatedData, loading } = useCustomers({
    search: debouncedSearch || undefined,
    state: stateFilter || undefined,
    ownership: ownershipFilter || undefined,
    page: page,
  });

  const customers = paginatedData.items || [];
  const totalCount = paginatedData.total || 0;

  const states = useMemo(() => {
    // We only have states from the current page here, which is a limitation of server-side pagination
    // for a simple dropdown. In a real app, we'd have a separate endpoint for states.
    // For now, we'll keep it as is or hardcode some common ones if needed.
    const all = customers.map((c) => c.state).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  }, [customers]);

  const totalFirst = customers.filter((c) => c.ownership_history === "1st owner").length;
  const totalSecond = customers.filter((c) => c.ownership_history === "2nd owner").length;
  const withContact = customers.filter((c) => c.contact).length;

  const totalPages = Math.ceil(totalCount / pageSize);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStateFilter("");
    setOwnershipFilter("");
    setPage(1);
  };

  const hasFilters = search || stateFilter || ownershipFilter;

  if (loading) return <PageLoader icon={Users} title="Customer Registry" message="Retrieving CRM customer profiles..." rows={8} />;


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Customer Registry</h2>
          <p className="text-base text-muted-foreground mt-1.5 font-medium">Wipro DMS — <span className="text-foreground font-black">{totalCount.toLocaleString()}</span> customers found</p>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 rounded-xl bg-muted/60 px-5 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95"
          >
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={totalCount} icon={Users} accentColor="blue" delay={0} />
        <StatCard title="1st Owners" value={totalFirst} icon={Car} trend="On current page" accentColor="green" delay={0.1} />
        <StatCard title="2nd Owners" value={totalSecond} icon={Car} trend="On current page" accentColor="purple" delay={0.2} />
        <StatCard title="With Contact" value={withContact} icon={Phone} trend="On current page" accentColor="amber" delay={0.3} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/10 shadow-sm p-5 border border-border/20 mt-2">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or customer ID..."
              value={search}
              onChange={(e) => { handleSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl bg-muted/40 border border-border/10 pl-12 pr-4 py-4 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* State filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={stateFilter}
                onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                className="rounded-xl bg-muted/40 border border-border/10 pl-11 pr-10 py-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none min-w-[200px] cursor-pointer"
              >
                <option value="">All States</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Ownership filter */}
            <div className="relative">
              <Car className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={ownershipFilter}
                onChange={(e) => { setOwnershipFilter(e.target.value); setPage(1); }}
                className="rounded-xl bg-muted/40 border border-border/10 pl-11 pr-10 py-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none min-w-[180px] cursor-pointer"
              >
                <option value="">All Ownership</option>
                {ownershipOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/10 shadow-sm overflow-hidden border border-border/10 shadow-lg mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border/10 bg-muted/5">
                <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Customer ID</th>
                <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Name</th>
                <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Contact</th>
                <th className="text-left p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Location</th>
                <th className="text-center p-5 text-xs uppercase tracking-widest text-muted-foreground font-black">Ownership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-muted-foreground text-lg font-medium">
                    No customers found matching your filters.
                  </td>
                </tr>
              ) : (
                customers.map((customer, i) => (
                  <motion.tr
                    key={customer.customer_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.2) }}
                    className="transition-colors hover:bg-muted/30 group"
                  >
                    <td className="p-5 font-mono text-xs text-muted-foreground/60">{customer.customer_id}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shadow-inner">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{customer.name}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      {customer.contact ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                          <Phone className="h-4 w-4 text-primary/60" />
                          <span>{customer.contact}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground/30">—</span>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                        <span>{[customer.city, customer.state].filter(Boolean).join(", ") || "—"}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest border border-border/10 shadow-sm ${ownershipColor[customer.ownership_history ?? ""] ?? "text-muted-foreground bg-muted"}`}>
                        {customer.ownership_history || "Unknown"}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{((page - 1) * pageSize) + 1}</span> to{" "}
              <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-muted/40 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs text-muted-foreground">Page</span>
                <span className="text-xs font-bold text-foreground">{page}</span>
                <span className="text-xs text-muted-foreground">of {totalPages}</span>
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-muted/40 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
