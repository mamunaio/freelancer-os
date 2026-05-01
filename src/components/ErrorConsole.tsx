import { useEffect, useState, useMemo } from "react";
import { errorBus, ErrorEntry } from "@/lib/errorBus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertOctagon, Copy, Trash2, X, ChevronDown, ChevronRight, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SOURCE_COLOR: Record<ErrorEntry["source"], string> = {
  supabase: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  edge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  console: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  unhandled: "bg-red-500/15 text-red-300 border-red-500/30",
  network: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function buildPayload(e: ErrorEntry) {
  return JSON.stringify(
    {
      id: e.id,
      timestamp: new Date(e.timestamp).toISOString(),
      source: e.source,
      message: e.message,
      context: e.context,
      detail: e.detail,
    },
    (_k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v),
    2,
  );
}

function Row({ entry }: { entry: ErrorEntry }) {
  const [open, setOpen] = useState(false);
  const payload = useMemo(() => buildPayload(entry), [entry]);

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/40"
      >
        {open ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", SOURCE_COLOR[entry.source])}>
          {entry.source}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
        <span className="flex-1 truncate text-xs">{entry.message}</span>
      </button>
      {open && (
        <div className="space-y-2 bg-background/40 px-3 pb-3">
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(payload);
                toast.success("Payload copied");
              }}
            >
              <Copy className="h-3 w-3" /> Copy payload
            </Button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-md border border-border/40 bg-background/80 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {payload}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ErrorConsole() {
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);

  useEffect(() => {
    const unsub = errorBus.subscribe(setEntries);
    return () => { unsub(); };
  }, []);

  // When opening, mark all as seen
  useEffect(() => {
    if (open) setSeenCount(entries.length);
  }, [open, entries.length]);

  const unread = Math.max(0, entries.length - seenCount);

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-lg backdrop-blur-xl transition-colors hover:border-primary/50 hover:text-foreground",
          entries.length > 0 ? "text-foreground" : "text-muted-foreground",
        )}
        title="Error console"
        aria-label="Open error console"
      >
        <Bug className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass fixed bottom-20 right-4 z-50 flex h-[60vh] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/60 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-primary" />
              <span className="font-display text-sm font-semibold">Error console</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{entries.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (entries.length === 0) return;
                  navigator.clipboard.writeText(entries.map(buildPayload).join("\n\n"));
                  toast.success(`Copied ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`);
                }}
                disabled={entries.length === 0}
              >
                <Copy className="h-3 w-3" /> Copy all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => errorBus.clear()}
                disabled={entries.length === 0}
              >
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {entries.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
                <Bug className="h-6 w-6 text-muted-foreground/60" />
                <p className="text-sm font-medium">No errors captured</p>
                <p className="text-xs text-muted-foreground">Supabase, edge function, network, and unhandled errors appear here in real-time.</p>
              </div>
            ) : (
              <div>{entries.map((e) => <Row key={e.id} entry={e} />)}</div>
            )}
          </ScrollArea>
        </div>
      )}
    </>
  );
}
