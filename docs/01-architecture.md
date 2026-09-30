# 01. Архитектура

Статус: draft v1

## 1. Обзор

Клиентское SPA. Нет собственного сервера. Браузер обращается напрямую к Firebase Auth и Firestore. Защиту данных обеспечивают Security Rules (`docs/02-data-model.md`).

```
Браузер (React SPA)
  ├─ UI (pages, components)
  ├─ Hooks
  ├─ Repositories ──► Firebase SDK ──► Firebase Auth / Firestore (+ Security Rules, App Check)
  └─ Domain (чистые функции)

Hosting: Firebase Hosting (SPA rewrite) · CI/CD: GitHub Actions
```

## 2. Стек

Версии фиксируются при инициализации F00 (заполнить колонку). Любое изменение версий только через ADR или согласование.

| Слой | Технология | Версия (F00) | Заметка |
|---|---|---|---|
| Сборка | Vite + React + TypeScript (`strict`) | — | SPA, без SSR |
| Пакетный менеджер | pnpm | — | |
| Стили и UI | Tailwind CSS v4, shadcn/ui (Radix), lucide-react | — | Tailwind v4: конфигурация в CSS |
| Роутинг | React Router (data router) | — | Фильтры и месяц в `searchParams` |
| Формы | React Hook Form + Zod + shadcn `Form` | — | Схема Zod: валидация, тип, парсер |
| Backend | Firebase Auth + Firestore (modular SDK) | — | |
| Графики | Recharts (через shadcn `chart`) | — | Грузится лениво |
| Даты | date-fns | — | Локали EN и RU |
| CSV | PapaParse | — | |
| i18n | i18next + react-i18next | — | EN, RU |
| Уведомления | sonner (через shadcn) | — | |
| Тесты | Vitest, Testing Library, Playwright, `@firebase/rules-unit-testing` | — | |
| Качество | ESLint (flat), typescript-eslint, Prettier, Husky, lint-staged, commitlint | — | |
| CI/CD | GitHub Actions, Firebase Hosting | — | Preview-каналы на PR |

## 3. Реестр архитектурных решений

Полные ADR в `docs/adr/` (пачка 2). Здесь краткий реестр.

| ADR | Решение | Суть |
|---|---|---|
| 001 | SPA на Vite, без Next.js | Приложение клиентское, SSR не нужен, Auth проще |
| 002 | Без Cloud Functions | Остаёмся на Spark, вся защита на rules |
| 003 | Деньги в minor units (int) | Нет ошибок float |
| 004 | Дата транзакции строка `YYYY-MM-DD` | Нет проблем с часовыми поясами |
| 005 | Данные в `users/{uid}/...` | Тривиальные и проверяемые правила доступа |
| 006 | Реалтайм `onSnapshot`, запрос по месяцу | Месяц заменяет пагинацию. Без TanStack Query |
| 007 | Доступ к Firestore только через repository | Запросы в одном месте, тестируемость |
| 008 | i18n с первого дня | Ретрофит строк болезнен |
| 009 | Demo через Anonymous Auth | Живая демка на реальном стеке. Риск: квота и накопление аккаунтов |
| 010 | Фильтры на клиенте внутри месяца | Нет составных индексов, мгновенная реакция, не платим за повторные чтения |
| 011 | Дефолтные сущности хранят `systemKey` | Названия переводятся при смене языка |
| 012 | Детерминированный id бюджета `{YYYY-MM}_{categoryId}` | Уникальность «один бюджет на категорию и месяц» без запросов |
| 013 | Без глобального стора | Состояние: Context (auth, тема), URL (фильтры, месяц), хуки (данные) |

## 4. Слои и ответственность

| Слой | Где | Отвечает за | Не делает |
|---|---|---|---|
| **UI** | `features/*/components`, `pages`, `components/common`, `components/ui` | Отрисовка, события, состояния экрана | Не знает про Firestore, не считает деньги |
| **Hooks** | `features/*/hooks`, `src/hooks` | Данные для UI, подписки, мутации, статус (`loading`, `error`) | Не пишет запросы Firestore |
| **Repositories** | `features/*/repository.ts`, `lib/firestore/*` | Чтение и запись, converters, batch, преобразование ошибок в `AppError` | Не знает про React |
| **Domain** | `src/lib/*` (чистые модули) | Деньги, даты, агрегации, CSV, валидация | Не знает про React и Firebase |

