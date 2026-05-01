import { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { Plus, Trash2, Edit2, Shield, Loader2, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const API_BASE = "http://127.0.0.1:8000/api/v1";
const ZONES = ["North", "East", "West", "South", "Central"];

export default function UserManagement() {
  const { role, token } = useRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, username: "", password: "", role: "dealership", zone: "", dealer_id: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "mother_warehouse") {
      fetchUsers();
    }
  }, [role]);

  // Access guard AFTER all hooks
  if (role !== "mother_warehouse") {
    return (
      <div className="flex items-center justify-center h-[70vh] text-center">
        <div>
          <Shield className="h-12 w-12 text-neon-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only the Mother Warehouse admin can manage users.</p>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setSuccessMsg("");
    try {
      const payload = {
        username: formData.username,
        role: formData.role,
        zone: formData.zone || null,
        dealer_id: formData.dealer_id || null,
      };
      if (formData.password) payload.password = formData.password;

      const url = isEditing ? `${API_BASE}/users/${formData.id}` : `${API_BASE}/users`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to save user");
      }

      setSuccessMsg(isEditing ? "User updated successfully." : "User created successfully.");
      resetForm();
      fetchUsers();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch(`${API_BASE}/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (e) {
      alert("Failed to delete user");
    }
  };

  const handleEdit = (u) => {
    setFormData({ id: u.id, username: u.username, password: "", role: u.role, zone: u.zone || "", dealer_id: u.dealer_id || "" });
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ id: null, username: "", password: "", role: "dealership", zone: "", dealer_id: "" });
    setIsEditing(false);
    setShowForm(false);
  };

  const roleLabel = (r) => ({ mother_warehouse: "Admin", regional_distributor: "Regional Mgr", dealership: "Dealership" }[r] || r);
  const roleBadgeColor = (r) => ({
    mother_warehouse: "bg-purple-500/15 text-purple-400",
    regional_distributor: "bg-blue-500/15 text-blue-400",
    dealership: "bg-emerald-500/15 text-emerald-400"
  }[r] || "");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage network user accounts. Reassign dealerships between regional distributors using the Zone field.
          </p>
        </div>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> {successMsg}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* User Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 rounded-xl border border-border/40 h-fit">
          {!showForm ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Add Network User</h3>
              <p className="text-xs text-muted-foreground mb-6">Create a new account for a dealership, regional distributor, or admin.</p>
              <button onClick={() => setShowForm(true)} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 text-sm transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create New User
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {isEditing ? "Edit User" : "Create New User"}
              </h3>

              {/* Warning banner when reassigning zone for a dealership */}
              {isEditing && formData.role === "dealership" && (
                <div className="mt-2 mb-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-3 py-2 text-xs">
                  <ArrowRightLeft className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Changing the <strong>Zone</strong> will reassign this dealership to a different Regional Distributor.</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Username (Email)</label>
                  <input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Password {isEditing && <span className="text-muted-foreground/60">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    required={!isEditing}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value, zone: "", dealer_id: ""})}
                    className="w-full rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  >
                    <option value="mother_warehouse">Mother Warehouse (Admin)</option>
                    <option value="regional_distributor">Regional Distributor</option>
                    <option value="dealership">Dealership</option>
                  </select>
                </div>

                {(formData.role === "regional_distributor" || formData.role === "dealership") && (
                  <AnimatePresence>
                    <motion.div key="zone-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {formData.role === "dealership" ? "Regional Distributor Zone" : "Assigned Zone"}
                      </label>
                      <select
                        required
                        value={formData.zone}
                        onChange={(e) => setFormData({...formData, zone: e.target.value})}
                        className="w-full rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                      >
                        <option value="" disabled>Select a Zone</option>
                        {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </motion.div>
                  </AnimatePresence>
                )}

                {formData.role === "dealership" && (
                  <AnimatePresence>
                    <motion.div key="dealer-id-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Dealer ID (e.g. DLR001)</label>
                      <input
                        required
                        value={formData.dealer_id}
                        onChange={(e) => setFormData({...formData, dealer_id: e.target.value})}
                        className="w-full rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                      />
                    </motion.div>
                  </AnimatePresence>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    disabled={formLoading}
                    type="submit"
                    className="flex-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 text-sm transition-colors flex items-center justify-center"
                  >
                    {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Save Changes" : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground px-4 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>

        {/* User List */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 glass p-6 rounded-xl border border-border/40">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Network Users <span className="text-sm font-normal text-muted-foreground ml-1">({users.length} total)</span>
          </h3>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Zone</th>
                    <th className="pb-3 pr-4">Dealer ID</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-3 pr-4 text-foreground font-medium max-w-[160px] truncate" title={u.username}>{u.username}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadgeColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {u.zone
                          ? <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{u.zone}</span>
                          : <span className="text-muted-foreground/40 text-xs">—</span>
                        }
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">
                        {u.dealer_id || <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-3 flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(u)}
                          title={u.role === "dealership" ? "Edit / Reassign Zone" : "Edit user"}
                          className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete user"
                          className="p-1.5 rounded bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-muted-foreground">No users found.</td></tr>
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
