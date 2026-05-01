import { useEffect, useState, createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, KanbanSquare, CheckSquare, Wallet, Timer, Plus, Sparkles, Loader2, Play,
  Settings as SettingsIcon, User, Briefcase, ListTodo,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type QuickAdd = "task" | "client" | "project" | null;

interface PaletteCtx {
  open: () => void;
  openAssistant: () => void;
  isAssistantOpen: boolean;
  closeAssistant: () => void;
  openQuickAdd: (kind: "task" | "client" | "project") => void;
}
const Ctx = createContext<PaletteCtx | null>(null);
export const usePalette = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePalette must be used within CommandPaletteProvider");
  return c;
};

interface SearchResults {
  clients: { id: string; name: string; company: string | null }[];
  projects: { id: string; name: string; status: string }[];
  tasks: { id: string; title: string; done: boolean }[];
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [quickAdd, setQuickAdd] = useState<QuickAdd>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Quick-add forms
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset search when palette closes
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Fuzzy search across entities (only when palette is open + has query)
  const { data: results, isFetching } = useQuery({
    queryKey: ["palette-search", search],
    enabled: open && search.trim().length > 0,
    staleTime: 10_000,
    queryFn: async (): Promise<SearchResults> => {
      const q = search.trim();
      const like = `%${q}%`;
      const [clientsRes, projectsRes, tasksRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, company")
          .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`)
          .limit(6),
        supabase
          .from("projects")
          .select("id, name, status")
          .ilike("name", like)
          .limit(6),
        supabase
          .from("tasks")
          .select("id, title, done")
          .ilike("title", like)
          .limit(6),
      ]);
      return {
        clients: clientsRes.data ?? [],
        projects: projectsRes.data ?? [],
        tasks: tasksRes.data ?? [],
      };
    },
  });

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return results.clients.length + results.projects.length + results.tasks.length;
  }, [results]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const startTimerNav = () => {
    setOpen(false);
    navigate("/timer?autostart=1");
  };

  const openQuickAddInternal = (kind: Exclude<QuickAdd, null>) => {
    setOpen(false);
    setTimeout(() => setQuickAdd(kind), 50);
  };

  const submitQuickAdd = async () => {
    setSaving(true);
    try {
      if (quickAdd === "task") {
        if (!taskTitle.trim()) throw new Error("Title required");
        const quadrant = taskPriority === "high" ? "q1" : "q2";
        const { error } = await supabase.from("tasks").insert({
          title: taskTitle.trim(),
          priority: taskPriority,
          is_urgent: taskPriority === "high",
          is_important: true,
          quadrant,
        });
        if (error) throw error;
        toast.success("Task added");
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        setTaskTitle(""); setTaskPriority("medium");
      } else if (quickAdd === "client") {
        if (!clientName.trim()) throw new Error("Name required");
        const { error } = await supabase.from("clients").insert({
          name: clientName.trim(),
          company: clientCompany.trim() || null,
        });
        if (error) throw error;
        toast.success("Client added");
        qc.invalidateQueries({ queryKey: ["clients"] });
        setClientName(""); setClientCompany("");
      } else if (quickAdd === "project") {
        if (!projectName.trim()) throw new Error("Name required");
        const { error } = await supabase.from("projects").insert({ name: projectName.trim() });
        if (error) throw error;
        toast.success("Project added");
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        setProjectName("");
      }
      setQuickAdd(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const ctxValue: PaletteCtx = {
    open: useCallback(() => setOpen(true), []),
    openAssistant: useCallback(() => { setOpen(false); setIsAssistantOpen(true); }, []),
    isAssistantOpen,
    closeAssistant: useCallback(() => setIsAssistantOpen(false), []),
    openQuickAdd: useCallback((kind) => {
      setOpen(false);
      setTimeout(() => setQuickAdd(kind), 50);
    }, []),
  };

  const hasSearch = search.trim().length > 0;
  const hasResults = hasSearch && totalResults > 0;

  return (
    <Ctx.Provider value={ctxValue}>
      {children}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search clients, projects, tasks — or type a command…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[480px]">
          {hasSearch && !isFetching && totalResults === 0 && (
            <CommandEmpty>No results for "{search}".</CommandEmpty>
          )}
          {hasSearch && isFetching && totalResults === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}

          {/* Search results — grouped */}
          {hasResults && results && (
            <>
              {results.clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {results.clients.map((c) => (
                    <CommandItem
                      key={`client-${c.id}`}
                      value={`client-${c.id}-${c.name}-${c.company ?? ""}`}
                      onSelect={() => go(`/clients`)}
                    >
                      <User className="mr-2 h-4 w-4 text-accent" />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.company && (
                        <span className="ml-2 truncate text-[11px] text-muted-foreground">{c.company}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.projects.length > 0 && (
                <CommandGroup heading="Projects">
                  {results.projects.map((p) => (
                    <CommandItem
                      key={`project-${p.id}`}
                      value={`project-${p.id}-${p.name}`}
                      onSelect={() => go(`/projects`)}
                    >
                      <Briefcase className="mr-2 h-4 w-4 text-primary" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.status.replace("_", " ")}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.tasks.length > 0 && (
                <CommandGroup heading="Tasks">
                  {results.tasks.map((t) => (
                    <CommandItem
                      key={`task-${t.id}`}
                      value={`task-${t.id}-${t.title}`}
                      onSelect={() => go(`/tasks`)}
                    >
                      <ListTodo className="mr-2 h-4 w-4 text-success" />
                      <span className={`flex-1 truncate ${t.done ? "line-through opacity-60" : ""}`}>
                        {t.title}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
            </>
          )}

          {/* Always-visible commands */}
          <CommandGroup heading="AI">
            <CommandItem onSelect={() => { setOpen(false); setIsAssistantOpen(true); }}>
              <Sparkles className="mr-2 h-4 w-4" /> Ask Copilot
              <CommandShortcut>AI</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/")}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</CommandItem>
            <CommandItem onSelect={() => go("/clients")}><Users className="mr-2 h-4 w-4" /> Clients</CommandItem>
            <CommandItem onSelect={() => go("/projects")}><KanbanSquare className="mr-2 h-4 w-4" /> Projects</CommandItem>
            <CommandItem onSelect={() => go("/tasks")}><CheckSquare className="mr-2 h-4 w-4" /> Tasks</CommandItem>
            <CommandItem onSelect={() => go("/finance")}><Wallet className="mr-2 h-4 w-4" /> Finance</CommandItem>
            <CommandItem onSelect={() => go("/timer")}><Timer className="mr-2 h-4 w-4" /> Focus Timer</CommandItem>
            <CommandItem onSelect={() => go("/settings")}><SettingsIcon className="mr-2 h-4 w-4" /> Settings</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick add">
            <CommandItem onSelect={() => openQuickAddInternal("task")}>
              <Plus className="mr-2 h-4 w-4" /> New task <CommandShortcut>T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => openQuickAddInternal("client")}>
              <Plus className="mr-2 h-4 w-4" /> New client <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => openQuickAddInternal("project")}>
              <Plus className="mr-2 h-4 w-4" /> New project <CommandShortcut>P</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={startTimerNav}><Play className="mr-2 h-4 w-4" /> Start focus timer</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Quick-add dialog */}
      <Dialog open={quickAdd !== null} onOpenChange={(o) => !o && setQuickAdd(null)}>
        <DialogContent className="glass border-border/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display capitalize">Quick add {quickAdd}</DialogTitle>
            <DialogDescription>Press Enter to save.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {quickAdd === "task" && (
              <>
                <div className="grid gap-1.5">
                  <Label>Title</Label>
                  <Input
                    autoFocus
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitQuickAdd(); }}
                    placeholder="What needs doing?"
                    className="border-border/60 bg-secondary/40"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as any)}>
                    <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High · Urgent</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {quickAdd === "client" && (
              <>
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    autoFocus
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitQuickAdd(); }}
                    placeholder="Jane Doe"
                    className="border-border/60 bg-secondary/40"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Company</Label>
                  <Input
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitQuickAdd(); }}
                    placeholder="Acme Co. (optional)"
                    className="border-border/60 bg-secondary/40"
                  />
                </div>
              </>
            )}
            {quickAdd === "project" && (
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitQuickAdd(); }}
                  placeholder="New marketing site"
                  className="border-border/60 bg-secondary/40"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAdd(null)} className="border-border/60">Cancel</Button>
            <Button onClick={submitQuickAdd} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
