import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslation } from '@/lib/i18n';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="bg-warning/15 text-warning-foreground border-warning/30 flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs font-medium"
    >
      <WifiOff className="text-warning size-4 shrink-0" aria-hidden="true" />
      <span>{t('layout.offlineBanner')}</span>
    </aside>
  );
}
