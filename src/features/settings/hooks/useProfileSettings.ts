import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAuth, type Theme } from '@/features/auth';
import { useTheme } from '@/app/providers/ThemeProvider';
import { changeAppLanguage } from '@/i18n/config';
import type { CurrencyCode } from '@/lib/currencies';
import type { Locale } from '@/lib/locales';
import { updateUserProfile } from '../repository';

export interface UseProfileSettingsReturn {
  profile: ReturnType<typeof useAuth>['profile'];
  isSaving: boolean;
  updateDisplayName: (displayName: string) => Promise<void>;
  updateCurrency: (baseCurrency: CurrencyCode) => Promise<void>;
  updateLocale: (locale: Locale) => Promise<void>;
  updateTheme: (theme: Theme) => Promise<void>;
}

/**
 * Hook to manage user profile and application preferences.
 * Synchronizes changes to Firestore users/{uid}, app language, theme, and toast feedback.
 */
export function useProfileSettings(): UseProfileSettingsReturn {
  const { user, profile, refreshProfile } = useAuth();
  const { setTheme } = useTheme();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await updateUserProfile(user.uid, { displayName });
        await refreshProfile();
        toast.success(
          t('settings.profile.successToast', {
            defaultValue: 'Profile updated successfully',
          }),
        );
      } catch (err) {
        toast.error(
          t('settings.errors.saveFailed', {
            defaultValue:
              'Failed to save settings. Please check your connection.',
          }),
        );
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user, refreshProfile, t],
  );

  const updateCurrency = useCallback(
    async (baseCurrency: CurrencyCode) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await updateUserProfile(user.uid, { baseCurrency });
        await refreshProfile();
        toast.success(
          t('settings.preferences.currencyUpdatedToast', {
            currency: baseCurrency,
            defaultValue: `Base currency updated to ${baseCurrency}`,
          }),
        );
      } catch (err) {
        toast.error(
          t('settings.errors.saveFailed', {
            defaultValue:
              'Failed to save settings. Please check your connection.',
          }),
        );
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user, refreshProfile, t],
  );

  const updateLocale = useCallback(
    async (locale: Locale) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await changeAppLanguage(locale);
        await updateUserProfile(user.uid, { locale });
        await refreshProfile();
        toast.success(
          t('settings.preferences.languageUpdatedToast', {
            defaultValue: 'Language changed',
          }),
        );
      } catch (err) {
        toast.error(
          t('settings.errors.saveFailed', {
            defaultValue:
              'Failed to save settings. Please check your connection.',
          }),
        );
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user, refreshProfile, t],
  );

  const updateTheme = useCallback(
    async (theme: Theme) => {
      if (!user) return;
      setIsSaving(true);
      try {
        setTheme(theme);
        await updateUserProfile(user.uid, { theme });
        await refreshProfile();
        toast.success(
          t('settings.preferences.themeUpdatedToast', {
            defaultValue: 'Theme updated',
          }),
        );
      } catch (err) {
        toast.error(
          t('settings.errors.saveFailed', {
            defaultValue:
              'Failed to save settings. Please check your connection.',
          }),
        );
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user, setTheme, refreshProfile, t],
  );

  return {
    profile,
    isSaving,
    updateDisplayName,
    updateCurrency,
    updateLocale,
    updateTheme,
  };
}
