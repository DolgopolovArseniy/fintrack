export const ROUTES = {
  root: '/',
  login: '/login',
  register: '/register',
  resetPassword: '/reset-password',
  app: '/app',
  dashboard: '/app/dashboard',
  transactions: '/app/transactions',
  accounts: '/app/accounts',
  budgets: '/app/budgets',
  categories: '/app/categories',
  importExport: '/app/import-export',
  settings: '/app/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
