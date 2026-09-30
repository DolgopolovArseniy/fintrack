import * as React from 'react';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { LanguageToggle } from '@/app/providers/I18nProvider';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { navItems } from './navItems';

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
    <div className="bg-background text-foreground selection:bg-primary/20 flex min-h-screen">
      {/* Desktop Sidebar (>= 1024px) - Clean high-density layout */}
      <aside className="border-border/80 bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center justify-between px-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <h1 className="text-foreground truncate text-sm font-semibold tracking-tight">
              {t('common.appName')}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
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
                    ? 'bg-sidebar-accent text-foreground font-medium shadow-xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className="truncate whitespace-nowrap">
                  {t(item.labelKey)}
                </span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header (< 1024px) */}
        <header className="border-border/80 bg-background/80 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-foreground truncate text-sm font-semibold tracking-tight">
              {t('common.appName')}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Content Body with bottom padding reserved for mobile nav */}
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (< 1024px) */}
        <nav
          aria-label="Mobile Navigation"
          className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex h-16 items-center justify-around px-1">
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
                    'flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] transition-colors',
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="max-w-[4.8rem] truncate text-center whitespace-nowrap">
                    {t(item.labelKey)}
                  </span>
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
                    'flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] transition-colors',
                    isSecondaryActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <MoreHorizontal className="size-4 shrink-0" />
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
                            ? 'bg-secondary text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        <span className="truncate whitespace-nowrap">
                          {t(item.labelKey)}
                        </span>
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
