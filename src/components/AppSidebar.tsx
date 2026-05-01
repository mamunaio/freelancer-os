import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FileText,
  CheckSquare,
  Wallet,
  Receipt,
  Timer,
  Sparkles,
  LogOut,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Projects", url: "/projects", icon: KanbanSquare },
  { title: "Proposals", url: "/proposals", icon: FileText },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Invoice Maker", url: "/invoice", icon: Receipt },
  { title: "Focus Timer", url: "/timer", icon: Timer },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const { settings } = useWorkspace();
  const collapsed = state === "collapsed";
  const initials = (user?.email ?? "A").slice(0, 2).toUpperCase();

  const wsName = settings?.name ?? "Injaazh OS";
  // Smart split for the colored mark: last word gets gradient
  const parts = wsName.split(" ");
  const head = parts.length > 1 ? parts.slice(0, -1).join(" ") : wsName;
  const tail = parts.length > 1 ? parts.slice(-1)[0] : "";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-primary shadow-glow">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold tracking-tight">
                {head}
                {tail && <span className="gradient-text"> {tail}</span>}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {settings?.tagline?.slice(0, 28) ?? "Productivity"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="!bg-sidebar-accent !text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:rounded-r before:bg-gradient-primary"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        {!collapsed ? (
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-xs font-medium">{user?.email ?? "Admin"}</span>
                <span className="text-[10px] text-muted-foreground">CEO · Admin</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={signOut}
            title="Sign out"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground"
          >
            {initials}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
