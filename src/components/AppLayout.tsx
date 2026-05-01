import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, Command, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePalette } from "@/components/CommandPalette";
import { AssistantPanel } from "@/components/AssistantPanel";
import { ErrorConsole } from "@/components/ErrorConsole";
import { PageTransition } from "@/components/PageTransition";
import { NotificationBell } from "@/components/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const palette = usePalette();
  const { mode, toggle } = useTheme();
  const { settings } = useWorkspace();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/40 bg-background/60 px-4 backdrop-blur-xl md:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs text-muted-foreground">Workspace</span>
              <span className="text-xs text-muted-foreground/40">/</span>
              <span className="text-xs font-medium">{settings?.name ?? "Acme Studio"}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={palette.open}
                className="relative hidden h-9 w-72 items-center rounded-lg border border-border/60 bg-secondary/50 pl-9 pr-16 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                Search or jump to…
                <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px]">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </button>

              <Button
                onClick={palette.open}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground md:hidden"
                title="Command palette (⌘K)"
              >
                <Search className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => palette.openAssistant()}
                size="sm"
                className="h-9 gap-1.5 bg-gradient-primary px-3 text-primary-foreground shadow-glow hover:opacity-90"
                title="Ask Copilot"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copilot</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                title={mode === "dark" ? "Switch to light" : "Switch to dark"}
              >
                {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <AssistantPanel open={palette.isAssistantOpen} onClose={palette.closeAssistant} />
        <ErrorConsole />
      </div>
    </SidebarProvider>
  );
}
