import {
  ArrowDownLeft,
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
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
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type IconCategoryKey =
  'general' | 'food' | 'transport' | 'home' | 'leisure' | 'finance';

export interface CategoryIconItem {
  name: string;
  label: string;
  category: IconCategoryKey;
  icon: LucideIcon;
}

export const CATEGORY_ICONS: readonly CategoryIconItem[] = [
  // General / Базовые
  {
    name: 'circle-ellipsis',
    label: 'Other',
    category: 'general',
    icon: CircleEllipsis,
  },
  { name: 'tag', label: 'Tag', category: 'general', icon: Tag },
  { name: 'folder', label: 'Folder', category: 'general', icon: Folder },
  { name: 'sparkles', label: 'Special', category: 'general', icon: Sparkles },
  { name: 'briefcase', label: 'Work', category: 'general', icon: Briefcase },
  {
    name: 'graduation-cap',
    label: 'Education',
    category: 'general',
    icon: GraduationCap,
  },
  { name: 'smile', label: 'Personal', category: 'general', icon: Smile },
  { name: 'paw-print', label: 'Pets', category: 'general', icon: PawPrint },
  { name: 'baby', label: 'Family', category: 'general', icon: Baby },

  // Food / Еда
  { name: 'utensils', label: 'Food', category: 'food', icon: Utensils },
  { name: 'coffee', label: 'Cafe', category: 'food', icon: Coffee },
  {
    name: 'shopping-bag',
    label: 'Groceries',
    category: 'food',
    icon: ShoppingBag,
  },
  {
    name: 'shopping-cart',
    label: 'Supermarket',
    category: 'food',
    icon: ShoppingCart,
  },

  // Transport / Транспорт
  { name: 'car', label: 'Car', category: 'transport', icon: Car },
  { name: 'bus', label: 'Public Transport', category: 'transport', icon: Bus },
  { name: 'train', label: 'Train', category: 'transport', icon: Train },
  { name: 'plane', label: 'Travel', category: 'transport', icon: Plane },
  { name: 'fuel', label: 'Fuel', category: 'transport', icon: Fuel },

  // Home / Дом и связь
  { name: 'home', label: 'Housing', category: 'home', icon: Home },
  { name: 'zap', label: 'Utilities', category: 'home', icon: Zap },
  { name: 'wrench', label: 'Maintenance', category: 'home', icon: Wrench },
  { name: 'hammer', label: 'Tools', category: 'home', icon: Hammer },
  { name: 'phone', label: 'Phone', category: 'home', icon: Phone },
  { name: 'wifi', label: 'Internet', category: 'home', icon: Wifi },

  // Leisure & Health / Досуг и здоровье
  {
    name: 'heart-pulse',
    label: 'Healthcare',
    category: 'leisure',
    icon: HeartPulse,
  },
  { name: 'film', label: 'Entertainment', category: 'leisure', icon: Film },
  { name: 'music', label: 'Music', category: 'leisure', icon: Music },
  { name: 'tv', label: 'Streaming', category: 'leisure', icon: Tv },
  { name: 'gamepad-2', label: 'Gaming', category: 'leisure', icon: Gamepad2 },
  { name: 'dumbbell', label: 'Fitness', category: 'leisure', icon: Dumbbell },
  { name: 'book', label: 'Books', category: 'leisure', icon: Book },
  { name: 'shirt', label: 'Shopping', category: 'leisure', icon: Shirt },
  { name: 'scissors', label: 'Beauty', category: 'leisure', icon: Scissors },

  // Finance / Финансы
  { name: 'wallet', label: 'Salary', category: 'finance', icon: Wallet },
  { name: 'gift', label: 'Gifts', category: 'finance', icon: Gift },
  {
    name: 'arrow-down-left',
    label: 'Income',
    category: 'finance',
    icon: ArrowDownLeft,
  },
  { name: 'dollar-sign', label: 'Cash', category: 'finance', icon: DollarSign },
  {
    name: 'trending-up',
    label: 'Investments',
    category: 'finance',
    icon: TrendingUp,
  },
  {
    name: 'piggy-bank',
    label: 'Savings',
    category: 'finance',
    icon: PiggyBank,
  },
  { name: 'credit-card', label: 'Card', category: 'finance', icon: CreditCard },
  { name: 'coins', label: 'Coins', category: 'finance', icon: Coins },
  { name: 'receipt', label: 'Bills', category: 'finance', icon: Receipt },
] as const;

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICONS.map((item) => [
    item.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    item.icon,
  ]),
);

export function getCategoryIconComponent(name: string): LucideIcon {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ICON_MAP[normalized] ?? Tag;
}
