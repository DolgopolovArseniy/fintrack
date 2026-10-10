import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportCard, ImportPlaceholderCard } from '@/features/import-export';
import { useTranslation } from '@/lib/i18n';

export function ImportExportPage() {
  const { t } = useTranslation();

  return (
    <div data-testid="import-export-page" className="space-y-6">
      <PageHeader
        title={t('importExport.title')}
        description={t('importExport.description')}
      />

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList data-testid="import-export-tabs-list">
          <TabsTrigger value="export" data-testid="tab-export">
            {t('importExport.tabs.export')}
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">
            {t('importExport.tabs.import')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="outline-none">
          <ExportCard />
        </TabsContent>

        <TabsContent value="import" className="outline-none">
          <ImportPlaceholderCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
