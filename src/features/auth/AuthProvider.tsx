import * as React from 'react';
import { logger } from '@/lib/logger';
import { AuthContext } from './AuthContext';
import { reloadCurrentUser, subscribeToAuthState } from './authService';
import type { AuthContextValue, AuthState, AuthUser } from './types';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = React.useState<AuthState>({ status: 'loading' });

  React.useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (user: AuthUser | null) => {
        if (user) {
          setState({ status: 'authenticated', user });
        } else {
          setState({ status: 'unauthenticated' });
        }
      },
      (error) => {
        logger.error('Auth state subscription error', error);
        setState({ status: 'unauthenticated' });
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshUser = React.useCallback(async () => {
    try {
      const freshUser = await reloadCurrentUser();
      if (freshUser) {
        setState({ status: 'authenticated', user: freshUser });
      } else {
        setState({ status: 'unauthenticated' });
      }
    } catch (error) {
      logger.error('Failed to reload current user', error);
      throw error;
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshUser,
    }),
    [state, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
