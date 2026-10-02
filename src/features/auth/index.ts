export { AuthProvider } from './AuthProvider';
export { useAuth } from './useAuth';
export { useSignOut } from './useSignOut';
export { RequireAuth } from './guards/RequireAuth';
export { PublicOnly } from './guards/PublicOnly';
export { RootRedirect } from './guards/RootRedirect';
export { AuthLoadingScreen } from './components/AuthLoadingScreen';
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { UserMenu } from './components/UserMenu';
export { EmailVerificationBanner } from './components/EmailVerificationBanner';
export { getInitials } from './getInitials';

export {
  localeSchema,
  themeSchema,
  schemaVersionSchema,
  userProfileInputSchema,
  userProfileSchema,
} from './schemas';

export type { Locale, Theme, UserProfileInput, UserProfile } from './schemas';
export type { AuthUser, AuthState, AuthContextValue } from './types';
