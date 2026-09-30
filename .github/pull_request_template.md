## Description

<!-- Provide a brief description of the changes and motivation behind them. -->

**Feature Spec**: <!-- e.g. docs/feature-specs/F00-foundation.md -->
**Task ID**: <!-- e.g. T9 -->

## Type of Change

- [ ] `feat`: New feature
- [ ] `fix`: Bug fix
- [ ] `test`: Adding or updating tests
- [ ] `refactor`: Code refactoring without behavior change
- [ ] `style`: Design system, token or styling update
- [ ] `chore`: Build, CI, or toolchain configuration
- [ ] `docs`: Documentation update

## UI Verification (if applicable)

<!-- Attach screenshots or videos demonstrating the changes in both themes and screen sizes. -->

| Desktop (Light / Dark)         | Mobile 360px (Light / Dark)   |
| ------------------------------ | ----------------------------- |
| <!-- ![Desktop Light](url) --> | <!-- ![Mobile Light](url) --> |

## Verification Evidence

<!-- Paste terminal outputs or summary demonstrating that all checks passed locally. -->

- [ ] `pnpm typecheck` passed (0 errors)
- [ ] `pnpm lint` passed (0 errors)
- [ ] `pnpm format:check` passed
- [ ] `pnpm test` passed
- [ ] `pnpm build` passed (production bundle compiled)
- [ ] `pnpm e2e` passed (smoke tests green)

## Definition of Done (DoD) Checklist

- [ ] Acceptance criteria from the feature spec are fulfilled
- [ ] Unit and/or component tests cover the new logic / edge cases
- [ ] Architectural boundaries strictly respected (no forbidden cross-layer imports)
- [ ] No hardcoded strings in JSX (all user-facing texts localized via i18n)
- [ ] DRY principles followed: no duplicate components or repeated long Tailwind classes
- [ ] No forbidden patterns used (`any`, `as` without justification, float for money, `Date` for transaction date)
- [ ] Accessibility: WCAG 2.1 AA checked, no critical axe violations
- [ ] Relevant documentation updated (`AGENTS.md`, `docs/`, `README.md`)
- [ ] Deferred work, known limitations, or unverified items are explicitly documented
