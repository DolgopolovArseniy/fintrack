# F01 — Domain core

Статус: spec-ready
Зависит от: F00
Размер: S–M (7 задач)
Ветка: `feat/F01-domain-core`

> Агент читает: `AGENTS.md`, эту спеку, `docs/02-data-model.md` (§2–§5, §9), `docs/03-conventions.md` (§3, §7), `docs/05-testing-strategy.md` (§3.1).
> Синтаксис Zod, `Intl`, date-fns, Firestore converters сверяется через **Context7**. UI в этой фиче нет.

## 1. Цель

Создать фундамент предметной области: деньги, даты, валюты, лимиты, баланс, агрегации, Zod-схемы всех документов и общую инфраструктуру чтения Firestore. Всё, что связано с деньгами и датами, **плотно покрыто тестами** и живёт в чистых функциях. Все следующие фичи строятся на этом слое.

## 2. Скоуп

**Входит:**
- `lib/limits.ts`, `lib/currencies.ts`, `lib/money.ts`, `lib/dates.ts`, `lib/balance.ts`, `lib/aggregations.ts`, `lib/schemas.ts` (общие схемы).
- Zod-схемы и типы сущностей в фичах (`features/*/schemas.ts`) и `index.ts` с публичными типами.
- `lib/firestore/paths.ts`, `lib/firestore/createConverter.ts`, `lib/logger.ts`.
- Тестовые фабрики `src/test/factories.ts`, настройка покрытия и прогон тестов дат в нескольких часовых поясах.

**Не входит:**
- Repository, хуки, UI, `MoneyText`, `AmountInput` (F05).
- `lib/csv.ts` (F09, F10), правила Firestore (F03), rules-тесты на синхронизацию констант (F03).
- Бизнес-логика конкретных экранов (группировка списка по дням, id бюджета: F05, F08).

## 3. Решения F01

| Вопрос | Решение |
|---|---|
| Список валют | USD, EUR, GBP, UAH, PLN, CZK, CHF, CAD, AUD (все с 2 знаками). Расширение списка, если владелец решит в Фазе 0 |
| Константы лимитов | Один файл `lib/limits.ts`. Значения совпадают с `02-data-model.md`. Синхронность с rules проверит тест в F03 |
| Где схема профиля | `features/auth/schemas.ts` |
| Схемы | Для каждой сущности: `xInputSchema` (что даёт UI) и `xSchema` (документ: `id`, служебные поля, `Date`). Типы через `z.infer` |
| Ограничение цвета категории | В схеме `z.enum` по ключам палитры (`features/categories/constants.ts`), rules принимают любую строку до 20 символов |
| Чтение битых документов | Converter не падает на одном документе: список пропускает невалидные и сообщает через `logger` |
| Запись | Converter **не** формирует запись. Repository собирает payload сам (с `serverTimestamp()` и `deleteField()`). `toFirestore` в converter проходной |
| Часовой пояс | Функции дат не зависят от часового пояса окружения (проверяется тестами) |

## 4. Контракты

### 4.1 `lib/limits.ts`

```ts
export const MAX_AMOUNT = 100_000_000_000          // minor units, 1 .. MAX_AMOUNT
export const MAX_BALANCE = 1_000_000_000_000       // по модулю
export const NOTE_MAX_LENGTH = 200
export const NAME_MAX_LENGTH = 40
export const SYSTEM_KEY_MAX_LENGTH = 30
export const DISPLAY_NAME_MAX_LENGTH = 60
export const TAGS_MAX_COUNT = 10
export const IMPORT_CHUNK_SIZE = 400               // транзакций на batch
```

### 4.2 `lib/currencies.ts`

```ts
export const SUPPORTED_CURRENCIES = ['USD','EUR','GBP','UAH','PLN','CZK','CHF','CAD','AUD'] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]
export const DEFAULT_CURRENCY: CurrencyCode = 'USD'
export function isSupportedCurrency(value: string): value is CurrencyCode
export function getFractionDigits(currency: CurrencyCode): number   // через Intl, для всех поддерживаемых = 2
```

### 4.3 `lib/money.ts`

```ts
export type Locale = 'en' | 'ru'
export type TransactionType = 'expense' | 'income'

// '12,50' -> 1250. Возвращает null для невалидного ввода или значения > MAX_AMOUNT.
export function parseMoneyInput(input: string): number | null

// 1050, {locale:'en', currency:'USD'} -> '$10.50'
export function formatMoney(minor: number, options: { locale: Locale; currency: CurrencyCode }): string

// 1250 -> '12.50' (строка для поля редактирования; десятичный разделитель по локали)
export function formatMoneyInput(minor: number, locale: Locale): string

// income -> +amount, expense -> -amount
export function signedAmount(type: TransactionType, amount: number): number
```

