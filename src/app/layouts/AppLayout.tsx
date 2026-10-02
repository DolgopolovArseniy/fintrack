import * as React from 'react';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { LanguageToggle } from '@/app/components/LanguageToggle';
import { OfflineBanner } from '@/app/components/OfflineBanner';
import { RouteLoadingSkeleton } from '@/app/components/RouteLoadingSkeleton';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { EmailVerificationBanner, UserMenu } from '@/features/auth';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import { navItems, type NavItem } from './navItems';

interface BrandLogoProps {
  size?: 'sm' | 'md';
}

function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const { t } = useTranslation();
  const isSm = size === 'sm';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={cn(
          'bg-primary text-primary-foreground flex shrink-0 items-center justify-center shadow-xs',
          isSm ? 'size-6 rounded-md' : 'size-7 rounded-lg',
        )}
      >
        <Sparkles className={isSm ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      </div>
      <span className="text-foreground truncate text-sm font-semibold tracking-tight">
        {t('common.appName')}
      </span>
    </div>
  );
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-100',
          isActive
            ? 'bg-sidebar-accent text-foreground font-medium shadow-xs'
            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <span className="truncate whitespace-nowrap">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  );
}

function MobileBottomNavLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] transition-colors',
          isActive
            ? 'text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="max-w-[4.8rem] truncate text-center whitespace-nowrap">
        {t(item.labelKey)}
      </span>
    </NavLink>
  );
}

function MobileSheetNavLink({
  item,
  onSelect,
}: {
  item: NavItem;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onSelect}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-secondary text-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <span className="truncate whitespace-nowrap">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  );
}

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = React.useState<boolean>(false);

  const primaryMobileItems = React.useMemo(
    () => navItems.filter((item) => item.isPrimaryMobile),
    [],
  );
  const secondaryMobileItems = React.useMemo(
    () => navItems.filter((item) => !item.isPrimaryMobile),
    [],
  );

  const isSecondaryActive = secondaryMobileItems.some(
    (item) =>
      location.pathname === item.href ||
      location.pathname.startsWith(`${item.href}/`),
  );

  return (
    <div className="bg-background text-foreground selection:bg-primary/20 flex min-h-screen flex-col">
      {/* Network offline notification */}
      <OfflineBanner />

      {/* Email verification alert for unverified password accounts */}
      <EmailVerificationBanner />

      <div className="flex flex-1">
        {/* Desktop Sidebar (>= 1024px) */}
        <aside className="border-border/80 bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
          <div className="flex h-14 items-center justify-between px-3.5">
            <BrandLogo size="md" />
            <div className="flex shrink-0 items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          <Separator className="bg-border/60" />
          <nav aria-label={t('nav.main')} className="flex-1 space-y-0.5 p-2">
            {navItems.map((item) => (
              <SidebarNavLink key={item.id} item={item} />
            ))}
          </nav>
          <div className="border-border/60 border-t p-2">
            <UserMenu />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Header (< 1024px) */}
          <header className="border-border/80 bg-background/80 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md lg:hidden">
            <BrandLogo size="sm" />
            <div className="flex shrink-0 items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu variant="compact" />
            </div>
          </header>

          {/* Content Body with reserved bottom padding on mobile */}
          <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
            <ErrorBoundary>
              <React.Suspense fallback={<RouteLoadingSkeleton />}>
                {children ?? <Outlet />}
              </React.Suspense>
            </ErrorBoundary>
          </main>

          {/* Mobile Bottom Navigation Bar (< 1024px) */}
          <nav
            aria-label={t('nav.bottom')}
            className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex h-16 items-center justify-around px-1">
              {primaryMobileItems.map((item) => (
                <MobileBottomNavLink key={item.id} item={item} />
              ))}

              {/* "More" Sheet trigger for remaining items */}
              <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('nav.more')}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] transition-colors',
                      isSecondaryActive
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <MoreHorizontal
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="max-w-[4.8rem] truncate text-center whitespace-nowrap">
                      {t('nav.more')}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-6">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-base font-semibold">
                      {t('nav.more')}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-1 gap-1.5 pt-2">
                    {secondaryMobileItems.map((item) => (
                      <MobileSheetNavLink
                        key={item.id}
                        item={item}
                        onSelect={() => setIsMoreOpen(false)}
                      />
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
