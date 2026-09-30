import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { AppError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n';

export interface ErrorStateProps {
  error?: unknown;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  error,
  title,
  description,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();

  const appError = error instanceof AppError ? error : null;

  const errorMessage = error instanceof Error ? error.message : undefined;

  const resolvedTitle = title ?? t('errors.title');

  let defaultDescription = t('errors.unknown');
  if (appError?.code) {
    switch (appError.code) {
      case 'permission-denied':
        defaultDescription = t('errors.permission-denied');
        break;
      case 'not-found':
        defaultDescription = t('errors.not-found');
        break;
      case 'offline':
        defaultDescription = t('errors.offline');
        break;
      case 'validation':
        defaultDescription = t('errors.validation');
        break;
      case 'unauthenticated':
        defaultDescription = t('errors.unauthenticated');
        break;
      default:
        defaultDescription = t('errors.unknown');
        break;
    }
  }

  const resolvedDescription = description ?? defaultDescription;

  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-card/60 flex min-h-[320px] w-full flex-col items-center justify-center rounded-xl border p-6 text-center shadow-xs',
        className,
      )}
    >
      <div className="bg-destructive/15 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-foreground mt-4 text-base font-semibold tracking-tight">
        {resolvedTitle}
      </h3>
      <p className="text-muted-foreground mt-1.5 max-w-md text-sm">
        {resolvedDescription}
      </p>

      {import.meta.env.DEV && errorMessage ? (
        <pre className="bg-muted/60 text-muted-foreground mt-3 max-w-lg overflow-x-auto rounded-md p-3 text-left font-mono text-xs">
          {errorMessage}
        </pre>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        {action ??
          (onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>{t('common.actions.retry')}</span>
            </Button>
          ) : null)}
      </div>
    </div>
  );
}
