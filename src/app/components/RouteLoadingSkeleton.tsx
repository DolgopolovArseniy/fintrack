import { Skeleton } from '@/components/ui/skeleton';

export function RouteLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl sm:col-span-2 lg:col-span-1" />
      </div>

      {/* Main Content Area Skeleton */}
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
