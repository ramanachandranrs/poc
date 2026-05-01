import { useState, useEffect } from "react";
import {
  LayoutDashboard, Car, Package, Train, Users, Flame,
  TrendingUp, Bot, BarChart3, Zap, Network, UserCog, Store, Brain,
  ChevronRight
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRole, TAB_VISIBILITY } from "@/context/RoleContext";

const NAV_GROUPS = [
  {
    label: "Analytics",
    icon: BarChart3,
    items: [
      { id: "alerts",       title: "Today's Actions",    url: "/",            icon: Zap },
      { id: "overview",     title: "Network Overview",   url: "/overview",    icon: LayoutDashboard },
      { id: "roi",          title: "ROI Analysis",       url: "/roi",         icon: TrendingUp },
    ]
  },
  {
    label: "Operations",
    icon: Car,
    items: [
      { id: "inventory",    title: "Vehicle Inventory",  url: "/inventory",   icon: Car },
      { id: "aging",        title: "Aging Stock",        url: "/aging",       icon: Flame },
      { id: "parts",        title: "Spare Parts & ROP",  url: "/parts",       icon: Package },
      { id: "transit",      title: "Transit Logistics",  url: "/transit",     icon: Train },
    ]
  },
  {
    label: "AI Intelligence",
    icon: Brain,
    items: [
      { id: "forecast",     title: "Demand Forecast",    url: "/forecast",    icon: TrendingUp },
      { id: "ai-workspace", title: "AI Workspace",       url: "/ai",          icon: Bot },
      { id: "ml-status",    title: "ML Auto-Retrain",   url: "/ml-status",   icon: Brain },
    ]
  },
  {
    label: "Administration",
    icon: UserCog,
    items: [
      { id: "customers",    title: "Customers",          url: "/customers",   icon: Users },
      { id: "users",        title: "User Management",    url: "/users",       icon: UserCog },
      { id: "dealers",      title: "Dealer Management",  url: "/dealers",     icon: Store },
    ]
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useRole();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const visibleIds = role ? TAB_VISIBILITY[role] || [] : [];

  useEffect(() => {
    console.log("AppSidebar: role =", role, "visibleIds =", visibleIds);
  }, [role, visibleIds]);

  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (group.items.some(item => location.pathname === item.url)) {
        setOpenGroup(group.label);
        break;
      }
    }
  }, [location.pathname]);

  const handleGroupToggle = (label: string) => {
    setOpenGroup(prev => prev === label ? null : label);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar/95 backdrop-blur-md">
      <SidebarHeader className="p-4 pb-2">
        {!collapsed && (
          <div className="flex items-center gap-3 transition-all duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-foreground tracking-tight leading-none">ANTIGRAVITY</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Dealer AI Copilot</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all duration-300">
              <Network className="h-4 w-4" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 pb-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-primary mt-6 mb-4 opacity-60">
            {!collapsed && "Platform Intelligence"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_GROUPS.map((group) => {
                const visibleItems = group.items.filter(item => visibleIds.includes(item.id));
                if (visibleItems.length === 0) return null;

                const isGroupOpen = openGroup === group.label;

                return (
                  <Collapsible
                    key={group.label}
                    open={isGroupOpen}
                    onOpenChange={() => handleGroupToggle(group.label)}
                    className="group/collapsible mb-1"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={`w-full justify-between px-3 py-2 hover:bg-muted/50 rounded-md transition-colors ${
                            isGroupOpen ? "text-foreground bg-muted/30" : "text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <group.icon className={`h-4 w-4 shrink-0 ${isGroupOpen ? "text-foreground" : "text-muted-foreground"}`} />
                            {!collapsed && <span className="text-[13px] font-medium tracking-tight">{group.label}</span>}
                          </div>
                          {!collapsed && (
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform duration-300 ${isGroupOpen ? "rotate-90 text-foreground" : "text-muted-foreground"}`} 
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-in fade-in slide-in-from-top-1 duration-300">
                        <SidebarMenuSub className="ml-4 mt-1 border-l-2 border-primary/10 pl-2">
                          {visibleItems.map((item) => {
                            const active = location.pathname === item.url;
                            return (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={item.url}
                                    end
                                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 group ${
                                      active
                                        ? "text-primary font-medium bg-primary/10"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                                    activeClassName=""
                                  >
                                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className="tracking-tight">{item.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
