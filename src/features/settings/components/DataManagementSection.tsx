import { Link } from 'react-router';
import { Download, FileSpreadsheet, Loader2, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ROUTES } from '@/app/routes';
import { useFullDataExport } from '../hooks/useFullDataExport';

export interface DataManagementSectionProps {
  onExport?: () => Promise<unknown>;
  isExportingOverride?: boolean;
  isOnlineOverride?: boolean;
}

export function DataManagementSection({
  onExport,
  isExportingOverride,
  isOnlineOverride,
}: DataManagementSectionProps) {
  const { t } = useTranslation();
  const { isOnline: hookIsOnline } = useOnlineStatus();
  const { exportData: hookExportData, isExporting: hookIsExporting } =
    useFullDataExport();

  const isOnline = isOnlineOverride ?? hookIsOnline;
  const isExporting = isExportingOverride ?? hookIsExporting;

  const handleExport = async () => {
    if (!isOnline || isExporting) return;
    if (onExport) {
      await onExport();
    } else {
      await hookExportData();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('settings.data.title', { defaultValue: 'Data Management' })}
        </CardTitle>
        <CardDescription>
          {t('settings.data.description', {
            defaultValue: 'Export your financial history or transfer data',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-border/60 bg-muted/20 dark:bg-muted/10 space-y-3 rounded-lg border p-4">
          <div className="space-y-1">
            <h4 className="text-foreground text-sm font-medium">
              {t('settings.data.exportJsonTitle', {
                defaultValue: 'Full Data Export (JSON)',
              })}
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t('settings.data.exportJsonDescription', {
                defaultValue:
                  'Download a comprehensive backup of your profile, accounts, categories, budgets, and all transactions in JSON format.',
              })}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleExport();
              }}
              disabled={isExporting || !isOnline}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('settings.data.exporting', {
                    defaultValue: 'Generating export...',
                  })}
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  {t('settings.data.exportJsonButton', {
                    defaultValue: 'Export All Data (JSON)',
                  })}
                </>
              )}
            </Button>

            {!isOnline && (
              <span className="text-warning text-xs">
                {t('settings.errors.offlineNotice', {
                  defaultValue:
                    'This action requires an active internet connection.',
                })}
              </span>
            )}
          </div>
        </div>

        <div className="border-border/60 bg-muted/20 dark:bg-muted/10 flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet
              className="text-muted-foreground size-5 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              <p className="text-foreground text-sm font-medium">
                {t('settings.data.csvLink', {
                  defaultValue:
                    'Looking for CSV format? Visit Import & Export transactions page',
                })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to={ROUTES.importExport}
              className="inline-flex items-center gap-1 text-xs"
            >
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
