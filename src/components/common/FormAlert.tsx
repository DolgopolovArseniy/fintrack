import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/cn';

export interface FormAlertProps extends Omit<
  React.ComponentProps<'div'>,
  'title'
> {
  message?: React.ReactNode;
  title?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function FormAlert({
  message,
  title,
  variant = 'destructive',
  className,
  children,
  ...props
}: FormAlertProps) {
  if (!message && !children && !title) {
    return null;
  }

  return (
    <Alert variant={variant} className={cn('text-sm', className)} {...props}>
      <AlertCircle className="size-4" aria-hidden="true" />
      {title && <AlertTitle>{title}</AlertTitle>}
      {(message || children) && (
        <AlertDescription>{message ?? children}</AlertDescription>
      )}
    </Alert>
  );
}
