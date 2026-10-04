import { Navigate, Outlet, useSearchParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { resolveReturnTo, RETURN_TO_PARAM } from '../returnTo';
import { useAuth } from '../useAuth';

/**
 * Route guard that restricts routes to unauthenticated visitors only (e.g. login, register).
 * Authenticated users are redirected to onboarding if profile is missing,
 * or to returnTo param / dashboard if ready.
 */
export function PublicOnly() {
  const { status, profileStatus } = useAuth();
  const [searchParams] = useSearchParams();

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
    const returnTo = searchParams.get(RETURN_TO_PARAM);
    return <Navigate to={resolveReturnTo(returnTo)} replace />;
  }

  return <Outlet />;
}
