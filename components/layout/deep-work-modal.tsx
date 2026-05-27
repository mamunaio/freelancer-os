"use client";

import { useState, useEffect } from "react";
import { Play, Pause, X, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeepWorkModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound or notification here
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative flex w-full max-w-2xl flex-col items-center justify-center rounded-3xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--background))] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
        
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 rounded-full p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))]"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="eyebrow mb-6 text-[hsl(var(--primary))] uppercase tracking-[0.2em] text-xs font-bold">
          Deep Work Focus
        </p>

        <div className="text-center">
          <h2 className="font-display text-[80px] font-bold tracking-tighter tabular-nums leading-none text-[hsl(var(--foreground))]">
            {formatTime(timeLeft)}
          </h2>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={toggleTimer}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
              isActive ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--primary))]"
            )}
          >
            {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
          </button>
          
          <button
            onClick={resetTimer}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))]"
            title="Reset Timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-12 w-full max-w-md rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-1))] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
            Pinned Priority Task
          </p>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Review Q3 brand guidelines for Lumen</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Lumen Corp - Lumen brand refresh</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
