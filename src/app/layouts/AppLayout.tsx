import * as React from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Settings,
  Sparkles,
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
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Desktop Sidebar (>= 768px) - High-density Linear/Stripe styling */}
      <aside className="hidden w-60 flex-col border-r border-border/80 bg-sidebar md:flex">
        <div className="flex h-14 items-center justify-between px-3.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              FinTrack
            </h1>
          </div>
          <ThemeToggle />
        </div>
        <Separator className="bg-border/60" />
        <nav className="flex-1 space-y-0.5 p-2">
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
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-100',
                  isActive
                    ? 'bg-sidebar-accent font-medium text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span>{t(item.labelKey)}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header (< 768px) */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              FinTrack
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Content Body with bottom padding reserved for mobile nav */}
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:hidden"
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
                    'flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-[11px] transition-colors',
                    isActive
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
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
                    'flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-[11px] transition-colors',
                    isSecondaryActive
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <MoreHorizontal className="size-4" />
                  <span>{t('nav.more')}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-6">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base font-semibold">
                    {t('nav.more')}
                  </SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-1 gap-1.5 pt-2">
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
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-secondary font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
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
