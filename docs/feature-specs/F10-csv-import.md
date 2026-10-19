# F10 — CSV Import (Импорт транзакций из CSV с превью)

Статус: done
Зависит от: F01 (доменные типы, деньги, даты, схемы, лимиты), F02 (аутентификация, профиль), F03 (Security Rules v1), F04 (категории, `getCategoryDisplayName`), F05 (Transactions, `TransactionInput`, `getTransactionsByDateRange`), F07 (счета, `getAccountDisplayName`, `mergeDeltas`), F09 (экспорт CSV, `src/lib/csv.ts`, страница `/app/import-export`, namespace `importExport`)
Размер: L (6 задач: T1–T6)
Ветка: `feat/F10-csv-import`

> **Контекст для агента:** Фича F10 закрывает веху **M5 Data** («вау»-элемент №2, `docs/00-project-spec.md` §3, §4): возврат истории операций в приложение за секунды. Круговой сценарий F09 → F10 обязан работать без потерь. Построчная валидация — только через существующую `transactionInputSchema` (новых правил для денег и дат нет), разрешение имён категорий и счетов в id — без молчаливых подмен, дедупликация — предупреждение, а не авто-удаление, запись — чанками по 400 с агрегированными дельтами балансов (`02-data-model.md` §7). Правила Firestore и индексы не меняются.
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7), `docs/02-data-model.md` (§2, §3.4, §5, §6.1, §7, §11), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2–§4, §5 таблица Import/Export, §6, §8, §9), `docs/05-testing-strategy.md` (§3.1 csv, §3.2 чанкинг, §3.5 e2e-8).
> Справка по API библиотек (`papaparse`, `firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner, date-fns) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Дать надёжный импорт операций из CSV: загрузка файла, сопоставление колонок, построчная проверка с понятными ошибками, превью с исключением битых строк и дубликатов, пакетная запись с отчётом — без потери корректных строк и без дрейфа балансов.

**Пользовательские истории:**
1. *Как пользователь*, я хочу загрузить CSV (свою выгрузку F09 или выписку банка) и увидеть превью до записи в базу.
2. *Как пользователь*, я хочу сопоставить колонки файла полям один раз для всего файла, а не править каждую строку.
3. *Как пользователь*, я хочу видеть, какие строки ошибочны и почему (с номером строки), а валидные импортировать — одна битая строка не блокирует сотни корректных.
4. *Как пользователь*, я хочу сам решать судьбу дубликатов (внутри файла и против базы), чтобы не задвоить историю.
5. *Как пользователь*, я хочу отчёт после импорта (записано / пропущено и почему / состояние балансов).
6. *Как пользователь* с русским Excel, я хочу, чтобы файл с `;`, десятичной запятой и датами `DD.MM.YYYY` понимался без ручной конвертации.

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы
- `src/lib/csv.ts`: `generateCsv`, `CsvDelimiter` — канонический формат импорта = формат экспорта F09.
- `src/lib/money.ts`: `parseMoneyInput` — единственный парсер сумм (понимает `.` и `,`, пробелы, NBSP, группировки).
- `src/lib/dates.ts`: `isValidIsoDate`, `compareIsoDates` — единственный валидатор дат.
- `src/lib/schemas.ts`: `isoDateSchema`, `moneyAmountSchema`, `transactionTypeSchema`.
- `src/lib/limits.ts`: `MAX_AMOUNT`, `NOTE_MAX_LENGTH`, `TAGS_MAX_COUNT`, `IMPORT_CHUNK_SIZE = 400` — готов.
- `src/lib/balance.ts`: `balanceDeltas`, `mergeDeltas` — агрегация дельт по счетам.
- `src/lib/firestore/paths.ts`: `transactionsCol(uid)`, `accountDoc(uid, id)`.
- `src/features/transactions/`: `transactionInputSchema`, `TransactionInput`, `getTransactionsByDateRange`, `createTransaction` (образец batch с балансом).
- `src/features/categories/`: `useCategories`, `getCategoryDisplayName`, тип `Category`.
- `src/features/accounts/`: `useAccounts`, `getAccountDisplayName`, тип `Account`.
- `src/features/import-export/`: `schemas.ts`, `services/exportService.ts` (8 канонических колонок), `ImportExportPage` с табами, `ImportPlaceholderCard` (заменяется на `ImportCard`).
- `src/components/common/`: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`, `ResponsiveDialog`, `ConfirmDialog`, `CategoryBadge`, `AccountBadge`, `MoneyText`, `OfflineBanner`.

### 2.2 Архитектурные ограничения и инварианты
- **Границы ESLint:** `components/common/` не импортирует `features/**`; фичи — только через `index.ts`; `firebase/firestore` — только в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`; `papaparse` — только в доменном модуле парсинга (§8.1), не в компонентах.
- **Деньги:** только minor units через `parseMoneyInput` → `moneyAmountSchema`. Никаких `parseFloat` и `toFixed` в расчётах.
- **Даты хранения:** только `YYYY-MM-DD`, календарно валидная (`isValidIsoDate`). `DD.MM.YYYY` живёт только на входе парсера и сразу нормализуется в ISO.
- **Нет `null`:** пустая заметка и пустые теги не пишутся (как в `createTransaction`).
- **Балансы:** только `writeBatch` + `balanceDeltas`/`mergeDeltas` + `increment`, как в F05. `runTransaction` запрещён (не работает offline).
- **Запросы:** сверка с базой — только существующим запросом по диапазону дат (ADR-010). Составных индексов нет.
- **Rules:** изменения `firestore.rules` **не требуются**.

---

## 3. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Чем парсить CSV** | `PapaParse` (уже в стеке `01-architecture.md` §2; добавить в `dependencies` в T1, версию фиксирует T1 через Context7) | Ручной сплит ломается на кавычках, переносах внутри полей и BOM. Одна проверенная зависимость вместо велосипеда. Генерация остаётся на чистом `src/lib/csv.ts`. |
| 2 | **Канонический формат** | 8 колонок F09 (`Date, Type, Category, Account, Amount, Currency, Note, Tags`), заголовки EN и RU. `Currency` при импорте игнорируется | Круговой сценарий работает из коробки. Суммы хранятся в minor units базовой валюты (`02-data-model.md` §4). |
| 3 | **Чужие (банковские) файлы** | Через ручной маппинг колонок + два формата дат и суммы со знаком (решения 4–5). Отдельных пресетов под банки нет | Покрывает выписки без раздувания скоупа. Пресеты под банки — Backlog, не v1. |
| 4 | **Форматы дат на входе** | Ровно два: `YYYY-MM-DD` и `DD.MM.YYYY`. Остальное — ошибка строки | Покрывают наш экспорт и доминирующий формат выписок. Больше форматов — неоднозначность (`01/02/2026`): отказываемся осознанно. |
| 5 | **Суммы и тип** | Первично: `Type` + положительная `Amount`. Запасной путь: `Type` не сопоставлен — одиночная сумма со знаком (`-125,50` → `expense`, `125,50` → `income`); знак снимает импорт-парсер до `parseMoneyInput` (который знаки отвергает) | Совместимо с F09 и выписками в одну колонку «Сумма». В базе `amount` всегда положительный (`02-data-model.md` §3.4). |
| 6 | **Типы на входе** | Метки экспорта на обоих языках: `Expense`/`Расход`, `Income`/`Доход` (trim, case-insensitive) | Файл, выгруженный в русской локали, импортируется без перенастройки. |
| 7 | **Имена → id** | Авто-матчинг по display name (обе локали, trim + case-insensitive) плюс `systemKey`-имена. Нераспознанные уникальные имена — один селект на имя (не на строку) + обязательные дефолты (счёт, категория расходов, категория доходов) | Минимум кликов, ноль молчаливых подмен: несовпавшее без выбора — ошибка строки. Тип категории обязан совпадать с типом операции. |
| 8 | **Дедупликация** | Ключ `date\|type\|amount\|accountId\|categoryId\|note-normalized`. Внутри файла + против базы в диапазоне дат файла (один `getTransactionsByDateRange`). Дубликат — предупреждение, по умолчанию исключён, возвращается галкой | Авто-пропуск без ведома = «потерянные» операции. Заметка нормализуется: trim, схлопывание пробелов, lower-case. |
| 9 | **Запись и балансы** | Новая `createTransactionsBatch(uid, inputs)` в `features/transactions/repository.ts`: чанки по `IMPORT_CHUNK_SIZE` (400), один `writeBatch` на чанк + агрегированные `increment` через `mergeDeltas`, отчёт по чанкам | Следует `02-data-model.md` §7 (лимит batch 500, рабочий размер 400). Каждый чанк атомарен; частичный успех виден в отчёте. |
| 10 | **Лимиты файла** | `MAX_IMPORT_ROWS = 2000`, `MAX_IMPORT_FILE_SIZE = 2_000_000` (~2 МБ) в `src/lib/limits.ts`. Превышение — глобальная ошибка до парсинга | Потолок Spark-квоты и читаемости превью. Кто перерос — режет файл помесячно. |
| 11 | **Шаги** | Стейт-машина в хуке: `upload → mapping → preview → importing → result`. Импорт — только при ≥ 1 валидной включённой строке | Повторяет `04-ux-guidelines.md` §5 (Загрузка, Колонки, Проверка, Результат). |
| 12 | **Offline** | Парсинг и превью работают offline. Кнопка «Импортировать» offline блокируется с объяснением | Отдельной очереди импорта нет — хватает стандартного offline-кеша Firestore. |

---

## 4. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Круговой импорт своего экспорта** | Файл `fintrack-export-2026-09.csv` из F09, 42 строки | 1. Таб «Импорт» → дропзона.<br>2. Маппинг авто, «Продолжить».<br>3. Превью: 42 валидные.<br>4. «Импортировать 42» | 1 batch + increments. Отчёт «Импортировано 42, пропущено 0». Балансы сошлись. Toast успеха |
| 2 | **Русский Excel** | `;`, `1 250,50`, `15.09.2026`, заголовки RU | Загружает файл | Разделитель, суммы, даты и заголовки распознаны. Суммы через `MoneyText` |
| 3 | **Выписка без Type** | Колонки `Дата, Описание, Сумма` (`-500` / `+30000`) | Маппит Дата→`date`, Описание→`note`, Сумма→`amount`; выбирает счёт и дефолтную категорию | Знаки превратились в `expense`/`income` с положительными суммами |
| 4 | **Битые строки не блокируют** | 100 строк: 3 × `31.02.2026`, 2 × пустая сумма, 1 × огромная сумма | Открывает превью | 94 валидны, 6 с причинами, исключены. Кнопка «Импортировать 94». Отчёт перечисляет пропущенные с номерами строк |
| 5 | **Дубликаты под контролем** | Повторная загрузка того же файла | Открывает превью | 42 строки «Дубликат», исключены. Возврат галками работает, задвоения нет |
| 6 | **Новое имя из банка** | Категория `Кофейни` отсутствует в справочнике | Шаг маппинга: селект «К какой категории отнести» → `Кафе` | Все строки с `Кофейни` разрешились сразу. Без выбора — ошибка строк, не тихая запись |
| 7 | **Слишком большой файл** | 5000 строк / 5 МБ | Перетаскивает файл | Глобальная ошибка до парсинга, ноль записей |
| 8 | **Офлайн** | Нет сети (`OfflineBanner`) | Загружает, доходит до превью | Превью работает. Кнопка `disabled` с подсказкой. После появления сети — активна без потери маппинга |

---

## 5. UI и дизайн-система

### 5.1 Место и маршрут
- **Маршрут:** `/app/import-export`, таб `import` (тот же `Tabs`, что в F09). `ImportPlaceholderCard` заменяется на `ImportCard`.
- **Шапка:** существующий `PageHeader` — не дублируем.
- **Степпер:** `Upload → Columns → Preview → Result` (+ `Progress` на импорте). Mobile — компактный вертикальный степпер, таблицы скроллятся внутри контейнера.

### 5.2 Шаг 1 — Загрузка (`FileDropzone`)
- Дропзона + «Выбрать файл» (`input[type=file]` `accept=".csv,text/csv"`), drag-and-drop, доступность с клавиатуры (фокус, Enter).
- Проверки до парсинга: размер ≤ `MAX_IMPORT_FILE_SIZE`, строк ≤ `MAX_IMPORT_ROWS`, иначе глобальная ошибка.
- Кнопка «Скачать шаблон CSV» — 3 строки-примера через существующий `generateCsv` (ноль нового кода генерации).
- Состояния: idle / parsing (скелетон) / parse-error (`ErrorState` с повтором).

### 5.3 Шаг 2 — Колонки (`ColumnMapper`)
- Каждая колонка файла → `Select` поля (`date`, `type`, `amount`, `category`, `account`, `note`, `tags`, `__ignore__`). Авто-маппинг по словарю EN+RU (§9).
- Переключатель разделителя `,`/`;` (по умолчанию авто-детект) — переразбор без перезагрузки файла.
- Блок «Нераспознанные имена»: уникальное имя → селект сущности + дефолты (счёт, категория расходов, категория доходов).
- Переход дальше: `date` и `amount` замаплены обязательно; `type` — обязательно или явно включён режим «суммы со знаком».

### 5.4 Шаг 3 — Проверка (`ImportPreviewTable`)
- Потолок 2000 строк: рендер порциями по 200 + «показать ещё» (виртуализация не нужна).
- Строка: статус-иконка (`Check` / `AlertTriangle` / `XCircle`), дата, тип, категория (`CategoryBadge`), счёт (`AccountBadge`), сумма (`MoneyText`), заметка, причина, чекбокс «включить».
- Панель: «Готово N · Ошибки M · Дубликаты K», чипы-фильтры, «Пропустить дубликаты».
- Кнопка «Импортировать N» (`ConfirmDialog` при N ≥ 100) — `disabled` при N = 0 или offline.

### 5.5 Шаг 4 — Результат (`ImportReport`)
- Записано N, пропущено M (ошибки / дубликаты / вручную), затронутые счета с балансами, ссылка «Смотреть операции» → `/app/transactions?month=YYYY-MM` по диапазону файла.
- Упавшие чанки: какие записались, кнопка «Повторить оставшееся» (только незаписанные чанки).
- Кнопка «Импортировать ещё файл» (сброс в `upload`).

### 5.6 Переиспользование (DRY-матрица)

| UI-элемент | Источник | Статус в F10 |
|---|---|---|
| Заголовок, табы | `PageHeader`, `components/ui/tabs` | Готовые |
| Пустое / ошибка / скелетон | `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary` | Готовые |
| Диалог / подтверждение | `ResponsiveDialog`, `ConfirmDialog` | Готовые |
| Бейджи, деньги | `CategoryBadge`, `AccountBadge`, `MoneyText` | Готовые |
| Генератор CSV (шаблон) | `src/lib/csv.ts` | Готовый |
| Парсер CSV | `papaparse` (только в домене) | **Добавить в T1** |
| `ImportCard`, `FileDropzone`, `ColumnMapper`, `ImportPreviewTable`, `ImportReport` | `features/import-export/components/` | **Создать в T4** |
| `ImportPlaceholderCard` | `features/import-export/components/` | **Удалить использование** (файл удалить, экспорт из `index.ts` убрать) |

---

## 6. Скоуп

### Входит
1. Зависимость `papaparse` (+типы) в T1 — с явным упоминанием в PR, версию фиксирует T1 через Context7.
2. Доменный модуль парсинга (§8.1): BOM, детект разделителя, PapaParse, `parseImportDate` / `parseImportAmount` / `parseImportType`, словарь авто-маппинга EN+RU.
3. Сервис `services/importService.ts`: `mapRowsToInputs`, валидация через `transactionInputSchema`, дедупликация, отчёт.
4. Репозиторий: `createTransactionsBatch(uid, inputs)` + `chunkImportInputs` в `features/transactions/repository.ts`; чанки 400, `mergeDeltas`, `increment`.
5. Хук-машина `useCsvImport` (§8.5): шаги, маппинг, превью, прогресс, повтор незаписанного.
6. UI T4: `ImportCard` + 4 подкомпонента, замена таба, удаление плейсхолдера, i18n `importExport.import.*` (EN+RU), шаблон-примера.
7. Тесты (§13): unit домена и сервиса, integration batch на эмуляторе (401+ строк, два счёта), компонентные, e2e-8.

### Не входит (явно)
- Пресеты под конкретные банки, автоопределение банка, `.xlsx`, OFX/QIF.
- Создание новых категорий/счетов из файла (только маппинг на существующие).
- Редактирование ячеек в превью (только включение/исключение строк).
- Серверный фон / Cloud Functions; отмена уже записанного импорта (undo нет, удаление — поштучно в F05).
- Экспорт всех данных (F11), изменения rules и индексов.

---

## 7. Модель данных и запросы Firestore

### 7.1 Что пишется
Обычные документы `users/{uid}/transactions/{txId}` по `02-data-model.md` §3.4 через `transactionInputSchema`. Новых полей и коллекций нет. `note: ''` и `tags: []` не пишутся.

### 7.2 Запросы
1. **Сверка дубликатов:** один `getTransactionsByDateRange(uid, minDate, maxDate)` по диапазону файла (однополевой запрос F09, индексы не нужны). Сравнение — на клиенте.
2. **Запись:** чанки по `IMPORT_CHUNK_SIZE`: в каждом `writeBatch` — до 400 `set` + по одному `update(account, { balance: increment(mergedDelta) })` на затронутый счёт (нулевые дельты пропущены).
3. **Повтор:** только чанки `failed`; записанные не трогаем (идемпотентность на уровне чанков).

### 7.3 Влияние на rules и индексы
- `firestore.rules`: **нет**.
- `firestore.indexes.json`: **нет** (остаётся пустым).

---

## 8. Контракты и API

### 8.1 Доменный модуль парсинга (`src/lib/csvImport.ts`, чистый, без React/Firebase)

```ts
import type { CsvDelimiter } from './csv';

export const IMPORTABLE_FIELDS = [
  'date',
  'type',
  'amount',
  'category',
  'account',
  'note',
  'tags',
] as const;
export type ImportField = (typeof IMPORTABLE_FIELDS)[number];

export type ColumnMapping = Record<ImportField, number | null>;

export interface ParsedCsvTable {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
  hasHeader: boolean;
}

/** Снимает BOM, определяет , vs ;, разбирает через PapaParse. Бросает AppError. */
export function parseCsvText(text: string, opts?: { delimiter?: CsvDelimiter }): ParsedCsvTable;

/** trim + схлопывание NBSP/пробелов. */
export function normalizeImportCell(value: unknown): string;

/** 'YYYY-MM-DD' как есть; 'DD.MM.YYYY' -> 'YYYY-MM-DD'; иначе null. */
export function parseImportDate(raw: string): string | null;

/** Знак отдельно, модуль через parseMoneyInput. */
export function parseImportAmount(raw: string): { minor: number; isNegative: boolean } | null;

/** 'Expense'/'Расход' -> 'expense', 'Income'/'Доход' -> 'income'; иначе null. */
export function parseImportType(raw: string): 'expense' | 'income' | null;

/** Делит по запятой, trim, отсев пустых, максимум TAGS_MAX_COUNT. */
export function parseImportTags(raw: string, delimiter: CsvDelimiter): string[];

/** Авто-маппинг заголовков EN+RU в ColumnMapping. */
export function autoMapColumns(headers: string[]): ColumnMapping;

/** Нормализованный ключ дедупликации. */
export function buildImportDedupKey(input: {
  date: string;
  type: string;
  amount: number;
  accountId: string;
  categoryId: string;
  note?: string;
}): string;
```

### 8.2 Схемы (`src/features/import-export/schemas.ts`, дописать) и лимиты

```ts
export const importFieldSchema = z.enum(['date', 'type', 'amount', 'category', 'account', 'note', 'tags']);
export const columnMappingSchema = z.record(importFieldSchema, z.number().int().min(0).nullable());

export const importNameOverrideSchema = z.object({
  sourceName: z.string().min(1).max(40),
  categoryId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64).optional(),
});
```

В `src/lib/limits.ts` (единственное место чисел):

```ts
export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_FILE_SIZE = 2_000_000;
```

### 8.3 Сервис импорта (`src/features/import-export/services/importService.ts`)

```ts
import type { TransactionInput } from '@/features/transactions';
import type { Category } from '@/features/categories';
import type { Account } from '@/features/accounts';

