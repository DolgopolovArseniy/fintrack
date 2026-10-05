import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { formatMoney } from '@/lib/money';
import { useTranslation } from '@/lib/i18n';

export interface MoneyTextProps {
  amount: number;
  type?: 'expense' | 'income' | 'neutral';
  currency?: CurrencyCode;
  locale?: Locale;
  showSign?: boolean;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'kpi';
  className?: string;
}

const SIZE_STYLES: Record<
  NonNullable<MoneyTextProps['size']>,
  { text: string; icon: string }
> = {
  xs: { text: 'text-xs', icon: 'size-3' },
  sm: { text: 'text-sm', icon: 'size-3.5' },
  md: { text: 'text-base', icon: 'size-4' },
  lg: { text: 'text-lg font-semibold', icon: 'size-5' },
  xl: { text: 'text-xl font-bold', icon: 'size-5' },
  kpi: { text: 'text-2xl sm:text-3xl font-bold', icon: 'size-6' },
};

const TYPE_STYLES = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-foreground',
} as const;

export function MoneyText({
  amount,
  type,
  currency,
  locale,
  showSign,
  showIcon = false,
  size = 'md',
  className,
}: MoneyTextProps) {
  const { i18n } = useTranslation();

  const currentLocale: Locale =
    locale ?? (i18n.language?.startsWith('ru') ? 'ru' : DEFAULT_LOCALE);
  const currentCurrency: CurrencyCode = currency ?? DEFAULT_CURRENCY;

  const resolvedType =
    type ?? (amount > 0 ? 'income' : amount < 0 ? 'expense' : 'neutral');

  let sign = '';
  if (amount !== 0) {
    if (showSign === true) {
      sign =
        resolvedType === 'income' ? '+' : resolvedType === 'expense' ? '−' : '';
    } else if (showSign === false) {
      sign = '';
    } else if (amount < 0) {
      sign = '−';
    }
  }

  const absAmount = Math.abs(amount);
  const formatted = formatMoney(absAmount, {
    locale: currentLocale,
    currency: currentCurrency,
  });

  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const colorStyle = TYPE_STYLES[resolvedType] ?? TYPE_STYLES.neutral;

  const IconComponent =
    showIcon && resolvedType === 'income'
      ? ArrowUpRight
      : showIcon && resolvedType === 'expense'
        ? ArrowDownLeft
        : null;

  return (
    <span
      data-slot="money-text"
      data-type={resolvedType}
      data-amount={amount}
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums select-none',
        colorStyle,
        sizeStyle.text,
        className,
      )}
    >
      {IconComponent && (
        <IconComponent
          aria-hidden="true"
          className={cn('shrink-0', sizeStyle.icon)}
          data-slot="money-icon"
        />
      )}
      <span>
        {sign}
        {formatted}
      </span>
    </span>
  );
}
