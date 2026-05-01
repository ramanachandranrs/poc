import { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { Plus, Trash2, Edit2, Shield, Loader2, Store } from "lucide-react";
import { motion } from "framer-motion";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function DealerManagement() {
  const { role, token } = useRole();

  // ALL hooks must be declared before any early return
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ dealer_id: "", dealer_name: "", city: "", state: "", dealer_type: "1S", zone: "" });
  const [formLoading, setFormLoading] = useState(false);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/dealers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch dealers");
      setDealers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "regional_distributor") {
      fetchDealers();
    }
  }, [role]);

  // Access guard AFTER all hooks
  if (role !== "regional_distributor") {
    return (
      <div className="flex items-center justify-center h-[70vh] text-center">
        <div>
          <Shield className="h-12 w-12 text-neon-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only Regional Distributors can access Dealership Management.</p>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        dealer_id: formData.dealer_id,
        dealer_name: formData.dealer_name,
        city: formData.city,
        state: formData.state,
        dealer_type: formData.dealer_type,
        zone: formData.zone || "North", // backend enforces zone matches user's zone
      };

      const url = isEditing ? `${API_BASE}/dealers/${formData.dealer_id}` : `${API_BASE}/dealers`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to save dealership");
      }

      setFormData({ dealer_id: "", dealer_name: "", city: "", state: "", dealer_type: "1S", zone: "" });
      setIsEditing(false);
      setShowForm(false);
      fetchDealers();
    } catch (err) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dealership? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/dealers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete dealership");
      }
      fetchDealers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleEdit = (d) => {
    setFormData({
      dealer_id: d.dealer_id,
      dealer_name: d.dealer_name,
      city: d.city,
      state: d.state,
      dealer_type: d.dealer_type || "1S",
      zone: d.zone || ""
    });
    setIsEditing(true);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dealership Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the dealerships operating within your assigned territory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dealer Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card text-card-foreground p-6 rounded-xl border border-border/40 shadow-lg h-fit">
          {!showForm ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Add Dealership</h3>
              <p className="text-xs text-muted-foreground mb-6">Onboard a new dealership into your network zone.</p>
              <button
                onClick={() => setShowForm(true)}
                className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 text-sm transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Create Dealership
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4">
                {isEditing ? "Edit Dealership" : "Create Dealership"}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Dealer ID</label>
                  <input
                    required
                    disabled={isEditing}
                    value={formData.dealer_id}
                    onChange={(e) => setFormData({...formData, dealer_id: e.target.value})}
                    className="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none disabled:opacity-50"
                    placeholder="e.g. DLR031"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Dealership Name</label>
                  <input
                    required
                    value={formData.dealer_name}
                    onChange={(e) => setFormData({...formData, dealer_name: e.target.value})}
                    className="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">City</label>
                    <input
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">State</label>
                    <input
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    disabled={formLoading}
                    type="submit"
                    className="flex-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 text-sm transition-colors flex items-center justify-center shadow-lg shadow-primary/20"
                  >
                    {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Save Changes" : "Create Dealer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setShowForm(false); setFormData({ dealer_id: "", dealer_name: "", city: "", state: "", dealer_type: "1S", zone: "" }); }}
                    className="rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground px-4 py-2 text-sm transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>

        {/* Dealer List */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-card p-6 rounded-xl border border-border/40 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">
            Network Dealerships <span className="text-sm font-normal text-muted-foreground ml-1">({dealers.length} total)</span>
          </h3>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">ID</th>
                    <th className="pb-3 pr-4">Dealership Name</th>
                    <th className="pb-3 pr-4">Location</th>
                    <th className="pb-3 pr-4">Zone</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.map((d) => (
                    <tr key={d.dealer_id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{d.dealer_id}</td>
                      <td className="py-3 pr-4 font-medium">{d.dealer_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{d.city}, {d.state}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {d.zone}
                        </span>
                      </td>
                      <td className="py-3 flex justify-end gap-2">
                        <button onClick={() => handleEdit(d)} className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(d.dealer_id)} className="p-1.5 rounded bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dealers.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-muted-foreground">No dealerships found in your zone.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
