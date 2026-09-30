# F00 — Foundation

Статус: spec-ready
Зависит от: Фаза 0 (P1–P9 в `docs/06-roadmap.md`)
Размер: L (11 задач)
Ветка: `feat/F00-foundation` (один коммит на задачу, PR после T9, чтобы CI проверил сам себя)

> Агент читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§2, §5, §7, §8), `docs/04-ux-guidelines.md` (§2–§4), `docs/03-conventions.md`, `docs/05-testing-strategy.md`.
> Все точные команды установки и API (Vite, Tailwind v4, shadcn, Firebase, i18next, ESLint flat, Vitest, Playwright) сверяются через **Context7**. Версии фиксируются по факту установки.

## 1. Цель

Получить рабочий «скелет» проекта: сборка, строгие проверки качества, дизайн-система, i18n, Firebase-инфраструктура (эмуляторы), каркас приложения и CI. После F00 любая фича добавляется в готовую инфраструктуру, а агент физически не может нарушить границы слоёв.

## 2. Скоуп

**Входит:**
- Репозиторий, Vite + React + TypeScript (strict), pnpm, алиас `@/`.
- ESLint (границы слоёв, запрет жёстких строк), Prettier, Husky, lint-staged, commitlint.
- Tailwind CSS v4, shadcn/ui, токены темы (светлая и тёмная), тема без мигания.
- i18next (EN, RU), типизированные ключи.
- `lib/env.ts`, `lib/firebase.ts`, конфигурация эмуляторов, placeholder-правила (deny-all), пустой файл индексов.
- Роутер со всеми роутами-заглушками, `AppLayout`, `AuthLayout`, `ErrorBoundary`, `OfflineBanner`, 404.
- Базовые `components/common`: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`.
- `lib/errors.ts` (`AppError`) и `hooks/useSubscription`.
- Vitest, Testing Library, Playwright (smoke и axe), тестовые хелперы.
- CI (GitHub Actions), шаблон PR, deploy-воркфлоу Firebase Hosting (preview и prod).
- README (скелет), заполнение версий и команд в документах, финализация скилла `verify`.

**Не входит:**
- Auth, профиль, guard'ы (F02), реальные Security Rules (F03), данные и бизнес-фичи.
- `ResponsiveDialog`, `MoneyText`, `AmountInput`, `MonthNavigator`, `CategoryBadge`, `ConfirmDialog` (создаются в фичах, где впервые нужны).
- App Check (только заглушка, включение в F13), PWA, Recharts (появится в F06).

## 3. Решения, зафиксированные в F00

| Вопрос | Решение |
|---|---|
| Название | `<APP_NAME>` подставляется из Фазы 0 (P9). Заменить `FinTrack` во всех документах |
| Определение языка при первом визите | `ru*` в `navigator.language` → `ru`, иначе `en`. Выбор сохраняется в `localStorage`. После F02 источником станет профиль |
| Тема | `light \| dark \| system`, хранится в `localStorage`, применяется до монтирования React |
| Расположение переключателей темы и языка | Временно в шапке `AppLayout`. Перенос в Settings в F11 (компоненты переиспользуются) |
| Пути | Единый источник: `src/app/routes.ts` (константы `ROUTES`) |
| Порядок обработки ошибок и `AppError` | `lib/errors.ts` создаётся здесь (а не в F01), так как нужен `QueryBoundary` |

## 4. Пользовательские сценарии

| # | Сценарий | Результат |
|---|---|---|
| 1 | `pnpm dev`, открыть `/` | Редирект на `/app/dashboard`, виден `AppLayout` (временно без auth) |
| 2 | Переключить тему, перезагрузить страницу | Тема сохранена, нет мигания светлой темы |
| 3 | Переключить язык EN и RU | Тексты меняются, выбор сохраняется |
| 4 | Открыть каждый роут из меню | Показывается страница-заглушка (`PageHeader` + `EmptyState`), чанк грузится лениво |
| 5 | Сузить окно до 360 px | Вместо сайдбара нижняя навигация, нет горизонтального скролла |
| 6 | Отключить сеть | Появляется `OfflineBanner`, при возврате сети исчезает |
| 7 | Бросить ошибку в компоненте | `ErrorBoundary` показывает `ErrorState` с кнопкой перезагрузки |
| 8 | Открыть несуществующий URL | Страница 404 с ссылкой на главную |
| 9 | Добавить запрещённый импорт (`firebase/firestore` в компоненте) | `pnpm lint` падает с понятным сообщением |
| 10 | Убрать переменную из `.env.local` | Приложение показывает понятную ошибку конфигурации со списком переменных |

## 5. UI

### AppLayout
- **Desktop (≥ 1024 px):** shadcn `Sidebar`: Dashboard, Transactions, Accounts, Budgets, Categories, Import/Export, Settings.
- **Mobile (< 1024 px):** нижняя панель: Dashboard, Transactions, Budgets, More. «More» открывает `Sheet` с остальными пунктами. Кнопка быстрого добавления (FAB) пока отсутствует (появится в F05).
- Шапка: заголовок, переключатель темы, переключатель языка (временные).
- Safe-area для нижней панели (`env(safe-area-inset-bottom)`).
- Навигация описывается **одним массивом** (`navItems`), из которого строятся и сайдбар, и нижняя панель (DRY).

### AuthLayout
Центрированная карточка с логотипом и слотом для формы (используется в F02).

### Страницы-заглушки
`PageHeader` + `EmptyState` с текстом из i18n (`placeholder.comingSoon`). Каждая страница экспортируется по имени и подключается через lazy.

### Переиспользование (DRY-проверка)

| Что нужно | Решение |
|---|---|
| Повторяющиеся заглушки страниц | Один компонент `PlaceholderPage` с пропсом `titleKey` |
| Пункты навигации | Один массив `navItems` |
| Шапка страницы, пустое и ошибочное состояние, скелетон | `components/common` (создаются здесь, дальше только используются) |
| Стили кнопок и карточек | Только shadcn-компоненты и токены |

## 6. Данные и инфраструктура

- Коллекций нет. Запросов нет.
- `firestore.rules`: **placeholder** `allow read, write: if false;` (полностью закрыто) до F03.
- `firestore.indexes.json`: пустой список индексов.
- `firebase.json`: эмуляторы (Auth, Firestore, Hosting, UI, порты по умолчанию или заданные явно), Hosting (`public: dist`, SPA rewrite, кеш-заголовки для хешированных ассетов, отсутствие кеша для `index.html`).
- `.firebaserc`: алиасы `dev` и `prod` (значения из Фазы 0).
- Скрипт `emulators`: с `--import=./.emulator-data --export-on-exit`. `.emulator-data/` в `.gitignore`.
- Локальная разработка только на эмуляторах (`VITE_USE_EMULATORS=true`).

## 7. Контракты

```ts
// src/app/routes.ts — единственный источник путей
export const ROUTES = {
  root: '/',
  login: '/login',
  register: '/register',
  resetPassword: '/reset-password',
  app: '/app',
  dashboard: '/app/dashboard',
  transactions: '/app/transactions',
  accounts: '/app/accounts',
  budgets: '/app/budgets',
  categories: '/app/categories',
  importExport: '/app/import-export',
  settings: '/app/settings',
} as const
```

```ts
// src/lib/errors.ts
export type AppErrorCode =
  | 'permission-denied' | 'not-found' | 'offline' | 'validation'
  | 'unauthenticated' | 'unknown' | `auth/${string}`

