import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import type { Transaction } from '../schemas';

export interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  className?: string;
}

export function TransactionItem({
  transaction,
  category,
  account,
  onEdit,
  onDelete,
  className,
}: TransactionItemProps) {
  const { t } = useTranslation();

  const accountName =
    account?.name?.trim() ||
    (account?.systemKey === 'main' ? 'Main account' : account?.systemKey);

  return (
    <div
      data-slot="transaction-item"
      data-testid={`transaction-item-${transaction.id}`}
      className={cn(
        'border-border/50 bg-card hover:bg-accent/40 flex items-center justify-between rounded-lg border p-3 transition-colors sm:px-4 sm:py-3.5',
        className,
      )}
    >
      {/* Left: Category & details */}
      <div className="flex min-w-0 items-center gap-3">
        <CategoryBadge
          name={category?.name}
          systemKey={category?.systemKey}
          icon={category?.icon}
          color={category?.color}
          archived={category?.archived}
          size="sm"
        />

        <div className="flex min-w-0 flex-col">
          {transaction.note ? (
            <span
              className="text-foreground truncate text-sm font-medium"
              data-testid="transaction-note"
            >
              {transaction.note}
            </span>
          ) : null}

          {accountName ? (
            <span
              className="text-muted-foreground truncate text-xs"
              data-testid="transaction-account-name"
            >
              {accountName}
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: Amount & actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <MoneyText
          amount={transaction.amount}
          type={transaction.type}
          showSign={true}
          size="sm"
          className="font-semibold"
        />

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-8 shrink-0"
                aria-label={t('common.actions.edit')}
                data-testid={`transaction-actions-${transaction.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(transaction)}
                  data-testid={`transaction-edit-${transaction.id}`}
                >
                  <Pencil className="mr-2 size-4" />
                  {t('transactions.actions.edit')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(transaction)}
                  className="text-destructive focus:text-destructive"
                  data-testid={`transaction-delete-${transaction.id}`}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t('transactions.actions.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
