import * as React from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import type { TransactionFilterState } from '../hooks/useTransactionFilters';

export interface TransactionFiltersProps {
  filters: TransactionFilterState;
  onTypeChange: (type: 'all' | 'expense' | 'income') => void;
  onCategoryChange: (categoryId: string) => void;
  onAccountChange: (accountId: string) => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  categories?: Category[];
  accounts?: Account[];
  className?: string;
}

export function TransactionFilters({
  filters,
  onTypeChange,
  onCategoryChange,
  onAccountChange,
  onSearchChange,
  onReset,
  hasActiveFilters,
  categories = [],
  accounts = [],
  className,
}: TransactionFiltersProps) {
  const { t } = useTranslation();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

  // Active filter count
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.categoryId !== 'all') count++;
    if (filters.accountId !== 'all') count++;
    if (filters.search.trim().length > 0) count++;
    return count;
  }, [filters]);

  // Categories filtered by currently selected type (if not 'all')
  const availableCategories = React.useMemo(() => {
    return categories.filter((cat) => {
      if (cat.archived) return false;
      if (filters.type === 'all') return true;
      return cat.type === filters.type;
    });
  }, [categories, filters.type]);

  // Active accounts
  const availableAccounts = React.useMemo(() => {
    return accounts.filter((acc) => !acc.archived);
  }, [accounts]);

  const handleTypeChange = (newType: 'all' | 'expense' | 'income') => {
    onTypeChange(newType);
    if (newType !== 'all' && filters.categoryId !== 'all') {
      const selected = categories.find((c) => c.id === filters.categoryId);
      if (selected && selected.type !== newType) {
        onCategoryChange('all');
      }
    }
  };

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <div
      data-slot="transaction-filters"
      data-testid="transaction-filters"
      className={cn('space-y-3', className)}
    >
      {/* Mobile Bar: Search + Sheet Button */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('transactions.filters.searchPlaceholder')}
            data-testid="mobile-search-input"
            className="pr-8 pl-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="default"
              data-testid="mobile-filters-trigger"
              className="relative shrink-0 gap-1.5"
            >
              <SlidersHorizontal className="size-4" />
              {activeFiltersCount > 0 && (
                <span
                  data-testid="active-filters-badge"
                  className="bg-primary text-primary-foreground ml-1 flex size-5 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] space-y-6 p-6 sm:w-[360px]"
          >
            <SheetHeader>
              <SheetTitle>{t('transactions.filters.allTypes')}</SheetTitle>
            </SheetHeader>

            <div className="space-y-4">
              {/* Type in Mobile */}
              <div className="space-y-1.5">
                <Label>{t('transactions.form.typeLabel')}</Label>
                <Tabs
                  value={filters.type}
                  onValueChange={(val) =>
                    handleTypeChange(val as 'all' | 'expense' | 'income')
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">
                      {t('transactions.filters.allTypes')}
                    </TabsTrigger>
                    <TabsTrigger value="expense">
                      {t('transactions.filters.expensesOnly')}
                    </TabsTrigger>
                    <TabsTrigger value="income">
                      {t('transactions.filters.incomesOnly')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Category in Mobile */}
              <div className="space-y-1.5">
                <Label>{t('transactions.form.categoryLabel')}</Label>
                <Select
                  value={filters.categoryId}
                  onValueChange={onCategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('transactions.filters.allCategories')}
                    </SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account in Mobile */}
              <div className="space-y-1.5">
                <Label>{t('transactions.form.accountLabel')}</Label>
                <Select
                  value={filters.accountId}
                  onValueChange={onAccountChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('transactions.filters.allAccounts')}
                    </SelectItem>
                    {availableAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name?.trim() || acc.systemKey || acc.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  onReset();
                  setIsMobileSheetOpen(false);
                }}
                className="text-destructive hover:text-destructive w-full gap-2"
              >
                <RotateCcw className="size-4" />
                {t('transactions.actions.resetFilters')}
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-3">
        {/* Type Tabs */}
        <Tabs
          value={filters.type}
          onValueChange={(val) =>
            handleTypeChange(val as 'all' | 'expense' | 'income')
          }
          className="w-auto shrink-0"
        >
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-type-all">
              {t('transactions.filters.allTypes')}
            </TabsTrigger>
            <TabsTrigger value="expense" data-testid="filter-type-expense">
              {t('transactions.filters.expensesOnly')}
            </TabsTrigger>
            <TabsTrigger value="income" data-testid="filter-type-income">
              {t('transactions.filters.incomesOnly')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category Select */}
        <Select value={filters.categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger
            data-testid="filter-category-select"
            className="w-[180px]"
          >
            <SelectValue
              placeholder={t('transactions.filters.allCategories')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="filter-category-option-all">
              {t('transactions.filters.allCategories')}
            </SelectItem>
            {availableCategories.map((cat) => (
              <SelectItem
                key={cat.id}
                value={cat.id}
                data-testid={`filter-category-option-${cat.id}`}
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Account Select */}
        <Select value={filters.accountId} onValueChange={onAccountChange}>
          <SelectTrigger
            data-testid="filter-account-select"
            className="w-[180px]"
          >
            <SelectValue placeholder={t('transactions.filters.allAccounts')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="filter-account-option-all">
              {t('transactions.filters.allAccounts')}
            </SelectItem>
            {availableAccounts.map((acc) => (
              <SelectItem
                key={acc.id}
                value={acc.id}
                data-testid={`filter-account-option-${acc.id}`}
              >
                {acc.name?.trim() || acc.systemKey || acc.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('transactions.filters.searchPlaceholder')}
            data-testid="filter-search-input"
            className="pr-8 pl-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            data-testid="filter-reset-button"
            className="text-muted-foreground hover:text-foreground shrink-0 gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            {t('transactions.actions.resetFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
