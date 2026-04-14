import {
  LayoutDashboard, Car, Package, Train, Users, Flame,
  TrendingUp, Bot, ShieldCheck, BarChart3, Zap, Network,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useRole, ROLES, TAB_VISIBILITY } from "@/context/RoleContext";

const ALL_NAV_ITEMS = [
  { id: "alerts",       title: "Today's Actions",    url: "/",          icon: Zap },
  { id: "overview",     title: "Network Overview",   url: "/overview",  icon: LayoutDashboard },
  { id: "inventory",    title: "Vehicle Inventory",  url: "/inventory", icon: Car },
  { id: "aging",        title: "Aging Stock",        url: "/aging",     icon: Flame },
  { id: "parts",        title: "Spare Parts & ROP",  url: "/parts",     icon: Package },
  { id: "transit",      title: "Transit Logistics",  url: "/transit",   icon: Train },
  { id: "forecast",     title: "Demand Forecast",    url: "/forecast",  icon: TrendingUp },
  { id: "ai-workspace", title: "AI Workspace",       url: "/ai",        icon: Bot },
  { id: "customers",    title: "Customers",          url: "/customers", icon: Users },
  { id: "roi",          title: "ROI Report",         url: "/roi",       icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, setRole } = useRole();

  const visible = TAB_VISIBILITY[role] || TAB_VISIBILITY["all"];
  const navItems = ALL_NAV_ITEMS.filter((item) => visible.includes(item.id));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-blue">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-wide">DEALER AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Copilot Network</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Network className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Role switcher */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg bg-muted/30 border border-border/40 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                          active
                            ? "bg-primary/10 text-primary glow-blue font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
