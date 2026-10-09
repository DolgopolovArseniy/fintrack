import * as React from 'react';
import {
  Archive,
  ArchiveRestore,
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { isSupportedLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import type { Account } from '../schemas';
import { getAccountDisplayName, getAccountTypeLabel } from '../utils';

export interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onUnarchive: (account: Account) => void;
  onRecalculate: (account: Account) => void;
  isRecalculating?: boolean;
  canArchive?: boolean;
  currency?: CurrencyCode;
  className?: string;
}

const TYPE_ICONS: Record<
  Account['type'],
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  bank: Landmark,
};

const TYPE_CONTAINER_STYLES: Record<Account['type'], string> = {
  cash: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  card: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  bank: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
};

export function AccountCard({
  account,
  onEdit,
  onArchive,
  onUnarchive,
  onRecalculate,
  isRecalculating = false,
  canArchive = true,
  currency = DEFAULT_CURRENCY,
  className,
}: AccountCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.resolvedLanguage ?? i18n.language ?? '';
  const currentLocale: Locale = isSupportedLocale(currentLang)
    ? currentLang
    : DEFAULT_LOCALE;

  const displayName = getAccountDisplayName(account, (key, options) =>
    t(key as never, options),
  );
  const typeLabel = getAccountTypeLabel(account.type, (key, options) =>
    t(key as never, options),
  );
  const IconComponent = TYPE_ICONS[account.type] ?? Wallet;
  const iconContainerStyle =
    TYPE_CONTAINER_STYLES[account.type] ?? 'bg-primary/10 text-primary';

  const formattedInitialBalance = formatMoney(account.initialBalance, {
    locale: currentLocale,
    currency,
  });

  return (
    <article
      data-slot="account-card"
      data-testid={`account-card-${account.id}`}
      data-account-id={account.id}
      data-archived={account.archived ? 'true' : undefined}
      className={cn(
        'bg-card text-card-foreground border-border/60 hover:border-border/90 flex flex-col justify-between rounded-xl border p-4 shadow-xs transition-all',
        account.archived && 'bg-card/70 opacity-75 grayscale-[20%]',
        className,
      )}
    >
      {/* Top row: Icon, Name, Type badge, and Actions Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              iconContainerStyle,
            )}
          >
            <IconComponent className="size-5" />
          </div>
          <div className="min-w-0">
            <h3
              title={displayName}
              className={cn(
                'truncate text-sm font-semibold tracking-tight',
                account.archived &&
                  'decoration-muted-foreground/50 line-through',
              )}
            >
              {displayName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                data-slot="account-type-badge"
                className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-1.5 py-0 text-[11px] font-normal select-none"
              >
                {typeLabel}
              </span>
              {account.archived && (
                <span
                  data-slot="account-archived-badge"
                  className="text-muted-foreground border-border/80 inline-flex items-center rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase select-none"
                >
                  {t('accounts.card.archivedBadge', {
                    defaultValue: 'Archived',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8 shrink-0"
              aria-label={t('common.actions.edit', { defaultValue: 'Actions' })}
              data-testid={`account-actions-${account.id}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onEdit(account)}
              data-testid={`account-edit-${account.id}`}
            >
              <Pencil className="mr-2 size-4" />
              {t('accounts.actions.edit', {
                defaultValue: 'Edit account',
              })}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isRecalculating}
              onClick={() => onRecalculate(account)}
              data-testid={`account-recalculate-${account.id}`}
            >
              {isRecalculating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {isRecalculating
                ? t('accounts.card.recalculating', {
                    defaultValue: 'Recalculating...',
                  })
                : t('accounts.actions.recalculate', {
                    defaultValue: 'Recalculate balance',
                  })}
            </DropdownMenuItem>

            {account.archived ? (
              <DropdownMenuItem
                onClick={() => onUnarchive(account)}
                data-testid={`account-unarchive-${account.id}`}
              >
                <ArchiveRestore className="mr-2 size-4" />
                {t('accounts.actions.unarchive', {
                  defaultValue: 'Restore account',
                })}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!canArchive}
                title={
                  !canArchive
                    ? t('accounts.confirm.lastAccountWarning', {
                        defaultValue: 'Cannot archive the only active account.',
                      })
                    : undefined
                }
                onClick={() => {
                  if (canArchive) {
                    onArchive(account);
                  }
                }}
                className={cn(
                  'text-destructive focus:text-destructive',
                  !canArchive && 'cursor-not-allowed opacity-50',
                )}
                data-testid={`account-archive-${account.id}`}
              >
                <Archive className="mr-2 size-4" />
                {t('accounts.actions.archive', {
                  defaultValue: 'Archive account',
                })}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Middle row: Current Balance */}
      <div className="mt-4 space-y-1">
        <span className="text-muted-foreground text-xs font-medium">
          {t('accounts.card.currentBalance', {
            defaultValue: 'Current balance',
          })}
        </span>
        <div>
          <MoneyText
            amount={account.balance}
            currency={currency}
            size="lg"
            className="font-bold tracking-tight"
          />
        </div>
      </div>

      {/* Bottom row: Initial balance indicator */}
      <div className="border-border/40 text-muted-foreground mt-3 flex items-center justify-between border-t pt-2.5 text-xs">
        <span>
          {t('accounts.card.initialBalance', {
            defaultValue: 'Initial',
          })}
          :
        </span>
        <span className="text-foreground/80 font-medium tabular-nums">
          {formattedInitialBalance}
        </span>
      </div>
    </article>
  );
}