export type ImportRowStatus = 'valid' | 'error' | 'duplicate';

export interface ValidatedImportRow {
  rowNumber: number; // 1-based номер строки данных (без заголовка)
  status: ImportRowStatus;
  input: TransactionInput | null;
  errors: string[]; // ключи i18n, не сырые тексты
  duplicateOf: 'file' | 'database' | null;
  excluded: boolean; // ошибки и дубликаты исключены по умолчанию
}

export interface NameResolution {
  categoryByName: Map<string, string>;
  accountByName: Map<string, string>;
  defaultAccountId: string;
  defaultExpenseCategoryId: string;
  defaultIncomeCategoryId: string;
}

/** Чистая функция: сырые строки + маппинг + справочники -> валидированные строки (без сети). */
export function mapRowsToInputs(
  table: ParsedCsvTable,
  mapping: ColumnMapping,
  resolution: NameResolution,
  categories: readonly Category[],
  accounts: readonly Account[],
): ValidatedImportRow[];

/** Помечает дубликаты внутри файла + против existing. Чистая, без сети. */
export function markDuplicates(
  rows: ValidatedImportRow[],
  existing: readonly { date: string; type: string; amount: number; accountId: string; categoryId: string; note?: string }[],
): ValidatedImportRow[];

export interface ImportReportData {
  totalRows: number;
  importedCount: number;
  skippedErrorCount: number;
  skippedDuplicateCount: number;
  skippedManualCount: number;
  failedChunks: number;
  affectedAccounts: string[];
}
export function buildImportReport(
  rows: readonly ValidatedImportRow[],
  chunkResults: readonly ChunkWriteResult[],
): ImportReportData;
```

### 8.4 Репозиторий (`src/features/transactions/repository.ts`, дописать)

```ts
export interface ChunkWriteResult {
  chunkIndex: number;
  written: number;
  status: 'ok' | 'failed';
  error?: AppError;
}

