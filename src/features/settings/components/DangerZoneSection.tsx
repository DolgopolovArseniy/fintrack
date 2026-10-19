import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { DeleteAccountDialog } from './DeleteAccountDialog';

export interface DangerZoneSectionProps {
  isOnlineOverride?: boolean;
}

export function DangerZoneSection({
  isOnlineOverride,
}: DangerZoneSectionProps) {
  const { t } = useTranslation();
  const { isOnline: hookIsOnline } = useOnlineStatus();
  const isOnline = isOnlineOverride ?? hookIsOnline;

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-destructive/40 bg-destructive/5 dark:bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            {t('settings.dangerZone.title', { defaultValue: 'Danger Zone' })}
          </CardTitle>
          <CardDescription>
            {t('settings.dangerZone.description', {
              defaultValue: 'Irreversible account and data actions',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-foreground text-sm font-medium">
              {t('settings.dangerZone.deleteAccountTitle', {
                defaultValue: 'Delete Account & Data',
              })}
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t('settings.dangerZone.deleteAccountDescription', {
                defaultValue:
                  'Permanently remove your account, profile, all accounts, categories, budgets, and financial transactions. This action cannot be undone.',
              })}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDialogOpen(true)}
              disabled={!isOnline}
              className="w-full sm:w-auto"
            >
              {t('settings.dangerZone.deleteAccountButton', {
                defaultValue: 'Delete Account',
              })}
            </Button>

            {!isOnline && (
              <span className="text-warning text-xs">
                {t('settings.errors.offlineNotice', {
                  defaultValue:
                    'This action requires an active internet connection.',
                })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
