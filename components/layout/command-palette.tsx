"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User,
  FileText,
  Briefcase,
  CheckCircle2,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => onOpenChange(false)}>
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-1))] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full flex flex-col bg-transparent" loop>
          <div className="flex items-center border-b border-[hsl(var(--border))]/50 px-3">
            <Command.Input 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Type a command or search..." 
              autoFocus
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-sm text-[hsl(var(--foreground))]">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>
            
            <Command.Group heading="Create" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[hsl(var(--muted-foreground))]">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/tasks?action=new'))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-[hsl(var(--surface-2))] data-[selected=true]:text-[hsl(var(--foreground))] transition-colors"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-[hsl(var(--primary))]" />
                <span>Add Task</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/projects?action=new'))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-[hsl(var(--surface-2))] data-[selected=true]:text-[hsl(var(--foreground))] transition-colors"
              >
                <Briefcase className="mr-2 h-4 w-4" />
                <span>New Project</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/notes/new'))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-[hsl(var(--surface-2))] data-[selected=true]:text-[hsl(var(--foreground))] transition-colors"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Add Note</span>
              </Command.Item>
            </Command.Group>
            
            <Command.Separator className="my-1 h-px bg-[hsl(var(--border))]/50" />
            
            <Command.Group heading="Settings" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[hsl(var(--muted-foreground))]">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/settings/profile'))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-[hsl(var(--surface-2))] data-[selected=true]:text-[hsl(var(--foreground))] transition-colors"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <span className="ml-auto text-xs tracking-widest text-[hsl(var(--muted-foreground))]">⇧⌘P</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/settings'))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-[hsl(var(--surface-2))] data-[selected=true]:text-[hsl(var(--foreground))] transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <span className="ml-auto text-xs tracking-widest text-[hsl(var(--muted-foreground))]">⌘S</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