/** Резка на чанки по IMPORT_CHUNK_SIZE. Чистая. */
export function chunkImportInputs(inputs: readonly TransactionInput[]): TransactionInput[][];

export async function createTransactionsBatch(
  uid: string,
  inputs: readonly TransactionInput[],
  onProgress?: (done: number, total: number) => void,
): Promise<ChunkWriteResult[]>;
```

### 8.5 Хук (`src/features/import-export/hooks/useCsvImport.ts`)

```ts
export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'result';

export interface UseCsvImportResult {
  step: ImportStep;
  table: ParsedCsvTable | null;
  mapping: ColumnMapping;
  setMapping: (patch: Partial<ColumnMapping>) => void;
  rows: ValidatedImportRow[];
  includedCount: number;
  isParsing: boolean;
  isImporting: boolean;
  progress: { done: number; total: number };
  report: ImportReportData | null;
  globalError: AppError | null;
  loadFile: (file: File) => Promise<void>;
  setRowExcluded: (rowNumber: number, excluded: boolean) => void;
  excludeAllByStatus: (status: 'error' | 'duplicate') => void;
  startImport: () => Promise<void>;
  retryFailedChunks: () => Promise<void>;
  reset: () => void;
}
export function useCsvImport(): UseCsvImportResult;
```

### 8.6 Публичный API (`src/features/import-export/index.ts`)

```ts
export { mapRowsToInputs, markDuplicates, buildImportReport } from './services/importService';
export type { ValidatedImportRow, ImportRowStatus, ImportReportData } from './services/importService';
export { useCsvImport } from './hooks/useCsvImport';
export type { ImportStep, UseCsvImportResult } from './hooks/useCsvImport';
export { ImportCard } from './components/ImportCard';
// ImportPlaceholderCard и его тип удалить из экспорта
```

---

## 9. Валидация и ошибки

| Ситуация | Правило | Поведение UI | Ключ i18n |
|---|---|---|---|
| Файл > 2 МБ / строк > 2000 | до парсинга | Глобальная ошибка, «Выбрать другой файл» | `import.errors.fileTooLarge` |
| Нечитаемый текст | `parseCsvText` бросил | `ErrorState` с повтором | `import.errors.parseFailed` |
| `date`/`amount` не сопоставлены | обязательные поля маппинга | Блок перехода, подсказка под маппером | `import.errors.mappingRequired` |
| Дата `31.02.2026`, `2026-13-01`, мусор | `parseImportDate` + `isValidIsoDate` | Ошибка строки, исключена | `import.rowErrors.dateInvalid` |
| Пустая сумма / мусор / `0` | `parseImportAmount` + `moneyAmountSchema` | Ошибка строки | `import.rowErrors.amountInvalid` |
| Сумма > `MAX_AMOUNT` | `moneyAmountSchema` | Ошибка строки | `import.rowErrors.amountTooLarge` |
| Неизвестный тип | `parseImportType` → null | Ошибка строки | `import.rowErrors.typeInvalid` |
| Тип категории ≠ типу операции | сверка `category.type` | Ошибка строки | `import.rowErrors.categoryTypeMismatch` |
| Имя не распознано и не замаплено | нет id в `NameResolution` | Ошибка строк с этим именем | `import.rowErrors.unknownCategory` / `unknownAccount` |
| Заметка > 200 (не режем молча) | длина | Ошибка строки | `import.rowErrors.noteTooLong` |
| Тегов > 10 | длина массива | Ошибка строки | `import.rowErrors.tooManyTags` |
| Дубликат (файл/база) | ключ §3.8 | Предупреждение, исключён, возвращается галкой | `import.rowWarnings.duplicateFile` / `duplicateDatabase` |
| Упал чанк записи | `status === 'failed'` | Отчёт + «Повторить оставшееся» | `import.errors.chunkFailed` |
| Offline на записи | `navigator.onLine === false` | Кнопка `disabled` + подсказка | `import.errors.offlineBlocked` |

---

## 10. Локализация (i18n)

Namespace `importExport`, ветка `import` (EN + RU в одном коммите, плюрали через `count`). Общие строки (`common.actions.*`, `validation.*`) переиспользуются.

Новые ключи (полные тексты — в T4):
- `import.steps.{upload,columns,preview,result}`, `import.upload.{title,description,chooseFile,dropHint,templateButton}`
- `import.mapping.{title,description,delimiterLabel,auto,fieldLabels.{date,type,amount,category,account,note,tags,ignore},unmappedNames,defaultAccount,defaultExpenseCategory,defaultIncomeCategory,signModeHint}`
- `import.preview.{title,counters,filters.{all,errors,duplicates},skipDuplicates,importAction,importConfirmTitle,showMore}`
- `import.report.{title,imported,skippedErrors,skippedDuplicates,skippedManual,failedChunks,retryRemaining,importAnother,viewTransactions}`
- `import.rowErrors.{dateInvalid,amountInvalid,amountTooLarge,typeInvalid,categoryTypeMismatch,unknownCategory,unknownAccount,noteTooLong,tooManyTags}`
- `import.rowWarnings.{duplicateFile,duplicateDatabase}`
- `import.errors.{fileTooLarge,parseFailed,mappingRequired,chunkFailed,offlineBlocked}`

---

## 11. Эдж-кейсы фичи и обработка ошибок (глобальные)

1. **BOM из Excel:** снимаем `\uFEFF` до PapaParse, иначе первый заголовок не маппится. Пустые строки пропускаем (`skipEmptyLines`), иначе хвост файла даёт сотни «пустых ошибок».
2. **Кавычки и переносы внутри полей:** разбирает только PapaParse; ручных `split(';')` в коде нет.
3. **Пробелы в суммах (`1 250,50`):** сырую строку отдаём в `parseMoneyInput` как есть — он уже чистит пробелы и группировки. Своего regex поверх него нет.
4. **Формулы в заметках (`=1+1`):** храним как текст (в приложении не исполняются). При экспорте F09 их заэкранирует `sanitizeCsvFormula`.
5. **Архивные категории/счета:** резолвятся как обычные, в превью — бейдж архива. Дефолтами быть не могут.
6. **Неразрешённые строки в сверке дубликатов не участвуют** (они уже ошибки).
7. **Частичный успех чанков:** повтор — только по незаписанным inputs; прогресс считает только `ok`-чанки.
8. **Защита от двойной записи:** после успеха кнопка превращается в «Импортировать ещё файл» (сброс), а не в повторный запуск.
9. **Широкий диапазон дат:** сверка с базой — только если диапазон файла ≤ 366 дней; иначе явное предупреждение «проверены только дубликаты внутри файла» (квота Spark, ADR-010).
10. **Файл без заголовков:** `hasHeader=false` — маппинг по индексам `Колонка A/B/C`, авто-маппинг не применяется.
11. **Уход со страницы во время записи:** batch дописывается, хук игнорирует `setState` после unmount; новый вход начинает с чистого `upload`.

---

## 12. Acceptance criteria

- [x] **AC1 (круговой импорт):** Given файл из F09 (`,` или `;`, EN или RU), When шаги пройдены до результата, Then строки импортированы 1-в-1, балансы сошлись с `Σ signed`.
- [x] **AC2 (банковский формат):** Given CSV с `;`, `1 250,50`, `DD.MM.YYYY`, When файл загружен, Then всё распознано без ручной конвертации.
- [x] **AC3 (суммы со знаком):** Given файл без `Type` и суммы `-500`/`+30000`, When включён режим «суммы со знаком», Then типы определены верно, в базе `amount` положительные.
- [x] **AC4 (битые не блокируют):** Given строки `31.02.2026` и с пустой суммой, When открыто превью, Then они подсвечены с причинами и исключены, кнопка показывает N только по валидным, отчёт перечисляет пропущенные с номерами строк.
- [x] **AC5 (дедупликация):** Given повторная загрузка того же файла, When открыто превью, Then строки «Дубликат», исключены, возврат галкой работает, задвоения нет.
- [x] **AC6 (чанки и балансы):** Given 450 валидных строк на два счёта, When импорт завершён, Then 2 batch (400 + 50), increments равны `mergeDeltas`, оба чанка `ok` в отчёте.
- [x] **AC7 (лимиты и offline):** Given 5000 строк / 5 МБ, When загрузка, Then глобальная ошибка до парсинга, ноль записей. Given offline в превью, Then кнопка `disabled` с объяснением.
- [x] **AC-STATES:** loading (скелетон парсинга, прогресс записи), empty (0 валидных → `disabled` + `EmptyState`), error (глобальные и построчные с повтором), offline (превью работает, запись блокирована), success (отчёт + toast).
- [x] **AC-I18N:** все строки через `importExport.import.*` (EN+RU), заголовки EN+RU маппятся, жёстких строк нет.
- [x] **AC-A11Y:** дропзона с клавиатуры, `aria-live` счётчиков, подписанные чекбоксы, контраст по токенам.
- [x] **AC-ARCH:** `papaparse` и `firebase/firestore` только в разрешённых модулях, домен без React/Firebase, наружу только через `index.ts`, числа только в `limits.ts`, rules и индексы не тронуты.

---

## 13. План тестов

| Уровень | Файлы тестов | Что проверяется |
|---|---|---|
| **Unit (domain)** | `src/lib/csvImport.test.ts` | BOM, детект `,`/`;`, кавычки и переносы внутри полей, `skipEmptyLines`, `parseImportDate` (ISO + `DD.MM.YYYY` + `31.02.2026`, `2026-13-01`), `parseImportAmount` (знаки, `1 250,50`, мусор, `0`), `parseImportType` (EN+RU, регистр), `parseImportTags`, `autoMapColumns` (EN+RU), `buildImportDedupKey` |
| **Unit (service)** | `services/importService.test.ts` | Резолв имён (обе локали, case-insensitive), несовпадение типа категории, дефолты, ошибки с номерами строк; `markDuplicates` (файл + база); `buildImportReport` |
| **Unit (repo)** | `features/transactions/repository.test.ts` (дописать) | `chunkImportInputs`: 401 → 400+1, пустой вход |
| **Integration (эмулятор)** | `features/transactions/repository.integration.test.ts` (дописать) | `createTransactionsBatch`: 450 строк → 2 чанка, балансы двух счетов сошлись, повтор `failed` не дублирует, битый вход отклонён до записи |
| **Component** | `components/ImportCard.test.tsx`, `ColumnMapper.test.tsx`, `ImportPreviewTable.test.tsx` | Загрузка файла (mock `File`), смена разделителя, ручной маппинг, фильтры, исключение строк, confirm при N ≥ 100, offline-блокировка |
| **E2E** | `e2e/import.spec.ts` | Сценарий №8 из `05-testing-strategy.md`: сид (категории+счета) → таб import → круговой импорт файла F09 → превью с битой строкой и дубликатом → запись → отчёт → балансы и `a11y` (axe) |

---

## 14. Задачи (T1–T6)

Каждая задача — одна сессия агента и один коммит (Conventional Commits, английский).

### T1: Домен парсинга `src/lib/csvImport.ts`, лимиты, `papaparse`, unit-тесты
- **Что делаем:**
  1. Через Context7 сверить актуальный API `papaparse` (разбор строки, детект разделителя, `skipEmptyLines`).
  2. Добавить `papaparse` (+типы) в `dependencies` через `pnpm` (единственное разрешённое изменение `package.json` в фиче; явно указать в PR).
  3. Создать `src/lib/csvImport.ts` по §8.1 (BOM, детект `,`/`;`, `parseImportDate`, `parseImportAmount` поверх `parseMoneyInput`, `parseImportType`, `parseImportTags`, `autoMapColumns` по словарю EN+RU заголовков F09, `buildImportDedupKey`).
  4. Добавить `MAX_IMPORT_ROWS`, `MAX_IMPORT_FILE_SIZE` в `src/lib/limits.ts`.
  5. Написать `src/lib/csvImport.test.ts` (ветви из плана §13, цель — 100% ветвей модуля).
- **Файлы:** `package.json`, `pnpm-lock.yaml`, `src/lib/csvImport.ts`, `src/lib/csvImport.test.ts`, `src/lib/limits.ts`.
- **Проверка:** `pnpm test`, `pnpm typecheck`.

### T2: Схемы импорта и сервис `importService.ts` (+ unit-тесты)
- **Что делаем:**
  1. Дописать `src/features/import-export/schemas.ts` (§8.2: `importFieldSchema`, `columnMappingSchema`, `importNameOverrideSchema`).
  2. Создать `src/features/import-export/services/importService.ts` (§8.3: `mapRowsToInputs` с резолвом имён через `getCategoryDisplayName`/`getAccountDisplayName`, `markDuplicates`, `buildImportReport`).
  3. Обновить `src/features/import-export/schemas.test.ts`, создать `services/importService.test.ts` (фабрики из `src/test/`, без копирования объектов).
- **Файлы:** `src/features/import-export/schemas.ts`, `services/importService.ts`, тесты, `src/features/import-export/index.ts` (экспорт сервиса).
- **Проверка:** `pnpm test`, `pnpm typecheck`, `pnpm lint`.

### T3: Репозиторий `createTransactionsBatch` (+ integration на эмуляторе)
- **Что делаем:**
  1. Добавить в `src/features/transactions/repository.ts` `chunkImportInputs` (чистая) и `createTransactionsBatch` (§8.4: чанки 400, `writeBatch` + `mergeDeltas` + `increment`, `onProgress`, отчёт по чанкам, `toAppError`).
  2. Экспортировать из `src/features/transactions/index.ts`.
  3. Дописать unit (`chunkImportInputs`) и integration-тесты на эмуляторе (450 строк, два счёта, смена счёта, повтор `failed`, битый вход).
- **Файлы:** `src/features/transactions/repository.ts`, `index.ts`, `repository.test.ts`, `repository.integration.test.ts`.
- **Проверка:** `pnpm test`, интеграционные на эмуляторе.

### T4: Хук `useCsvImport` и UI (`ImportCard` + 4 компонента), i18n, замена таба
- **Что делаем:**
  1. Создать `hooks/useCsvImport.ts` (§8.5: машина шагов, `loadFile` через `File.text()`, сверка дубликатов одним `getTransactionsByDateRange`, `startImport`/`retryFailedChunks`, guard unmount, `useOnlineStatus` для блокировки).
  2. Создать `ImportCard`, `FileDropzone`, `ColumnMapper`, `ImportPreviewTable`, `ImportReport` (§5.2–§5.5; кнопка шаблона через `generateCsv`; `ConfirmDialog` при N ≥ 100).
  3. Заменить таб импорта на `ImportCard`, удалить `ImportPlaceholderCard.tsx` и его экспорт, обновить `ImportExportPage.test.tsx`.
  4. Добавить `import` в `src/i18n/locales/{en,ru}/importExport.json` (§10, полные тексты + плюрали).
- **Файлы:** `hooks/useCsvImport.ts`, `components/*` (5 новых, 1 удалён), `index.ts`, `ImportExportPage.tsx`, локали, тесты страницы.
- **Проверка:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, визуально (loading/empty/error/offline, mobile 360px, EN/RU, тёмная тема).

### T5: Компонентные тесты и Playwright e2e
- **Что делаем:**
  1. Написать `ImportCard.test.tsx`, `ColumnMapper.test.tsx`, `ImportPreviewTable.test.tsx` (загрузка mock-файла, маппинг, фильтры, исключение, confirm, offline).
  2. Написать `e2e/import.spec.ts`: сид → круговой импорт → битая строка + дубликат → отчёт → проверка балансов; `axe` на табе импорта.
  3. Исправить найденное, не расширяя скоуп.
- **Файлы:** `*.test.tsx`, `e2e/import.spec.ts`, фикстуры CSV в `e2e/fixtures/`.
- **Проверка:** `pnpm test`, `pnpm e2e`.

### T6: Верификация (`verify`), финализация, документация
- **Что делаем:**
  1. Полный цикл: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (+ `test:rules` без изменений — убедиться, что зелёный).
  2. Ручная проверка по `04-ux-guidelines.md` §11 через скилл `verify` (5 состояний, mobile/desktop, светлая/тёмная, EN/RU, клавиатура, offline).
  3. Обновить статус F10 в `docs/06-roadmap.md` (`todo` → `done`), отметить AC.
- **Файлы:** `docs/06-roadmap.md`, эта спека (статус → `done`).
- **Проверка:** скилл `verify`, отчёт приложен к PR.

После каждой задачи: `pnpm typecheck && pnpm lint && pnpm test`, коммит (Conventional Commits, английский).

---

## 15. Definition of Done

- [x] Acceptance criteria AC1–AC7, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH выполнены.
- [x] Тесты из §13 написаны и проходят (unit domain: `csvImport.ts` 97.3% строк / 100% функций; единственная непокрытая ветвь — защитная проверка пустого результата парсинга, exempt по политике покрытия `AGENTS.md` §13).
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rules`, `pnpm build` зелёные; скилл `verify` пройден, отчёт в PR.
- [x] Нет нарушений `AGENTS.md` (§7, §8, §11): границы слоёв, DRY, запрещённые паттерны.
- [x] `firestore.rules` и `firestore.indexes.json` не изменены.
- [x] Статус в `docs/06-roadmap.md` обновлён; непроверенное и ограничения перечислены в PR.

---

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос или решение | Статус |
|---|---|---|
| 2026-10-15 | `PapaParse` как единственный парсер (в стеке с F00, в `package.json` отсутствует — добавить в T1) | Решено в спеке, требует упоминания в PR (изменение `package.json`) |
| 2026-10-15 | Только два входных формата дат (`YYYY-MM-DD`, `DD.MM.YYYY`); суммы со знаком как запасной путь без колонки Type | Решено в спеке |
| 2026-10-15 | Дедупликация — предупреждение с исключением по умолчанию, не авто-удаление; сверка с базой только при диапазоне ≤ 366 дней | Решено в спеке |
| 2026-10-15 | Создание категорий/счетов из файла и пресеты под банки — вне v1 (Backlog) | Решено в спеке |
| 2026-10-15 | Точная версия `papaparse` и API опций — сверить через Context7 в T1, не фиксировать в спеке | Закрыто в T1: `papaparse@5.7.0` + `@types/papaparse@5.5.2` |
| 2026-10-15 | Колонка `Currency` из «игнорируется» стала проверяемой: несовпадение с базовой валютой профиля — ошибка строки `currencyMismatch`; шаблон генерируется в базовой валюте | Решено при реализации, покрыто unit + e2e |
| 2026-10-15 | `ImportChunkResult` из T2 заменён на `ChunkWriteResult` из T3 (§8.3) | Решено в T3, без изменений поведения |
