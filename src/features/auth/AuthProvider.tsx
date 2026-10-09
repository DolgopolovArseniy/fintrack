import * as React from 'react';
import { logger } from '@/lib/logger';
import { AuthContext } from './AuthContext';
import { reloadCurrentUser, subscribeToAuthState } from './authService';
import { getUserProfile, subscribeUserProfile } from './repository';
import type { AuthContextValue, AuthState, AuthUser } from './types';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = React.useState<AuthState>({
    status: 'loading',
    user: null,
    profileStatus: 'loading',
    profile: null,
  });

  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthState(
      (user: AuthUser | null) => {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (user) {
          setState({
            status: 'authenticated',
            user,
            profileStatus: 'loading',
            profile: null,
          });

          unsubscribeProfile = subscribeUserProfile(
            user.uid,
            (profile) => {
              setState((prev) => ({
                status: 'authenticated',
                user: prev.status === 'authenticated' ? prev.user : user,
                profileStatus: profile ? 'ready' : 'needsOnboarding',
                profile,
              }));
            },
            (error) => {
              logger.error('User profile subscription error', error);
              setState((prev) => ({
                status: 'authenticated',
                user: prev.status === 'authenticated' ? prev.user : user,
                profileStatus: 'needsOnboarding',
                profile: null,
              }));
            },
          );
        } else {
          setState({
            status: 'unauthenticated',
            user: null,
            profileStatus: 'ready',
            profile: null,
          });
        }
      },
      (error) => {
        logger.error('Auth state subscription error', error);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setState({
          status: 'unauthenticated',
          user: null,
          profileStatus: 'ready',
          profile: null,
        });
      },
    );

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeAuth();
    };
  }, []);

  const refreshUser = React.useCallback(async () => {
    try {
      const freshUser = await reloadCurrentUser();
      if (freshUser) {
        setState((prev) =>
          prev.status === 'authenticated'
            ? { ...prev, user: freshUser }
            : {
                status: 'authenticated',
                user: freshUser,
                profileStatus: 'loading',
                profile: null,
              },
        );
      } else {
        setState({
          status: 'unauthenticated',
          user: null,
          profileStatus: 'ready',
          profile: null,
        });
      }
    } catch (error) {
      logger.error('Failed to reload current user', error);
      throw error;
    }
  }, []);

  const uid = state.user?.uid;
  const refreshProfile = React.useCallback(async () => {
    if (!uid) {
      return;
    }
    try {
      const freshProfile = await getUserProfile(uid);
      setState((prev) =>
        prev.status === 'authenticated'
          ? {
              ...prev,
              profileStatus: freshProfile ? 'ready' : 'needsOnboarding',
              profile: freshProfile,
            }
          : prev,
      );
    } catch (error) {
      logger.error('Failed to reload profile', error);
      throw error;
    }
  }, [uid]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshUser,
      refreshProfile,
    }),
    [state, refreshUser, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
