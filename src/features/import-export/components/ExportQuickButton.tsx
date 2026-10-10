import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/features/transactions';
import { useTranslation } from '@/lib/i18n';
import { useQuickExport } from '../hooks/useQuickExport';

export interface ExportQuickButtonProps {
  transactions: readonly Transaction[];
  filenameScope: string;
  className?: string;
  variant?: 'outline' | 'default' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportQuickButton({
  transactions,
  filenameScope,
  className,
  variant = 'outline',
  size = 'default',
}: ExportQuickButtonProps) {
  const { t } = useTranslation();
  const { exportCurrentView } = useQuickExport();

  const handleExport = React.useCallback(() => {
    exportCurrentView(transactions, filenameScope);
  }, [exportCurrentView, transactions, filenameScope]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={transactions.length === 0}
      className={className}
      aria-label={t('importExport.export.actions.quickExport')}
      data-testid="export-quick-button"
    >
      <Download className={size === 'icon' ? 'size-4' : 'mr-2 size-4'} />
      {size !== 'icon' && t('importExport.export.actions.quickExport')}
    </Button>
  );
}
