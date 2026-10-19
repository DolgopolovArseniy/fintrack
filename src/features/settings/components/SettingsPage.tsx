import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';
import { ProfileSection } from './ProfileSection';
import { PreferencesSection } from './PreferencesSection';
import { DataManagementSection } from './DataManagementSection';
import { DangerZoneSection } from './DangerZoneSection';

export function SettingsPage() {
  const { t } = useTranslation();
  const { status, user, profile, profileStatus, refreshProfile } = useAuth();

  if (status === 'loading' || profileStatus === 'loading') {
    return (
      <div data-testid="settings-page" className="space-y-6">
        <PageHeader
          title={t('settings.title', { defaultValue: 'Settings' })}
          description={t('settings.description', {
            defaultValue:
              'Manage your profile, application preferences, data export and account',
          })}
        />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return null;
  }

  if (profileStatus === 'ready' && !profile && !user.isAnonymous) {
    return (
      <div data-testid="settings-page" className="space-y-6">
        <PageHeader
          title={t('settings.title', { defaultValue: 'Settings' })}
          description={t('settings.description', {
            defaultValue:
              'Manage your profile, application preferences, data export and account',
          })}
        />
        <ErrorState
          onRetry={() => {
            void refreshProfile();
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="settings-page" className="space-y-6">
      <PageHeader
        title={t('settings.title', { defaultValue: 'Settings' })}
        description={t('settings.description', {
          defaultValue:
            'Manage your profile, application preferences, data export and account',
        })}
      />

      <div className="space-y-6">
        <ProfileSection />
        <PreferencesSection />
        <DataManagementSection />
        <DangerZoneSection />
      </div>
    </div>
  );
}
