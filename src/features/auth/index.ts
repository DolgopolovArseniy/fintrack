export { AuthProvider } from './AuthProvider';
export { useAuth } from './useAuth';
export { RequireAuth } from './guards/RequireAuth';
export { PublicOnly } from './guards/PublicOnly';
export { RootRedirect } from './guards/RootRedirect';
export { AuthLoadingScreen } from './components/AuthLoadingScreen';

export {
  localeSchema,
  themeSchema,
  schemaVersionSchema,
  userProfileInputSchema,
  userProfileSchema,
} from './schemas';

export type { Locale, Theme, UserProfileInput, UserProfile } from './schemas';
export type { AuthUser, AuthState, AuthContextValue } from './types';
