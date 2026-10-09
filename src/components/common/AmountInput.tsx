import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';
import { useTranslation } from '@/lib/i18n';

export interface AmountInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange'
> {
  value?: number;
  onChange?: (minorUnits: number) => void;
  currency?: CurrencyCode;
  locale?: Locale;
  currencyPosition?: 'start' | 'end';
  currencyDisplay?: 'code' | 'symbol';
}

function getCurrencySymbol(currency: CurrencyCode, locale: Locale): string {
  try {
    const parts = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency,
    }).formatToParts(0);
    const currencyPart = parts.find((p) => p.type === 'currency');
    return currencyPart ? currencyPart.value : currency;
  } catch {
    return currency;
  }
}

export function AmountInput({
  value,
  onChange,
  currency,
  locale,
  currencyPosition = 'end',
  currencyDisplay = 'code',
  placeholder,
  className,
  onFocus,
  onBlur,
  ref,
  ...props
}: AmountInputProps) {
  const { i18n } = useTranslation();

  const currentLocale: Locale =
    locale ?? (i18n.language?.startsWith('ru') ? 'ru' : DEFAULT_LOCALE);
  const currentCurrency: CurrencyCode = currency ?? DEFAULT_CURRENCY;
  const currencyLabel =
    currencyDisplay === 'code'
      ? currentCurrency
      : getCurrencySymbol(currentCurrency, currentLocale);

  const [isFocused, setIsFocused] = React.useState(false);
  const [prevValue, setPrevValue] = React.useState(value);
  const [prevLocale, setPrevLocale] = React.useState(currentLocale);
  const [displayValue, setDisplayValue] = React.useState<string>(() => {
    if (value !== undefined && value > 0) {
      return formatMoneyInput(value, currentLocale);
    }
    return '';
  });

  if (value !== prevValue || currentLocale !== prevLocale) {
    setPrevValue(value);
    setPrevLocale(currentLocale);
    if (!isFocused) {
      if (value !== undefined && value > 0) {
        setDisplayValue(formatMoneyInput(value, currentLocale));
      } else if (value === 0 || value === undefined) {
        setDisplayValue('');
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (raw.trim() === '') {
      setDisplayValue('');
      onChange?.(0);
      return;
    }

    // Allow only digits and separators . and ,
    let cleaned = raw.replace(/[^0-9.,]/g, '');

    // Allow at most one separator (preserve the first one encountered)
    let separatorIndex = -1;
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '.' || cleaned[i] === ',') {
        if (separatorIndex === -1) {
          separatorIndex = i;
        } else {
          cleaned = cleaned.slice(0, i) + cleaned.slice(i + 1);
          i--;
        }
      }
    }

    // Limit decimal places to at most 2 digits
    if (separatorIndex !== -1) {
      const intPart = cleaned.slice(0, separatorIndex);
      const sep = cleaned[separatorIndex];
      const decPart = cleaned.slice(separatorIndex + 1, separatorIndex + 3);
      cleaned = `${intPart}${sep}${decPart}`;
    }

    setDisplayValue(cleaned);

    const parsed = parseMoneyInput(cleaned);
    if (parsed !== null) {
      onChange?.(parsed);
    } else if (cleaned === '.' || cleaned === ',') {
      onChange?.(0);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (displayValue.trim() !== '') {
      const parsed = parseMoneyInput(displayValue);
      if (parsed !== null && parsed > 0) {
        setDisplayValue(formatMoneyInput(parsed, currentLocale));
      } else if (parsed === 0) {
        setDisplayValue(formatMoneyInput(0, currentLocale));
      } else {
        setDisplayValue('');
      }
    } else if (value !== undefined && value > 0) {
      setDisplayValue(formatMoneyInput(value, currentLocale));
    }
    onBlur?.(e);
  };

  const defaultPlaceholder = currentLocale === 'ru' ? '0,00' : '0.00';

  return (
    <div className="relative flex w-full items-center">
      {currencyPosition === 'start' && (
        <span
          data-slot="amount-currency"
          className="text-muted-foreground pointer-events-none absolute left-3 text-xs font-semibold tracking-wider uppercase select-none"
          aria-hidden="true"
        >
          {currencyLabel}
        </span>
      )}
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        data-slot="amount-input"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder ?? defaultPlaceholder}
        className={cn(
          'w-full tabular-nums',
          currencyPosition === 'start' ? 'pl-14' : 'pr-14',
          className,
        )}
        {...props}
      />
      {currencyPosition === 'end' && (
        <span
          data-slot="amount-currency"
          className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-semibold tracking-wider uppercase select-none"
          aria-hidden="true"
        >
          {currencyLabel}
        </span>
      )}
    </div>
  );
}
