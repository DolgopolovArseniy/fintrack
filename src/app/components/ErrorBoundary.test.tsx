import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent(): never {
  throw new Error('Test crash');
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <I18nProvider>
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      </I18nProvider>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback error message when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <I18nProvider>
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      </I18nProvider>,
    );

    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByText('Test crash')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