export class AppError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message?: string, options?: { cause?: unknown })
}

// Превращает любую ошибку (в том числе FirebaseError по полю code) в AppError.
// НЕ импортирует firebase: опирается на строковое поле `code`.
export function toAppError(error: unknown): AppError
```

```ts
// src/hooks/useSubscription.ts
export type SubscriptionState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AppError }

export type SubscriptionResult<T> = SubscriptionState<T> & { retry: () => void }

// subscribe вызывается внутри эффекта, возвращает функцию отписки.
// При смене deps: отписка, статус loading, новая подписка.
export function useSubscription<T>(
  subscribe: (onData: (data: T) => void, onError: (error: unknown) => void) => () => void,
  deps: React.DependencyList,
): SubscriptionResult<T>
```

```tsx
// src/components/common/QueryBoundary.tsx
type QueryBoundaryProps<T> = {
  state: SubscriptionResult<T>
  isEmpty?: (data: T) => boolean      // по умолчанию: пустой массив
  skeleton?: React.ReactNode          // по умолчанию <LoadingSkeleton variant="list" />
  empty: React.ReactNode              // обычно <EmptyState ... />
  children: (data: T) => React.ReactNode
}
```

```ts
// src/lib/env.ts: Zod-схема переменных окружения, экспорт `env` (типизированный объект).
// Обязательные: VITE_FIREBASE_* (из firebaseConfig), VITE_USE_EMULATORS (boolean-строка).
// Необязательные: VITE_APPCHECK_SITE_KEY, VITE_APPCHECK_DEBUG_TOKEN.

