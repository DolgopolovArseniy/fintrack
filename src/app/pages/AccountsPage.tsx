import * as React from 'react';
import { Plus, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/features/auth';
import {
  AccountForm,
  AccountList,
  AccountSummaryHeader,
  getAccountDisplayName,
  sortAccounts,
  useAccounts,
  useAccountMutations,
  useAccountTotals,
  type Account,
  type AccountInput,
} from '@/features/accounts';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_CURRENCY } from '@/lib/currencies';

export function AccountsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const currency = profile?.baseCurrency ?? DEFAULT_CURRENCY;

  const accountsState = useAccounts();
  const {
    createAccount,
    updateAccount,
    archiveAccount,
    unarchiveAccount,
    recalculateBalance,
    isSubmitting,
  } = useAccountMutations();

  const [showArchived, setShowArchived] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(
    null,
  );
  const [accountToArchive, setAccountToArchive] =
    React.useState<Account | null>(null);
  const [recalculatingId, setRecalculatingId] = React.useState<string | null>(
    null,
  );

  const rawAccounts =
    accountsState.status === 'success' ? accountsState.data : [];
  const totals = useAccountTotals(rawAccounts);

  const handleCreate = async (values: AccountInput) => {
    await createAccount(values);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (values: AccountInput) => {
    if (!editingAccount) return;
    await updateAccount(editingAccount.id, editingAccount, {
      name: values.name,
      type: values.type,
      initialBalance: values.initialBalance,
    });
    setEditingAccount(null);
  };

  const handleConfirmArchive = async () => {
    if (!accountToArchive) return;
    await archiveAccount(accountToArchive.id);
    setAccountToArchive(null);
  };

  const handleUnarchive = async (account: Account) => {
    await unarchiveAccount(account.id);
  };

  const handleRecalculate = async (account: Account) => {
    setRecalculatingId(account.id);
    try {
      await recalculateBalance(account.id);
    } finally {
      setRecalculatingId(null);
    }
  };

  const renderEmptyState = (
    <EmptyState
      icon={Wallet}
      title={t('accounts.empty.title', { defaultValue: 'No active accounts' })}
      description={t('accounts.empty.description', {
        defaultValue:
          'All your accounts are archived or no accounts exist yet.',
      })}
      action={
        <Button
          onClick={() => setIsCreateOpen(true)}
          data-testid="empty-create-account-button"
        >
          <Plus className="mr-2 size-4" />
          {t('accounts.actions.add', { defaultValue: 'Add account' })}
        </Button>
      }
    />
  );

  return (
    <div data-testid="accounts-page" className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('accounts.title', { defaultValue: 'Accounts' })}
        description={t('accounts.description', {
          defaultValue:
            'Manage your wallets, cards, bank accounts and track balances',
        })}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived-accounts"
                checked={showArchived}
                onCheckedChange={setShowArchived}
                data-testid="show-archived-switch"
              />
              <Label
                htmlFor="show-archived-accounts"
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-normal"
              >
                {t('accounts.showArchived', {
                  defaultValue: 'Show archived',
                })}
              </Label>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              data-testid="add-account-button"
            >
              <Plus className="mr-2 size-4" />
              {t('accounts.actions.add', { defaultValue: 'Add account' })}
            </Button>
          </div>
        }
      />

      {/* Summary KPI Header */}
      <AccountSummaryHeader totals={totals} currency={currency} />

      {/* Accounts List & Data Query Boundary */}
      <QueryBoundary state={accountsState} empty={renderEmptyState}>
        {(accounts) => {
          const sorted = sortAccounts(accounts, (k, o) => t(k as never, o));
          const displayedAccounts = sorted.filter(
            (acc) => showArchived || !acc.archived,
          );

          if (displayedAccounts.length === 0) {
            return renderEmptyState;
          }

          return (
            <AccountList
              accounts={displayedAccounts}
              onEdit={(acc) => setEditingAccount(acc)}
              onArchive={(acc) => setAccountToArchive(acc)}
              onUnarchive={(acc) => void handleUnarchive(acc)}
              onRecalculate={(acc) => void handleRecalculate(acc)}
              recalculatingAccountId={recalculatingId}
              currency={currency}
            />
          );
        }}
      </QueryBoundary>

      {/* Create Account Dialog */}
      <AccountForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        currency={currency}
      />

      {/* Edit Account Dialog */}
      {editingAccount && (
        <AccountForm
          open={Boolean(editingAccount)}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          initialData={editingAccount}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          currency={currency}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(accountToArchive)}
        onOpenChange={(open) => !open && setAccountToArchive(null)}
        title={t('accounts.confirm.archiveTitle', {
          defaultValue: 'Archive account',
        })}
        description={t('accounts.confirm.archiveDescription', {
          name: accountToArchive
            ? getAccountDisplayName(accountToArchive, (k, o) =>
                t(k as never, o),
              )
            : '',
          defaultValue: `Are you sure you want to archive "${accountToArchive ? getAccountDisplayName(accountToArchive) : ''}"?`,
        })}
        confirmLabel={t('accounts.confirm.archiveConfirm', {
          defaultValue: 'Archive',
        })}
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
