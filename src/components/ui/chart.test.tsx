import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChartContainer,
  type ChartConfig,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
} from './chart';

describe('Chart UI component', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  const mockConfig: ChartConfig = {
    income: {
      label: 'Monthly Income',
      color: 'var(--income)',
    },
    expense: {
      label: 'Monthly Expense',
      color: 'var(--expense)',
    },
  };

  describe('ChartContainer', () => {
    it('renders with data-slot and data-chart attributes', () => {
      const { container } = render(
        <ChartContainer id="test" config={mockConfig}>
          <div data-testid="chart-child">Child Element</div>
        </ChartContainer>,
      );

      const chartElement = container.querySelector('[data-slot="chart"]');
      expect(chartElement).toBeInTheDocument();
      expect(chartElement).toHaveAttribute('data-chart', 'chart-test');
      expect(screen.getByTestId('chart-child')).toBeInTheDocument();
    });

    it('injects scoped CSS variables via ChartStyle', () => {
      const { container } = render(
        <ChartStyle id="test-style" config={mockConfig} />,
      );

      const styleEl = container.querySelector('style');
      expect(styleEl).toBeInTheDocument();
      expect(styleEl?.innerHTML).toContain('[data-chart=test-style]');
      expect(styleEl?.innerHTML).toContain('--color-income: var(--income);');
      expect(styleEl?.innerHTML).toContain('--color-expense: var(--expense);');
    });

    it('supports theme-based colors (light and dark)', () => {
      const themedConfig: ChartConfig = {
        custom: {
          label: 'Themed Metric',
          theme: {
            light: '#111',
            dark: '#eee',
          },
        },
      };

      const { container } = render(
        <ChartStyle id="themed" config={themedConfig} />,
      );

      const styleEl = container.querySelector('style');
      expect(styleEl).toBeInTheDocument();
      expect(styleEl?.innerHTML).toContain('--color-custom: #111;');
      expect(styleEl?.innerHTML).toContain('.dark [data-chart=themed]');
      expect(styleEl?.innerHTML).toContain('--color-custom: #eee;');
    });
  });

  describe('ChartTooltipContent', () => {
    it('renders tooltip items with label and tabular-nums values', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>
            <ChartTooltipContent
              active
              label="2026-05"
              payload={[
                {
                  name: 'income',
                  dataKey: 'income',
                  value: 125000,
                  color: 'var(--income)',
                },
                {
                  name: 'expense',
                  dataKey: 'expense',
                  value: 85000,
                  color: 'var(--expense)',
                },
              ]}
            />
          </div>
        </ChartContainer>,
      );

      expect(screen.getByText('2026-05')).toBeInTheDocument();
      expect(screen.getByText('Monthly Income')).toBeInTheDocument();
      expect(screen.getByText('Monthly Expense')).toBeInTheDocument();
      expect(screen.getByText(/125.*000/)).toBeInTheDocument();
      expect(screen.getByText(/85.*000/)).toBeInTheDocument();
    });

    it('returns null when active is false or payload is empty', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div>
            <ChartTooltipContent active={false} payload={[]} />
          </div>
        </ChartContainer>,
      );

      expect(container.querySelector('.grid')).toBeNull();
    });
  });

  describe('ChartLegendContent', () => {
    it('renders legend items with labels from config', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>
            <ChartLegendContent
              payload={[
                {
                  value: 'income',
                  dataKey: 'income',
                  color: 'var(--income)',
                },
                {
                  value: 'expense',
                  dataKey: 'expense',
                  color: 'var(--expense)',
                },
              ]}
            />
          </div>
        </ChartContainer>,
      );

      expect(screen.getByText('Monthly Income')).toBeInTheDocument();
      expect(screen.getByText('Monthly Expense')).toBeInTheDocument();
    });

    it('returns null when payload is empty', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div>
            <ChartLegendContent payload={[]} />
          </div>
        </ChartContainer>,
      );

      expect(
        container.querySelector('.flex.items-center.justify-center'),
      ).toBeNull();
    });
  });
});
