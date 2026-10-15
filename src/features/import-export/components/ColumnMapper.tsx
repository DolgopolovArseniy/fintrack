import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAccountDisplayName, type Account } from '@/features/accounts';
import { getCategoryDisplayName, type Category } from '@/features/categories';
import { IMPORTABLE_FIELDS, type ImportField } from '@/lib/csvImport';
import { useTranslation } from '@/lib/i18n';
import type {
  DelimiterSelection,
  UseCsvImportResult,
} from '../hooks/useCsvImport';

export interface ColumnMapperProps {
  importer: UseCsvImportResult;
}

const IGNORE_VALUE = '__ignore__';

/** Display-name translator compatible with getCategory/AccountDisplayName. */
function useDisplayTranslate(): (
  key: string,
  options?: Record<string, unknown>,
) => string {
  const { t } = useTranslation();
  return React.useCallback(
    (key: string, options?: Record<string, unknown>) => {
      const defaultValue =
        typeof options?.defaultValue === 'string' ? options.defaultValue : key;
      return t(key, { ...options, defaultValue });
    },
    [t],
  );
}

function columnLetter(index: number): string {
  let letter = '';
  let rest = index;
  do {
    letter = String.fromCharCode(65 + (rest % 26)) + letter;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return letter;
}

export function ColumnMapper({ importer }: ColumnMapperProps) {
  const { t } = useTranslation();
  const [attempted, setAttempted] = React.useState(false);

  const { table, mapping } = importer;
  if (!table) {
    return null;
  }

  const columnCount = Math.max(
    table.headers.length,
    ...table.rows.map((row) => row.length),
    0,
  );
  const columnIndexes = Array.from({ length: columnCount }, (_, i) => i);
  const fieldForColumn = (index: number): ImportField | null => {
    for (const field of IMPORTABLE_FIELDS) {
      if (mapping[field] === index) {
        return field;
      }
    }
    return null;
  };

  const handleFieldChange = (index: number, value: string) => {
    if (value === IGNORE_VALUE) {
      const current = fieldForColumn(index);
      if (current) {
        importer.setMapping({ [current]: null });
      }
      return;
    }
    const field = value as ImportField;
    const patch: Record<string, number | null> = { [field]: index };
    for (const other of IMPORTABLE_FIELDS) {
      if (other !== field && mapping[other] === index) {
        patch[other] = null;
      }
    }
    importer.setMapping(patch);
  };

  const mappingIncomplete = mapping.date === null || mapping.amount === null;
  const showMappingError =
    (attempted ||
      importer.globalError?.message === 'import.errors.mappingRequired') &&
    mappingIncomplete;

  const handleContinue = () => {
    if (!importer.goToPreview()) {
      setAttempted(true);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {t('import.mapping.description')}
      </p>

      <div className="space-y-2">
        <Label>{t('import.mapping.delimiterLabel')}</Label>
        <div className="flex gap-2" role="group">
          {(['auto', ',', ';'] as DelimiterSelection[]).map((option) => (
            <Button
              key={option}
              type="button"
              variant={importer.delimiter === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => importer.setDelimiter(option)}
            >
              {option === 'auto' ? t('import.mapping.auto') : option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {columnIndexes.map((index) => {
          const header = table.hasHeader
            ? (table.headers[index] ?? '')
            : t('import.mapping.columnName', {
                letter: columnLetter(index),
              });
          const sample = table.rows[0]?.[index] ?? '';
          return (
            <div
              key={index}
              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{header}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {sample}
                </p>
              </div>
              <Select
                value={fieldForColumn(index) ?? IGNORE_VALUE}
                onValueChange={(value) => handleFieldChange(index, value)}
              >
                <SelectTrigger data-testid={`column-map-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={IGNORE_VALUE}>
                    {t('import.mapping.fieldLabels.ignore')}
                  </SelectItem>
                  {IMPORTABLE_FIELDS.map((field) => (
                    <SelectItem
                      key={field}
                      value={field}
                      data-testid={`column-option-${field}`}
                    >
                      {t(`import.mapping.fieldLabels.${field}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {mapping.type === null && (
        <p className="text-muted-foreground text-sm">
          {t('import.mapping.signModeHint')}
        </p>
      )}

      <NameOverrideBlock importer={importer} />
      <DefaultSelectors importer={importer} />

      {showMappingError && (
        <p role="alert" className="text-destructive text-sm">
          {t('import.errors.mappingRequired')}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={importer.reset}>
          {t('import.mapping.backAction')}
        </Button>
        <Button type="button" onClick={handleContinue}>
          {t('import.mapping.continueAction')}
        </Button>
      </div>
    </div>
  );
}

function NameOverrideBlock({ importer }: ColumnMapperProps) {
  const { t } = useTranslation();
  const translate = useDisplayTranslate();

  const hasUnmapped =
    importer.unmappedCategoryNames.length > 0 ||
    importer.unmappedAccountNames.length > 0;
  if (!hasUnmapped) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        {t('import.mapping.unmappedNames')}
      </h3>
      <p className="text-muted-foreground text-sm">
        {t('import.mapping.unmappedHint')}
      </p>
      {importer.unmappedCategoryNames.map((name) => (
        <div
          key={`cat:${name}`}
          className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
        >
          <p className="truncate text-sm">{name}</p>
          <Select
            value={importer.categoryOverrides.get(name) ?? ''}
            onValueChange={(id) =>
              importer.setNameOverride('category', name, id)
            }
          >
            <SelectTrigger data-testid={`override-category-${name}`}>
              <SelectValue
                placeholder={t('import.mapping.fieldLabels.category')}
              />
            </SelectTrigger>
            <SelectContent>
              {importer.categories.map((cat: Category) => (
                <SelectItem
                  key={cat.id}
                  value={cat.id}
                  data-testid={`override-category-option-${cat.id}`}
                >
                  {getCategoryDisplayName(cat, translate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {importer.unmappedAccountNames.map((name) => (
        <div
          key={`acc:${name}`}
          className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
        >
          <p className="truncate text-sm">{name}</p>
          <Select
            value={importer.accountOverrides.get(name) ?? ''}
            onValueChange={(id) =>
              importer.setNameOverride('account', name, id)
            }
          >
            <SelectTrigger data-testid={`override-account-${name}`}>
              <SelectValue
                placeholder={t('import.mapping.fieldLabels.account')}
              />
            </SelectTrigger>
            <SelectContent>
              {importer.accounts.map((acc: Account) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {getAccountDisplayName(acc, translate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function DefaultSelectors({ importer }: ColumnMapperProps) {
  const { t } = useTranslation();
  const translate = useDisplayTranslate();

  const activeAccounts = importer.accounts.filter((acc) => !acc.archived);
  const expenseCategories = importer.categories.filter(
    (cat) => !cat.archived && cat.type === 'expense',
  );
  const incomeCategories = importer.categories.filter(
    (cat) => !cat.archived && cat.type === 'income',
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>{t('import.mapping.defaultAccount')}</Label>
        <Select
          value={importer.defaults.accountId}
          onValueChange={(id) => importer.setDefaultOverride({ accountId: id })}
        >
          <SelectTrigger data-testid="import-default-account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeAccounts.map((acc: Account) => (
              <SelectItem key={acc.id} value={acc.id}>
                {getAccountDisplayName(acc, translate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('import.mapping.defaultExpenseCategory')}</Label>
        <Select
          value={importer.defaults.expenseCategoryId}
          onValueChange={(id) =>
            importer.setDefaultOverride({ expenseCategoryId: id })
          }
        >
          <SelectTrigger data-testid="import-default-expense-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((cat: Category) => (
              <SelectItem key={cat.id} value={cat.id}>
                {getCategoryDisplayName(cat, translate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('import.mapping.defaultIncomeCategory')}</Label>
        <Select
          value={importer.defaults.incomeCategoryId}
          onValueChange={(id) =>
            importer.setDefaultOverride({ incomeCategoryId: id })
          }
        >
          <SelectTrigger data-testid="import-default-income-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {incomeCategories.map((cat: Category) => (
              <SelectItem key={cat.id} value={cat.id}>
                {getCategoryDisplayName(cat, translate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
