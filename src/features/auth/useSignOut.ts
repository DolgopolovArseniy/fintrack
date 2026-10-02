import * as React from 'react';
import { ROUTES } from '@/app/routes';
import { clearLocalFirestoreData } from '@/lib/firestore/session';
import { signOutUser } from './authService';

export interface UseSignOutReturn {
  signOut: () => Promise<void>;
  isSigningOut: boolean;
}

/**
 * Hook to sign out the current user, clear local Firestore cache,
 * and perform a full-page reload redirect to the login page (ADR-0015).
 */
export function useSignOut(): UseSignOutReturn {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const signOut = React.useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
      try {
        await clearLocalFirestoreData();
      } catch {
        // Ignored: clearLocalFirestoreData is best-effort as per AC10
      }
      window.location.assign(ROUTES.login);
    } catch (error) {
      setIsSigningOut(false);
      throw error;
    }
  }, []);

  return { signOut, isSigningOut };
}
