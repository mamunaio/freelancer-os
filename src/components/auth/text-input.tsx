import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}

/**
 * Plain text input matching the auth shell aesthetic.
 * Uses forwardRef so it works with react-hook-form / native form refs.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, hint, className, id, ...rest }, ref) {
    const inputId =
      id ?? `txt-${Math.random().toString(36).slice(2, 8)}`;
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
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus-ring transition-colors",
            "hover:border-[hsl(var(--border-strong))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/40",
            error && "border-[hsl(var(--destructive))]/50",
            className,
          )}
          {...rest}
        />
        {error ? (
          <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
