import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from 'lucide-react';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { Category } from '../schemas';

export interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
  onUnarchive: (category: Category) => void;
  className?: string;
}

export function CategoryItem({
  category,
  onEdit,
  onArchive,
  onUnarchive,
  className,
}: CategoryItemProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid={`category-item-${category.id}`}
      className={cn(
        'border-border/60 bg-card hover:bg-accent/40 flex items-center justify-between rounded-lg border p-3 transition-colors',
        category.archived && 'opacity-75',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <CategoryBadge
          name={category.name}
          systemKey={category.systemKey}
          icon={category.icon}
          color={category.color}
          archived={category.archived}
          size="md"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8 shrink-0"
            aria-label={t('common.actions.edit')}
            data-testid={`category-actions-${category.id}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => onEdit(category)}
            data-testid={`category-edit-${category.id}`}
          >
            <Pencil className="mr-2 size-4" />
            {t('categories.actions.edit')}
          </DropdownMenuItem>

          {category.archived ? (
            <DropdownMenuItem
              onClick={() => onUnarchive(category)}
              data-testid={`category-unarchive-${category.id}`}
            >
              <ArchiveRestore className="mr-2 size-4" />
              {t('categories.actions.unarchive')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onArchive(category)}
              className="text-destructive focus:text-destructive"
              data-testid={`category-archive-${category.id}`}
            >
              <Archive className="mr-2 size-4" />
              {t('categories.actions.archive')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
