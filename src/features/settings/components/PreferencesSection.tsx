import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  type CurrencyCode,
  isSupportedCurrency,
} from '@/lib/currencies';
import { type Locale } from '@/lib/locales';
import type { Theme } from '@/features/auth';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { CurrencyChangeDialog } from './CurrencyChangeDialog';

export interface PreferencesSectionProps {
  /** Optional overrides for testing */
  initialCurrency?: CurrencyCode;
  initialLocale?: Locale;
  initialTheme?: Theme;
  onUpdateCurrency?: (currency: CurrencyCode) => Promise<void>;
  onUpdateLocale?: (locale: Locale) => Promise<void>;
  onUpdateTheme?: (theme: Theme) => Promise<void>;
}

export function PreferencesSection({
  initialCurrency,
  initialLocale,
  initialTheme,
  onUpdateCurrency,
  onUpdateLocale,
  onUpdateTheme,
}: PreferencesSectionProps) {
  const { t } = useTranslation();
  const {
    profile,
    updateCurrency: hookUpdateCurrency,
    updateLocale: hookUpdateLocale,
    updateTheme: hookUpdateTheme,
    isSaving,
  } = useProfileSettings();

  const currentCurrency =
    initialCurrency ?? profile?.baseCurrency ?? DEFAULT_CURRENCY;
  const currentLocale = initialLocale ?? profile?.locale ?? 'en';
  const currentTheme = initialTheme ?? profile?.theme ?? 'system';

  const [pendingCurrency, setPendingCurrency] = useState<CurrencyCode | null>(
    null,
  );
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);

  const handleCurrencySelect = (val: string) => {
    if (!isSupportedCurrency(val) || val === currentCurrency) {
      return;
    }
    setPendingCurrency(val);
    setIsCurrencyDialogOpen(true);
  };

  const handleConfirmCurrencyChange = async () => {
    if (!pendingCurrency) return;
    if (onUpdateCurrency) {
      await onUpdateCurrency(pendingCurrency);
    } else {
      await hookUpdateCurrency(pendingCurrency);
    }
    setPendingCurrency(null);
  };

  const handleLocaleSelect = async (val: string) => {
    if (val !== 'en' && val !== 'ru') return;
    if (onUpdateLocale) {
      await onUpdateLocale(val);
    } else {
      await hookUpdateLocale(val);
    }
  };

  const handleThemeSelect = async (val: string) => {
    if (val !== 'light' && val !== 'dark' && val !== 'system') return;
    if (onUpdateTheme) {
      await onUpdateTheme(val);
    } else {
      await hookUpdateTheme(val);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {t('settings.preferences.title', { defaultValue: 'Preferences' })}
          </CardTitle>
          <CardDescription>
            {t('settings.preferences.description', {
              defaultValue:
                'Configure display currency, app language, and theme',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Currency */}
          <div className="space-y-2">
            <Label htmlFor="settings-currency-select">
              {t('settings.preferences.currencyLabel', {
                defaultValue: 'Base Currency',
              })}
            </Label>
            <Select
              value={currentCurrency}
              onValueChange={handleCurrencySelect}
              disabled={isSaving}
            >
              <SelectTrigger
                id="settings-currency-select"
                aria-label={t('settings.preferences.currencyLabel', {
                  defaultValue: 'Base Currency',
                })}
                className="w-full sm:w-64"
              >
                <SelectValue placeholder={currentCurrency} />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t('settings.preferences.currencyHelp', {
                defaultValue:
                  'Currency used across all account balances and totals',
              })}
            </p>
          </div>

          {/* Interface Language */}
          <div className="space-y-2">
            <Label htmlFor="settings-language-select">
              {t('settings.preferences.languageLabel', {
                defaultValue: 'Interface Language',
              })}
            </Label>
            <Select
              value={currentLocale}
              onValueChange={(val) => {
                void handleLocaleSelect(val);
              }}
              disabled={isSaving}
            >
              <SelectTrigger
                id="settings-language-select"
                aria-label={t('settings.preferences.languageLabel', {
                  defaultValue: 'Interface Language',
                })}
                className="w-full sm:w-64"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  {t('layout.language.en', { defaultValue: 'English' })}
                </SelectItem>
                <SelectItem value="ru">
                  {t('layout.language.ru', { defaultValue: 'Русский' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="settings-theme-select">
              {t('settings.preferences.themeLabel', {
                defaultValue: 'Theme',
              })}
            </Label>
            <Select
              value={currentTheme}
              onValueChange={(val) => {
                void handleThemeSelect(val);
              }}
              disabled={isSaving}
            >
              <SelectTrigger
                id="settings-theme-select"
                aria-label={t('settings.preferences.themeLabel', {
                  defaultValue: 'Theme',
                })}
                className="w-full sm:w-64"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  {t('settings.preferences.themeLight', {
                    defaultValue: 'Light',
                  })}
                </SelectItem>
                <SelectItem value="dark">
                  {t('settings.preferences.themeDark', {
                    defaultValue: 'Dark',
                  })}
                </SelectItem>
                <SelectItem value="system">
                  {t('settings.preferences.themeSystem', {
                    defaultValue: 'System',
                  })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <CurrencyChangeDialog
        open={isCurrencyDialogOpen}
        onOpenChange={setIsCurrencyDialogOpen}
        targetCurrency={pendingCurrency}
        onConfirm={handleConfirmCurrencyChange}
        isLoading={isSaving}
      />
    </>
  );
}