### Поток «добавить трату 12.50»

1. UI: форма валидируется схемой Zod, вызывает `useCreateTransaction()`.
2. Domain: строка `"12.50"` превращается в `1250` (`parseMoneyInput`).
3. Hook: вызывает `createTransaction(uid, input)` и не блокирует UI до подтверждения сервером (работает offline).
4. Repository: один `writeBatch` записывает транзакцию и делает `increment` баланса счёта (`balanceDeltas`).
5. `onSnapshot` присылает локальное обновление сразу, затем подтверждение. UI перерисовывается, на ошибку показывается toast.

## 5. Структура папок

```
src/
  app/                        # providers, router, layouts, guards, ErrorBoundary
    providers/                # AuthProvider, ThemeProvider, I18nProvider, QueryBoundary
    router.tsx
    layouts/                  # AppLayout (sidebar + mobile nav), AuthLayout
  features/
    auth/
    categories/
    transactions/
      components/             # TransactionForm, TransactionList, TransactionFilters...
      hooks/
      repository.ts           # Firestore-доступ
      converters.ts           # Zod <-> Firestore
      schemas.ts              # Zod-схемы, типы через z.infer
      utils.ts                # чистая логика фичи
      index.ts                # публичный API фичи
    accounts/ budgets/ dashboard/ import-export/ settings/ demo/
  components/
    ui/                       # shadcn (минимальные правки)
    common/                   # наши общие компоненты (см. §6)
  hooks/                      # общие хуки: useSubscription, useOnlineStatus, useMediaQuery
  lib/
    firebase.ts               # инициализация SDK, эмуляторы, App Check
    firestore/                # createConverter(schema), пути коллекций, batch-хелперы
    env.ts                    # Zod-валидация import.meta.env
    errors.ts                 # AppError, коды, маппинг ошибок Firebase
    money.ts  dates.ts  aggregations.ts  csv.ts  currencies.ts  cn.ts
  i18n/
    index.ts  locales/en/*.json  locales/ru/*.json
  test/                       # setup, фабрики тестовых данных
  main.tsx
docs/  e2e/  firestore.rules  firestore.indexes.json  firebase.json  AGENTS.md
```

Алиас путей: `@/` указывает на `src/` (настраивается в Vite и `tsconfig`).

## 6. Общие компоненты (`components/common`) — основа DRY в UI

Каждый повторяющийся UI-паттерн живёт здесь в единственном экземпляре. Список растёт по мере появления второго использования. Базовый набор:

| Компонент | Назначение |
|---|---|
| `PageHeader` | Заголовок страницы, описание, блок действий |
| `EmptyState` | Пустое состояние: иконка, текст, призыв к действию |
| `ErrorState` | Ошибка с кнопкой повтора |
| `LoadingSkeleton` (варианты list, card, chart) | Скелетоны загрузки |
| `QueryBoundary` | Единая обработка `loading / error / empty / success` для данных подписки |
| `MoneyText` | Сумма с цветом, знаком и иконкой по типу (не только цвет) |
| `AmountInput` | Ввод суммы: запятая и точка, возвращает minor units |
| `MonthNavigator` | Переключение месяца, синхронизация с URL |
| `CategoryBadge` | Иконка и название категории (учитывает `systemKey` и `archived`) |
| `ConfirmDialog` | Подтверждение опасных действий |
| `ResponsiveDialog` | `Dialog` на desktop и `Drawer` на mobile |
| `OfflineBanner` | Индикатор сети |

Правило: стили повторяются в двух местах означает вынос в компонент или вариант `cva`. Подробно: `docs/03-conventions.md`.

## 7. Правила зависимостей (проверяются ESLint)

Направление: `app → features → components/common → components/ui → lib`. Слева направо можно импортировать, справа налево нельзя.

