"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string | null;
  hint?: string;
}

/**
 * Password input with show/hide toggle. Forwards ref via plain HTML input
 * (no Radix wrapping needed).
 */
export function PasswordInput({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-[hsl(var(--foreground))]/80"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={show ? "text" : "password"}
          className={cn(
            "h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] pl-3 pr-10 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus-ring transition-colors",
            "hover:border-[hsl(var(--border-strong))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/40",
            error && "border-[hsl(var(--destructive))]/50",
            className,
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          tabIndex={-1}
        >
          {show ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      ) : null}
    </div>
  );
}
