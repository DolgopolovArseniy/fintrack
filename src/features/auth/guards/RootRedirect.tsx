import { Navigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { useAuth } from '../useAuth';

/**
 * Handles the root (/) path redirection:
 * - Shows loading screen while auth/profile is resolving
 * - Redirects authenticated users needing onboarding to onboarding
 * - Redirects authenticated ready users to dashboard
 * - Redirects guests to login
 */
export function RootRedirect() {
  const { status, profileStatus } = useAuth();

  if (
    status === 'loading' ||
    (status === 'authenticated' && profileStatus === 'loading')
  ) {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    if (profileStatus === 'needsOnboarding') {
      return <Navigate to={ROUTES.onboarding} replace />;
    }
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Navigate to={ROUTES.login} replace />;
}
