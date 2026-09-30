import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';

export type LoadingSkeletonVariant = 'list' | 'card' | 'chart';

export interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant;
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'list',
  count,
  className,
}: LoadingSkeletonProps) {
  const { t } = useTranslation();

  if (variant === 'card') {
    const itemCount = count ?? 3;
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
          className,
        )}
      >
        <span className="sr-only">{t('common.status.loading')}</span>
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            className="bg-card border-border flex flex-col justify-between rounded-xl border p-5 shadow-xs"
          >
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-7 w-2/3" />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn(
          'bg-card border-border rounded-xl border p-6 shadow-xs',
          className,
        )}
      >
        <span className="sr-only">{t('common.status.loading')}</span>
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="mt-8 flex h-60 items-end justify-between gap-3 pt-6">
          <Skeleton className="h-24 w-full rounded-t-md" />
          <Skeleton className="h-40 w-full rounded-t-md" />
          <Skeleton className="h-32 w-full rounded-t-md" />
          <Skeleton className="h-52 w-full rounded-t-md" />
          <Skeleton className="h-28 w-full rounded-t-md" />
          <Skeleton className="h-44 w-full rounded-t-md" />
        </div>
      </div>
    );
  }

  // Default: 'list'
  const itemCount = count ?? 4;
  return (
    <div role="status" aria-busy="true" className={cn('space-y-3', className)}>
      <span className="sr-only">{t('common.status.loading')}</span>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div
          key={index}
          className="bg-card border-border flex items-center justify-between rounded-lg border p-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
