import { Construction } from "lucide-react";

interface Props {
  /** Translated paragraph telling the user what's coming. */
  message: string;
  /** Phase tag, e.g. "Sub-phase 8b". */
  phase: string;
}

/**
 * Lightweight placeholder used by the not-yet-implemented Money tabs in
 * sub-phase 8a. Replaced by real content as each later sub-phase ships.
 */
export function MoneyStubTab({ message, phase }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-1))] p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]">
        <Construction className="h-5 w-5" />
      </span>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        {message}
      </p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--foreground))]/60">
        {phase}
      </p>
    </div>
  );
}
