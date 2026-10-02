import { RouterProvider } from 'react-router';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth';

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
