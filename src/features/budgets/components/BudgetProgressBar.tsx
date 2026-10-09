import { cn } from '@/lib/cn';
import type { BudgetStatus } from '../schemas';

export interface BudgetProgressBarProps {
  progress: number;
  status?: BudgetStatus;
  className?: string;
  ariaLabel?: string;
  ariaValueText?: string;
}

const STATUS_COLOR_CLASSES: Record<BudgetStatus, string> = {
  normal: 'bg-primary',
  warning: 'bg-amber-500',
  exceeded: 'bg-destructive',
};

/**
 * Accessible progress bar for budget exhaustion with dynamic color transitions
 * (normal: primary/green, warning: amber, exceeded: destructive/red).
 */
export function BudgetProgressBar({
  progress,
  status = 'normal',
  className,
  ariaLabel,
  ariaValueText,
}: BudgetProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const trackColorClass =
    STATUS_COLOR_CLASSES[status] ?? STATUS_COLOR_CLASSES.normal;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText ?? `${progress}%`}
      data-status={status}
      data-progress={progress}
      className={cn(
        'bg-muted relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          trackColorClass,
        )}
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}
