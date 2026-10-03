# Architectural Decision Records (ADR)

В этом каталоге фиксируются все ключевые архитектурные решения проекта FinTrack. Изменения в существующих решениях вносятся через создание новых ADR с пометкой о замене старых (Supersedes).

| ID | Заголовок | Статус | Дата |
|---|---|---|---|
| [ADR-001](0001-vite-react-spa.md) | SPA на Vite + React 19 без SSR / Next.js | Accepted | 2026-09-29 |
| [ADR-002](0002-no-cloud-functions.md) | Работа без Cloud Functions на бесплатном тарифе Spark | Accepted | 2026-09-29 |
| [ADR-003](0003-money-minor-units.md) | Хранение денег в minor units (целые числа) | Accepted | 2026-09-29 |
| [ADR-004](0004-transaction-date-string.md) | Дата транзакции как строка YYYY-MM-DD | Accepted | 2026-09-29 |
| [ADR-005](0005-user-subcollections.md) | Хранение всех данных в подколлекциях users/{uid} | Accepted | 2026-09-29 |
| [ADR-006](0006-realtime-monthly-queries.md) | Реалтайм через onSnapshot и запросы по месяцам | Accepted | 2026-09-29 |
| [ADR-007](0007-repository-pattern.md) | Изоляция доступа к Firestore через слой репозиториев | Accepted | 2026-09-29 |
| [ADR-008](0008-i18n-first-day.md) | Внедрение i18n (EN + RU) с первого дня | Accepted | 2026-09-29 |
| [ADR-009](0009-demo-mode-anonymous-auth.md) | Demo-режим через Anonymous Auth и клиентский сид | Accepted | 2026-09-29 |
| [ADR-010](0010-client-side-filtering.md) | Фильтрация по категории, счёту и типу на клиенте в рамках месяца | Accepted | 2026-09-29 |
| [ADR-011](0011-system-keys-default-entities.md) | Использование systemKey для перевода дефолтных счетов и категорий | Accepted | 2026-09-29 |
| [ADR-012](0012-composite-budget-id.md) | Составной ID бюджета вида {YYYY-MM}_{categoryId} | Accepted | 2026-09-29 |
| [ADR-013](0013-soft-delete-categories.md) | Мягкое удаление (архивация) категорий вместо физического | Accepted | 2026-09-29 |
| [ADR-015](0015-firestore-cache-cleanup-on-signout.md) | Очистка локального кеша Firestore и перезагрузка при выходе | Accepted | 2026-10-02 |
| [ADR-016](0016-firestore-security-rules-boundaries.md) | Границы ответственности Security Rules и отказ от get()/exists() | Accepted | 2026-10-03 |