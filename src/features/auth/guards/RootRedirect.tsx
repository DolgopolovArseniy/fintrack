import { Navigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { useAuth } from '../useAuth';

/**
 * Handles the root (/) path redirection:
 * - Shows loading screen while auth is resolving
 * - Redirects authenticated users to dashboard
 * - Redirects guests to login
 */
export function RootRedirect() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Navigate to={ROUTES.login} replace />;
}
