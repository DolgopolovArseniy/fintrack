import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthContextValue } from './types';

/**
 * Hook to access current authentication state and actions.
 * Throws an error if used outside of an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
