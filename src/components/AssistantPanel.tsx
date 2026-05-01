import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2, CalendarRange, Mail, ListTodo, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Msg { role: "user" | "assistant"; content: string }

const PROMPTS = [
  { label: "Summarize my week", icon: CalendarRange, prompt: "Summarize the past week: income vs expenses, project progress, completed and open tasks, and total focused hours. End with 3 priority next steps." },
  { label: "Draft client follow-up", icon: Mail, prompt: "Draft a friendly follow-up email to my top client by revenue. Reference our recent project and propose a quick check-in next week." },
  { label: "NL → task example", icon: ListTodo, prompt: "Remind me to invoice Lumen next Tuesday — high priority." },
];

interface Props { open: boolean; onClose: () => void }

export function AssistantPanel({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: next },
      });
      if (error) throw error;
      const payload = (data as any) ?? {};
      if (payload.error) {
        // Soft fallback for rate-limit / credits / upstream issues — show amber notice in chat
        setMessages((m) => [...m, { role: "assistant", content: `__FALLBACK__${payload.error}` }]);
        toast.warning(payload.error);
        return;
      }
      const content = payload.content ?? "(no reply)";
      setMessages((m) => [...m, { role: "assistant", content }]);
      // Refresh task data in case the assistant created tasks
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `__FALLBACK__${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="glass flex w-full flex-col border-l border-border/60 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="font-display text-base">Copilot</SheetTitle>
                <SheetDescription className="text-[11px]">Powered by Lovable AI · sees your live data</SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setMessages([])} title="Clear">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Try one of these:</p>
              <div className="grid gap-2">
                {PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => send(p.prompt)}
                    className="group flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
                  >
                    <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{p.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{p.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                const isFallback = m.role === "assistant" && m.content.startsWith("__FALLBACK__");
                if (isFallback) {
                  return (
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[85%] rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-warning">
                        {m.content.replace("__FALLBACK__", "")}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                        m.role === "user"
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border border-border/60 bg-secondary/40",
                      )}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-foreground">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/40 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask anything, or 'remind me to…'"
              rows={2}
              className="min-h-[48px] resize-none border-border/60 bg-secondary/40 text-sm"
              disabled={loading}
            />
            <Button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 shrink-0 bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
