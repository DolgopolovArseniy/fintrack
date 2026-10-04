import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { buildLoginPath } from '../returnTo';
import { useAuth } from '../useAuth';

/**
 * Route guard that requires the user to be authenticated and onboarded.
 * Shows loading screen during auth/profile check,
 * redirects unauthenticated users to login with returnTo,
 * handles onboarding route access,
 * and renders child routes for authenticated ready users.
 */
export function RequireAuth() {
  const { status, profileStatus } = useAuth();
  const location = useLocation();

  if (
    status === 'loading' ||
    (status === 'authenticated' && profileStatus === 'loading')
  ) {
    return <AuthLoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={buildLoginPath(location)} replace />;
  }

  const isOnboardingRoute = location.pathname === ROUTES.onboarding;

  if (profileStatus === 'needsOnboarding') {
    if (isOnboardingRoute) {
      return <Outlet />;
    }
    return <Navigate to={ROUTES.onboarding} replace />;
  }

  // profileStatus === 'ready'
  if (isOnboardingRoute) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
