// Shared metadata for task work types, energy levels, and time estimates.
// Used by the Tasks page modal, task cards, and filters.

export type WorkTypeKey =
  | "development"
  | "design"
  | "content"
  | "client_call"
  | "research"
  | "admin"
  | "social"
  | "bug_fix"
  | "meeting"
  | "setup";

export type EnergyLevel = "high" | "medium" | "low";

export interface WorkTypeMeta {
  key: WorkTypeKey;
  label: string;
  emoji: string;
  // Tailwind classes for the pill badge shown on task cards.
  // Uses semantic tokens from index.css.
  badge: string;
}

export const WORK_TYPES: WorkTypeMeta[] = [
  { key: "development", label: "Development",   emoji: "💻", badge: "bg-primary/15 text-primary border-primary/30" },
  { key: "design",      label: "Design",        emoji: "🎨", badge: "bg-accent/20 text-accent-foreground border-accent/40" },
  { key: "content",     label: "Content",       emoji: "📝", badge: "bg-success/15 text-success border-success/30" },
  { key: "client_call", label: "Client Call",   emoji: "📞", badge: "bg-warning/15 text-warning border-warning/30" },
  { key: "research",    label: "Research",      emoji: "🔍", badge: "bg-primary/10 text-primary border-primary/20" },
  { key: "admin",       label: "Admin / Email", emoji: "📧", badge: "bg-muted text-muted-foreground border-border/60" },
  { key: "social",      label: "Social Media",  emoji: "📱", badge: "bg-accent/15 text-accent-foreground border-accent/30" },
  { key: "bug_fix",     label: "Bug Fix",       emoji: "🐛", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { key: "meeting",     label: "Meeting",       emoji: "🤝", badge: "bg-warning/15 text-warning border-warning/30" },
  { key: "setup",       label: "Setup / Config",emoji: "⚙️", badge: "bg-muted text-muted-foreground border-border/60" },
];

export const WORK_TYPE_BY_KEY: Record<string, WorkTypeMeta> = Object.fromEntries(
  WORK_TYPES.map((w) => [w.key, w]),
);

export interface EnergyMeta {
  key: EnergyLevel;
  label: string;
  hint: string;
  emoji: string;
}

export const ENERGY_LEVELS: EnergyMeta[] = [
  { key: "high",   label: "High focus", hint: "Deep work",   emoji: "⚡" },
  { key: "medium", label: "Medium",     hint: "Normal work", emoji: "🔄" },
  { key: "low",    label: "Low energy", hint: "Easy task",   emoji: "😌" },
];

export const TIME_ESTIMATES: { label: string; minutes: number }[] = [
  { label: "15m",     minutes: 15 },
  { label: "30m",     minutes: 30 },
  { label: "1h",      minutes: 60 },
  { label: "2h",      minutes: 120 },
  { label: "4h",      minutes: 240 },
  { label: "All day", minutes: 480 },
];

export const formatEstimate = (mins?: number | null): string | null => {
  if (!mins || mins <= 0) return null;
  const match = TIME_ESTIMATES.find((t) => t.minutes === mins);
  if (match) return match.label;
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
};
