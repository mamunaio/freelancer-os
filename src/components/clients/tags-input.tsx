"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Cap to avoid label spam. */
  max?: number;
}

/**
 * Pill-style tag editor.
 *
 * - Press Enter or comma to commit the current draft as a tag.
 * - Backspace on empty input removes the last tag.
 * - Pasted comma-separated text becomes multiple tags.
 * - De-duped, trimmed, capped to `max`.
 */
export function TagsInput({
  value,
  onChange,
  label,
  hint,
  placeholder,
  disabled,
  max = 20,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function commitDraft(text: string) {
    const candidates = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const seen = new Set(value.map((t) => t.toLowerCase()));
    const next = [...value];
    for (const tag of candidates) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      if (next.length >= max) break;
      next.push(tag);
      seen.add(key);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[hsl(var(--foreground))]/80"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2.5 py-1.5 text-sm transition-colors focus-within:border-[hsl(var(--ring))]/40 focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/20",
          disabled && "opacity-60",
        )}
      >
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[11px] font-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--destructive))]"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commitDraft(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.includes(",")) {
              e.preventDefault();
              commitDraft(text);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled || value.length >= max}
          className="min-w-[120px] flex-1 bg-transparent text-sm placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && (
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</p>
      )}
    </div>
  );
}
