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
    href: '#dashboard',
    isPrimaryMobile: true,
  },
  {
    id: 'transactions',
    labelKey: 'nav.transactions',
    icon: ArrowLeftRight,
    href: '#transactions',
    isPrimaryMobile: true,
  },
  {
    id: 'budgets',
    labelKey: 'nav.budgets',
    icon: PieChart,
    href: '#budgets',
    isPrimaryMobile: true,
  },
  {
    id: 'accounts',
    labelKey: 'nav.accounts',
    icon: Wallet,
    href: '#accounts',
  },
  {
    id: 'categories',
    labelKey: 'nav.categories',
    icon: Tags,
    href: '#categories',
  },
  {
    id: 'importExport',
    labelKey: 'nav.importExport',
    icon: ArrowUpDown,
    href: '#import-export',
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    icon: Settings,
    href: '#settings',
  },
];
