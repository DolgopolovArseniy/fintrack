import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardMetrics } from '../utils';
import { DashboardKpiGrid } from './DashboardKpiGrid';

describe('DashboardKpiGrid', () => {
  const mockMetrics: DashboardMetrics = {
    totalBalance: 500000, // 5,000.00
    currentIncome: 250000, // 2,500.00
    currentExpense: 150000, // 1,500.00
    netSavings: 100000, // 1,000.00
    savingsRate: 40,
    incomeChange: {
      percent: 15,
      direction: 'increase',
      isNewPeriod: false,
    },
    expenseChange: {
      percent: 5,
      direction: 'decrease',
      isNewPeriod: false,
    },
  };

  it('renders all 4 KPI cards with formatted amounts and tabular-nums', () => {
    const { container } = render(
      <DashboardKpiGrid
        metrics={mockMetrics}
        activeAccountsCount={3}
        currency="USD"
      />,
    );

    expect(screen.getByTestId('kpi-total-balance')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-income')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-expense')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-net-savings')).toBeInTheDocument();

    // Check money values with tabular-nums
    const moneyElements = container.querySelectorAll(
      '[data-slot="money-text"]',
    );
    expect(moneyElements.length).toBe(4);
    moneyElements.forEach((el) => {
      expect(el.className).toContain('tabular-nums');
    });

    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('+$1,000.00')).toBeInTheDocument();
  });

  it('renders active accounts hint on total balance card', () => {
    render(
      <DashboardKpiGrid
        metrics={mockMetrics}
        activeAccountsCount={3}
        currency="USD"
      />,
    );

    expect(screen.getByText(/3 active account/i)).toBeInTheDocument();
  });

  it('renders income increase badge with positive styling and green color', () => {
    render(
      <DashboardKpiGrid
        metrics={mockMetrics}
        activeAccountsCount={1}
        currency="USD"
      />,
    );

    const incomeCard = screen.getByTestId('kpi-income');
    const badge = incomeCard.querySelector('[data-slot="kpi-trend-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('+15%');
    expect(badge?.className).toContain('text-income');
    expect(badge?.className).toContain('bg-income/10');
  });

  it('renders expense decrease badge with positive styling (green color) because lowering expenses is good', () => {
    render(
      <DashboardKpiGrid
        metrics={mockMetrics}
        activeAccountsCount={1}
        currency="USD"
      />,
    );

    const expenseCard = screen.getByTestId('kpi-expense');
    const badge = expenseCard.querySelector('[data-slot="kpi-trend-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('−5%');
    expect(badge?.className).toContain('text-income');
  });

  it('renders expense increase badge with negative styling (red color)', () => {
    const metricsWithExpenseIncrease: DashboardMetrics = {
      ...mockMetrics,
      expenseChange: {
        percent: 20,
        direction: 'increase',
        isNewPeriod: false,
      },
    };

    render(
      <DashboardKpiGrid
        metrics={metricsWithExpenseIncrease}
        activeAccountsCount={1}
        currency="USD"
      />,
    );

    const expenseCard = screen.getByTestId('kpi-expense');
    const badge = expenseCard.querySelector('[data-slot="kpi-trend-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('+20%');
    expect(badge?.className).toContain('text-expense');
  });

  it('renders savings rate badge when savingsRate is present', () => {
    render(
      <DashboardKpiGrid
        metrics={mockMetrics}
        activeAccountsCount={1}
        currency="USD"
      />,
    );

    const savingsBadge = screen.getByTestId('kpi-net-savings');
    expect(savingsBadge).toHaveTextContent(/40%/);
  });

  it('renders neutral indicator when savingsRate is null', () => {
    const metricsNoSavings: DashboardMetrics = {
      ...mockMetrics,
      savingsRate: null,
    };

    render(
      <DashboardKpiGrid
        metrics={metricsNoSavings}
        activeAccountsCount={1}
        currency="USD"
      />,
    );

    const savingsCard = screen.getByTestId('kpi-net-savings');
    expect(savingsCard).toBeInTheDocument();
  });
});
