/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test';

interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{ html: string; target: string[] }>;
}

interface AxeResults {
  violations: AxeViolation[];
}

/**
 * Runs axe accessibility auditing on the current page.
 * Asserts that no 'serious' or 'critical' WCAG violations exist (F02 AC13).
 */
export async function checkA11y(page: Page): Promise<void> {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
  });

  const results = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (context: unknown, options: unknown) => Promise<AxeResults>;
        };
      }
    ).axe;

    return await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    });
  });

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  if (seriousOrCritical.length > 0) {
    const details = seriousOrCritical
      .map(
        (v) =>
          `[${v.impact?.toUpperCase() ?? 'UNKNOWN'}] ${v.id}: ${v.description} (${v.nodes.length} occurrences)`,
      )
      .join('\n');
    expect(
      seriousOrCritical,
      `Accessibility violations found:\n${details}`,
    ).toEqual([]);
  }
}