**Правила `parseMoneyInput`** (детерминированные, без привязки к локали):
1. Обрезать края, удалить пробелы, неразрывные и узкие пробелы, апострофы (`'`, `’`) внутри числа.
2. Допустимы только цифры `0-9` и разделители `.` и `,`. Любой другой символ: `null`. Знак минус и плюс: `null`. Экспонента: `null`.
3. Если присутствуют **оба** разделителя, десятичным считается **последний**, другой вид это группировка. После десятичного ≤ 2 цифр, иначе `null`.
4. Если разделитель **одного вида**:
   - встречается несколько раз: это группировка, группы по 3 цифры (кроме первой), иначе `null`;
   - встречается один раз и после него 1–2 цифры: десятичный;
   - встречается один раз и после него ровно 3 цифры: группировка;
   - встречается один раз и после него ≥ 4 цифры: `null`.
5. Допустимы `12.` (даёт `1200`) и `.5` (даёт `50`). Пустая строка и только разделитель: `null`.
6. Результат это целое число minor units (без float-арифметики: разбор строкой). Значение > `MAX_AMOUNT`: `null`. Значение `0` допустимо (схема UI отклонит).

### 4.4 `lib/dates.ts`

```ts
export type IsoDate = string      // 'YYYY-MM-DD'
export type YearMonth = string    // 'YYYY-MM'

export function isValidIsoDate(value: string): boolean                 // учитывает високосные годы
export function isValidYearMonth(value: string): boolean
export function toIsoDate(date: Date): IsoDate                         // по ЛОКАЛЬНЫМ компонентам даты
export function todayIso(now?: Date): IsoDate
export function toYearMonth(date: IsoDate): YearMonth
export function currentYearMonth(now?: Date): YearMonth
export function addMonths(month: YearMonth, delta: number): YearMonth
export function monthRange(month: YearMonth): { start: IsoDate; end: IsoDate }   // end = `${month}-31` (верхняя граница для сравнения строк)
export function monthsBack(endMonth: YearMonth, count: number): YearMonth[]      // по возрастанию, включая endMonth
export function compareIsoDates(a: IsoDate, b: IsoDate): number
export function formatIsoDate(date: IsoDate, locale: Locale, style: 'short' | 'medium' | 'long'): string
export function formatYearMonth(month: YearMonth, locale: Locale): string        // 'September 2026' / 'сентябрь 2026'
```

Запрещено: `new Date('YYYY-MM-DD')` для календарной даты. Форматирование строит дату так, чтобы результат не зависел от часового пояса (например UTC-компоненты).

### 4.5 `lib/balance.ts`

```ts
export type BalanceTx = { type: TransactionType; amount: number; accountId: string }

// before=null (создание), after=null (удаление), оба (изменение). Нулевые дельты не включаются.
export function balanceDeltas(before: BalanceTx | null, after: BalanceTx | null): Map<string, number>

// Складывает дельты нескольких изменений (для импорта и batch): один счёт -> одна суммарная дельта.
export function mergeDeltas(deltas: Iterable<Map<string, number>>): Map<string, number>
```

### 4.6 `lib/aggregations.ts`

```ts
export type AggTx = { type: TransactionType; amount: number; categoryId: string; date: IsoDate }

export function sumByType(txs: readonly AggTx[]): { income: number; expense: number; net: number }
export function totalsByCategory(txs: readonly AggTx[], type: TransactionType): Array<{ categoryId: string; total: number }>   // по убыванию
export function totalsByMonth(txs: readonly AggTx[]): Array<{ month: YearMonth; income: number; expense: number }>            // по возрастанию, без пропусков только для месяцев с данными
export function topNWithOther<T extends { total: number }>(items: readonly T[], n: number, otherFactory: (total: number) => T): T[]
```

### 4.7 Схемы (Zod)

Общие в `lib/schemas.ts`: `isoDateSchema`, `yearMonthSchema`, `moneyAmountSchema` (int, 1..`MAX_AMOUNT`), `currencySchema`, `transactionTypeSchema`.

По фичам (имена файлов: `features/<feature>/schemas.ts`):

| Фича | Экспорт |
|---|---|
| `auth` | `userProfileInputSchema`, `userProfileSchema`, типы `UserProfile`, `UserProfileInput` (поля из `02-data-model.md` §3.1, `locale`: `en \| ru`, `theme`: `light \| dark \| system`) |
| `categories` | `constants.ts`: `CATEGORY_COLOR_KEYS` (12 ключей из `04-ux-guidelines.md` §2.2), `DEFAULT_EXPENSE_CATEGORY_KEYS`, `DEFAULT_INCOME_CATEGORY_KEYS`. `schemas.ts`: `categoryInputSchema`, `categorySchema` (refine: есть `name` или `systemKey`) |
| `accounts` | `accountInputSchema`, `accountSchema` (refine: `name` или `systemKey`, `balance` и `initialBalance` в пределах `MAX_BALANCE`) |
| `transactions` | `transactionInputSchema` (пример в `02-data-model.md` §9), `transactionSchema` |
| `budgets` | `budgetInputSchema`, `budgetSchema` |

