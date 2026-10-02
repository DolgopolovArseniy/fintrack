import { Navigate, Outlet, useLocation } from 'react-router';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { buildLoginPath } from '../returnTo';
import { useAuth } from '../useAuth';

/**
 * Route guard that requires the user to be authenticated.
 * Shows loading screen during auth check, redirects unauthenticated users to login with returnTo,
 * and renders child routes for authenticated users.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={buildLoginPath(location)} replace />;
  }

  return <Outlet />;
}
