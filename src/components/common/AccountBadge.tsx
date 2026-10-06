import * as React from 'react';
import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export interface AccountBadgeProps {
  name?: string;
  systemKey?: string;
  type?: 'cash' | 'card' | 'bank';
  archived?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showArchivedBadge?: boolean;
  showTypeIcon?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<
  'cash' | 'card' | 'bank',
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  bank: Landmark,
};

const TYPE_STYLES: Record<
  'cash' | 'card' | 'bank',
  { bg: string; text: string; border: string }
> = {
  cash: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
  },
  card: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/20 dark:border-blue-500/30',
  },
  bank: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500/20 dark:border-purple-500/30',
  },
};

const DEFAULT_STYLE = {
  bg: 'bg-secondary/50',
  text: 'text-secondary-foreground',
  border: 'border-border/60',
};

export function AccountBadge({
  name,
  systemKey,
  type,
  archived = false,
  size = 'md',
  showArchivedBadge = true,
  showTypeIcon = true,
  className,
}: AccountBadgeProps): React.JSX.Element {
  const { t } = useTranslation();

  const displayName = React.useMemo(() => {
    const trimmed = name?.trim();
    if (trimmed) {
      return trimmed;
    }
    if (systemKey) {
      return t(`accounts.system.${systemKey}` as const, {
        defaultValue: systemKey === 'main' ? 'Main account' : systemKey,
      });
    }
    return '';
  }, [name, systemKey, t]);

  const IconComponent = type ? (TYPE_ICONS[type] ?? Wallet) : Wallet;
  const typeStyle = type ? (TYPE_STYLES[type] ?? DEFAULT_STYLE) : DEFAULT_STYLE;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5 [&_svg]:size-3',
    md: 'text-sm px-2.5 py-1 gap-1.5 [&_svg]:size-3.5',
    lg: 'text-base px-3 py-1.5 gap-2 [&_svg]:size-4',
  }[size];

  return (
    <span
      data-slot="account-badge"
      data-testid="account-badge"
      data-archived={archived ? 'true' : undefined}
      data-type={type}
      className={cn(
        'inline-flex items-center rounded-md border font-medium transition-colors select-none',
        typeStyle.bg,
        typeStyle.text,
        typeStyle.border,
        sizeClasses,
        archived && 'opacity-65 grayscale-[25%]',
        className,
      )}
    >
      {showTypeIcon && (
        <IconComponent aria-hidden="true" className="shrink-0" />
      )}
      <span
        className={cn(
          'truncate',
          archived && 'line-through decoration-current/40',
        )}
      >
        {displayName}
      </span>
      {archived && showArchivedBadge && (
        <span
          data-slot="account-badge-archived"
          className="bg-muted/80 text-muted-foreground ml-1 rounded px-1 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
        >
          {t('accounts.card.archivedBadge', { defaultValue: 'Archived' })}
        </span>
      )}
    </span>
  );
}
