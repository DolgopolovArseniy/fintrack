import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';

/**
 * Fullscreen loading screen displayed during auth state resolution.
 * Accessible to screen readers and prevents content flashes.
 */
export function AuthLoadingScreen() {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-busy="true"
      className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-4 sm:p-6"
    >
      <span className="sr-only">{t('auth.loading')}</span>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="bg-card border-border space-y-4 rounded-xl border p-6 shadow-xs">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
