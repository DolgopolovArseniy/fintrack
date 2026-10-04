import * as React from 'react';
import { cn } from '@/lib/cn';
import type { Category } from '../schemas';
import { CategoryItem } from './CategoryItem';

export interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
  onUnarchive: (category: Category) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function CategoryList({
  categories,
  onEdit,
  onArchive,
  onUnarchive,
  emptyState,
  className,
}: CategoryListProps) {
  if (categories.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div
      data-testid="category-list"
      className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
        />
      ))}
    </div>
  );
}
