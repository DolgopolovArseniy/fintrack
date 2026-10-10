import * as React from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useAccounts,
  getAccountDisplayName,
  type Account,
} from '@/features/accounts';
import {
  useCategories,
  getCategoryDisplayName,
  sortCategories,
  type Category,
} from '@/features/categories';
import { useTranslation } from '@/lib/i18n';
import type { CsvDelimiter } from '@/lib/csv';
import {
  resolvePresetDateRange,
  useExportTransactions,
} from '../hooks/useExportTransactions';
import type { ExportScopePreset, ExportTransactionType } from '../schemas';

export interface ExportCardProps {
  className?: string;
}

export function ExportCard({ className }: ExportCardProps) {
  const { t } = useTranslation();
  const categoriesState = useCategories();
  const accountsState = useAccounts();

  const {
    config,
    setConfig,
    isExporting,
    matchingCount,
    isLoadingCount,
    exportCsv,
  } = useExportTransactions();

  const categories: Category[] = React.useMemo(
    () => (categoriesState.status === 'success' ? categoriesState.data : []),
    [categoriesState],
  );

  const accounts: Account[] = React.useMemo(
    () => (accountsState.status === 'success' ? accountsState.data : []),
    [accountsState],
  );

  const translate = React.useCallback(
    (key: string, options?: Record<string, unknown>) => {
      const defaultValue =
        typeof options?.defaultValue === 'string' ? options.defaultValue : key;
      return t(key as `categories.system.${string}`, defaultValue);
    },
    [t],
  );

  const availableCategories: Category[] = React.useMemo(() => {
    const filtered = categories.filter((cat: Category) => {
      if (cat.archived) return false;
      if (config.type === 'all') return true;
      return cat.type === config.type;
    });
    return sortCategories(filtered, translate);
  }, [categories, config.type, translate]);

  const availableAccounts: Account[] = React.useMemo(() => {
    return accounts.filter((acc: Account) => !acc.archived);
  }, [accounts]);

  const dateValidation = React.useMemo(
    () =>
      resolvePresetDateRange(config.preset, config.startDate, config.endDate),
    [config.preset, config.startDate, config.endDate],
  );

  const isCustom = config.preset === 'custom';
  const isDateInvalid = isCustom && !dateValidation.isValid;
  const canExport =
    !isExporting && !isLoadingCount && matchingCount > 0 && !isDateInvalid;

  const handleTypeChange = (value: string) => {
    const newType = value as ExportTransactionType;
    const patch: Parameters<typeof setConfig>[0] = { type: newType };

    if (newType !== 'all' && config.categoryId !== 'all') {
      const selected = categories.find(
        (c: Category) => c.id === config.categoryId,
      );
      if (selected && selected.type !== newType) {
        patch.categoryId = 'all';
      }
    }

    setConfig(patch);
  };

  return (
    <Card className={className} data-testid="export-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <FileSpreadsheet className="size-4" />
          </div>
          <div>
            <CardTitle>{t('importExport.export.cardTitle')}</CardTitle>
            <CardDescription className="mt-1">
              {t('importExport.export.cardDescription')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Date Range Preset Selection */}
        <div className="space-y-3">
          <Label htmlFor="export-preset-select">
            {t('importExport.export.presets.label')}
          </Label>
          <Select
            value={config.preset}
            onValueChange={(val) =>
              setConfig({ preset: val as ExportScopePreset })
            }
          >
            <SelectTrigger
              id="export-preset-select"
              data-testid="export-preset-select"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="currentMonth">
                {t('importExport.export.presets.currentMonth')}
              </SelectItem>
              <SelectItem value="prevMonth">
                {t('importExport.export.presets.prevMonth')}
              </SelectItem>
              <SelectItem value="last3Months">
                {t('importExport.export.presets.last3Months')}
              </SelectItem>
              <SelectItem value="last6Months">
                {t('importExport.export.presets.last6Months')}
              </SelectItem>
              <SelectItem value="thisYear">
                {t('importExport.export.presets.thisYear')}
              </SelectItem>
              <SelectItem value="allTime">
                {t('importExport.export.presets.allTime')}
              </SelectItem>
              <SelectItem value="custom">
                {t('importExport.export.presets.custom')}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Inputs */}
          {isCustom && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="export-start-date" className="text-xs">
                    {t('importExport.export.customDates.startDate')}
                  </Label>
                  <Input
                    id="export-start-date"
                    data-testid="export-start-date"
                    type="date"
                    value={config.startDate ?? ''}
                    onChange={(e) => setConfig({ startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="export-end-date" className="text-xs">
                    {t('importExport.export.customDates.endDate')}
                  </Label>
                  <Input
                    id="export-end-date"
                    data-testid="export-end-date"
                    type="date"
                    value={config.endDate ?? ''}
                    onChange={(e) => setConfig({ endDate: e.target.value })}
                  />
                </div>
              </div>
              {isDateInvalid && (
                <p
                  role="alert"
                  className="text-destructive text-xs"
                  data-testid="date-range-error"
                >
                  {t('importExport.errors.invalidDateRange')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. Filters Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="export-type-select">
              {t('importExport.export.filters.typeLabel')}
            </Label>
            <Select value={config.type} onValueChange={handleTypeChange}>
              <SelectTrigger
                id="export-type-select"
                data-testid="export-type-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('importExport.export.filters.allTypes')}
                </SelectItem>
                <SelectItem value="expense">
                  {t('importExport.export.filters.expensesOnly')}
                </SelectItem>
                <SelectItem value="income">
                  {t('importExport.export.filters.incomeOnly')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label htmlFor="export-category-select">
              {t('importExport.export.filters.categoryLabel')}
            </Label>
            <Select
              value={config.categoryId}
              onValueChange={(val) => setConfig({ categoryId: val })}
            >
              <SelectTrigger
                id="export-category-select"
                data-testid="export-category-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('importExport.export.filters.allCategories')}
                </SelectItem>
                {availableCategories.map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getCategoryDisplayName(cat, translate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Filter */}
          <div className="space-y-2">
            <Label htmlFor="export-account-select">
              {t('importExport.export.filters.accountLabel')}
            </Label>
            <Select
              value={config.accountId}
              onValueChange={(val) => setConfig({ accountId: val })}
            >
              <SelectTrigger
                id="export-account-select"
                data-testid="export-account-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('importExport.export.filters.allAccounts')}
                </SelectItem>
                {availableAccounts.map((acc: Account) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {getAccountDisplayName(acc, translate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3. CSV Format Options */}
        <div className="border-border/60 bg-muted/30 space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="export-delimiter-select">
              {t('importExport.export.format.delimiterLabel')}
            </Label>
            <Select
              value={config.delimiter}
              onValueChange={(val) =>
                setConfig({ delimiter: val as CsvDelimiter })
              }
            >
              <SelectTrigger
                id="export-delimiter-select"
                data-testid="export-delimiter-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">
                  {t('importExport.export.format.comma')}
                </SelectItem>
                <SelectItem value=";">
                  {t('importExport.export.format.semicolon')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label
              htmlFor="export-include-headers"
              className="cursor-pointer text-sm font-normal"
            >
              {t('importExport.export.format.includeHeaders')}
            </Label>
            <Switch
              id="export-include-headers"
              data-testid="export-include-headers"
              checked={config.includeHeaders}
              onCheckedChange={(checked) =>
                setConfig({ includeHeaders: checked })
              }
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
        {/* Status / Matching Count */}
        <div
          aria-live="polite"
          className="text-muted-foreground text-sm"
          data-testid="export-summary-count"
        >
          {isLoadingCount ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
            </div>
          ) : matchingCount > 0 ? (
            <span>
              {t('importExport.export.summary.found', { count: matchingCount })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('importExport.empty.noTransactions')}
            </span>
          )}
        </div>

        {/* Export Button */}
        <Button
          onClick={exportCsv}
          disabled={!canExport}
          data-testid="export-submit-button"
          className="w-full sm:w-auto"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('importExport.export.actions.downloading')}
            </>
          ) : (
            <>
              <Download className="mr-2 size-4" />
              {t('importExport.export.actions.download')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