// src/lib/firebase.ts: экспортирует `app`, `auth`, `db`.
// Firestore с persistentLocalCache и persistentMultipleTabManager.
// Эмуляторы при env.VITE_USE_EMULATORS. App Check — заглушка (включение в F13).
```

Правило для линтера: `react-hooks/exhaustive-deps` должен знать про `useSubscription` (`additionalHooks`).

## 8. Правила ESLint (границы из `docs/01-architecture.md` §7)

| Правило | Реализация |
|---|---|
| `firebase/firestore` только в `features/*/repository.ts`, `features/*/converters.ts`, `lib/firebase.ts`, `lib/firestore/**` | `no-restricted-imports` с переопределением для разрешённых файлов |
| `firebase/auth` только в `features/auth/**` и `lib/firebase.ts` | то же |
| Фича импортирует фичу только через `index.ts` | `eslint-plugin-boundaries` или `no-restricted-imports` с паттернами |
| `lib/` не импортирует `features/`, `components/`, `app/` | boundaries |
| `components/ui` и `components/common` не импортируют `features/` | boundaries |
| Domain-модули не импортируют React и Firebase | `no-restricted-imports` для `lib/{money,dates,aggregations,csv,balance,currencies}*.ts` |
| Нет циклов | `import/no-cycle` |
| Нет жёстких строк в JSX | `eslint-plugin-i18next` (`no-literal-string`) для `src/features/**` и `src/components/common/**`, `src/app/**`. Исключения: `components/ui`, тесты, `main.tsx` (экран ошибки конфигурации) |
| Доступность | `eslint-plugin-jsx-a11y` |
| Типобезопасность | `typescript-eslint` type-checked правила, запрет `any`, `ts-ignore` (разрешён `ts-expect-error` с описанием) |
| Именованные экспорты | правило против `export default` (исключения: конфиги) |

## 9. Валидация и ошибки

| Ситуация | Поведение |
|---|---|
| Нет или невалидна переменная окружения | Ошибка на старте со списком проблемных переменных |
| Ошибка рендера | `ErrorBoundary` показывает `ErrorState` (кнопка «Перезагрузить») |
| Любая неожиданная ошибка | `toAppError` даёт код, `ErrorState` берёт текст из `errors.<code>` i18n, для неизвестных кодов `errors.unknown` |

## 10. i18n-ключи (минимальный набор, EN и RU)

Namespaces: `common`, `nav`, `errors`, `validation`, `layout`, `placeholder`.

- `common.actions.{save,cancel,retry,delete,add,edit,close,reload}`
- `common.status.{loading,offline,online}`
- `nav.{dashboard,transactions,accounts,budgets,categories,importExport,settings,more}`
- `errors.{permission-denied,not-found,offline,validation,unauthenticated,unknown}` и заголовок `errors.title`
- `layout.{theme.light,theme.dark,theme.system,language.en,language.ru,openMenu,offlineBanner}`
- `placeholder.comingSoon.{title,description}`
- `notFound.{title,description,goHome}`
- `validation.*` — пока пустой раздел, заполняется в F02.

## 11. Acceptance criteria

- [ ] AC1: `pnpm install && pnpm dev` на чистом клоне запускает приложение. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` проходят без ошибок и предупреждений.
- [ ] AC2: TS работает с `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. Алиас `@/` работает в Vite, TS, Vitest и ESLint.
- [ ] AC3: Временный файл с `import ... from 'firebase/firestore'` в `src/features/x/components/` ломает `pnpm lint`. Временный файл с импортом внутренностей другой фичи ломает lint. Жёсткая строка в JSX ломает lint. (Проверено руками, временные файлы удалены.)
- [ ] AC4: Pre-commit запускает lint-staged, `commit-msg` отклоняет сообщение не в формате Conventional Commits.
- [ ] AC5: Тема `light/dark/system` работает, сохраняется, при перезагрузке нет мигания. Все токены из `04-ux-guidelines.md` §2.1 определены для обеих тем. Фактические значения записаны в §2 документа `04-ux-guidelines.md`, контраст проверен и результат приложен к PR.
- [ ] AC6: Язык EN и RU переключается и сохраняется. Первый визит определяет язык по правилу из §3. Ключи типизированы: опечатка в `t('...')` ломает `pnpm typecheck`. Плюрали работают для EN и RU (есть unit-тест на русские три формы).
- [ ] AC7: Все роуты из `ROUTES` открываются, страницы грузятся лениво, есть 404. `/` редиректит на `/app/dashboard`.
- [ ] AC8: `AppLayout`: desktop с сайдбаром, mobile (360 px) с нижней панелью и «More», без горизонтального скролла. Навигация строится из одного массива `navItems`.
- [ ] AC9: `OfflineBanner` появляется при потере сети и исчезает при возврате. `ErrorBoundary` ловит ошибку рендера.
- [ ] AC10: `useSubscription` покрыт тестами: подписка и отписка при размонтировании, корректная работа под StrictMode, переход в `loading` при смене deps, ошибка в `error`, `retry`. `QueryBoundary` покрыт тестами для loading, error, empty, success.
- [ ] AC11: `toAppError` покрыт тестами (Firebase-подобная ошибка с `code`, обычная `Error`, не-Error значение).
- [ ] AC12: `lib/firebase.ts` подключается к эмуляторам при `VITE_USE_EMULATORS=true`. `pnpm emulators` стартует, UI эмулятора открывается, данные сохраняются между перезапусками.
- [ ] AC13: CI на PR выполняет typecheck, lint, test, build, e2e smoke и приходит зелёным. Preview-деплой на Firebase Hosting публикует ссылку в PR.
- [ ] AC14: В `.gitignore` есть `.env*` (кроме `.env.example`), `.emulator-data`, `dist`, `node_modules`, отчёты тестов. Секретов в репозитории нет.
- [ ] AC-STATES: Заглушки и layout показывают корректные loading (скелетон маршрута) и error (ErrorBoundary) состояния.
- [ ] AC-I18N: Нет жёстких строк в JSX (кроме исключений из §8).
- [ ] AC-A11Y: axe не находит критичных нарушений на `/app/dashboard` (layout) в обеих темах.
- [ ] AC-ARCH: Границы слоёв соблюдены, `components/common` содержит только перечисленные в скоупе компоненты, нет дублирования стилей.

## 12. План тестов

| Уровень | Что |
|---|---|
| Unit | `toAppError`, `env` (валидный и невалидный), `ROUTES`/`navItems` консистентность, определение языка, плюрали RU |
| Component | `useSubscription`, `QueryBoundary`, `ErrorState`, `EmptyState`, `OfflineBanner`, `ErrorBoundary`, `AppLayout` (рендер навигации) |
| E2E (smoke) | Загрузка `/`, навигация по роутам, смена темы и языка, 404, mobile viewport (нижняя панель), axe на layout |
| Rules, integration | Нет (появятся в F03 и далее) |

## 13. Задачи

| # | Задача | Основные файлы | Проверка после |
|---|---|---|---|
| T1 | **Scaffold.** Vite react-ts создаётся **во временной папке**, файлы переносятся в корень репозитория, **не затирая** `AGENTS.md`, `docs/`, `skills/`. pnpm (поле `packageManager`), `.nvmrc` и `engines`, `tsconfig` с флагами из AC2, алиас `@/`, `.gitignore`, `.editorconfig`, удаление демо-кода, скрипты `dev`, `build`, `preview`, `typecheck` | `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `src/main.tsx` | `pnpm dev`, `pnpm build`, `pnpm typecheck` |
| T2 | **Качество.** ESLint flat (правила из §8), Prettier, Husky, lint-staged, commitlint. Скрипты `lint`, `format`, `format:check`. Разрешённые зависимости: eslint, typescript-eslint, eslint-plugin-{react-hooks,jsx-a11y,import,boundaries,i18next}, prettier, husky, lint-staged, @commitlint/* | `eslint.config.js`, `.prettierrc`, `.husky/*`, `commitlint.config.js` | Временные нарушения (AC3), тестовый коммит (AC4) |
| T3 | **Tailwind v4 + shadcn + токены + тема.** Tailwind через официальный плагин Vite, `shadcn init`, токены из `04-ux-guidelines.md` §2 (включая `income`, `expense`, `warning`, `success`, палитру категорий `--cat-*`, `chart-*`), локальный шрифт, `cn()`, `ThemeProvider` и inline-скрипт против мигания, prettier-plugin для Tailwind. Установить через CLI shadcn только нужное: `button`, `card`, `skeleton`, `sonner`, `separator`, `sidebar` (с зависимостями), `sheet`, `tooltip`, `dropdown-menu`. Обновить §2 документа `04-ux-guidelines.md` фактическими значениями и записать результат проверки контраста | `src/index.css`, `src/components/ui/*`, `src/lib/cn.ts`, `src/app/providers/ThemeProvider.tsx` | `pnpm build`, визуальная проверка в обеих темах |
| T4 | **i18n.** i18next + react-i18next, namespaces, файлы EN и RU, определение языка (§3), типизированные ключи (module augmentation), `I18nProvider`, переключатель языка, тест плюралей RU | `src/i18n/*`, `src/app/providers/I18nProvider.tsx` | `pnpm typecheck` (опечатка в ключе падает), `pnpm test` |
| T5 | **Firebase и окружение.** `lib/env.ts`, `lib/firebase.ts`, `.env.example`, `firebase.json`, `.firebaserc`, placeholder `firestore.rules` (deny-all), пустой `firestore.indexes.json`, скрипт `emulators`. Разрешённые зависимости: `firebase`, `zod`, `firebase-tools` (dev). Экран ошибки конфигурации в `main.tsx` | `src/lib/env.ts`, `src/lib/firebase.ts`, `firebase.json`, `.env.example` | `pnpm emulators`, `pnpm dev` с эмуляторами, тест `env` |
| T6 | **Каркас приложения.** `routes.ts`, router (data router, lazy-страницы), `AppLayout` (sidebar, bottom nav, More-sheet), `AuthLayout`, `PlaceholderPage`, 404, `ErrorBoundary`, `OfflineBanner`, `useOnlineStatus`, провайдеры (Theme, I18n, Toaster). Разрешённая зависимость: `react-router` (пакет и API сверить через Context7) | `src/app/**`, `src/hooks/useOnlineStatus.ts` | `pnpm dev`, сценарии 1–8 |
| T7 | **`common`, ошибки, подписки.** `lib/errors.ts`, `hooks/useSubscription.ts`, `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton` (варианты list, card, chart), `QueryBoundary`, unit и component тесты | `src/lib/errors.ts`, `src/hooks/*`, `src/components/common/*` | `pnpm test` |
| T8 | **Тестовая инфраструктура.** Vitest (jsdom, setup, алиас), Testing Library, `renderWithProviders` (i18n, router), Playwright (конфиг, smoke-сценарии, axe), скрипты `test`, `e2e`. Разрешённые зависимости: vitest, @testing-library/*, jsdom, @playwright/test, @axe-core/playwright | `vitest.config.ts`, `src/test/*`, `playwright.config.ts`, `e2e/*` | `pnpm test`, `pnpm e2e` |
| T9 | **CI.** `.github/workflows/ci.yml` (кеш pnpm, typecheck, lint, format:check, test, build, e2e, сохранение артефактов Playwright при падении), `.github/pull_request_template.md` (ссылка на спеку, скриншоты desktop и mobile, отчёт verify, чеклист DoD) | `.github/**` | Открыть PR: CI зелёный |
| T10 | **Hosting и деплой.** Этап с **ручными действиями владельца** (см. §14). Агент добавляет и проверяет воркфлоу preview (на PR, проект dev) и prod (merge в `main`), деплой правил и индексов на prod, кеш-заголовки. Секреты не попадают в репозиторий | `.github/workflows/*`, `firebase.json` | PR получает preview-ссылку, merge деплоит в prod |
| T11 | **Финализация.** Заполнить версии в `docs/01-architecture.md` §2, команды в `AGENTS.md` §3, заменить `FinTrack` на финальное название, README (EN, скелет: название, описание, статус, стек, запуск, структура), финализировать `skills/verify` (реальные команды вместо `<F00>`), обновить статус в `docs/06-roadmap.md`, прогнать `verify` | документы, `README.md`, `skills/verify/SKILL.md` | Скилл `verify` (все шаги) |

После каждой задачи: `pnpm typecheck && pnpm lint && pnpm test`, коммит по Conventional Commits (английский).

## 14. Действия владельца (то, что агент сделать не может)

| Когда | Действие |
|---|---|
| До T1 | Завершена Фаза 0 (репозиторий, инструменты, MCP, Firebase-проекты). Значения `firebaseConfig` положены в `.env.local` (не в git) |
| До T5 | Установлен JDK для эмулятора Firestore (версию сверить в документации Firebase), выполнен `firebase login` |
| T10 | `firebase init hosting:github` (создаёт сервисный аккаунт и секреты GitHub), привязка репозитория, проверка секретов в настройках GitHub |
| После первого зелёного CI | Включить защиту ветки `main`: обязательный PR, обязательный статус CI, только squash merge, удаление веток после merge |
| После T10 | Добавить домен Hosting в Authorized domains Firebase Auth (детальный план настройки Firebase выдаётся отдельно перед F00) |

## 15. Definition of Done

- [ ] AC1–AC14 и AC-* выполнены
- [ ] Тесты из плана написаны и проходят локально и в CI
- [ ] Скилл `verify` пройден, отчёт приложен к PR
- [ ] Нет нарушений `AGENTS.md` (разделы 7, 8, 11)
- [ ] Версии, команды, название, токены зафиксированы в документах
- [ ] Защита ветки `main` включена
- [ ] Статус F00 в `docs/06-roadmap.md` = `done`

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос или решение | Статус |
|---|---|---|
| — | Точный набор ESLint-плагинов для границ (`boundaries` или `no-restricted-imports`) выбирается в T2 по документации и фиксируется | open |
| — | Способ подключения lazy-страниц в выбранной версии роутера | open |