1. Фича импортирует другую фичу **только** через её `index.ts`. Внутренности (`repository`, `components/*`) закрыты.
2. `firebase/firestore` импортируется только в `features/*/repository.ts`, `features/*/converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
3. `firebase/auth` импортируется только в `features/auth/*` и `lib/firebase.ts`.
4. `lib/` не импортирует `features/`, `components/`, `app/`.
5. `components/ui` и `components/common` не импортируют `features/`.
6. Domain-модули (`money`, `dates`, `aggregations`, `csv`) не импортируют React и Firebase.
7. Циклических импортов нет (`import/no-cycle`).
8. Barrel-файлы только `features/*/index.ts`.
9. Нет жёстких строк в JSX (правило ESLint для i18n или ревью).

Инструменты: `no-restricted-imports`, `eslint-plugin-boundaries` (или эквивалент), `eslint-plugin-import`. Настраивается в F00 и не отключается агентом.

## 8. Сквозные механизмы

### 8.1 Firebase и окружения

- Один модуль `lib/firebase.ts`: инициализация приложения, Auth, Firestore с `persistentLocalCache` и `persistentMultipleTabManager` (offline и несколько вкладок), подключение эмуляторов при `VITE_USE_EMULATORS=true`, App Check.
- Проекты: `finance-tracker-dev` (preview) и `finance-tracker-prod`. Локальная разработка только на эмуляторах.
- Точные API сверяются через Context7 (SDK меняется).

### 8.2 Переменные окружения

`.env.example` в репозитории, `.env.local` в `.gitignore`. Валидация Zod при старте (`lib/env.ts`), приложение падает с понятной ошибкой при отсутствии переменной.

| Переменная | Назначение |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID` (и другие из `firebaseConfig`) | Конфиг Firebase (не секрет, защищается rules, App Check и ограничением ключа) |
| `VITE_USE_EMULATORS` | `true` в dev |
| `VITE_APPCHECK_SITE_KEY`, `VITE_APPCHECK_DEBUG_TOKEN` | App Check |

### 8.3 Состояние приложения

| Что | Где хранится |
|---|---|
| Пользователь и статус входа | `AuthProvider` (Context) |
| Тема, язык | Context + профиль пользователя + localStorage (чтобы не мигала тема до загрузки профиля) |
| Месяц, фильтры, сортировка | URL (`searchParams`). Хуки читают URL как источник истины |
| Серверные данные | Хуки подписок (`useSubscription`), без глобального кеша |
| Состояние форм | React Hook Form |
| Диалоги | Локальный `useState` |

### 8.4 Auth и guard'ы

Состояния: `loading` → `unauthenticated` | `authenticated` с подсостоянием `needsOnboarding` | `ready`.

- Пока `loading`, показывается экран-скелетон (нет «мигания» страницы логина).
- `needsOnboarding`: у пользователя нет документа профиля. Создаётся профиль, набор категорий и счёт «Основной» **одним batch** (`02-data-model.md`).
- Роуты `/app/**` закрыты guard'ом: нет пользователя означает редирект на `/login`. Авторизованного пользователя редиректит с `/login` на `/app/dashboard`.
- Demo: `signInAnonymously`, затем сид. Конвертация в аккаунт через `linkWithCredential`. Обработать `auth/credential-already-in-use` (предложить войти в существующий аккаунт, сообщив, что демо-данные не перенесутся).
- Email enumeration protection включена в консоли (проверить при настройке).
- Неподтверждённый email: баннер с повторной отправкой, доступ не блокируется (решение можно пересмотреть в F02).

### 8.5 Подписки на данные

- Repository экспортирует функции вида `subscribeX(uid, params, onData, onError): Unsubscribe`.
- Общий хук `useSubscription` (один на весь проект) отвечает за: подписку, отписку в cleanup, корректную работу под React StrictMode (двойной вызов эффектов), переход в `loading` при смене параметров, единый формат состояния.
- Состояние: `{ status: 'loading' } | { status: 'success', data } | { status: 'error', error: AppError }`.
- Фичи **не пишут** собственные `useEffect` с `onSnapshot`.
- Используем данные из локального кеша: `snapshot.data({ serverTimestamps: 'estimate' })`, чтобы pending-записи не давали `null`.

