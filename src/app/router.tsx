import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ROUTES } from '@/app/routes';

export const router = createBrowserRouter([
  {
    path: ROUTES.root,
    element: <Navigate to={ROUTES.dashboard} replace />,
  },
  {
    path: ROUTES.app,
    element: <Navigate to={ROUTES.dashboard} replace />,
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: ROUTES.dashboard,
        lazy: async () => {
          const { DashboardPage } = await import('@/app/pages/DashboardPage');
          return { Component: DashboardPage };
        },
      },
      {
        path: ROUTES.transactions,
        lazy: async () => {
          const { TransactionsPage } =
            await import('@/app/pages/TransactionsPage');
          return { Component: TransactionsPage };
        },
      },
      {
        path: ROUTES.accounts,
        lazy: async () => {
          const { AccountsPage } = await import('@/app/pages/AccountsPage');
          return { Component: AccountsPage };
        },
      },
      {
        path: ROUTES.budgets,
        lazy: async () => {
          const { BudgetsPage } = await import('@/app/pages/BudgetsPage');
          return { Component: BudgetsPage };
        },
      },
      {
        path: ROUTES.categories,
        lazy: async () => {
          const { CategoriesPage } = await import('@/app/pages/CategoriesPage');
          return { Component: CategoriesPage };
        },
      },
      {
        path: ROUTES.importExport,
        lazy: async () => {
          const { ImportExportPage } =
            await import('@/app/pages/ImportExportPage');
          return { Component: ImportExportPage };
        },
      },
      {
        path: ROUTES.settings,
        lazy: async () => {
          const { SettingsPage } = await import('@/app/pages/SettingsPage');
          return { Component: SettingsPage };
        },
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.login,
        lazy: async () => {
          const { LoginPage } = await import('@/app/pages/LoginPage');
          return { Component: LoginPage };
        },
      },
      {
        path: ROUTES.register,
        lazy: async () => {
          const { RegisterPage } = await import('@/app/pages/RegisterPage');
          return { Component: RegisterPage };
        },
      },
      {
        path: ROUTES.resetPassword,
        lazy: async () => {
          const { ResetPasswordPage } =
            await import('@/app/pages/ResetPasswordPage');
          return { Component: ResetPasswordPage };
        },
      },
    ],
  },
  {
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/app/pages/NotFoundPage');
      return { Component: NotFoundPage };
    },
  },
]);
