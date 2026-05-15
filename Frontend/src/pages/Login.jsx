import { useState } from "react";
import { Network, Lock, User, Loader2 } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useRole();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mx-auto z-10"
        style={{ maxWidth: "340px" }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 glow-blue mb-4 shadow-lg border border-primary/20">
            <Network className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">DEALER AI</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Copilot Network</p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-2xl relative">
          <h2 className="text-base font-semibold mb-6 text-center">Sign in</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative w-full">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-muted/10 border border-border/50 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-background transition-colors"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative w-full">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-muted/10 border border-border/50 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-background transition-colors"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-neon-red text-xs font-medium bg-neon-red/10 border border-neon-red/20 rounded-lg p-2.5 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 transition-colors flex items-center justify-center mt-2 disabled:opacity-70 shadow-lg shadow-primary/25 text-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>
          
          <p className="text-[9px] text-muted-foreground text-center mt-6 uppercase tracking-wider">
            Secure access restricted
          </p>
        </div>
      </motion.div>
    </div>
  );
}
