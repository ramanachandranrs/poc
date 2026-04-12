import { LayoutDashboard, Car, Package, Train, Users, Flame, TrendingUp, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "AI Command Center",  url: "/",         icon: LayoutDashboard },
  { title: "Vehicle Inventory",  url: "/inventory",icon: Car },
  { title: "Aging Stock",        url: "/aging",    icon: Flame },
  { title: "Demand Forecast",    url: "/forecast", icon: TrendingUp },
  { title: "AI Copilot Prompts", url: "/genai",    icon: Bot },
  { title: "Spare Parts & ROP",  url: "/parts",    icon: Package },
  { title: "Transit Logistics",  url: "/transit",  icon: Train },
  { title: "Customer Registry",  url: "/customers",icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-blue">
              <LayoutDashboard className="h-5 w-5 text-primary" />
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
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
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
