export { useDashboardData } from './hooks/useDashboardData';
export type { DashboardData } from './hooks/useDashboardData';

export { DashboardKpiGrid } from './components/DashboardKpiGrid';
export type { DashboardKpiGridProps } from './components/DashboardKpiGrid';

export {
  calculatePercentageChange,
  computeDashboardMetrics,
  formatMonthShortLabel,
} from './utils';
export type { DashboardMetrics, PercentageChangeResult } from './utils';
