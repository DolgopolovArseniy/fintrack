import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/features/auth';
import { AppError } from '@/lib/errors';
import { fetchAllUserData } from '../repository';
import {
  generateFullDataJson,
  getJsonExportFilename,
  downloadJsonBlob,
  type FullUserDataDump,
} from '../utils/exportJson';

export interface UseFullDataExportReturn {
  exportData: () => Promise<FullUserDataDump | undefined>;
  isExporting: boolean;
}

/**
 * Hook to manage full user data JSON backup generation and browser download.
 */
export function useFullDataExport(): UseFullDataExportReturn {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(async (): Promise<
    FullUserDataDump | undefined
  > => {
    if (!user) {
      throw new AppError(
        'unauthenticated',
        'Cannot export data without authenticated user',
      );
    }

    setIsExporting(true);
    try {
      const dump = await fetchAllUserData(user.uid);
      const json = generateFullDataJson(dump);
      const filename = getJsonExportFilename();
      downloadJsonBlob(json, filename);

      toast.success(
        t('settings.data.exportSuccessToast', {
          defaultValue: 'Data export downloaded successfully',
        }),
      );
      return dump;
    } catch (err) {
      toast.error(
        t('settings.data.exportFailed', {
          defaultValue: 'Failed to export data. Please try again.',
        }),
      );
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [user, t]);

  return {
    exportData,
    isExporting,
  };
}
