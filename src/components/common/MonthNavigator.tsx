import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  addMonths,
  currentYearMonth,
  formatYearMonth,
  type YearMonth,
} from '@/lib/dates';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { useTranslation } from '@/lib/i18n';

export interface MonthNavigatorProps {
  month?: YearMonth;
  value?: YearMonth;
  onChange?: (month: YearMonth) => void;
  locale?: Locale;
  showCurrentMonthButton?: boolean;
  className?: string;
}

export function MonthNavigator({
  month,
  value,
  onChange,
  locale,
  showCurrentMonthButton = true,
  className,
}: MonthNavigatorProps) {
  const { t, i18n } = useTranslation();

  const currentLocale: Locale =
    locale ?? (i18n.language?.startsWith('ru') ? 'ru' : DEFAULT_LOCALE);

  const selectedMonth: YearMonth = month ?? value ?? currentYearMonth();
  const thisMonth: YearMonth = currentYearMonth();
  const isCurrentMonth = selectedMonth === thisMonth;

  const formattedMonth = formatYearMonth(selectedMonth, currentLocale);
  const monthTitle =
    formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

  const handlePrev = () => {
    onChange?.(addMonths(selectedMonth, -1));
  };

  const handleNext = () => {
    onChange?.(addMonths(selectedMonth, 1));
  };

  const handleResetToCurrent = () => {
    if (!isCurrentMonth) {
      onChange?.(thisMonth);
    }
  };

  return (
    <div
      data-slot="month-navigator"
      className={cn(
        'inline-flex items-center gap-1 select-none sm:gap-1.5',
        className,
      )}
    >
      <Button
        variant="outline"
        size="icon-sm"
        type="button"
        aria-label={t('monthNavigator.prevMonth', {
          defaultValue: 'Previous month',
        })}
        onClick={handlePrev}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>

      <div
        data-slot="month-title"
        className="min-w-[120px] text-center text-sm font-semibold sm:min-w-[140px]"
        aria-live="polite"
      >
        {monthTitle}
      </div>

      <Button
        variant="outline"
        size="icon-sm"
        type="button"
        aria-label={t('monthNavigator.nextMonth', {
          defaultValue: 'Next month',
        })}
        onClick={handleNext}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>

      {showCurrentMonthButton && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={isCurrentMonth}
          onClick={handleResetToCurrent}
          className="text-muted-foreground hover:text-foreground text-xs font-medium disabled:opacity-40"
        >
          {t('monthNavigator.currentMonth', { defaultValue: 'This month' })}
        </Button>
      )}
    </div>
  );
}
