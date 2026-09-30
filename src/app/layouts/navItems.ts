import type * as React from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  LayoutDashboard,
  PieChart,
  Settings,
  Tags,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/app/routes';

export type NavKey =
  | 'nav.dashboard'
  | 'nav.transactions'
  | 'nav.budgets'
  | 'nav.accounts'
  | 'nav.categories'
  | 'nav.importExport'
  | 'nav.settings';

export interface NavItem {
  id: string;
  labelKey: NavKey;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  isPrimaryMobile?: boolean;
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    href: ROUTES.dashboard,
    isPrimaryMobile: true,
  },
  {
    id: 'transactions',
    labelKey: 'nav.transactions',
    icon: ArrowLeftRight,
    href: ROUTES.transactions,
    isPrimaryMobile: true,
  },
  {
    id: 'budgets',
    labelKey: 'nav.budgets',
    icon: PieChart,
    href: ROUTES.budgets,
    isPrimaryMobile: true,
  },
  {
    id: 'accounts',
    labelKey: 'nav.accounts',
    icon: Wallet,
    href: ROUTES.accounts,
  },
  {
    id: 'categories',
    labelKey: 'nav.categories',
    icon: Tags,
    href: ROUTES.categories,
  },
  {
    id: 'importExport',
    labelKey: 'nav.importExport',
    icon: ArrowUpDown,
    href: ROUTES.importExport,
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    icon: Settings,
    href: ROUTES.settings,
  },
];
