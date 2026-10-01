import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**'],
      exclude: [
        'src/lib/index.ts',
        'src/lib/firebase.ts',
        'src/lib/env.ts',
        '**/*.test.ts',
      ],
      thresholds: {
        'src/lib/{money,dates,balance,aggregations}.ts': {
          branches: 90,
          functions: 100,
          lines: 95,
          statements: 95,
        },
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          exclude: [
            'src/lib/dates.timezone.test.ts',
            '**/node_modules/**',
            '**/e2e/**',
          ],
        },
      },
      {
        test: {
          name: 'tz-utc',
          environment: 'node',
          pool: 'forks',
          include: ['src/lib/dates.timezone.test.ts'],
          env: {
            TZ: 'UTC',
          },
        },
      },
      {
        test: {
          name: 'tz-la',
          environment: 'node',
          pool: 'forks',
          include: ['src/lib/dates.timezone.test.ts'],
          env: {
            TZ: 'America/Los_Angeles',
          },
        },
      },
      {
        test: {
          name: 'tz-kiritimati',
          environment: 'node',
          pool: 'forks',
          include: ['src/lib/dates.timezone.test.ts'],
          env: {
            TZ: 'Pacific/Kiritimati',
          },
        },
      },
    ],
  },
});
