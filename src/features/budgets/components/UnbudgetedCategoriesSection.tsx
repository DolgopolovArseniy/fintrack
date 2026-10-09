import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';

export interface UnbudgetedCategoriesSectionProps {
  categories: Category[];
  onSetLimit: (category: Category) => void;
  className?: string;
}

export function UnbudgetedCategoriesSection({
  categories,
  onSetLimit,
  className,
}: UnbudgetedCategoriesSectionProps) {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="unbudgeted-categories-section"
      className={cn(
        'border-border/80 bg-card/50 space-y-3 rounded-xl border border-dashed p-5',
        className,
      )}
    >
      <div>
        <h3 className="text-foreground text-sm font-semibold tracking-tight">
          {t('budgets.unbudgeted.title')}
        </h3>
        <p className="text-muted-foreground text-xs">
          {t('budgets.unbudgeted.description')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {categories.map((category) => (
          <div
            key={category.id}
            data-testid={`unbudgeted-category-${category.id}`}
            className="border-border/60 bg-card flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-2xs"
          >
            <CategoryBadge
              name={category.name}
              systemKey={category.systemKey}
              icon={category.icon}
              color={category.color}
              archived={category.archived}
              size="sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onSetLimit(category)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>{t('budgets.unbudgeted.setLimit')}</span>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
