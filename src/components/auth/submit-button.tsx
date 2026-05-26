"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children: React.ReactNode;
  /** Optional override; otherwise uses `useFormStatus().pending`. */
  loading?: boolean;
  className?: string;
}

/**
 * Primary submit button for auth forms. Shows a spinner while the parent
 * `<form>` is pending (server action in flight).
 */
export function SubmitButton({ children, loading, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = loading ?? pending;

  return (
    <button
      type="submit"
      disabled={isLoading}
      className={cn(
        "relative flex h-10 w-full items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-ring",
        className,
      )}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
