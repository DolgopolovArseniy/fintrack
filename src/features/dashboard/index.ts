export { useDashboardData } from './hooks/useDashboardData';
export type { DashboardData } from './hooks/useDashboardData';

export { DashboardKpiGrid } from './components/DashboardKpiGrid';
export type { DashboardKpiGridProps } from './components/DashboardKpiGrid';

export { DashboardCharts } from './components/charts/DashboardCharts';
export type { DashboardChartsProps } from './components/charts/DashboardCharts';
export { ExpenseDonutChart } from './components/charts/ExpenseDonutChart';
export type { ExpenseDonutChartProps } from './components/charts/ExpenseDonutChart';
export { MonthlyBarChart } from './components/charts/MonthlyBarChart';
export type { MonthlyBarChartProps } from './components/charts/MonthlyBarChart';

export {
  calculatePercentageChange,
  computeDashboardMetrics,
  formatMonthShortLabel,
} from './utils';
export type { DashboardMetrics, PercentageChangeResult } from './utils';
