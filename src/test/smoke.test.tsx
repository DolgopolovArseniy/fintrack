import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App smoke test', () => {
  it('renders application title', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /fintrack/i }),
    ).toBeInTheDocument();
  });
});
