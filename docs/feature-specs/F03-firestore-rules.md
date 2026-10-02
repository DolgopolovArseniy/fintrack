# F03 — Firestore Security Rules v1 и тесты

Статус: spec-ready
Зависит от: F01 (нужны `lib/limits.ts`, `lib/currencies.ts`, схемы), F02 (для ручной проверки с реальным пользователем на эмуляторе; сами rules-тесты от кода F02 не зависят)
Размер: M (7 задач)
Ветка: `feat/F03-rules`

> Агент читает: `AGENTS.md`, эту спеку, `docs/02-data-model.md` (§2–§3, §11–§14), `docs/05-testing-strategy.md` (§3.3), `docs/adr/` (ADR по rules, если есть).
> Синтаксис Security Rules, `@firebase/rules-unit-testing`, `firebase emulators:exec`, Vitest (проекты, `fileParallelism`) сверяется через **Context7**. Если синтаксис из `02-data-model.md` §11 не проходит на эмуляторе, исправлять **по ошибке эмулятора** и обновлять документ.

## 1. Цель

Заменить закрытые «на всё» правила (`allow ... if false`) на правила v1: пользователь читает и пишет только `users/{свой uid}/**`, невалидные данные отклоняются, `createdAt` неизменяем. Правила покрыты автоматическими тестами на эмуляторе (включая негативные случаи) и проверяются в CI. Это один из главных пунктов портфолио.

## 2. Состояние репозитория на старт (проверено по `main`, адаптация спеки)

