import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import {
  useAuth,
  reauthenticateWithPassword,
  reauthenticateWithGoogle,
  deleteCurrentUserAccount,
} from '@/features/auth';
import { clearLocalFirestoreData } from '@/lib/firestore/session';
import { ROUTES } from '@/app/routes';
import { AppError } from '@/lib/errors';
import {
  deleteAllUserFirestoreData,
  type DeletionProgress,
} from '../repository';

export interface DeleteAccountOptions {
  password?: string;
  useGoogle?: boolean;
}

export interface UseAccountDeletionReturn {
  deleteAccount: (options?: DeleteAccountOptions) => Promise<boolean>;
  isDeleting: boolean;
  progress: DeletionProgress | null;
  error: string | null;
  resetState: () => void;
}

/**
 * Hook managing the permanent account erasure lifecycle:
 * 1. Re-authentication (password or Google popup; skipped for anonymous demo users)
 * 2. Chunked batch deletion of all Firestore data across 4 subcollections and user profile
 * 3. Deletion of Firebase Auth user record
 * 4. Local cache cleanup and redirection to /login
 */
export function useAccountDeletion(): UseAccountDeletionReturn {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<DeletionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setIsDeleting(false);
    setProgress(null);
    setError(null);
  }, []);

  const deleteAccount = useCallback(
    async (options?: DeleteAccountOptions): Promise<boolean> => {
      if (!user) {
        throw new AppError(
          'unauthenticated',
          'Cannot delete account without authenticated user',
        );
      }

      setIsDeleting(true);
      setError(null);

      try {
        // Step 1: Re-authentication (if not anonymous demo user)
        setProgress({ phase: 'reauth', deletedItems: 0, totalItems: 1 });

        if (!user.isAnonymous) {
          if (options?.password) {
            await reauthenticateWithPassword(options.password);
          } else {
            await reauthenticateWithGoogle();
          }
        }

        setProgress({ phase: 'reauth', deletedItems: 1, totalItems: 1 });

        // Step 2: Delete all user Firestore collections and profile
        await deleteAllUserFirestoreData(user.uid, (p) => {
          setProgress(p);
        });

        // Step 3: Delete Auth record
        setProgress({ phase: 'auth', deletedItems: 0, totalItems: 1 });
        await deleteCurrentUserAccount();
        setProgress({ phase: 'auth', deletedItems: 1, totalItems: 1 });

        // Step 4: Finalize & redirect
        setProgress({ phase: 'done', deletedItems: 1, totalItems: 1 });

        try {
          await clearLocalFirestoreData();
        } catch {
          // Best-effort cleanup of offline IndexedDB cache
        }

        toast.success(
          t('settings.dangerZone.successToast', {
            defaultValue:
              'Your account and data have been successfully deleted',
          }),
        );

        void navigate(ROUTES.login, { replace: true });
        return true;
      } catch (err) {
        let message: string = t('settings.dangerZone.deletionFailed', {
          defaultValue:
            'Failed to complete account deletion. Please try again.',
        });

        if (err instanceof AppError) {
          if (
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/invalid-credential'
          ) {
            message = t('settings.dangerZone.wrongPassword', {
              defaultValue: 'The password you entered is incorrect',
            });
          } else if (err.code === 'auth/popup-closed-by-user') {
            message = t('settings.dangerZone.popupClosed', {
              defaultValue:
                'Authentication was cancelled. Account was not deleted.',
            });
          }
        }

        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [user, navigate, t],
  );

  return {
    deleteAccount,
    isDeleting,
    progress,
    error,
    resetState,
  };
}
