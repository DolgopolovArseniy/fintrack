# 06. Roadmap

Статус: draft v1 · Обновляется при закрытии каждой фичи (`todo` → `spec-ready` → `in-progress` → `done`).

## 1. Фаза 0: подготовка (до F00)

Ничего из реализации не начинается, пока эти пункты не закрыты.

| # | Пункт | Статус |
|---|---|---|
| P1 | Документы пачек 1 и 2 в репозитории (`AGENTS.md`, `docs/**`) | todo |
| P2 | Публичный GitHub-репозиторий, ветка `main`, защита ветки (PR и CI) | todo |
| P3 | Установлены Node (LTS), pnpm, Git, JDK (для эмулятора Firestore, версию сверить в документации Firebase) | todo |
| P4 | Установлены VSCode и Antigravity CLI, понятно, как агент читает `AGENTS.md` (или `GEMINI.md`) | todo |
| P5 | Подключены MCP: **Context7** и **GitHub**, проверены вызовом | todo |
| P6 | Скилл `verify` (черновик готов), остальные скиллы написаны и подключены | todo |
| P7 | Firebase: проекты dev и prod, Web App, Auth, Firestore (Native, регион), Hosting (шаги в отдельном плане перед F00) | todo |
| P8 | Все спеки фич как минимум F00 и F01 в статусе `spec-ready` | todo |
| P9 | Решено название проекта и список валют (`00-project-spec.md` §12) | todo |

## 2. Порядок и зависимости