### 8.6 Мутации и offline

- Запись в Firestore не резолвится до подтверждения сервером. Поэтому UI **не ждёт** `await` для оптимистичного отображения: snapshot показывает локальную запись сразу.
- Мутации в хуках возвращают промис. Ошибка (например `permission-denied`) обрабатывается в `.catch` и показывается toast.
- Удаление с отменой (undo): мягкая отсрочка на клиенте или повторное создание записи (решается в спеке F05).
- `OfflineBanner` отслеживает `navigator.onLine`.

### 8.7 Ошибки

- `lib/errors.ts`: тип `AppError { code, message?, cause? }`, коды (`permission-denied`, `not-found`, `offline`, `validation`, `unknown`, `auth/*`), функция `toAppError(unknown)`.
- Repository ловит ошибки Firebase и бросает `AppError`. Хук отдаёт его в UI. Тексты ошибок берутся из i18n по `code`.
- Глобальный `ErrorBoundary` для непредвиденных ошибок рендера. `QueryBoundary` для ошибок данных.

### 8.8 Роутинг

Data router, lazy-роуты для тяжёлых страниц (`dashboard` с графиками, `import-export`). Страницы экспортируются по имени, lazy подключается через `lazy: () => import(...).then(m => ({ Component: m.XPage }))` (сверить API через Context7).

| Роут | Назначение |
|---|---|
| `/` | Редирект: авторизован на `/app/dashboard`, иначе на `/login` |
| `/login` | Вход (email, Google, кнопка «Демо») |
| `/register` | Регистрация |
| `/reset-password` | Сброс пароля |
| `/app` | Редирект на `/app/dashboard` |
| `/app/dashboard` | Итоги месяца, графики, последние операции |
| `/app/transactions` | Список по дням, месяц и фильтры в URL, CRUD |
| `/app/accounts` | Счета и балансы |
| `/app/budgets` | Лимиты и прогресс |
| `/app/categories` | Управление категориями |
| `/app/import-export` | CSV-экспорт и импорт |
| `/app/settings` | Профиль, валюта, язык, тема, удаление аккаунта |
| `*` | Страница 404 |

### 8.9 Тема и язык

- Тема: `light | dark | system`, класс `dark` на `<html>`. Инлайн-скрипт в `index.html` применяет сохранённую тему до монтирования React (нет мигания).
- Язык: i18next, ключи `feature.section.key`, файлы по namespace, плюрали через i18next. Даты через date-fns с локалью, числа и валюты через `Intl`.

### 8.10 Производительность

- Lazy-роуты, graphs и импорт грузятся по требованию.
- Подписка на ограниченный набор данных (месяц, для дашборда несколько месяцев).
- Агрегации (`lib/aggregations.ts`) чистые, результат мемоизируется в хуках (`useMemo`).
- Бюджет бандла и Lighthouse проверяются в CI/F13.

## 9. CI/CD

| Этап | Проверка |
|---|---|
| PR | typecheck, lint, unit и компонентные тесты, rules-тесты (эмулятор), build, e2e, preview-деплой на Firebase Hosting |
| Merge в `main` | Всё выше плюс деплой в prod (Hosting, правила, индексы) |
| Защита | Merge только при зелёном CI. Правки `firestore.rules`, индексов и CI требуют явного ревью |

Ветки: `feat/F05-transactions`. Коммиты: conventional commits на английском. Squash merge.

## 10. Расширение (пути апгрейда)

| Потребность | Путь |
|---|---|
| Тяжёлые агрегации за много месяцев | Серверные aggregation queries или месячные summary-документы в том же batch |
| Повторяющиеся транзакции | Материализация при открытии приложения, затем Cloud Functions при смене решения |
| Замена Firestore | Замена реализаций `repository.ts`, hooks и UI не меняются |
| Глобальный кеш запросов | TanStack Query для не-realtime данных (ADR-006) |
| Украинский язык | Добавить `locales/uk`, обновить whitelist локалей в rules |
