import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { PreferencesSection } from './PreferencesSection';

vi.mock('../hooks/useProfileSettings', () => ({
  useProfileSettings: vi.fn(),
}));

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('PreferencesSection', () => {
  const mockUpdateCurrency = vi.fn().mockResolvedValue(undefined);
  const mockUpdateLocale = vi.fn().mockResolvedValue(undefined);
  const mockUpdateTheme = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProfileSettings).mockReturnValue({
      profile: {
        id: 'user-123',
        displayName: 'John',
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      isSaving: false,
      updateDisplayName: vi.fn(),
      updateCurrency: mockUpdateCurrency,
      updateLocale: mockUpdateLocale,
      updateTheme: mockUpdateTheme,
    });
  });

  it('renders title, description, and selector labels', () => {
    render(<PreferencesSection />);

    expect(screen.getByText(/Preferences/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Customize your display currency, language, and theme/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Base currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme/i)).toBeInTheDocument();
  });

  it('opens CurrencyChangeDialog when selecting a different currency', async () => {
    const user = userEvent.setup();
    render(<PreferencesSection />);

    const currencyTrigger = screen.getByLabelText(/Base currency/i);
    expect(currencyTrigger).toBeInTheDocument();
    await user.click(currencyTrigger);

    // Click EUR from dropdown options
    const eurOption = await screen.findByRole('option', { name: 'EUR' });
    await user.click(eurOption);

    // Dialog should open
    expect(
      await screen.findByText('Change base currency?'),
    ).toBeInTheDocument();

    // Confirm dialog
    const confirmBtn = screen.getByRole('button', {
      name: /I understand, change currency/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdateCurrency).toHaveBeenCalledWith('EUR');
    });
  });

  it('updates interface language when selecting Russian', async () => {
    const user = userEvent.setup();
    render(<PreferencesSection />);

    const langTrigger = screen.getByLabelText(/Language/i);
    await user.click(langTrigger);

    const ruOption = await screen.findByRole('option', { name: 'Русский' });
    await user.click(ruOption);

    await waitFor(() => {
      expect(mockUpdateLocale).toHaveBeenCalledWith('ru');
    });
  });

  it('updates theme when selecting dark theme', async () => {
    const user = userEvent.setup();
    render(<PreferencesSection />);

    const themeTrigger = screen.getByLabelText(/Theme/i);
    await user.click(themeTrigger);

    const darkOption = await screen.findByRole('option', { name: 'Dark' });
    await user.click(darkOption);

    await waitFor(() => {
      expect(mockUpdateTheme).toHaveBeenCalledWith('dark');
    });
  });

  it('disables selectors when isSaving is true', () => {
    vi.mocked(useProfileSettings).mockReturnValue({
      profile: null,
      isSaving: true,
      updateDisplayName: vi.fn(),
      updateCurrency: mockUpdateCurrency,
      updateLocale: mockUpdateLocale,
      updateTheme: mockUpdateTheme,
    });

    render(<PreferencesSection />);

    expect(screen.getByLabelText(/Base currency/i)).toBeDisabled();
    expect(screen.getByLabelText(/Language/i)).toBeDisabled();
    expect(screen.getByLabelText(/Theme/i)).toBeDisabled();
  });
});
