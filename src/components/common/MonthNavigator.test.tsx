import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthNavigator } from './MonthNavigator';
import { currentYearMonth } from '@/lib/dates';

describe('MonthNavigator', () => {
  it('renders localized month name and year with first letter capitalized', () => {
    render(<MonthNavigator month="2026-09" locale="en" />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });

  it('renders Russian month name capitalized', () => {
    render(<MonthNavigator month="2026-09" locale="ru" />);
    expect(screen.getByText(/Сентябрь 2026/i)).toBeInTheDocument();
  });

  it('calls onChange with previous month when clicking prev button', () => {
    const handleChange = vi.fn();
    render(
      <MonthNavigator month="2026-09" onChange={handleChange} locale="en" />,
    );

    const prevButton = screen.getByRole('button', { name: /previous month/i });
    fireEvent.click(prevButton);

    expect(handleChange).toHaveBeenCalledWith('2026-08');
  });

  it('calls onChange with next month when clicking next button', () => {
    const handleChange = vi.fn();
    render(
      <MonthNavigator month="2026-09" onChange={handleChange} locale="en" />,
    );

    const nextButton = screen.getByRole('button', { name: /next month/i });
    fireEvent.click(nextButton);

    expect(handleChange).toHaveBeenCalledWith('2026-10');
  });

  it('handles year boundary when navigating across years', () => {
    const handleChange = vi.fn();
    render(
      <MonthNavigator month="2026-12" onChange={handleChange} locale="en" />,
    );

    const nextButton = screen.getByRole('button', { name: /next month/i });
    fireEvent.click(nextButton);
    expect(handleChange).toHaveBeenCalledWith('2027-01');
  });

  it('disables current month button when selected month is current calendar month', () => {
    const current = currentYearMonth();
    render(<MonthNavigator month={current} locale="en" />);

    const thisMonthButton = screen.getByRole('button', { name: /this month/i });
    expect(thisMonthButton).toBeDisabled();
  });

  it('enables current month button when selected month is different and triggers onChange on click', () => {
    const handleChange = vi.fn();
    const current = currentYearMonth();
    // A past month
    render(
      <MonthNavigator month="2020-01" onChange={handleChange} locale="en" />,
    );

    const thisMonthButton = screen.getByRole('button', { name: /this month/i });
    expect(thisMonthButton).not.toBeDisabled();

    fireEvent.click(thisMonthButton);
    expect(handleChange).toHaveBeenCalledWith(current);
  });
});