Каждая фича получает `index.ts` с экспортом **только** схем и типов (публичный API, без внутренностей).

### 4.8 Firestore-инфраструктура (`lib/firestore/`)

```ts
// paths.ts — единый модуль путей (импортирует firebase/firestore и db)
export function userDoc(uid: string): DocumentReference
export function accountsCol(uid: string): CollectionReference
export function categoriesCol(uid: string): CollectionReference
export function transactionsCol(uid: string): CollectionReference
export function budgetsCol(uid: string): CollectionReference

// createConverter.ts
export function createConverter<S extends z.ZodType>(schema: S): FirestoreDataConverter<z.infer<S>>
// fromFirestore: snapshot.data({ serverTimestamps: 'estimate' }), Timestamp -> Date, подстановка id, парсинг схемой.
// Невалидный документ: бросает внутреннюю ошибку InvalidDocumentError (не AppError пользователю).

// Хелпер для списков: пропускает невалидные документы и сообщает через logger.
export function parseSnapshotDocs<T>(snapshot: QuerySnapshot, schema: z.ZodType<T>): T[]
```

```ts
// lib/logger.ts — единственное место, где разрешён console (warn/error). Остальной код использует logger.
export const logger: { warn: (message: string, context?: unknown) => void; error: (message: string, context?: unknown) => void }
```

Конкретные сигнатуры Firestore (`withConverter`, опции `data()`) уточняются через Context7: контракт выше задаёт поведение, а не точные типы SDK.

## 5. Валидация и сообщения

Схемы задают **коды** сообщений (ключи `validation.*`), а не тексты. Тексты добавляются в i18n в F02 и далее. В F01 используются стабильные ключи:

| Правило | Ключ |
|---|---|
| Обязательное поле | `validation.required` |
| Сумма не положительная | `validation.amountPositive` |
| Сумма слишком большая | `validation.amountTooLarge` |
| Неверная дата | `validation.dateInvalid` |
| Слишком длинный текст | `validation.tooLong` |
| Неподдерживаемая валюта | `validation.currencyUnsupported` |

## 6. Acceptance criteria

- [ ] AC1: `parseMoneyInput` даёт ожидаемые значения для всех строк таблицы ниже.
- [ ] AC2: `formatMoney` форматирует EN (`$10.50`) и RU (`10,50 ₴` для UAH, с учётом неразрывных пробелов) для всех поддерживаемых валют. Для нулей, больших сумм и отрицательных значений (баланс) формат корректен.
- [ ] AC3: Все функции дат возвращают одинаковые результаты в часовых поясах `UTC`, `America/Los_Angeles`, `Pacific/Kiritimati` (UTC+14). `toIsoDate(new Date(2026, 8, 30, 23, 30))` всегда `'2026-09-30'`.
- [ ] AC4: `isValidIsoDate`: `2024-02-29` верно, `2023-02-29`, `2026-13-01`, `2026-00-10`, `2026-9-1`, `2026-09-31` неверно. `addMonths('2026-12', 1) = '2027-01'`, `addMonths('2026-01', -1) = '2025-12'`.
- [ ] AC5: `balanceDeltas` правильно обрабатывает: создание, удаление, смену суммы, смену типа, смену счёта, одновременную смену счёта и суммы, отсутствие изменений (пустая Map). `mergeDeltas` суммирует дельты одного счёта.
- [ ] AC6: `aggregations` корректны для пустого набора, одной категории, нескольких месяцев. `topNWithOther` схлопывает хвост в «Другое» и не добавляет его, если элементов ≤ n.
- [ ] AC7: Схемы принимают валидные и отклоняют невалидные входы для каждой сущности (границы: `amount` 0, `-1`, `1.5`, `MAX_AMOUNT + 1`; `note` 201 символ; `date` неверный формат; неподдерживаемая валюта; нет `name` и `systemKey`).
- [ ] AC8: `createConverter` на фейковом snapshot: `Timestamp` превращается в `Date`, `id` подставляется, невалидный документ обрабатывается `parseSnapshotDocs` (пропускается, вызывается `logger.warn`), pending-запись (`serverTimestamps: 'estimate'`) не даёт `null`.
- [ ] AC9: Покрытие ветвей по `money.ts`, `dates.ts`, `balance.ts`, `aggregations.ts` равно 100%. Порог настроен и падает в CI при снижении.
- [ ] AC10: Domain-модули не импортируют React и Firebase (проверяет ESLint). `firebase/firestore` импортируется только в `lib/firestore/*`.
- [ ] AC-ARCH: Нет дублирования (константы только в `limits.ts`, валидные значения лимитов не повторяются в схемах литералами), нет `float` и `toFixed` в расчётах, нет `any`.