| Что есть в коде | Следствие для F03 |
|---|---|
| `firestore.rules` закрыт полностью, `firestore.indexes.json` пустой (`indexes` и `fieldOverrides`), оба подключены в `firebase.json` | Меняем только `firestore.rules`. Индексы остаются пустыми (ADR-010) |
| `firebase.json`: эмуляторы Auth `9099`, Firestore `8080`, Hosting `5000`, UI `4000`, `singleProjectMode: true` | Для тестов используем отдельный `demo-` проект и `--only firestore`, порт `8080` |
| Скрипт `emulators:exec` вызывает `firebase emulators:exec --import=...` **без команды**, как есть он не работает | Не использовать. Добавить отдельный `test:rules` со своей командой |
| `vitest.config.ts`: окружение `jsdom`, `setupFiles` с `matchMedia`, паттерн тестов по умолчанию на весь репозиторий | Rules-тесты уйдут в отдельный каталог и конфиг (окружение `node`), из основного конфига исключаются |
| `tsconfig.node.json` включает `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `e2e` | Добавить `rules-tests` и `vitest.rules.config.ts`, иначе ESLint (`projectService`) не найдёт файлы |
| ESLint запрещает `firebase/firestore` везде, кроме repository, converters, `lib/firebase.ts`, `lib/firestore/**` | Добавить override для `rules-tests/**` |
| `@/lib/i18n.ts` экспортирует тип `Locale`, F01 планирует `Locale` в `lib/money.ts`, runtime-списка языков нет | Для sync-теста нужна чистая константа `SUPPORTED_LOCALES` (см. T6), дубли типов убрать |
| CI: джобы `quality` и `e2e`, Java не устанавливается | Добавить джоб `rules` с JDK 21 и кешем эмуляторов |
| Деплой-воркфлоу отсутствует (T12 плана F00 не выполнен), `.firebaserc` содержит `dev` (`fintrack-dev-4fb7e`) и `prod` | Деплой правил в dev делает **владелец вручную** (§14). Автодеплой в prod вне скоупа F03 |
| `docs/adr/` содержит только README и шаблон | ADR-0016 создаётся в T7 |
| F01 в `main` ещё нет (`lib/limits.ts`, `lib/currencies.ts`, `features/*/schemas.ts` отсутствуют) | **F03 стартует только после влива F01** |

## 3. Скоуп

**Входит:**
- `firestore.rules` v1 по `docs/02-data-model.md` §11 (с исправлениями по эмулятору).
- Тестовая инфраструктура: `vitest.rules.config.ts`, скрипт `test:rules`, хелперы, билдеры валидных документов.
- Полный набор rules-тестов (изоляция, схема, временные метки, batch, пути).
- Sync-тесты: константы в rules совпадают с кодом, документ совпадает с файлом, нет запрещённых вызовов.
- Джоб `rules` в CI.
- Обновление `docs/02-data-model.md` (если правилось), ADR-0016.

**Не входит:**
- Индексы (остаются пустыми), репозитории, онбординг и запись данных из приложения (F04 и далее).
- Проверки целостности ссылок (`exists()`, `get()`) и соответствия типов, проверки согласованности баланса (осознанно, ADR-0016).
- App Check, rate limiting, автодеплой правил в prod.

## 4. Решения F03

| Вопрос | Решение |
|---|---|
| Раннер | Vitest, окружение `node`, отдельный конфиг, каталог `rules-tests/` в корне |
| Идентификатор проекта эмулятора | `demo-fintrack-rules` (префикс `demo-` не требует учётных данных) |
| Запуск | `firebase emulators:exec --only firestore --project demo-fintrack-rules "<команда vitest>"` |
| Параллельность файлов | Выключена (`fileParallelism: false`): один эмулятор, общее состояние. Данные очищаются перед каждым тестом |
| Стиль тестов | Data-driven (`it.each`) для невалидных значений, билдеры валидных документов. Без копирования объектов между файлами |
| Анонимный пользователь | Проверяется отдельным контекстом (`sign_in_provider: 'anonymous'`), права как у владельца |
| Что **не** проверяют rules | Существование счёта и категории, соответствие `type`, календарная корректность даты (`2026-02-31` проходит формат), согласованность баланса. Тесты документируют эти границы явно |
| Источник истины | Код правил в `firestore.rules`. Блок в `02-data-model.md` §11 проверяется тестом на совпадение |

## 5. Пользовательские сценарии (на уровне данных)

| # | Сценарий | Результат |
|---|---|---|
| 1 | Владелец создаёт и читает свои документы во всех подколлекциях | Разрешено |
| 2 | Чужой пользователь или гость читает, перечисляет, пишет, удаляет чужие данные | Отказ |
| 3 | Владелец пишет в `users/{uid}/неизвестная`, в корневую коллекцию, во вложенный путь транзакции | Отказ (запрет по умолчанию) |
| 4 | Создание транзакции с `amount: 0`, дробным, строкой, с лишним полем, неверной датой | Отказ |
| 5 | Изменение `createdAt` при обновлении, пропущенный `updatedAt` | Отказ |
| 6 | Атомарный batch: транзакция плюс `increment` баланса счёта | Разрешено |
| 7 | Batch из 400 создаваний транзакций (имитация импорта) | Разрешено (нет `exists()`/`get()`) |
| 8 | Collection group запрос по `transactions`, листинг `users` | Отказ |

## 6. Данные и изменения rules

- Меняется только `firestore.rules` (разрешено этой спекой). Индексы без изменений.
- Целевой текст: `docs/02-data-model.md` §11 дословно. Допустимые правки: синтаксические (по ошибке эмулятора) и устранение найденных тестами дефектов. Любое отличие фиксируется в `02-data-model.md` (тот же PR).

## 7. Тестовая инфраструктура

### 7.1 Файлы

```
vitest.rules.config.ts          // node, include rules-tests/**/*.test.ts, fileParallelism: false, увеличенные таймауты, алиас '@'
rules-tests/
  helpers/env.ts                // initializeTestEnvironment, чтение firestore.rules, контексты (owner, other, anon-user, guest), clearFirestore
  helpers/docs.ts               // билдеры валидных «сырых» документов: validProfile(), validAccount(), validCategory(), validTransaction(), validBudget()
  helpers/seed.ts               // запись существующих документов в обход правил (withSecurityRulesDisabled) с реальными Timestamp
  isolation.rules.test.ts
  paths.rules.test.ts
  profile.rules.test.ts
  accounts.rules.test.ts
  categories.rules.test.ts
  transactions.rules.test.ts
  budgets.rules.test.ts
  batch.rules.test.ts
  sync.test.ts                  // статические проверки (без обращения к эмулятору)
