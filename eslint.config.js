import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import i18next from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

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
          paths: [
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
            {
              name: 'firebase/auth',
              message:
                'Forbidden: direct import of firebase/auth is allowed only in features/auth/** and lib/firebase.ts. See AGENTS.md §7.',
            },
          ],
          patterns: [
            {
              group: ['firebase/firestore/*'],
              message:
                'Forbidden: direct import of firebase/firestore is allowed only in repository.ts, converters.ts, and lib/firebase.ts. See AGENTS.md §7.',
            },
            {
              group: ['firebase/auth/*'],
              message:
                'Forbidden: direct import of firebase/auth is allowed only in features/auth/** and lib/firebase.ts. See AGENTS.md §7.',
            },
            {
              group: ['@/features/**', '../features/**', './features/**'],
              message:
                'Forbidden: features must only be imported through their public index.ts API. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow direct firebase/firestore imports only in designated repository, converter, and lib/firebase modules
    files: [
      '**/repository.ts',
      '**/converters.ts',
      'src/lib/firebase.ts',
      'src/lib/firestore/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/auth',
              message:
                'Forbidden: direct import of firebase/auth is allowed only in features/auth/** and lib/firebase.ts. See AGENTS.md §7.',
            },
          ],
          patterns: [
            {
              group: ['firebase/auth/*'],
              message:
                'Forbidden: direct import of firebase/auth is allowed only in features/auth/** and lib/firebase.ts. See AGENTS.md §7.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow firebase/auth and firebase/firestore in src/lib/firebase.ts and auth feature
    files: ['src/lib/firebase.ts', 'src/features/auth/**'],
    rules: {
      'no-restricted-imports': 'off',
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
    // Architecture boundaries: lib/ and components/ must not import features/ or app/
    files: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**', '@/features', '@/app/**', '@/app'],
              message:
                'Forbidden: lib/ and components/ must not import from features/ or app/. See AGENTS.md §7.',
            },
          ],
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
