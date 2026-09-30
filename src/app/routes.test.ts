import { describe, expect, it } from 'vitest';
import { navItems } from '@/app/layouts/navItems';
import { ROUTES } from '@/app/routes';

describe('ROUTES & navItems consistency', () => {
  it('defines valid absolute paths for all ROUTES', () => {
    Object.values(ROUTES).forEach((path) => {
      expect(path).toMatch(/^\//);
    });
  });

  it('ensures every navItem has a valid href present in ROUTES', () => {
    const routeValues = Object.values(ROUTES) as string[];

    navItems.forEach((item) => {
      expect(routeValues).toContain(item.href);
      expect(item.id).toBeTruthy();
      expect(item.labelKey).toBeTruthy();
      expect(item.icon).toBeDefined();
    });
  });

  it('contains primary mobile nav items', () => {
    const primaryItems = navItems.filter((item) => item.isPrimaryMobile);
    expect(primaryItems.length).toBeGreaterThan(0);
    const primaryIds = primaryItems.map((item) => item.id);
    expect(primaryIds).toContain('dashboard');
    expect(primaryIds).toContain('transactions');
    expect(primaryIds).toContain('budgets');
  });
});
