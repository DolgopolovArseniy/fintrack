import * as React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import {
  CATEGORY_ICONS,
  getCategoryIconComponent,
  type IconCategoryKey,
} from '../icons';

export interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
  className?: string;
}

const CATEGORY_TABS: readonly {
  key: 'all' | IconCategoryKey;
  labelKey: string;
}[] = [
  { key: 'all', labelKey: 'categories.form.iconCategories.all' },
  { key: 'general', labelKey: 'categories.form.iconCategories.general' },
  { key: 'food', labelKey: 'categories.form.iconCategories.food' },
  { key: 'transport', labelKey: 'categories.form.iconCategories.transport' },
  { key: 'home', labelKey: 'categories.form.iconCategories.home' },
  { key: 'leisure', labelKey: 'categories.form.iconCategories.leisure' },
  { key: 'finance', labelKey: 'categories.form.iconCategories.finance' },
];

export function IconPicker({
  value,
  onChange,
  disabled = false,
  className,
}: IconPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<
    'all' | IconCategoryKey
  >('all');

  const filteredIcons = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return CATEGORY_ICONS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectIcon = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={t('categories.form.selectIcon')}
        className="flex h-10 w-full items-center justify-start gap-2.5 px-3 font-normal"
      >
        {React.createElement(getCategoryIconComponent(value), {
          'aria-hidden': 'true',
          className: 'size-5 shrink-0 text-primary',
        })}
        <span className="truncate text-sm">
          {value || t('categories.form.selectIcon')}
        </span>
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="max-w-md sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t('categories.form.selectIcon')}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {/* Search bar */}
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('categories.form.searchIcon')}
              className="pl-9"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors select-none',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {t(tab.labelKey as 'categories.form.iconCategories.all')}
                </button>
              );
            })}
          </div>

          {/* Icon grid */}
          <div className="max-h-[300px] overflow-y-auto pt-2">
            {filteredIcons.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                {t('categories.form.noIconsFound')}
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label={t('categories.form.icon')}
                className="grid grid-cols-6 gap-2 sm:grid-cols-7"
              >
                {filteredIcons.map((item) => {
                  const isSelected = item.name === value;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={item.label}
                      onClick={() => handleSelectIcon(item.name)}
                      className={cn(
                        'flex size-11 items-center justify-center rounded-lg border transition-all outline-none',
                        'hover:bg-muted hover:border-primary/40 active:scale-95',
                        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-1',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border/60 text-foreground/80',
                      )}
                    >
                      {React.createElement(item.icon, {
                        'aria-hidden': 'true',
                        className: 'size-5 shrink-0',
                      })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
