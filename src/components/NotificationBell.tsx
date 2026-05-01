import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCircle2, AlertCircle, ArrowUpRight, KanbanSquare, Wallet, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

const typeIcon = (type: Notification["type"]) => {
  switch (type) {
    case "task_due_soon": return AlertCircle;
    case "project_status_changed": return KanbanSquare;
    case "finance_entry_added": return Wallet;
    default: return Sparkles;
  }
};

const typeAccent = (type: Notification["type"]) => {
  switch (type) {
    case "task_due_soon": return "text-warning bg-warning/15 border-warning/30";
    case "project_status_changed": return "text-primary bg-primary/15 border-primary/30";
    case "finance_entry_added": return "text-success bg-success/15 border-success/30";
    default: return "text-muted-foreground bg-secondary/40 border-border/60";
  }
};

const timeAgo = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 60_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const unread = notifications.filter((n) => !n.is_read);
  const unreadCount = unread.length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All caught up");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onItemClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-primary px-1 text-[9px] font-semibold text-primary-foreground shadow-glow"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="glass w-[380px] border-border/60 p-0"
      >
        <div className="flex items-center justify-between border-b border-border/40 p-3">
          <div>
            <p className="font-display text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 gap-1 text-[11px]"
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/40">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">No notifications yet</p>
              <p className="text-[10px] text-muted-foreground/70">
                Tasks, projects, and finance changes will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => {
                const Icon = typeIcon(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => onItemClick(n)}
                    className={cn(
                      "group flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-secondary/30",
                      !n.is_read && "bg-primary/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                        typeAccent(n.type),
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("truncate text-xs font-medium", !n.is_read && "text-foreground")}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-glow" />
                        )}
                      </div>
                      {n.message && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {n.message}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{timeAgo(n.created_at)}</span>
                        {n.link && (
                          <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            View <ArrowUpRight className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border/40 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-center text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (confirm("Clear all notifications?")) {
                  supabase
                    .from("notifications")
                    .delete()
                    .gte("created_at", "1970-01-01")
                    .then(({ error }) => {
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Cleared");
                        qc.invalidateQueries({ queryKey: ["notifications"] });
                      }
                    });
                }
              }}
            >
              <Check className="mr-1 h-3 w-3" /> Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
