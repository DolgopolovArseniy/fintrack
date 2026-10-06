import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmountInput } from './AmountInput';

describe('AmountInput', () => {
  it('allows input with dot and calls onChange with minor units', () => {
    const handleChange = vi.fn();
    render(<AmountInput onChange={handleChange} locale="en" currency="USD" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '15.5' } });

    expect(input).toHaveValue('15.5');
    expect(handleChange).toHaveBeenCalledWith(1550);
  });

  it('allows input with comma and calls onChange with minor units', () => {
    const handleChange = vi.fn();
    render(<AmountInput onChange={handleChange} locale="ru" currency="EUR" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '15,5' } });

    expect(input).toHaveValue('15,5');
    expect(handleChange).toHaveBeenCalledWith(1550);
  });

  it('restricts input to at most 2 decimal places', () => {
    const handleChange = vi.fn();
    render(<AmountInput onChange={handleChange} locale="en" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12.345' } });

    expect(input).toHaveValue('12.34');
    expect(handleChange).toHaveBeenCalledWith(1234);
  });

  it('strips non-numeric and non-separator characters', () => {
    const handleChange = vi.fn();
    render(<AmountInput onChange={handleChange} locale="en" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc$12xyz.5' } });

    expect(input).toHaveValue('12.5');
    expect(handleChange).toHaveBeenCalledWith(1250);
  });

  it('calls onChange with 0 when input is cleared', () => {
    const handleChange = vi.fn();
    render(<AmountInput value={1000} onChange={handleChange} locale="en" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });

    expect(input).toHaveValue('');
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('formats input on blur according to locale', () => {
    const { rerender } = render(<AmountInput locale="en" />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '15.5' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('15.50');

    rerender(<AmountInput locale="ru" />);
    fireEvent.change(input, { target: { value: '25,5' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('25,50');
  });

  it('renders ISO currency code by default according to currency and position prop', () => {
    const { container, rerender } = render(
      <AmountInput currency="USD" currencyPosition="end" locale="en" />,
    );
    expect(
      container.querySelector('[data-slot="amount-currency"]'),
    ).toHaveTextContent('USD');

    rerender(
      <AmountInput currency="UAH" currencyPosition="start" locale="en" />,
    );
    const currencyEl = container.querySelector('[data-slot="amount-currency"]');
    expect(currencyEl).toHaveTextContent('UAH');

    rerender(
      <AmountInput
        currency="EUR"
        currencyDisplay="symbol"
        currencyPosition="start"
        locale="en"
      />,
    );
    expect(
      container.querySelector('[data-slot="amount-currency"]'),
    ).toHaveTextContent('€');
  });

  it('syncs display value when external value changes and input is not focused', () => {
    const { rerender } = render(<AmountInput value={1000} locale="en" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('10.00');

    rerender(<AmountInput value={2550} locale="en" />);
    expect(input).toHaveValue('25.50');
  });
});
