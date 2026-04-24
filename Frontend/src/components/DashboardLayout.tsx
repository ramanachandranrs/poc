import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bot, UserCircle, LogOut, Sun, Moon } from "lucide-react";
import { useRole } from "@/context/RoleContext";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useRole();
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full gradient-mesh">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 glass-strong">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary animate-pulse-soft" />
                <span className="text-xs text-muted-foreground hidden sm:inline">AI Engine Online</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                <span className="hidden md:inline">Systems Operational</span>
              </div>
              
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              
              {user && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/50 text-xs text-foreground">
                    <UserCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium max-w-[120px] truncate" title={user.username}>{user.username}</span>
                  </div>
                  
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-colors text-xs font-medium border border-neon-red/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
