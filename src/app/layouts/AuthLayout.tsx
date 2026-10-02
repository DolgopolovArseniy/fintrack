import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { LanguageToggle } from '@/app/components/LanguageToggle';
import { RouteLoadingSkeleton } from '@/app/components/RouteLoadingSkeleton';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/lib/i18n';

export interface AuthLayoutProps {
  children?: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      {/* Top utility bar */}
      <header className="border-border/60 flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link
          to={ROUTES.root}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg shadow-xs">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <span className="text-foreground text-sm font-semibold tracking-tight">
            {t('common.appName')}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Centered Auth Card slot */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <React.Suspense fallback={<RouteLoadingSkeleton />}>
            {children ?? <Outlet />}
          </React.Suspense>
        </div>
      </main>
    </div>
  );
}
