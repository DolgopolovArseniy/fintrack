import { RouterProvider } from 'react-router';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RouterProvider router={router} />
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
