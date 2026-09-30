import * as React from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Settings,
  Tags,
  Wallet,
} from 'lucide-react';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export interface NavItem {
  id: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  isPrimaryMobile?: boolean;
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    href: '#dashboard',
    isPrimaryMobile: true,
  },
  {
    id: 'transactions',
    labelKey: 'nav.transactions',
    icon: ArrowLeftRight,
    href: '#transactions',
    isPrimaryMobile: true,
  },
  {
    id: 'budgets',
    labelKey: 'nav.budgets',
    icon: PieChart,
    href: '#budgets',
    isPrimaryMobile: true,
  },
  {
    id: 'accounts',
    labelKey: 'nav.accounts',
    icon: Wallet,
    href: '#accounts',
  },
  {
    id: 'categories',
    labelKey: 'nav.categories',
    icon: Tags,
    href: '#categories',
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    icon: Settings,
    href: '#settings',
  },
];

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = React.useState<string>('dashboard');
  const [isMoreOpen, setIsMoreOpen] = React.useState<boolean>(false);

  const primaryMobileItems = navItems.filter((item) => item.isPrimaryMobile);
  const secondaryMobileItems = navItems.filter((item) => !item.isPrimaryMobile);
  const isSecondaryActive = secondaryMobileItems.some(
    (item) => item.id === activeItem,
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar (>= 768px) */}
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">
            FinTrack
          </h1>
          <ThemeToggle />
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveItem(item.id);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent font-semibold text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header (< 768px) */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="text-lg font-bold tracking-tight text-primary">
            FinTrack
          </span>
          <ThemeToggle />
        </header>

        {/* Content Body with bottom padding reserved for mobile nav */}
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex h-16 items-center justify-around px-2">
            {primaryMobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.id);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-xs transition-colors',
                    isActive
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t(item.labelKey)}</span>
                </a>
              );
            })}

            {/* "More" Sheet trigger for remaining items */}
            <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label={t('nav.more')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-xs transition-colors',
                    isSecondaryActive
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span>{t('nav.more')}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl pb-6">
                <SheetHeader className="text-left">
                  <SheetTitle>{t('nav.more')}</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {secondaryMobileItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveItem(item.id);
                          setIsMoreOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-secondary font-semibold text-primary'
                            : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{t(item.labelKey)}</span>
                      </a>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}