| Порядок | ID | Фича | Зависит от | Размер | Статус |
|---|---|---|---|---|---|
| 1 | F00 | Foundation (репозиторий, Vite, TS strict, Tailwind, shadcn init, ESLint-границы, Prettier, Husky, Vitest, Playwright, CI, Firebase init и эмуляторы, layout, тема, i18n, ErrorBoundary, env, `components/common` базовые) | P1–P9 | M | todo |
| 2 | F01 | Domain core (`money`, `dates`, `currencies`, `errors`, Zod-схемы, `createConverter`, `balanceDeltas`, unit-тесты) | F00 | S | done |
| 3 | F02 | Auth (email, Google, reset, `AuthProvider`, guard'ы, профиль, выход) | F00 | M | done |
| 4 | F03 | Firestore rules v1 + rules-тесты + `firestore.indexes.json` (пустой) + деплой правил | F01, F02 | M | done |
| 5 | F04 | Categories + онбординг (профиль, категории, счёт «Основной»). **Эталонная фича** | F03 | S | done |
| 6 | F05 | Transactions (форма, список по дням, навигатор месяца, фильтры в URL, edit, delete с undo, баланс через batch) | F04 | L | done |
| 7 | F06 | Dashboard (KPI, donut, доход и расход по месяцам, последние) | F05 | M | done |
| 8 | F12 | Demo-режим (anonymous auth, сид, конвертация в аккаунт) | F02, F04, F05, F06 | M | todo |
| 9 | F07 | Accounts UI (создание, архивация, пересчёт баланса, выбор счёта) | F05 | M | done |
| 10 | F08 | Budgets | F05 | M | done |
| 11 | F09 | CSV export | F05 | S | in-progress |
| 12 | F10 | CSV import с превью | F07, F09 | L | todo |
| 13 | F11 | Settings (валюта, язык, тема, удаление аккаунта, экспорт всех данных) | F02 | M | todo |
| 14 | F13 | Polish (a11y-проход, perf, e2e-полнота, README EN и RU, кейс-стади, prod-деплой) | все | M | todo |

**Размер:** S около 1 сессии в день, M несколько задач, L крупная фича, дробим на задачи T1…Tn в спеке.

## 3. Вехи

| Веха | Фичи | Результат |
|---|---|---|
| **M1 Foundation** | F00–F03 | Проект собирается, CI зелёный, вход работает, rules протестированы |
| **M2 Core** | F04–F06 | Рабочий продукт: категории, транзакции, дашборд |
| **M3 Demo** | F12 | Live-демка без регистрации (уже можно показывать) |
| **M4 Finance** | F07–F08 | Счета и бюджеты («вау»-элемент №1) |
| **M5 Data** | F09–F10 | Экспорт и импорт («вау»-элемент №2) |
| **M6 Account** | F11 | Настройки, удаление данных |
| **M7 Release** | F13 | Портфолио-готовность |

## 4. Чеклисты по фичам (укрупнённо)

Детальные задачи T1…Tn и acceptance criteria лежат в `feature-specs/Fxx-*.md`.

### F00 Foundation
- [ ] Репозиторий, lint-staged, Husky, commitlint
- [ ] Vite, React, TS strict, алиас `@/`
- [ ] Tailwind v4, shadcn init, токены темы (`04-ux-guidelines.md`)
- [ ] ESLint flat, правила границ и запрета импортов, запрет жёстких строк
- [ ] Vitest, Testing Library, Playwright, конфиг эмуляторов в тестах
- [ ] Firebase init, эмуляторы, `lib/firebase.ts`, `lib/env.ts`
- [ ] i18n (EN, RU), `AppLayout`, тема без мигания, `ErrorBoundary`, роутер с заглушками
- [ ] Базовые `components/common`: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`
- [ ] CI (typecheck, lint, test, build), preview-деплой
- [ ] Заполнены версии в `01-architecture.md`, команды в `AGENTS.md`
- [ ] Финализирован скилл `verify` под реальные команды

### F01 Domain core
- [x] `money`, `dates`, `currencies`, `errors`, `aggregations` (основа), `balanceDeltas`
- [x] Схемы Zod и `createConverter`
- [x] Unit-тесты, покрытие ветвей по стратегии

### F02 Auth
- [x] Регистрация, вход email, Google, reset, выход
- [x] `AuthProvider` со статусом `loading`, guard'ы, редиректы
- [x] Баннер подтверждения email, переведённые ошибки
- [x] Тесты (component, e2e 1–2)

### F03 Rules
- [x] `firestore.rules` из `02-data-model.md`, полный набор rules-тестов
- [x] Пустой `firestore.indexes.json`, деплой правил в dev
- [x] Проверка синтаксиса на эмуляторе, правки документа по факту

### F04 Categories
- [x] Онбординг-batch, дефолтные категории и счёт
- [x] CRUD и архивация, `CategoryBadge`, пикер иконки и цвета
- [x] Образец для остальных фич (структура, тесты, паттерны)

### F05 Transactions
- [x] Repository, converters, `balanceDeltas`, batch с балансом
- [x] Хуки, форма (`ResponsiveDialog`, `AmountInput`), список по дням
- [x] `MonthNavigator`, фильтры в URL, edit, delete с undo
- [x] Все 5 состояний, mobile, i18n, тесты (unit, integration, component, e2e 4–5, 11)

### F06 Dashboard
- [x] KPI, donut, столбцы по месяцам, последние операции
- [x] Lazy-загрузка графиков, доступные таблицы, все состояния

### F12 Demo
- [ ] Anonymous auth, детерминированный сид (~100 записей), кнопка на `/login`
- [ ] Конвертация в аккаунт (`linkWithCredential`), обработка конфликта
- [ ] Проверка автоочистки и квоты, документирование рисков

### F07 Accounts
- [x] Страница счетов, создание, архивация, выбор счёта в форме
- [x] `recalculateAccountBalance` и кнопка, тесты

### F08 Budgets
- [x] Лимиты, прогресс и состояния, id `month_categoryId`
- [x] Связь с тратами месяца, все состояния

### F09 CSV export
- [ ] UTF-8 BOM, разделитель, экранирование, CSV-injection, учёт фильтров

### F10 CSV import
- [ ] Загрузка, маппинг, валидация построчно, дедупликация, превью, чанки 400, отчёт

### F11 Settings
- [ ] Валюта (с предупреждением), язык, тема, экспорт всех данных
- [ ] Удаление аккаунта (reauth, удаление подколлекций, `deleteUser`)

### F13 Polish
- [ ] a11y-проход, Lighthouse ≥ 90, бюджет бандла
- [ ] Полный e2e-набор, README EN и RU (скриншоты, схема), кейс-стади, бейджи CI
- [ ] App Check в enforcement, ограничение API key, prod-деплой, LICENSE

## 5. Процесс закрытия фичи

1. Все T-задачи выполнены, acceptance criteria отмечены.
2. `verify` пройден, результаты приложены к PR.
3. Ревью в свежей сессии (`prompts/review.md`), замечания устранены.
4. Обновлены: статус здесь, `02-data-model.md` и ADR при изменении решений, README при необходимости.
5. PR в `main` (squash), зелёный CI, merge.
6. Следующая фича стартует в новой сессии агента.

## 6. Политика изменений плана

- Порядок фич меняется только осознанно, с записью причины здесь.
- Новая идея попадает в раздел «Backlog» ниже, а не в текущую фичу.
- Расширение скоупа фичи означает обновление спеки до начала кода.

## 7. Backlog (вне текущего скоупа)

- PWA и установка
- Cmd+K палитра
- Теги и фильтр по тегам
- Повторяющиеся транзакции
- Переводы между счетами
- AI-категоризация (stretch)
- Украинский язык
