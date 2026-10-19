import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/common/PasswordInput';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/features/auth';
import {
  useAccountDeletion,
  type DeleteAccountOptions,
} from '../hooks/useAccountDeletion';

export interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDesktop?: boolean;
  onDeleteAccountOverride?: (
    options?: DeleteAccountOptions,
  ) => Promise<boolean>;
  isDeletingOverride?: boolean;
}

const DEFAULT_PHASE_LABELS: Record<string, string> = {
  reauth: 'Verifying credentials',
  transactions: 'Deleting transactions',
  budgets: 'Deleting budgets',
  accounts: 'Deleting accounts',
  categories: 'Deleting categories',
  profile: 'Deleting profile',
  auth: 'Removing account',
  done: 'Completed',
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  isDesktop,
  onDeleteAccountOverride,
  isDeletingOverride,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    deleteAccount: hookDeleteAccount,
    isDeleting: hookIsDeleting,
    progress,
    error,
    resetState,
  } = useAccountDeletion();

  const isDeleting = isDeletingOverride ?? hookIsDeleting;
  const deleteAccount = onDeleteAccountOverride ?? hookDeleteAccount;

  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');

  const expectedPhrase = t('settings.dangerZone.dialog.expectedPhrase', {
    defaultValue: 'DELETE',
  });

  const normalizedPhrase = phrase.trim().toUpperCase();
  const isPhraseValid =
    normalizedPhrase === expectedPhrase.toUpperCase() ||
    normalizedPhrase === 'DELETE' ||
    normalizedPhrase === 'УДАЛИТЬ';

  const isAnonymous = user?.isAnonymous ?? false;
  const isGoogleUser = user?.providerIds.includes('google.com') ?? false;
  const isPasswordUser = !isAnonymous && !isGoogleUser;

  const isFormValid =
    isPhraseValid && (!isPasswordUser || password.trim().length > 0);

  const handleClose = () => {
    if (isDeleting) return;
    setPhrase('');
    setPassword('');
    resetState();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!isFormValid || isDeleting) return;

    let options: DeleteAccountOptions | undefined;
    if (isGoogleUser) {
      options = { useGoogle: true };
    } else if (isPasswordUser) {
      options = { password: password.trim() };
    }

    const success = await deleteAccount(options);
    if (success) {
      onOpenChange(false);
    }
  };

  const phaseLabel = progress?.phase
    ? t(`settings.dangerZone.phases.${progress.phase}`, {
        defaultValue: DEFAULT_PHASE_LABELS[progress.phase] ?? progress.phase,
      })
    : '';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
      isDesktop={isDesktop}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            {t('settings.dangerZone.dialog.title', {
              defaultValue: 'Delete account and all data',
            })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t('settings.dangerZone.dialog.warning', {
              defaultValue:
                'This action is permanent and completely irreversible.',
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <Alert variant="destructive">
            <AlertTitle>
              {t('settings.dangerZone.title', { defaultValue: 'Danger Zone' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {t('settings.dangerZone.dialog.warning', {
                defaultValue:
                  'This action is permanent and completely irreversible. All your transactions, accounts, categories, and budgets will be permanently deleted.',
              })}
            </AlertDescription>
          </Alert>

          {error && (
            <div
              role="alert"
              className="text-destructive bg-destructive/10 rounded-md p-3 text-xs font-medium"
            >
              {error}
            </div>
          )}

          {/* Confirmation phrase */}
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation-phrase" className="text-xs">
              {t('settings.dangerZone.dialog.confirmationPrompt', {
                defaultValue: 'To confirm deletion, please type DELETE below:',
              })}
            </Label>
            <Input
              id="delete-confirmation-phrase"
              data-testid="delete-confirmation-input"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={expectedPhrase}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          {/* Password re-authentication for password users */}
          {isPasswordUser && (
            <div className="space-y-2">
              <Label htmlFor="delete-account-password" className="text-xs">
                {t('settings.dangerZone.dialog.passwordLabel', {
                  defaultValue: 'Enter your password to confirm:',
                })}
              </Label>
              <PasswordInput
                id="delete-account-password"
                data-testid="delete-account-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t(
                  'settings.dangerZone.dialog.passwordPlaceholder',
                  {
                    defaultValue: 'Current account password',
                  },
                )}
                disabled={isDeleting}
                autoComplete="current-password"
              />
            </div>
          )}

          {/* Google users prompt */}
          {isGoogleUser && (
            <p className="text-muted-foreground text-xs">
              {t('settings.dangerZone.dialog.googlePrompt', {
                defaultValue:
                  'Confirm deletion by signing in with your Google account:',
              })}
            </p>
          )}

          {/* Progress state */}
          {isDeleting && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-md p-3 text-xs">
              <Loader2 className="text-destructive size-4 shrink-0 animate-spin" />
              <span>
                {t('settings.dangerZone.dialog.deleting', {
                  phase: phaseLabel,
                  defaultValue: `Deleting data: ${phaseLabel}...`,
                })}
              </span>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {t('settings.dangerZone.dialog.cancelButton', {
              defaultValue: 'Cancel',
            })}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              void handleDelete();
            }}
            disabled={!isFormValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('settings.dangerZone.dialog.deleting', {
                  phase: phaseLabel,
                  defaultValue: `Deleting data: ${phaseLabel}...`,
                })}
              </>
            ) : (
              t('settings.dangerZone.dialog.confirmButton', {
                defaultValue: 'Permanently Delete Everything',
              })
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
