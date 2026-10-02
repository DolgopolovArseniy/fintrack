import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App smoke test', () => {
  it('renders application with brand title and redirects guest to login', async () => {
    render(<App />);
    const brandElements = await screen.findAllByText(/fintrack/i);
    expect(brandElements.length).toBeGreaterThan(0);
    const authElements = await screen.findAllByText(
      /coming soon|welcome back|sign in/i,
    );
    expect(authElements.length).toBeGreaterThan(0);
  });
});
