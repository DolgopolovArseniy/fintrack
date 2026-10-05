import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyText } from './MoneyText';

describe('MoneyText', () => {
  it('formats positive amount as income with default styling and tabular-nums', () => {
    const { container } = render(
      <MoneyText amount={1250} currency="USD" locale="en" />,
    );

    expect(screen.getByText('$12.50')).toBeInTheDocument();
    const el = container.querySelector('[data-slot="money-text"]');
    expect(el).toHaveAttribute('data-type', 'income');
    expect(el?.className).toContain('text-income');
    expect(el?.className).toContain('tabular-nums');
  });

  it('formats negative amount as expense with minus sign and expense color', () => {
    const { container } = render(
      <MoneyText amount={-3500} currency="USD" locale="en" />,
    );

    // Unicode minus \u2212
    expect(screen.getByText('−$35.00')).toBeInTheDocument();
    const el = container.querySelector('[data-slot="money-text"]');
    expect(el).toHaveAttribute('data-type', 'expense');
    expect(el?.className).toContain('text-expense');
  });

  it('formats zero amount with neutral type and no sign', () => {
    const { container } = render(
      <MoneyText amount={0} currency="USD" locale="en" />,
    );

    expect(screen.getByText('$0.00')).toBeInTheDocument();
    const el = container.querySelector('[data-slot="money-text"]');
    expect(el).toHaveAttribute('data-type', 'neutral');
    expect(el?.className).toContain('text-foreground');
  });

  it('shows forced positive sign when showSign is true for income', () => {
    render(<MoneyText amount={5000} showSign currency="USD" locale="en" />);
    expect(screen.getByText('+$50.00')).toBeInTheDocument();
  });

  it('shows forced minus sign when showSign is true for expense with positive amount', () => {
    const { container } = render(
      <MoneyText
        amount={2000}
        type="expense"
        showSign
        currency="USD"
        locale="en"
      />,
    );

    expect(screen.getByText('−$20.00')).toBeInTheDocument();
    const el = container.querySelector('[data-slot="money-text"]');
    expect(el).toHaveAttribute('data-type', 'expense');
    expect(el?.className).toContain('text-expense');
  });

  it('suppresses sign when showSign is false even on negative amount', () => {
    render(
      <MoneyText amount={-1500} showSign={false} currency="USD" locale="en" />,
    );
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('renders ArrowUpRight icon when showIcon is true for income', () => {
    const { container } = render(
      <MoneyText
        amount={1000}
        showIcon
        type="income"
        currency="USD"
        locale="en"
      />,
    );

    const icon = container.querySelector('[data-slot="money-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders ArrowDownLeft icon when showIcon is true for expense', () => {
    const { container } = render(
      <MoneyText
        amount={1000}
        showIcon
        type="expense"
        currency="USD"
        locale="en"
      />,
    );

    const icon = container.querySelector('[data-slot="money-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('does not render icon when type is neutral even if showIcon is true', () => {
    const { container } = render(
      <MoneyText
        amount={0}
        showIcon
        type="neutral"
        currency="USD"
        locale="en"
      />,
    );

    const icon = container.querySelector('[data-slot="money-icon"]');
    expect(icon).not.toBeInTheDocument();
  });

  it('applies appropriate classes for different sizes', () => {
    const { rerender, container } = render(
      <MoneyText amount={1000} size="xs" currency="USD" locale="en" />,
    );
    expect(
      container.querySelector('[data-slot="money-text"]')?.className,
    ).toContain('text-xs');

    rerender(<MoneyText amount={1000} size="lg" currency="USD" locale="en" />);
    expect(
      container.querySelector('[data-slot="money-text"]')?.className,
    ).toContain('text-lg');

    rerender(<MoneyText amount={1000} size="kpi" currency="USD" locale="en" />);
    expect(
      container.querySelector('[data-slot="money-text"]')?.className,
    ).toContain('font-bold');
  });

  it('formats according to custom currency and Russian locale', () => {
    render(<MoneyText amount={10000} currency="EUR" locale="ru" />);
    // In Russian locale, 100 EUR is formatted as "100,00 €"
    const textContent = screen.getByText(/100,00/);
    expect(textContent).toBeInTheDocument();
  });
});
