import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-turf-700/60", className)} />;
}

/** Placeholder shown while a data-heavy page loads: a title, then a few content rows. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="mb-3 h-12 w-64 max-w-full" />
      <Skeleton className="mb-8 h-5 w-48 max-w-full" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
