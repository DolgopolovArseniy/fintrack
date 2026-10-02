import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App smoke test', () => {
  it('renders application layout with brand title and overview heading', async () => {
    render(<App />);
    const brandElements = await screen.findAllByText(/fintrack/i);
    expect(brandElements.length).toBeGreaterThan(0);
    expect(
      await screen.findByRole('heading', { name: /overview/i }),
    ).toBeInTheDocument();
  });
});
