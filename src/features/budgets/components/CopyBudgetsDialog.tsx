import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { formatYearMonth, isValidYearMonth } from '@/lib/dates';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { useTranslation } from '@/lib/i18n';

export interface CopyBudgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMonth: string;
  targetMonth: string;
  sourceBudgetsCount: number;
  onConfirm: (options: { overwrite: boolean }) => Promise<void> | void;
  isCopying?: boolean;
  isDesktop?: boolean;
}

export function CopyBudgetsDialog({
  open,
  onOpenChange,
  sourceMonth,
  targetMonth,
  sourceBudgetsCount,
  onConfirm,
  isCopying = false,
  isDesktop,
}: CopyBudgetsDialogProps) {
  const { t, i18n } = useTranslation();
  const [overwrite, setOverwrite] = React.useState(false);

  const currentLocale: Locale = i18n.language?.startsWith('ru')
    ? 'ru'
    : DEFAULT_LOCALE;

  const formattedSource = React.useMemo(() => {
    return isValidYearMonth(sourceMonth)
      ? formatYearMonth(sourceMonth, currentLocale)
      : sourceMonth;
  }, [sourceMonth, currentLocale]);

  const formattedTarget = React.useMemo(() => {
    return isValidYearMonth(targetMonth)
      ? formatYearMonth(targetMonth, currentLocale)
      : targetMonth;
  }, [targetMonth, currentLocale]);

  const handleConfirm = async () => {
    await onConfirm({ overwrite });
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
    >
      <ResponsiveDialogContent data-testid="copy-budgets-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('budgets.copyDialog.title')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('budgets.copyDialog.description', {
              sourceMonth: formattedSource,
              targetMonth: formattedTarget,
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {sourceBudgetsCount === 0 ? (
            <p className="text-muted-foreground">
              {t('budgets.copyDialog.noBudgetsInSource', {
                sourceMonth: formattedSource,
              })}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-foreground font-medium">
                {t('budgets.copyDialog.foundCount', {
                  count: sourceBudgetsCount,
                })}
              </p>

              <div className="border-border/70 bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label
                  htmlFor="copy-budgets-overwrite-switch"
                  className="cursor-pointer text-xs leading-relaxed"
                >
                  {t('budgets.copyDialog.overwriteLabel', {
                    targetMonth: formattedTarget,
                  })}
                </Label>
                <Switch
                  id="copy-budgets-overwrite-switch"
                  checked={overwrite}
                  onCheckedChange={setOverwrite}
                  disabled={isCopying}
                />
              </div>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={sourceBudgetsCount === 0 || isCopying}
          >
            {isCopying && (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            )}
            {t('budgets.copyDialog.confirmButton')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
