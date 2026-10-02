import { Navigate, Outlet, useSearchParams } from 'react-router';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { resolveReturnTo, RETURN_TO_PARAM } from '../returnTo';
import { useAuth } from '../useAuth';

/**
 * Route guard that restricts routes to unauthenticated visitors only (e.g. login, register).
 * Authenticated users are redirected to returnTo param or dashboard.
 */
export function PublicOnly() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    const returnTo = searchParams.get(RETURN_TO_PARAM);
    return <Navigate to={resolveReturnTo(returnTo)} replace />;
  }

  return <Outlet />;
}
