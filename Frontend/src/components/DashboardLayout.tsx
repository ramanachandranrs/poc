import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bot } from "lucide-react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
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
              <span className="text-xs text-muted-foreground">AI Engine Online</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs text-muted-foreground">All Systems Operational</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

export default DashboardLayout;
