import * as React from 'react';
import {
  ArrowDownLeft,
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  CircleHelp,
  Coffee,
  Coins,
  CreditCard,
  DollarSign,
  Dumbbell,
  Film,
  Folder,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Music,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Sparkles,
  Tag,
  Train,
  TrendingUp,
  Tv,
  Utensils,
  Wifi,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * Curated map of category icons supported out-of-the-box.
 * Keys are normalized lowercase alphanumeric strings for resilient lookups.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  heartpulse: HeartPulse,
  film: Film,
  shoppingbag: ShoppingBag,
  circleellipsis: CircleEllipsis,
  wallet: Wallet,
  gift: Gift,
  arrowdownleft: ArrowDownLeft,
  coffee: Coffee,
  shoppingcart: ShoppingCart,
  plane: Plane,
  bus: Bus,
  train: Train,
  fuel: Fuel,
  book: Book,
  graduationcap: GraduationCap,
  dumbbell: Dumbbell,
  music: Music,
  tv: Tv,
  gamepad2: Gamepad2,
  phone: Phone,
  wifi: Wifi,
  wrench: Wrench,
  hammer: Hammer,
  scissors: Scissors,
  pawprint: PawPrint,
  baby: Baby,
  shirt: Shirt,
  smile: Smile,
  briefcase: Briefcase,
  dollarsign: DollarSign,
  trendingup: TrendingUp,
  piggybank: PiggyBank,
  creditcard: CreditCard,
  coins: Coins,
  receipt: Receipt,
  tag: Tag,
  folder: Folder,
  sparkles: Sparkles,
  circlehelp: CircleHelp,
  helpcircle: CircleHelp,
};

interface CategoryColorStyle {
  bg: string;
  text: string;
  border: string;
}

const DEFAULT_COLOR_STYLE: CategoryColorStyle = {
  bg: 'bg-cat-slate/15',
  text: 'text-cat-slate',
  border: 'border-cat-slate/30',
};

const COLOR_STYLES: Record<string, CategoryColorStyle> = {
  slate: DEFAULT_COLOR_STYLE,
  red: {
    bg: 'bg-cat-red/15',
    text: 'text-cat-red',
    border: 'border-cat-red/30',
  },
  orange: {
    bg: 'bg-cat-orange/15',
    text: 'text-cat-orange',
    border: 'border-cat-orange/30',
  },
  amber: {
    bg: 'bg-cat-amber/15',
    text: 'text-cat-amber',
    border: 'border-cat-amber/30',
  },
  lime: {
    bg: 'bg-cat-lime/15',
    text: 'text-cat-lime',
    border: 'border-cat-lime/30',
  },
  emerald: {
    bg: 'bg-cat-emerald/15',
    text: 'text-cat-emerald',
    border: 'border-cat-emerald/30',
  },
  teal: {
    bg: 'bg-cat-teal/15',
    text: 'text-cat-teal',
    border: 'border-cat-teal/30',
  },
  sky: {
    bg: 'bg-cat-sky/15',
    text: 'text-cat-sky',
    border: 'border-cat-sky/30',
  },
  indigo: {
    bg: 'bg-cat-indigo/15',
    text: 'text-cat-indigo',
    border: 'border-cat-indigo/30',
  },
  violet: {
    bg: 'bg-cat-violet/15',
    text: 'text-cat-violet',
    border: 'border-cat-violet/30',
  },
  pink: {
    bg: 'bg-cat-pink/15',
    text: 'text-cat-pink',
    border: 'border-cat-pink/30',
  },
  stone: {
    bg: 'bg-cat-stone/15',
    text: 'text-cat-stone',
    border: 'border-cat-stone/30',
  },
};

export interface CategoryBadgeProps {
  name?: string;
  systemKey?: string;
  icon?: string | React.ComponentType<{ className?: string }>;
  color?: string;
  archived?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showArchivedBadge?: boolean;
  className?: string;
}

export function CategoryBadge({
  name,
  systemKey,
  icon,
  color = 'slate',
  archived = false,
  size = 'md',
  showArchivedBadge = true,
  className,
}: CategoryBadgeProps) {
  const { t } = useTranslation();

  // Resolve category display name: user-defined `name` takes precedence over `systemKey`
  const displayName = React.useMemo(() => {
    const trimmed = name?.trim();
    if (trimmed) {
      return trimmed;
    }
    if (systemKey) {
      return t(`categories.system.${systemKey}` as const, {
        defaultValue: systemKey,
      });
    }
    return '';
  }, [name, systemKey, t]);

  // Resolve icon component
  const IconComponent = React.useMemo(() => {
    if (!icon) {
      return null;
    }
    if (typeof icon !== 'string') {
      return icon;
    }
    const normalized = icon.toLowerCase().replace(/[^a-z0-9]/g, '');
    return ICON_MAP[normalized] ?? Tag;
  }, [icon]);

  const colorStyle = COLOR_STYLES[color] ?? DEFAULT_COLOR_STYLE;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5 [&_svg]:size-3',
    md: 'text-sm px-2.5 py-1 gap-1.5 [&_svg]:size-3.5',
    lg: 'text-base px-3 py-1.5 gap-2 [&_svg]:size-4',
  }[size];

  return (
    <span
      data-slot="category-badge"
      data-testid="category-badge"
      data-archived={archived ? 'true' : undefined}
      data-color={color}
      className={cn(
        'inline-flex items-center rounded-md border font-medium transition-colors select-none',
        colorStyle.bg,
        colorStyle.text,
        colorStyle.border,
        sizeClasses,
        archived && 'opacity-65 grayscale-[25%]',
        className,
      )}
    >
      {IconComponent && (
        <IconComponent aria-hidden="true" className="shrink-0" />
      )}
      <span
        className={cn(
          'truncate',
          archived && 'line-through decoration-current/40',
        )}
      >
        {displayName}
      </span>
      {archived && showArchivedBadge && (
        <span
          data-slot="category-badge-archived"
          className="bg-muted/80 text-muted-foreground ml-1 rounded px-1 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
        >
          {t('categories.archivedBadge')}
        </span>
      )}
    </span>
  );
}
