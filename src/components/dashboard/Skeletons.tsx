import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";

export function StatCardSkeleton() {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </GlassCard>
  );
}

export function ChartCardSkeleton() {
  return (
    <GlassCard>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-[260px] w-full rounded-xl" />
    </GlassCard>
  );
}

export function FocusListSkeleton() {
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-36" />
        </div>
      </div>
      <Skeleton className="mb-3 h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2.5 py-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-4 w-6 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function ProjectRowSkeleton() {
  return (
    <div className="rounded-lg border border-transparent p-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2.5 w-28" />
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-2.5 h-1.5 w-full rounded-full" />
    </div>
  );
}

export function ActiveProjectsSkeleton() {
  return (
    <GlassCard className="h-full">
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProjectRowSkeleton key={i} />
        ))}
      </div>
    </GlassCard>
  );
}

export function ClientCardSkeleton() {
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-4 w-14 rounded" />
      </div>
      <Skeleton className="mt-4 h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-24" />
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </GlassCard>
  );
}

export function KanbanCardSkeleton() {
  return (
    <div className="glass rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-3" />
      </div>
      <Skeleton className="mt-2 h-2.5 w-20" />
      <Skeleton className="mt-2.5 h-1 w-full rounded-full" />
      <div className="mt-2 flex justify-between">
        <Skeleton className="h-2.5 w-8" />
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-3 w-4" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
