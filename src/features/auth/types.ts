import type { CurrencyCode } from '@/lib/currencies';
import type { Locale } from '@/lib/locales';
import type { Theme, UserProfile } from './schemas';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerIds: readonly string[];
}

export type ProfileStatus = 'loading' | 'needsOnboarding' | 'ready';

export interface OnboardingInput {
  baseCurrency: CurrencyCode;
  locale: Locale;
  theme: Theme;
  displayName?: string;
}

export type AuthState =
  | {
      status: 'loading';
      user: null;
      profileStatus: 'loading';
      profile: null;
    }
  | {
      status: 'unauthenticated';
      user: null;
      profileStatus: 'ready';
      profile: null;
    }
  | {
      status: 'authenticated';
      user: AuthUser;
      profileStatus: ProfileStatus;
      profile: UserProfile | null;
    };

export type AuthContextValue = AuthState & {
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};
