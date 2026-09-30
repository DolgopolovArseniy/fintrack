import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  it('does not render banner when online', () => {
    const { container } = render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders banner when offline event fires', () => {
    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>,
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
