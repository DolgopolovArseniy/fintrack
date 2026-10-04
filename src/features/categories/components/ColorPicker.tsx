import * as React from 'react';
import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { CATEGORY_COLOR_KEYS, type CategoryColorKey } from '../constants';

const COLOR_CLASSES: Record<CategoryColorKey, string> = {
  slate: 'bg-cat-slate text-white dark:text-black',
  red: 'bg-cat-red text-white dark:text-black',
  orange: 'bg-cat-orange text-white dark:text-black',
  amber: 'bg-cat-amber text-black dark:text-black',
  lime: 'bg-cat-lime text-black dark:text-black',
  emerald: 'bg-cat-emerald text-white dark:text-black',
  teal: 'bg-cat-teal text-white dark:text-black',
  sky: 'bg-cat-sky text-black dark:text-black',
  indigo: 'bg-cat-indigo text-white dark:text-black',
  violet: 'bg-cat-violet text-white dark:text-black',
  pink: 'bg-cat-pink text-white dark:text-black',
  stone: 'bg-cat-stone text-white dark:text-black',
};

export interface ColorPickerProps {
  value: CategoryColorKey;
  onChange: (color: CategoryColorKey) => void;
  disabled?: boolean;
  className?: string;
}

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const buttonsRef = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (disabled) {
      return;
    }

    let nextIndex: number | null = null;
    const total = CATEGORY_COLOR_KEYS.length;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % total;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + total) % total;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = total - 1;
    }

    if (nextIndex !== null) {
      const nextColor = CATEGORY_COLOR_KEYS[nextIndex];
      if (nextColor) {
        onChange(nextColor);
        buttonsRef.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="radiogroup"
        aria-label={t('categories.form.color')}
        className={cn(
          'grid grid-cols-6 gap-2 sm:grid-cols-6 md:grid-cols-12',
          className,
        )}
      >
        {CATEGORY_COLOR_KEYS.map((colorKey, index) => {
          const isSelected = value === colorKey;
          const label = t(`categories.colors.${colorKey}` as const, {
            defaultValue: colorKey,
          });

          return (
            <Tooltip key={colorKey}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  ref={(el) => {
                    buttonsRef.current[index] = el;
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={label}
                  disabled={disabled}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onChange(colorKey)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={cn(
                    'group relative flex size-9 items-center justify-center rounded-full transition-transform outline-none',
                    'hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
                    'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
                    COLOR_CLASSES[colorKey],
                    isSelected &&
                      'ring-primary ring-offset-background scale-105 shadow-sm ring-2 ring-offset-2',
                  )}
                >
                  {isSelected && (
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 stroke-[3]"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>{label}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
