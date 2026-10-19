import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { useTranslation } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/currencies';

export interface CurrencyChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCurrency: CurrencyCode | null;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  isDesktop?: boolean;
}

export function CurrencyChangeDialog({
  open,
  onOpenChange,
  targetCurrency,
  onConfirm,
  isLoading = false,
  isDesktop,
}: CurrencyChangeDialogProps) {
  const { t } = useTranslation();

  const handleCancel = () => {
    if (isLoading) return;
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isLoading || !targetCurrency) return;
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('settings.preferences.currencyChangeDialog.title', {
              defaultValue: 'Change base currency?',
            })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('settings.preferences.currencyChangeDialog.warning', {
              defaultValue:
                'Changing the base currency only updates the currency symbol across all displayed accounts and reports. Historical transaction amounts are NOT converted using exchange rates.',
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {t('settings.preferences.currencyChangeDialog.cancelButton', {
              defaultValue: 'Cancel',
            })}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isLoading || !targetCurrency}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('settings.profile.saving', { defaultValue: 'Saving...' })}
              </>
            ) : (
              t('settings.preferences.currencyChangeDialog.confirmButton', {
                defaultValue: 'I understand, change currency',
              })
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
