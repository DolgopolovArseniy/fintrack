export { AuthProvider } from './AuthProvider';
export { useAuth } from './useAuth';
export { useSignOut } from './useSignOut';
export { RequireAuth } from './guards/RequireAuth';
export { PublicOnly } from './guards/PublicOnly';
export { RootRedirect } from './guards/RootRedirect';
export { AuthLoadingScreen } from './components/AuthLoadingScreen';
export { AuthFormCard } from './components/AuthFormCard';
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { OnboardingForm } from './components/OnboardingForm';
export { UserMenu } from './components/UserMenu';
export { EmailVerificationBanner } from './components/EmailVerificationBanner';
export { getInitials } from './getInitials';

export { executeOnboardingBatch, checkProfileExists } from './onboarding';
export type { OnboardingInput } from './onboarding';

export {
  localeSchema,
  themeSchema,
  schemaVersionSchema,
  userProfileInputSchema,
  userProfileSchema,
} from './schemas';

export type { Locale, Theme, UserProfileInput, UserProfile } from './schemas';
export type {
  AuthUser,
  AuthState,
  AuthContextValue,
  ProfileStatus,
} from './types';
