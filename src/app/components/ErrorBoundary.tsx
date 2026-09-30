import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const { t } = useTranslation();

  const handleReload = () => {
    onReset();
    window.location.reload();
  };

  return (
    <div className="border-destructive/30 bg-card flex min-h-[360px] w-full flex-col items-center justify-center rounded-xl border p-6 text-center shadow-xs">
      <div className="bg-destructive/15 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-foreground mt-4 text-lg font-semibold tracking-tight">
        {t('errors.title')}
      </h2>
      <p className="text-muted-foreground mt-1.5 max-w-md text-sm">
        {t('errors.unknown')}
      </p>
      {error?.message ? (
        <pre className="bg-muted/60 text-muted-foreground mt-3 max-w-lg overflow-x-auto rounded-md p-3 text-left font-mono text-xs">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          className="gap-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          <span>{t('common.actions.reload')}</span>
        </Button>
      </div>
    </div>
  );
}

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: (error: Error | null, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}
