import * as React from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import { getAuthErrorKey } from '../authErrors';
import { reloadCurrentUser, sendVerificationEmail } from '../authService';
import { useAuth } from '../useAuth';

export interface EmailVerificationBannerProps {
  className?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Non-blocking email verification banner shown under OfflineBanner.
 * Appears only when user is authenticated, emailVerified is false,
 * and the user has a password provider (F02 AC11).
 */
export function EmailVerificationBanner({
  className,
}: EmailVerificationBannerProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [cooldown, setCooldown] = React.useState(0);
  const [isSending, setIsSending] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [cooldown]);

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, refreshUser } = auth;
  const isPasswordUser = user.providerIds.includes('password');

  if (user.emailVerified || !isPasswordUser) {
    return null;
  }

  const handleResend = async () => {
    setIsSending(true);
    try {
      await sendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(t('auth.verify.sent'));
    } catch (error) {
      const errorKey = getAuthErrorKey(error);
      toast.error(errorKey ? t(errorKey) : t('errors.unknown'));
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      const freshUser = await reloadCurrentUser();
      if (freshUser && !freshUser.emailVerified) {
        toast.info(t('auth.verify.stillUnverified'));
      }
    } catch (error) {
      const errorKey = getAuthErrorKey(error);
      toast.error(errorKey ? t(errorKey) : t('errors.unknown'));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <aside
      role="region"
      aria-label={t('auth.verify.title')}
      className={cn(
        'border-primary/20 bg-primary/5 text-foreground flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <Mail
          className="text-primary mt-0.5 size-4 shrink-0 sm:mt-0"
          aria-hidden="true"
        />
        <div className="text-xs">
          <span className="mr-1.5 font-semibold">{t('auth.verify.title')}</span>
          <span className="text-muted-foreground">
            {t('auth.verify.description')}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSending || cooldown > 0}
          onClick={() => {
            void handleResend();
          }}
          className="h-8 text-xs"
        >
          <Send className="mr-1.5 size-3" aria-hidden="true" />
          {cooldown > 0
            ? t('auth.verify.resendCooldown', { count: cooldown })
            : t('auth.verify.resend')}
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isRefreshing}
          onClick={() => {
            void handleRefresh();
          }}
          className="h-8 text-xs"
        >
          <RefreshCw
            className={cn('mr-1.5 size-3', isRefreshing && 'animate-spin')}
            aria-hidden="true"
          />
          {t('auth.verify.iVerified')}
        </Button>
      </div>
    </aside>
  );
}
