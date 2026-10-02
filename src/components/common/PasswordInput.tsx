import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';

export interface PasswordInputProps extends Omit<
  React.ComponentProps<'input'>,
  'type'
> {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export function PasswordInput({
  className,
  showPasswordLabel,
  hidePasswordLabel,
  disabled,
  ref,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const { t } = useTranslation();

  const showLabel = showPasswordLabel ?? t('auth.fields.showPassword');
  const hideLabel = hidePasswordLabel ?? t('auth.fields.hidePassword');

  return (
    <div className="relative flex items-center">
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? hideLabel : showLabel}
        aria-pressed={showPassword}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background absolute right-0 flex h-full items-center justify-center rounded-r-md px-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        {showPassword ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
