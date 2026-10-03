import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import i18next from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const RESTRICTED_FIRESTORE_PATHS = [
  {
    name: 'firebase/firestore',
    message:
      'Forbidden: direct import of firebase/firestore is allowed only in repository.ts, converters.ts, and lib/firebase.ts. See AGENTS.md §7.',
  },
  {
    name: 'firebase/firestore/lite',
    message:
      'Forbidden: direct import of firebase/firestore is allowed only in repository.ts, converters.ts, and lib/firebase.ts. See AGENTS.md §7.',
  },
];

const RESTRICTED_FIRESTORE_PATTERNS = [
  {
    group: ['firebase/firestore/*'],
    message:
      'Forbidden: direct import of firebase/firestore is allowed only in repository.ts, converters.ts, and lib/firebase.ts. See AGENTS.md §7.',
  },
];

const RESTRICTED_AUTH_PATHS = [
  {
    name: 'firebase/auth',
    message:
      'Forbidden: direct import of firebase/auth is allowed only in features/auth/authService.ts and lib/firebase.ts. See AGENTS.md §7.',
  },
];

const RESTRICTED_AUTH_PATTERNS = [
  {
    group: ['firebase/auth/*'],
    message:
      'Forbidden: direct import of firebase/auth is allowed only in features/auth/authService.ts and lib/firebase.ts. See AGENTS.md §7.',
  },
];

const RESTRICTED_FEATURE_INTERNALS = [
  {
    group: ['@/features/*/**', '../features/*/**', './features/*/**'],
    message:
      'Forbidden: features must only be imported through their public index.ts API. See AGENTS.md §7.',
  },
];

const RESTRICTED_FEATURES_AND_APP_FROM_LOWER = [
  {
    group: ['@/features/**', '@/features', '@/app/**', '@/app'],
    message:
      'Forbidden: lib/ and components/ must not import from features/ or app/. See AGENTS.md §7.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '.emulator-data',
      'coverage',
      '**/*.d.ts',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      i18next,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          additionalHooks: '(useSubscription)',
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_FIRESTORE_PATHS, ...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_FIRESTORE_PATTERNS,
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
          ],
        },
      ],
    },
  },
  {
    // Architecture boundaries: components/ must not import features/ or app/, and must not import firebase
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_FIRESTORE_PATHS, ...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_FIRESTORE_PATTERNS,
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
          ],
        },
      ],
    },
  },
  {
    // Architecture boundaries: lib/ must not import features/, app/, or components/
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_FIRESTORE_PATHS, ...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_FIRESTORE_PATTERNS,
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
            {
              group: ['@/components/**', '@/components'],
              message:
                'Forbidden: lib/ must not import from components/. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow direct firebase/firestore imports in lib/firestore, but forbid auth, features, app, and components
    files: ['src/lib/firestore/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
            {
              group: ['@/components/**', '@/components'],
              message:
                'Forbidden: lib/ must not import from components/. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow direct firebase/firestore imports in feature repositories and converters
    files: ['src/features/**/repository.ts', 'src/features/**/converters.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
          ],
        },
      ],
    },
  },
  {
    // Allow direct firebase/firestore imports in rules tests
    files: ['rules-tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_AUTH_PATHS],
          patterns: [
            ...RESTRICTED_AUTH_PATTERNS,
            ...RESTRICTED_FEATURE_INTERNALS,
          ],
        },
      ],
    },
  },
  {
    // Auth service is allowed to import firebase/auth, but forbidden to import firebase/firestore, other features, or app
    files: ['src/features/auth/authService.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...RESTRICTED_FIRESTORE_PATHS],
          patterns: [
            ...RESTRICTED_FIRESTORE_PATTERNS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
          ],
        },
      ],
    },
  },
  {
    // Domain modules must be pure functions: no React, no Firebase SDK
    files: [
      'src/lib/{money,dates,aggregations,csv,currencies,limits,balance,locales}*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'Forbidden: domain modules must be pure functions without React. See AGENTS.md §7.',
            },
            {
              name: 'react-dom',
              message:
                'Forbidden: domain modules must be pure functions without React DOM. See AGENTS.md §7.',
            },
            {
              name: 'firebase',
              message:
                'Forbidden: domain modules must be pure functions without Firebase. See AGENTS.md §7.',
            },
            {
              name: 'firebase/app',
              message:
                'Forbidden: domain modules must be pure functions without Firebase. See AGENTS.md §7.',
            },
            ...RESTRICTED_FIRESTORE_PATHS,
            ...RESTRICTED_AUTH_PATHS,
          ],
          patterns: [
            {
              group: ['firebase/*'],
              message:
                'Forbidden: domain modules must be pure functions without Firebase. See AGENTS.md §7.',
            },
            ...RESTRICTED_FEATURE_INTERNALS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
            {
              group: ['@/components/**', '@/components'],
              message:
                'Forbidden: lib/ must not import from components/. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow firebase/auth and firebase/firestore in src/lib/firebase.ts, but forbid features/app/components
    files: ['src/lib/firebase.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...RESTRICTED_FEATURE_INTERNALS,
            ...RESTRICTED_FEATURES_AND_APP_FROM_LOWER,
            {
              group: ['@/components/**', '@/components'],
              message:
                'Forbidden: lib/firebase.ts must not import from components/. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Enforce no-literal-string on user-facing application components (excluding tests)
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/components/common/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}', '**/test/**', 'src/main.tsx'],
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          markupOnly: true,
          onlyAttribute: ['title', 'placeholder', 'aria-label', 'alt'],
        },
      ],
    },
  },
  {
    // Disable type-aware linting on JS/config files
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
