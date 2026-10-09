import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IconPicker } from './IconPicker';

describe('IconPicker', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders trigger button with current icon name', () => {
    render(<IconPicker value="utensils" onChange={vi.fn()} />);

    expect(screen.getByText('utensils')).toBeInTheDocument();
  });

  it('opens dialog on trigger button click', () => {
    render(<IconPicker value="utensils" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /select icon/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search icons/i)).toBeInTheDocument();
  });

  it('filters icons by category tab click', () => {
    render(<IconPicker value="utensils" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /select icon/i }));

    const foodTab = screen.getByRole('button', { name: /^food$/i });
    fireEvent.click(foodTab);

    // Food category has utensils, coffee, shopping-bag, shopping-cart
    expect(screen.getByRole('radio', { name: 'Food' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cafe' })).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'Car' }),
    ).not.toBeInTheDocument();
  });

  it('searches icons by text query', () => {
    render(<IconPicker value="utensils" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /select icon/i }));

    const searchInput = screen.getByPlaceholderText(/search icons/i);
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(screen.getByRole('radio', { name: 'Cafe' })).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'Food' }),
    ).not.toBeInTheDocument();
  });

  it('selects icon and calls onChange, closing dialog', () => {
    const handleChange = vi.fn();
    render(<IconPicker value="utensils" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: /select icon/i }));

    const cafeRadio = screen.getByRole('radio', { name: 'Cafe' });
    fireEvent.click(cafeRadio);

    expect(handleChange).toHaveBeenCalledWith('coffee');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