### Таблица для AC1 (`parseMoneyInput`)

| Ввод | Результат |
|---|---|
| `"12.5"` | 1250 |
| `"12,50"` | 1250 |
| `"12."` | 1200 |
| `".5"` | 50 |
| `"0.05"` | 5 |
| `"0"` | 0 |
| `"1 000,5"` (пробел, а также NBSP и узкий NBSP) | 100050 |
| `"1,000.50"` | 100050 |
| `"1.000,50"` | 100050 |
| `"1,234,567.89"` | 123456789 |
| `"1,000"` | 100000 |
| `"1.234"` | 123400 |
| `"12.345,6"` | 1234560 |
| `"1.2345"` | null |
| `"1.234,567"` | null |
| `"1,23,4"` | null |
| `""`, `"   "`, `"."`, `","` | null |
| `"abc"`, `"12a"`, `"1e3"`, `"١٢"` | null |
| `"-5"`, `"+5"` | null |
| `"1000000000.00"` (больше `MAX_AMOUNT`) | null |

## 7. План тестов

| Уровень | Что |
|---|---|
| Unit | Все модули `lib/*` (таблицы кейсов, граничные значения), схемы Zod, `createConverter` и `parseSnapshotDocs` на фейковых snapshot-объектах (без эмулятора) |
| Timezone | Набор тестов дат запускается в трёх часовых поясах (способ, работающий на Windows, macOS и Linux, выбрать через документацию Vitest: проекты или настройка `TZ`) |
| Coverage | Пороги на `money`, `dates`, `balance`, `aggregations` (100% ветвей). Разрешённая новая зависимость: `@vitest/coverage-v8` |
| Integration, rules | Нет (репозитории и эмулятор в F03 и F05) |

## 8. Задачи

| # | Задача | Файлы | Проверка после |
|---|---|---|---|
| T1 | `limits`, `currencies`, общие схемы в `lib/schemas.ts` + unit-тесты | `lib/limits.ts`, `lib/currencies.ts`, `lib/schemas.ts` + тесты | `pnpm test` |
| T2 | `money`: `parseMoneyInput`, `formatMoney`, `formatMoneyInput`, `signedAmount` + тесты по таблице AC1 | `lib/money.ts` + тесты | `pnpm test` |
| T3 | `dates` + тесты, включая прогон в трёх часовых поясах | `lib/dates.ts` + тесты, конфиг Vitest | `pnpm test` (во всех поясах) |
| T4 | `balance` и `aggregations` + тесты | `lib/balance.ts`, `lib/aggregations.ts` + тесты | `pnpm test` |
| T5 | Схемы сущностей (`features/*/schemas.ts`, `categories/constants.ts`, `index.ts` фич) + тесты | `features/{auth,categories,accounts,transactions,budgets}/*` | `pnpm test`, `pnpm lint` |
| T6 | `lib/logger.ts`, `lib/firestore/paths.ts`, `lib/firestore/createConverter.ts` + тесты на фейковых snapshot | `lib/logger.ts`, `lib/firestore/*` | `pnpm test`, `pnpm typecheck` |
| T7 | Фабрики `src/test/factories.ts`, пороги покрытия, `verify`, обновление `docs/06-roadmap.md` | `src/test/factories.ts`, `vitest.config.ts` | Скилл `verify` |

После каждой задачи: `pnpm typecheck && pnpm lint && pnpm test`, коммит по Conventional Commits.

## 9. Definition of Done

- [ ] AC1–AC10 и AC-ARCH выполнены
- [ ] Покрытие domain-модулей по порогам, тесты проходят локально и в CI
- [ ] Скилл `verify` пройден, отчёт приложен к PR
- [ ] Нет нарушений `AGENTS.md` (разделы 7, 8, 11)
- [ ] Если по ходу выяснились отличия от `02-data-model.md`, документ обновлён
- [ ] Статус F01 в `docs/06-roadmap.md` = `done`

## 10. Журнал решений и открытые вопросы

| Дата | Вопрос или решение | Статус |
|---|---|---|
| — | Окончательный список валют (дополнение владельцем до начала T1) | open |
| — | Способ запуска тестов в нескольких часовых поясах | open |
| — | Точный API `data({ serverTimestamps })` и `withConverter` в текущей версии SDK (Context7) | open |
