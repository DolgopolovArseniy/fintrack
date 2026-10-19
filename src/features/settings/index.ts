export { SettingsPage } from './components/SettingsPage';
export { ProfileSection } from './components/ProfileSection';
export { PreferencesSection } from './components/PreferencesSection';
export { DataManagementSection } from './components/DataManagementSection';
export { DangerZoneSection } from './components/DangerZoneSection';
export { CurrencyChangeDialog } from './components/CurrencyChangeDialog';
export { DeleteAccountDialog } from './components/DeleteAccountDialog';

export { useProfileSettings } from './hooks/useProfileSettings';
export { useFullDataExport } from './hooks/useFullDataExport';
export { useAccountDeletion } from './hooks/useAccountDeletion';

export {
  updateUserProfile,
  fetchAllUserData,
  deleteAllUserFirestoreData,
} from './repository';
export type { FullUserDataDump, DeletionProgress } from './repository';