```

### 7.2 Скрипты и конфигурация

```json
"test:rules": "firebase emulators:exec --only firestore --project demo-fintrack-rules \"vitest run --config vitest.rules.config.ts\""
```

- Кавычки в скрипте экранируются так, чтобы команда работала в `cmd` (Windows), PowerShell и bash. Проверить на Windows владельца.
- Основной `vitest.config.ts`: добавить `rules-tests/**` в `exclude`. `pnpm test` не должен ни запускать, ни падать из-за rules-тестов.
- `tsconfig.node.json`: добавить `rules-tests`, `vitest.rules.config.ts` в `include`.
- ESLint: override для `rules-tests/**`, разрешающий `firebase/firestore`. Остальные правила (в том числе запрет `any`) остаются.
- Новая зависимость (dev): `@firebase/rules-unit-testing` (проверить совместимость с установленной версией `firebase` через Context7). Других зависимостей не добавлять.
- Хост и порт эмулятора берутся из переменной окружения, которую выставляет `emulators:exec` (проверить по документации, при необходимости передать явно).

### 7.3 Билдеры и контексты

- Билдеры возвращают объекты, где `createdAt` и `updatedAt` это `serverTimestamp()`. Параметр `overrides` позволяет подменить поля, а специальный маркер удаляет поле (для проверки отсутствующих полей).
- Контексты: `ownerDb` (uid `alice`), `otherDb` (uid `bob`), `anonOwnerDb` (uid `alice`, провайдер `anonymous`), `guestDb` (без авторизации). Один хелпер `docRef(db, 'users/alice/transactions/t1')`.
- Для тестов update/delete существующий документ создаётся через `seed` с реальным `Timestamp`.

## 8. Каталог тестов

### 8.1 Изоляция и пути (`isolation`, `paths`)

Для **каждой** из коллекций (`users`, `accounts`, `categories`, `transactions`, `budgets`) параметризовано:

| Субъект | get | list | create | update | delete |
|---|---|---|---|---|---|
| Владелец | ✅ | ✅ | ✅ (валидный) | ✅ (валидный) | ✅ |
| Анонимный владелец | ✅ | ✅ | ✅ | ✅ | ✅ |
| Чужой пользователь | ❌ | ❌ | ❌ | ❌ | ❌ |
| Гость | ❌ | ❌ | ❌ | ❌ | ❌ |

Пути:
- ❌ владелец пишет `users/{uid}/settings/x`, `users/{uid}/transactions/{id}/notes/n`, корневые `transactions/x`, `accounts/x`
- ❌ листинг коллекции `users` (любой авторизованный)
- ❌ collection group запрос `collectionGroup('transactions')`
- ❌ создание `users/{чужой uid}` владельцем

### 8.2 Профиль

Валидные: минимальный набор; с `displayName` 60 символов; все три темы; `ru` и `en`; каждая валюта из белого списка.
Невалидные (`it.each`): нет каждого из обязательных ключей; лишний ключ; валюта `JPY` и `XXX`; пустая строка; `locale: 'uk'`; `theme: 'blue'`; `schemaVersion` 0, `1.5`, `'1'`, 1001; `displayName` 61 символ и число.
Update: смена `theme` ✅; изменение `createdAt` ❌; отсутствие обновления `updatedAt` ❌; смена валюты на неподдерживаемую ❌.

### 8.3 Счета

Валидные: только `systemKey`; только `name`; оба; `balance` отрицательный; `balance` на границе ±10¹²; три типа.
Невалидные: ни `name`, ни `systemKey`; `type: 'crypto'`; `balance` дробный, строка, 10¹²+1, −10¹²−1; `initialBalance` вне границ; `archived` не bool; `name` пустой и 41 символ; `systemKey` 31 символ; лишний ключ; нет обязательных ключей.
Update: `increment` баланса вместе с `updatedAt` ✅; `archived: true` ✅; без `updatedAt` ❌; `increment`, выводящий баланс за границу ❌; смена `createdAt` ❌.

### 8.4 Категории

Валидные: расход и доход; с `systemKey`; с `name`; `icon` 40 символов, `color` 20 символов.
Невалидные: ни `name`, ни `systemKey`; `type` неверный; `icon` пустой и 41; `color` пустой и 21; `archived` не bool; лишний ключ.
Update: переименование ✅; архивация ✅; **смена `type` ❌**; смена `createdAt` ❌.

### 8.5 Транзакции

Валидные: минимальная; с `note` ровно 200 символов; с `tags` из 10 элементов; `amount` 1 и `MAX_AMOUNT`; даты `2026-01-01`, `2024-02-29`.
Невалидные (`it.each`):

| Группа | Значения |
|---|---|
| Обязательные ключи | отсутствует каждый из `type`, `amount`, `accountId`, `categoryId`, `date`, `createdAt`, `updatedAt` |
| Лишние ключи | `foo`, `userId`, `balanceAfter` |
| `type` | `'transfer'`, пустая строка, число |
| `amount` | 0, −1, 1.5, `'100'`, `null`, `MAX_AMOUNT + 1` |
| `accountId`, `categoryId` | пустая строка, 65 символов, число |
| `date` | `'2026-13-01'`, `'2026-00-10'`, `'2026-9-1'`, `'26-02-01'`, `'2026-02-32'`, `20260201`, `''`, `'2026-02-01T00:00:00'` |
| `note` | 201 символ, число |
| `tags` | 11 элементов, строка вместо списка |
| Время | `createdAt: Timestamp.now()` (не серверное), `updatedAt` клиентский, `createdAt` в виде строки |

Update: изменение `amount` с `updatedAt` ✅; изменение `createdAt` ❌; без `updatedAt` ❌; невалидный `amount` ❌; delete владельцем ✅.

**Документируемые границы (тесты фиксируют текущее поведение):**
- ✅ `date: '2026-02-31'` проходит rules (формат верен), календарную корректность проверяет клиент.
- ✅ ссылки на несуществующие `accountId` и `categoryId` проходят rules, целостность проверяет repository.

### 8.6 Бюджеты

Валидные: id `2026-09_cat1` с `month: '2026-09'`, `categoryId: 'cat1'`, `limit` 1 и `MAX_AMOUNT`.
Невалидные: id не совпадает с `month_categoryId`; `month` `'2026-13'`, `'2026-9'`, `'202609'`; `limit` 0, дробный, `MAX_AMOUNT + 1`; лишний ключ; нет обязательных ключей.
Update: изменение `limit` ✅; изменение `month` или `categoryId` ❌ (нарушает соответствие id); смена `createdAt` ❌.

### 8.7 Batch (`batch.rules.test.ts`)

- ✅ batch: создание транзакции плюс `update` счёта (`increment`, `updatedAt`).
- ✅ batch онбординга: профиль плюс счёт плюс категории одним batch.
- ❌ batch с одним невалидным документом отклоняется **целиком**: проверка через чтение в обход правил, что ни один документ не записан.
- ✅ batch из **400** создаваний транзакций (подтверждает, что правила не используют `exists()`/`get()` и не упираются в лимит обращений).

### 8.8 Sync и статические проверки (`sync.test.ts`, без эмулятора)

| Проверка |
|---|
| Список валют в `firestore.rules` равен `SUPPORTED_CURRENCIES` (`lib/currencies.ts`) |
| Список языков в rules равен `SUPPORTED_LOCALES` |
| Числовые границы в rules (`MAX_AMOUNT`, `MAX_BALANCE`, длины `note`, `name`, `systemKey`, `displayName`, число тегов) равны константам `lib/limits.ts` (значения извлекаются из текста rules регулярными выражениями) |
| В `firestore.rules` нет вызовов `exists(`, `get(`, `getAfter(` (осознанное ограничение, ADR-0016) |
| `rules_version = '2'` |
| Блок кода с правилами в `docs/02-data-model.md` §11 совпадает с `firestore.rules` (нормализация переводов строк и пробелов, учёт CRLF на Windows) |

## 9. Acceptance criteria

- [ ] AC1: Запрет по умолчанию: любой путь вне `users/{uid}/{accounts|categories|transactions|budgets}` и документа `users/{uid}` отклоняется для владельца и остальных.
- [ ] AC2: Изоляция: чужой пользователь и гость получают отказ на get, list, create, update, delete для каждой коллекции.
- [ ] AC3: Анонимный пользователь имеет права владельца на **свои** данные и не имеет на чужие.
- [ ] AC4: Профиль валидируется по §8.2 (валюта из белого списка, язык `en|ru`, тема, `schemaVersion`, длина имени, набор ключей).
- [ ] AC5: Счета валидируются по §8.3, `balance` принимает результат `increment`.
- [ ] AC6: Категории валидируются по §8.4, `type` неизменяем.
- [ ] AC7: Транзакции валидируются по §8.5 (ключи, типы, границы, формат даты, длины).
- [ ] AC8: Бюджеты валидируются по §8.6, id совпадает с `month_categoryId`.
- [ ] AC9: `createdAt` и `updatedAt` равны серверному времени при создании. При обновлении `createdAt` не меняется, `updatedAt` обновляется.
- [ ] AC10: Batch-сценарии §8.7 проходят, в том числе 400 операций и атомарный отказ.
- [ ] AC11: Collection group запросы и листинг `users` отклоняются.
- [ ] AC12: Sync-тесты §8.8 проходят, включая совпадение документа и файла.
- [ ] AC13: `pnpm test:rules` проходит локально (Windows) и в CI. `pnpm test` не затрагивается. `pnpm typecheck` и `pnpm lint` покрывают `rules-tests`.
- [ ] AC14: Известные границы (§8.5) зафиксированы тестами и описаны в `02-data-model.md` и ADR-0016.
- [ ] AC15: Правила развёрнуты в dev-проект и проверены владельцем (§14).
- [ ] AC-ARCH: Нет дублирования между тестами (билдеры, параметризация), нет `any`, `firestore.rules` не содержит копипасты проверок вне функций-валидаторов.

## 10. План тестов

| Уровень | Что |
|---|---|
| Rules (эмулятор) | §8.1–§8.7 |
| Static/sync | §8.8 |
| Unit, component, e2e | Не затрагиваются |

## 11. Задачи (одна задача = одна сессия = один коммит)

| # | Задача | Файлы | Проверка после |
|---|---|---|---|
| T1 | **Инфраструктура.** `@firebase/rules-unit-testing`, `vitest.rules.config.ts`, исключение из основного конфига, `tsconfig.node.json`, ESLint-override, скрипт `test:rules`, `helpers/env.ts`, `helpers/seed.ts`. Дымовой тест на **текущих** закрытых правилах (любой доступ отклонён) | `package.json`, конфиги, `rules-tests/helpers/*` | `pnpm test:rules`, `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| T2 | **Правила v1 и базовые тесты.** `firestore.rules` из `02-data-model.md` §11, билдеры `helpers/docs.ts`, `isolation`, `paths`, `profile` | `firestore.rules`, `rules-tests/*` | `pnpm test:rules` (исправлять синтаксис по ошибкам эмулятора) |
| T3 | **Accounts и categories** | `accounts.rules.test.ts`, `categories.rules.test.ts` | `pnpm test:rules` |
| T4 | **Transactions** (полный каталог §8.5, включая документируемые границы) | `transactions.rules.test.ts` | `pnpm test:rules` |
| T5 | **Budgets, batch, временные метки** (§8.6, §8.7) | `budgets.rules.test.ts`, `batch.rules.test.ts` | `pnpm test:rules` |
| T6 | **Sync и статические тесты** (§8.8). Если чистого runtime-списка языков нет, создать `src/lib/locales.ts` (`SUPPORTED_LOCALES`, `Locale`, `DEFAULT_LOCALE`) и использовать его в `i18n/config.ts`, `lib/i18n.ts` и (из F01) `lib/money.ts` вместо дублирующих типов | `rules-tests/sync.test.ts`, `src/lib/locales.ts`, правки импортов | `pnpm test:rules`, `pnpm test`, `pnpm typecheck` |
| T7 | **CI, документы, финализация.** Джоб `rules` в `ci.yml` (JDK 21, кеш `~/.cache/firebase/emulators`, `pnpm test:rules`), обновление `02-data-model.md` (если правилось), `05-testing-strategy.md`, ADR-0016 (границы rules), roadmap (F03 `done`), прогон `verify` | `.github/workflows/ci.yml`, `docs/*` | CI зелёный, скилл `verify` |

После каждой задачи: `pnpm typecheck && pnpm lint && pnpm test` (и `pnpm test:rules` для задач T1–T7), коммит по Conventional Commits (английский).

## 12. Тестовые данные и стабильность

- Перед каждым тестом `clearFirestore()`. Время не мокается: серверные метки обеспечивает эмулятор.
- Никаких `sleep`. Ожидания только через `assertSucceeds` и `assertFails`.
- Каждый отказ проверяется именно на **правила**, а не на ошибку теста: для параллельной валидации в каждой группе есть парный положительный тест с тем же билдером.
- Нестабильный тест считается дефектом (см. `05-testing-strategy.md` §5).

## 13. Риски

| Риск | Мера |
|---|---|
| Эмулятор требует Java, на CI и у разработчиков | JDK 21 в CI, JDK 21+ локально (владелец) |
| Кавычки в скрипте `test:rules` ведут себя по-разному в `cmd`, PowerShell и bash | Проверка на Windows владельца, при проблемах вынести команду в Node-скрипт |
| Загрузка JAR эмулятора замедляет первый запуск в CI | Кеш `~/.cache/firebase/emulators` |
| Версия `@firebase/rules-unit-testing` несовместима с `firebase` 12 | Проверка через Context7 до T1, при несовместимости остановиться и сообщить |
| Часть правил (регулярные выражения, `concat`) может не пройти на эмуляторе | Правка по ошибке эмулятора, синхронное обновление документа (AC12) |

## 14. Действия владельца

| Когда | Действие |
|---|---|
| До T1 | JDK 21+ установлен, `firebase login` выполнен (`pnpm exec firebase --version` работает) |
| После T7 | В dev-проекте (`fintrack-dev-4fb7e`) создана база Firestore: режим **Native**, регион выбран осознанно (**сменить нельзя**), режим production |
| После T7 | Деплой правил и индексов в dev: `pnpm exec firebase deploy --only firestore:rules,firestore:indexes --project dev`. Проверить в консоли Firebase: вкладка Rules содержит развёрнутую версию |
| После деплоя | Ручная проверка в Rules Playground консоли: чтение чужого пути отклоняется, чтение своего при `request.auth.uid` разрешается |
| Перед prod | Повторить деплой для prod-проекта (автодеплой правил будет добавлен вместе с deploy-воркфлоу) |

## 15. Definition of Done

- [ ] AC1–AC15 и AC-ARCH выполнены
- [ ] `pnpm test:rules` зелёный локально и в CI
- [ ] Скилл `verify` пройден (шаг 3 для rules), отчёт приложен к PR
- [ ] `docs/02-data-model.md` совпадает с `firestore.rules`, ADR-0016 добавлен
- [ ] Правила развёрнуты в dev и проверены
- [ ] Статус F03 в `docs/06-roadmap.md` = `done`

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос или решение | Статус |
|---|---|---|
| — | Совместимость `@firebase/rules-unit-testing` с `firebase` 12 (Context7) | open |
| — | Способ передачи хоста эмулятора в `initializeTestEnvironment` (из окружения или явно) | open |
| — | Нужен ли `getAfter` для проверки соответствия баланса в будущем (нет, см. ADR-0016) | closed |
| — | Автодеплой правил и индексов в prod: вместе с deploy-воркфлоу (F13 или отдельная задача) | planned |
