# F09 — CSV Export (Экспорт транзакций в CSV)

Статус: spec-ready
Зависит от: F01 (доменные типы, деньги, даты, валюты, ошибки), F02 (аутентификация, профиль), F03 (Security Rules v1), F04 (категории, CategoryBadge, getCategoryDisplayName), F05 (Transactions, Transaction, subscribeTransactionsByDateRange, MonthNavigator), F07 (счета, getAccountDisplayName, AccountBadge)
Размер: S (5 задач: T1–T5)
Ветка: `feat/F09-csv-export`

> **Контекст для агента:** Фича F09 открывает веху **M5 Data** («Вау»-элемент №2: экспорт и импорт данных, `docs/00-project-spec.md` §3, §4). Она реализует фундаментальный продуктовый принцип FinTrack — *«Данные пользователя принадлежат ему»*: возможность в любой момент выгрузить свою финансовую историю в стандартном, чистом и безопасном формате CSV. Экспортированные файлы должны безупречно открываться в Microsoft Excel (включая русскоязычную локаль без «кракозябр» благодаря UTF-8 BOM и выбору разделителя `;`), Apple Numbers, Google Sheets и сторонних финансовых приложениях. Особое внимание уделяется защите от атак типа CSV Formula Injection (CWE-1236), строгому соблюдению стандарта RFC 4180 и бесшовному взаимодействию со страницей транзакций (быстрый экспорт текущей отфильтрованной выборки).
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7), `docs/02-data-model.md` (§2, §3.4, §6.1), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.1, §3, §4, §5, §6), `docs/05-testing-strategy.md` (§3.1, §3.5).
> Справка по API библиотек (`firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner, date-fns) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Предоставить пользователю гибкий, надежный и безопасный инструмент для экспорта транзакций в формат CSV с поддержкой фильтрации по периодам (текущий месяц, прошлый месяц, квартал, год, все время, произвольный диапазон дат), категориям, счетам и типам операций, гарантируя корректное открытие файлов в любых табличных процессорах (Microsoft Excel, Google Sheets, Apple Numbers) без искажения кодировки и без уязвимостей выполнения формул.

**Пользовательские истории:**
1. *Как пользователь*, я хочу выгрузить свои финансовые операции за любой выбранный период (месяц, год или произвольный диапазон дат) в файл CSV, чтобы вести собственный учет, строить сводные таблицы в Excel или сохранять резервную копию данных.
2. *Как пользователь*, я хочу иметь возможность экспортировать только отфильтрованные данные (например, только расходы по категории «Продукты» со счёта «Карта»), чтобы анализировать конкретные статьи бюджета.
3. *Как пользователь*, находясь на странице транзакций `/app/transactions`, я хочу в один клик экспортировать текущий просматриваемый месяц или результат активного поиска («Быстрый экспорт»), не переходя на отдельную страницу.
4. *Как пользователь*, использующий русскоязычный Excel, я хочу иметь возможность выбрать разделитель «точка с запятой» (`;`) и запятую в качестве десятичного разделителя, чтобы файл открывался сразу с разбивкой по колонкам и числа распознавались как суммы, а не текст.
5. *Как пользователь*, я хочу быть уверен, что кириллические названия категорий и заметок открываются в Excel без искажения символов (благодаря корректному UTF-8 BOM).
6. *Как пользователь*, я хочу видеть предварительное количество записей, попадающих под условия экспорта, до момента скачивания файла.

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы
- `src/lib/money.ts`: функции работы с minor units (`fromMinorUnits`, `formatMoney`, `parseMoneyInput`).
- `src/lib/dates.ts`: календарные утилиты без привязки к TZ (`isValidIsoDate`, `toIsoDate`, `todayIso`, `toYearMonth`, `currentYearMonth`, `addMonths`, `monthRange`, `compareIsoDates`, `formatIsoDate`, `formatYearMonth`).
- `src/lib/currencies.ts`: типы валют `CurrencyCode`, список поддерживаемых валют.
- `src/lib/firestore/paths.ts`: типизированные пути `transactionsCol(uid)`, `categoriesCol(uid)`, `accountsCol(uid)`.
- `src/lib/firestore/createConverter.ts`: `createConverter` и `parseSnapshotDocs`.
- `src/hooks/useSubscription.ts`: хук для подписок реального времени с защитой от React StrictMode.
- `src/features/auth/`: `useAuth` (доступ к `user.uid` и `profile.baseCurrency`).
- `src/features/categories/`: `useCategories`, `subscribeCategories`, `getCategoryDisplayName`, тип `Category`.
- `src/features/accounts/`: `useAccounts`, `subscribeAccounts`, `getAccountDisplayName`, тип `Account`.
- `src/features/transactions/`: `useTransactions`, `subscribeTransactionsByDateRange`, `subscribeTransactionsByMonth`, типы `Transaction`.
- `src/components/common/`: готовые компоненты `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`, `ResponsiveDialog`, `ConfirmDialog`.

### 2.2 Архитектурные ограничения и инварианты
- **Строгие границы ESLint:**
  - `components/common/` **не импортирует** `features/**`.
  - Модули `features/` импортируют друг друга **только через `index.ts`** (публичный API).
  - `firebase/firestore` импортируется **только** в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
  - Модуль генерации CSV `src/lib/csv.ts` является **чистым доменом** (Domain layer): не зависит от React, DOM-состояния и Firebase. Браузерная функция скачивания `downloadCsvBlob` изолирована и доступна для тестирования.
- **Безопасность CSV (CSV Injection / CWE-1236):** Любое текстовое значение (`note`, названия категорий/счетов), начинающееся с символов `=`, `+`, `-`, `@`, `\t`, `\r`, `%`, обязано санитизироваться префиксом `'` (одинарная кавычка).
- **Стандарт RFC 4180:** Значения, содержащие разделитель (`,` или `;`), двойные кавычки (`"`) или символы перевода строки (`\n`, `\r`), оборачиваются в двойные кавычки. Внутренние кавычки дублируются (`""`). Строки разделяются парой CRLF (`\r\n`).
- **Excel UTF-8 Совместимость:** Сгенерированный контент предваряется меткой порядка байтов UTF-8 BOM (`\uFEFF`).
- **Отсутствие составных индексов:** Запрос к Firestore для произвольного диапазона дат выполняется строго по одному полю `date`: `where('date', '>=', startDate)`, `where('date', '<=', endDate)`, `orderBy('date', 'desc')` (ADR-010). Все дополнительные фильтры (по категории, счёту, типу) применяются **на клиенте**.

---

## 3. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Архитектура генерации CSV** | Чистый доменный модуль `src/lib/csv.ts` с RFC 4180 сериализатором и BOM | Исключает внешние рантайм-зависимости для генерации, обеспечивает 100% покрытие unit-тестами и гарантирует переиспользование в F10 (импорт) и F11 (экспорт всех данных). |
| 2 | **Защита от CSV Formula Injection** | Автоматическая санитизация префиксом `'` для строк, начинающихся с `=`, `+`, `-`, `@`, `\t`, `\r`, `%` | Предотвращает исполнение произвольных DDE-команд и макросов при открытии файла в Excel/LibreOffice (требование NFR `00-project-spec.md` §6, CWE-1236). |
| 3 | **Поддержка локалей Excel (Разделители)** | Выбор двух пресетов: <br>1. **Международный:** разделитель `,`, десятичная точка `.`<br>2. **Европейский / RU Excel:** разделитель `;`, десятичная запятая `,` | В русскоязычном Excel по умолчанию системным разделителем колонок является `;` (так как запятая — разделитель дробной части). Пресет по умолчанию выбирается по текущей локали (`ru` → `;`, `en` → `,`) с возможностью ручного переключения в UI. |
| 4 | **Колонки и заголовки экспорта** | 8 стандартных колонок:<br>`Date`, `Type`, `Category`, `Account`, `Amount`, `Currency`, `Note`, `Tags`. Заголовки локализуются согласно языку интерфейса | Обеспечивает исчерпывающий состав финансовой информации, совместимый с будущим импортом в F10 и сторонними сервисами. |
| 5 | **Где располагается UI экспорта** | 1. Основной центр: страница `/app/import-export` (вкладка «Экспорт»).<br>2. Быстрое действие: кнопка «Экспорт в CSV» на странице `/app/transactions` | Основная страница позволяет настроить глубокие параметры и диапазоны за все время. Быстрая кнопка на странице транзакций выгружает текущий просматриваемый срез за 1 клик с нулевыми затратами на чтение Firestore. |
| 6 | **Загрузка данных для экспорта** | Выборка через одноразовый запрос `getTransactionsByDateRange(uid, start, end)` или переиспользование уже загруженных транзакций из памяти | При экспорте текущего месяца со страницы транзакций данные берутся прямо из хука (0 сетевых запросов). При экспорте большого диапазона со страницы `/app/import-export` делается одноразовый `getDocs` без постоянной подписки. |
| 7 | **Формат дат и денежных сумм** | Дата: строго `YYYY-MM-DD` (ISO-8601). Сумма: положительное десятичное число (например `125.50` или `125,50` из minor units `12550`) | ISO-формат даты безошибочно парсится любыми таблицами. Сумма конвертируется из minor units через чистую функцию `fromMinorUnits`. |
| 8 | **Отображение архивных и системных сущностей** | Названия категорий и счетов вычисляются через эталонные хелперы `getCategoryDisplayName` и `getAccountDisplayName`. Для архивированных сущностей добавляется суффикс `(archived)` | Файл содержит понятные человеку названия, а не технические id или сырые `systemKey`. |
| 9 | **Именование выгружаемого файла** | Шаблон: `fintrack-export-YYYY-MM-DD.csv` или `fintrack-transactions-{scope}-YYYY-MM-DD.csv` | Имя файла информативно, содержит дату выгрузки и предотвращает коллизии в папке загрузок пользователя. |

---

## 4. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Экспорт за текущий месяц (Happy Path)** | Пользователь авторизован, на странице `/app/import-export` | 1. Выбран таб «Экспорт».<br>2. Период по умолчанию: «Текущий месяц».<br>3. Отображается счетчик: «Найдено 42 операции».<br>4. Нажимает «Экспорт в CSV». | Начинается генерация, кнопка показывает лоадер. Браузер скачивает файл `fintrack-export-2026-10.csv`. Появляется toast «Экспортировано 42 операции». |
| 2 | **Быстрый экспорт отфильтрованных транзакций** | Пользователь на `/app/transactions`, выбран сентябрь 2026, активен фильтр «Кафе» (15 операций) | 1. Нажимает кнопку «Экспорт в CSV» в панели действий.<br>2. Подтверждает быстрое скачивание. | Мгновенно (без сетевого ожидания) скачивается файл `fintrack-transactions-2026-09.csv`, содержащий ровно 15 отфильтрованных операций. |
| 3 | **Экспорт за произвольный диапазон дат (Custom Range)** | Пользователь на `/app/import-export` | 1. В выпадающем списке периодов выбирает «Произвольный период».<br>2. Указывает даты с `2026-01-01` по `2026-06-30`.<br>3. Выбирает фильтр: «Только расходы».<br>4. Нажимает «Экспорт в CSV». | Выполняется запрос к Firestore за указанный диапазон, клиент фильтрует расходы, счетчик показывает количество, инициируется скачивание файла. |
| 4 | **Экспорт для русскоязычного Excel** | Пользователь с локалью `ru` | 1. Открывает настройки экспорта.<br>2. Разделитель по умолчанию: «Точка с запятой (;)».<br>3. Нажимает «Экспорт в CSV». | Скачивается CSV с разделителем `;`, числами с десятичной запятой (`125,50`), UTF-8 BOM. При двойном клике в Windows Excel файл открывается с правильными колонками и русскими буквами. |
| 5 | **Экспорт заметок с опасными формулами (CSV Injection)** | В базе есть транзакция с заметкой `=SUM(A1:A10)` или `@cmd|' /C calc'!A0` | Пользователь выполняет экспорт | В итоговом CSV строка санитизируется как `"'=SUM(A1:A10)"`. При открытии в Excel формула отображается как безопасный текст и не исполняется. |
| 6 | **Экспорт при отсутствии операций (Empty State)** | Выбран период без транзакций (0 операций) | 1. Выбирает прошлый год.<br>2. Счетчик показывает «0 операций». | Кнопка «Экспорт в CSV» блокируется (`disabled`), отображается предупреждение «Нет операций для экспорта за выбранный период». |
| 7 | **Экспорт в офлайн-режиме** | Устройство потеряло связь с сетью (`OfflineBanner`), пользователь на странице транзакций | Пользователь нажимает «Быстрый экспорт» текущего месяца | Файл успешно формируется из локального кэша Firestore и скачивается браузером без ошибок сети. |

---

## 5. UI и дизайн-система

### 5.1 Структура страницы `ImportExportPage.tsx`
- **Маршрут:** `/app/import-export`.
- **Шапка (`PageHeader`):**
  - Заголовок: `t('importExport.title')` («Импорт и экспорт» / «Import & Export»).
  - Описание: `t('importExport.description')`.
- **Навигация по вкладкам (`Tabs`):**
  - Вкладка 1: `t('importExport.tabs.export')` — **Экспорт данных** (полнофункциональный UI F09).
  - Вкладка 2: `t('importExport.tabs.import')` — **Импорт данных** (промо-карточка с описанием грядущей фичи F10).
- **Карточка конфигурации экспорта (`ExportCard.tsx`):**
  1. **Секция 1: Период выборки (`ExportDateRangePicker`):**
     - Селектор пресетов: «Текущий месяц», «Прошлый месяц», «Последние 3 месяца», «Последние 6 месяцев», «Текущий год», «Все время», «Произвольный период».
     - При выборе «Произвольный период» появляются поля ввода начальной и конечной даты (`YYYY-MM-DD`).
  2. **Секция 2: Фильтры (опционально):**
     - Тип операции: Все / Только расходы / Только доходы.
     - Категория: Все категории / Выбор конкретной категории (с `CategoryBadge`).
     - Счёт: Все счета / Выбор конкретного счёта (с `AccountBadge`).
  3. **Секция 3: Параметры формата CSV:**
     - Радиокнопки / Селект разделителя:
       - `Comma (,)` — стандартный для Google Sheets и международных версий Excel.
       - `Semicolon (;)` — стандартный для Excel в РФ и странах Европы (с десятичной запятой).
     - Переключатель `Включить заголовки колонок` (по умолчанию `true`).
  4. **Информационная сводка и действие:**
     - Плашка со счетчиком: иконка `FileSpreadsheet`, количество найденных операций, суммарный объем.
     - Кнопка действия `Button` «Экспорт в CSV» (`Download` иконка, состояние загрузки со спиннером).

### 5.2 Интеграция быстрого экспорта на `TransactionsPage.tsx`
- В шапке страницы транзакций или в панели `TransactionFilters` размещается компактная кнопка `ExportQuickButton` с иконкой `Download` и всплывающей подсказкой (`Tooltip`) «Экспортировать текущий вид в CSV».
- При нажатии мгновенно выгружается CSV для просматриваемого месяца с учетом всех активных фильтров поиска.

### 5.3 Переиспользование компонентов (DRY-матрица)

| UI-элемент | Источник | Статус в F09 |
|---|---|---|
| Заголовок страницы | `components/common/PageHeader` | Готовый из F00 |
| Пустое состояние | `components/common/EmptyState` | Готовый из F00 |
| Состояние ошибки | `components/common/ErrorState` | Готовый из F00 |
| Скелетон загрузки | `components/common/LoadingSkeleton` | Готовый из F00 |
| Бейдж категории | `components/common/CategoryBadge` | Готовый из F04 |
| Бейдж счёта | `components/common/AccountBadge` | Готовый из F07 |
| Форматирование денег | `lib/money.ts` | Готовый из F01 |
| Карточки и вкладки | `components/ui/card`, `components/ui/tabs` | Готовые shadcn |
| Селекты и радиокнопки | `components/ui/select`, `components/ui/radio-group` | Готовые shadcn |
| Генератор CSV | `src/lib/csv.ts` | **Создаётся в F09 (T1)** |
| Карточка экспорта | `features/import-export/components/ExportCard.tsx` | **Создаётся в F09 (T4)** |
| Кнопка быстрого экспорта | `features/import-export/components/ExportQuickButton.tsx` | **Создаётся в F09 (T4)** |

---

## 6. Скоуп

### Входит
1. **Чистый доменный модуль CSV (`src/lib/csv.ts`):**
   - Стандарт RFC 4180: экранирование разделителей, кавычек `""`, переносов строк, CRLF.
   - Защита от CSV Formula Injection (санитизация префиксов `=`, `+`, `-`, `@`, `\t`, `\r`, `%`).
   - Поддержка UTF-8 BOM (`\uFEFF`) для корректного распознавания кириллицы в Excel.
   - Поддержка разделителей `,` и `;` с соответствующим форматированием десятичных дробей (`.` или `,`).
   - Изолированная браузерная утилита скачивания файлов `downloadCsvBlob`.
2. **Инфраструктура экспорта (`src/features/import-export/`):**
   - Zod-схемы конфигурации экспорта и фильтров (`schemas.ts`).
   - Сервис преобразования транзакций в CSV-строки с разрешением названий категорий и счетов (`exportService.ts`).
   - Хук `useExportTransactions` для загрузки диапазона, подсчета записей и формирования файла.
   - Хук `useQuickExport` для моментального экспорта из `TransactionsPage`.
3. **Расширение репозитория транзакций:**
   - Функция `getTransactionsByDateRange(uid, startDate, endDate)` в `features/transactions/repository.ts` для одноразовой выборки без создания постоянных подписок.
4. **UI-компоненты:**
   - Компонент `ExportCard` с выбором пресетов периодов, фильтров, формата CSV и счетчиком записей.
   - Компонент `ExportQuickButton` для страницы транзакций.
   - Заглушка таба импорта `ImportPlaceholderCard` со статусом «Скоро в F10».
   - Полнофункциональная страница `src/app/pages/ImportExportPage.tsx`.
5. **Локализация и тесты:**
   - Словари переводов `src/i18n/locales/{en,ru}/importExport.json`.
   - Исчерпывающие unit-тесты `csv.test.ts` (100% ветвей), тесты сервиса маппинга, хуков, компонентные тесты формы и Playwright E2E-тест скачивания файла.

### Не входит (явно)
- CSV-импорт, парсинг входящих банковских файлов, сопоставление колонок и пакетная запись в Firestore (фича F10).
- Экспорт всех сущностей базы (профиль, бюджеты, настройки) в JSON/ZIP (фича F11 Settings — «Экспорт всех данных»).
- Фоновый экспорт на сервере через Cloud Functions (архитектура v1 — чистое клиентское SPA без бэкенда).

---

## 7. Модель данных и запросы Firestore

### 7.1 Запросы к Firestore
Для выгрузки данных за произвольный период используется стандартный запрос по однополевому диапазону дат (не требующий составных индексов):

```ts
// src/features/transactions/repository.ts
export async function getTransactionsByDateRange(
  uid: string,
  startDate: IsoDate,
  endDate: IsoDate,
): Promise<Transaction[]> {
  const colRef = transactionsCol(uid);
  const q = query(
    colRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc'),
  );
  const snapshot = await getDocs(q);
  return parseSnapshotDocs(snapshot, transactionSchema);
}
```

### 7.2 Структура колонок CSV-файла

| № | Имя колонки (EN) | Имя колонки (RU) | Источник данных | Пример значения (EN / RU) |
|---|---|---|---|---|
| 1 | `Date` | `Дата` | `tx.date` | `2026-10-15` |
| 2 | `Type` | `Тип` | `tx.type` | `Expense` / `Расход` |
| 3 | `Category` | `Категория` | `getCategoryDisplayName(category, t)` | `Groceries` / `Продукты` |
| 4 | `Account` | `Счёт` | `getAccountDisplayName(account, t)` | `Main Card` / `Основная карта` |
| 5 | `Amount` | `Сумма` | `fromMinorUnits(tx.amount)` | `1250.50` / `1250,50` |
| 6 | `Currency` | `Валюта` | `profile.baseCurrency` | `USD` / `RUB` |
| 7 | `Note` | `Заметка` | `tx.note` (санитизированный) | `Supermarket purchase` |
| 8 | `Tags` | `Теги` | `tx.tags.join(', ')` | `weekend, family` |

---

## 8. Контракты и API

### 8.1 Доменный модуль CSV (`src/lib/csv.ts`)

```ts
export type CsvDelimiter = ',' | ';';
export type CsvDecimalSeparator = '.' | ',';

export interface CsvColumn<T> {
  id: string;
  header: string;
  accessor: (item: T) => string | number | null | undefined;
}

export interface CsvExportOptions {
  delimiter?: CsvDelimiter;
  decimalSeparator?: CsvDecimalSeparator;
  includeHeaders?: boolean;
  useBom?: boolean;
  sanitizeFormulas?: boolean;
}

/**
 * Экранирует опасные начальные символы (=, +, -, @, \t, \r, %) апострофом
 * для предотвращения CSV Formula Injection.
 */
export function sanitizeCsvFormula(value: string): string;

/**
 * Экранирует отдельное поле по правилам RFC 4180:
 * оборачивает в кавычки при наличии разделителя, кавычек или переносов строк; дублирует кавычки.
 */
export function escapeCsvField(value: string, delimiter: CsvDelimiter): string;

/**
 * Генерирует CSV-строку с заголовками, CRLF переводами строк и UTF-8 BOM.
 */
export function generateCsv<T>(
  data: readonly T[],
  columns: readonly CsvColumn<T>[],
  options?: CsvExportOptions,
): string;

/**
 * Инициирует скачивание CSV-файла в браузере через временный Blob и <a> элемент.
 */
export function downloadCsvBlob(content: string, filename: string): void;

/**
 * Формирует имя файла экспорта: fintrack-export-{rangeLabel}-{YYYY-MM-DD}.csv
 */
export function buildExportFilename(rangeLabel: string, dateIso?: string): string;
```

### 8.2 Схемы Zod (`src/features/import-export/schemas.ts`)

```ts
import { z } from 'zod';
import { isoDateSchema } from '@/lib/schemas';

export const exportScopePresetSchema = z.enum([
  'currentMonth',
  'prevMonth',
  'last3Months',
  'last6Months',
  'thisYear',
  'allTime',
  'custom',
]);

export type ExportScopePreset = z.infer<typeof exportScopePresetSchema>;

export const csvDelimiterSchema = z.enum([',', ';']);

export const exportConfigSchema = z.object({
  preset: exportScopePresetSchema,
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  type: z.enum(['all', 'expense', 'income']).default('all'),
  categoryId: z.string().default('all'),
  accountId: z.string().default('all'),
  delimiter: csvDelimiterSchema.default(','),
  includeHeaders: z.boolean().default(true),
});

export type ExportConfig = z.infer<typeof exportConfigSchema>;
```

### 8.3 Сервис трансформации данных (`src/features/import-export/services/exportService.ts`)

```ts
import type { Transaction } from '@/features/transactions';
import type { Category } from '@/features/categories';
import type { Account } from '@/features/accounts';
import type { CurrencyCode } from '@/lib/currencies';
import type { CsvDelimiter, CsvExportOptions } from '@/lib/csv';
import type { TFunction } from 'i18next';

export interface ExportTransformParams {
  transactions: readonly Transaction[];
  categories: readonly Category[];
  accounts: readonly Account[];
  baseCurrency: CurrencyCode;
  t: TFunction;
  options?: CsvExportOptions;
}

export function buildTransactionCsvColumns(
  t: TFunction,
  options?: CsvExportOptions,
): CsvColumn<ExportRow>[];

export function transformTransactionsToCsv(
  params: ExportTransformParams,
): string;
```

### 8.4 Хуки фичи

```ts
// src/features/import-export/hooks/useExportTransactions.ts
export interface UseExportTransactionsResult {
  config: ExportConfig;
  setConfig: (config: Partial<ExportConfig>) => void;
  isExporting: boolean;
  matchingCount: number;
  isLoadingCount: boolean;
  exportCsv: () => Promise<void>;
}

export function useExportTransactions(): UseExportTransactionsResult;

// src/features/import-export/hooks/useQuickExport.ts
export function useQuickExport(): {
  exportCurrentView: (
    transactions: readonly Transaction[],
    filenameScope: string,
  ) => void;
};
```

### 8.5 Публичный API фичи (`src/features/import-export/index.ts`)

```ts
export * from './schemas';
export { transformTransactionsToCsv } from './services/exportService';
export { useExportTransactions } from './hooks/useExportTransactions';
export { useQuickExport } from './hooks/useQuickExport';
export { ExportCard } from './components/ExportCard';
export { ExportQuickButton } from './components/ExportQuickButton';
```

---

## 9. Валидация и ошибки

| Ситуация | Правило | Поведение UI / Toast | Ключ i18n |
|---|---|---|---|
| Некорректный диапазон дат (`start > end`) | `startDate <= endDate` | Блокировка кнопки экспорта, сообщение об ошибке под полями | `importExport.errors.invalidDateRange` |
| 0 транзакций за период | `matchingCount === 0` | Блокировка кнопки, информационная плашка | `importExport.empty.noTransactions` |
| Ошибка сети при запросе к Firestore | Сбой `getDocs` | Toast об ошибке с кнопкой повтора | `importExport.errors.fetchFailed` |
| Повреждённый документ в БД | Не прошел валидацию Zod | Пропускается с логом в `logger.warn`, валидные экспортируются | — |
| Ошибка браузера при создании Blob / скачивании | Исключение в DOM API | Toast с уведомлением об ошибке скачивания | `importExport.errors.downloadFailed` |

---

## 10. Локализация (i18n)

Создается отдельный файл пространства имен `src/i18n/locales/{en,ru}/importExport.json` и регистрируется в `src/i18n/config.ts` и `src/i18n/types.ts`.

### Файл `src/i18n/locales/en/importExport.json`:
```json
{
  "title": "Import & Export",
  "description": "Export your financial history or import statements from CSV files",
  "tabs": {
    "export": "Export",
    "import": "Import"
  },
  "export": {
    "cardTitle": "Export transactions to CSV",
    "cardDescription": "Configure filters, date range, and delimiter format for your spreadsheet application",
    "presets": {
      "label": "Date range",
      "currentMonth": "Current month",
      "prevMonth": "Previous month",
      "last3Months": "Last 3 months",
      "last6Months": "Last 6 months",
      "thisYear": "This year",
      "allTime": "All time",
      "custom": "Custom period"
    },
    "customDates": {
      "startDate": "Start date",
      "endDate": "End date"
    },
    "filters": {
      "typeLabel": "Transaction type",
      "categoryLabel": "Category",
      "accountLabel": "Account",
      "allTypes": "All types",
      "expensesOnly": "Expenses only",
      "incomeOnly": "Income only",
      "allCategories": "All categories",
      "allAccounts": "All accounts"
    },
    "format": {
      "delimiterLabel": "CSV Delimiter",
      "comma": "Comma (,) — Standard / Google Sheets",
      "semicolon": "Semicolon (;) — Excel (Europe / CIS)",
      "includeHeaders": "Include column headers"
    },
    "summary": {
      "found": "Found {{count}} transaction",
      "found_plural": "Found {{count}} transactions",
      "readyToExport": "Ready to export"
    },
    "actions": {
      "download": "Export CSV",
      "downloading": "Generating file...",
      "quickExport": "Export to CSV"
    },
    "columns": {
      "date": "Date",
      "type": "Type",
      "category": "Category",
      "account": "Account",
      "amount": "Amount",
      "currency": "Currency",
      "note": "Note",
      "tags": "Tags",
      "expenseType": "Expense",
      "incomeType": "Income"
    },
    "notifications": {
      "success": "Exported {{count}} transaction successfully",
      "success_plural": "Exported {{count}} transactions successfully"
    }
  },
  "importPromo": {
    "title": "CSV Statement Import",
    "badge": "Coming in F10",
    "description": "Upload bank statements, map columns with live preview, detect duplicates, and import hundreds of operations in seconds."
  },
  "errors": {
    "invalidDateRange": "Start date must be before or equal to end date",
    "fetchFailed": "Failed to load transactions for export",
    "downloadFailed": "Failed to download CSV file"
  },
  "empty": {
    "noTransactions": "No transactions found for the selected period and filters."
  }
}
```

### Файл `src/i18n/locales/ru/importExport.json`:
```json
{
  "title": "Импорт и экспорт",
  "description": "Экспорт истории операций и импорт банковских выписок в формате CSV",
  "tabs": {
    "export": "Экспорт",
    "import": "Импорт"
  },
  "export": {
    "cardTitle": "Экспорт операций в CSV",
    "cardDescription": "Настройте период, фильтры и формат разделителя для вашей табличной программы",
    "presets": {
      "label": "Период",
      "currentMonth": "Текущий месяц",
      "prevMonth": "Прошлый месяц",
      "last3Months": "Последние 3 месяца",
      "last6Months": "Последние 6 месяцев",
      "thisYear": "Текущий год",
      "allTime": "За всё время",
      "custom": "Произвольный период"
    },
    "customDates": {
      "startDate": "Дата начала",
      "endDate": "Дата окончания"
    },
    "filters": {
      "typeLabel": "Тип операции",
      "categoryLabel": "Категория",
      "accountLabel": "Счёт",
      "allTypes": "Все типы",
      "expensesOnly": "Только расходы",
      "incomeOnly": "Только доходы",
      "allCategories": "Все категории",
      "allAccounts": "Все счета"
    },
    "format": {
      "delimiterLabel": "Разделитель колонок CSV",
      "comma": "Запятая (,) — Международный / Google Sheets",
      "semicolon": "Точка с запятой (;) — Excel (РФ / Европа)",
      "includeHeaders": "Включать строку заголовков"
    },
    "summary": {
      "found": "Найдена {{count}} операция",
      "found_plural": "Найдено {{count}} операций",
      "readyToExport": "Готово к экспорту"
    },
    "actions": {
      "download": "Экспорт в CSV",
      "downloading": "Формирование файла...",
      "quickExport": "Экспорт в CSV"
    },
    "columns": {
      "date": "Дата",
      "type": "Тип",
      "category": "Категория",
      "account": "Счёт",
      "amount": "Сумма",
      "currency": "Валюта",
      "note": "Заметка",
      "tags": "Теги",
      "expenseType": "Расход",
      "incomeType": "Доход"
    },
    "notifications": {
      "success": "Успешно экспортирована {{count}} операция",
      "success_plural": "Успешно экспортировано {{count}} операций"
    }
  },
  "importPromo": {
    "title": "Импорт выписок из CSV",
    "badge": "Скоро в F10",
    "description": "Загрузка банковских выписок, сопоставление колонок с превью, поиск дубликатов и пакетная запись сотен операций за пару секунд."
  },
  "errors": {
    "invalidDateRange": "Дата начала не может быть позже даты окончания",
    "fetchFailed": "Не удалось загрузить операции для экспорта",
    "downloadFailed": "Не удалось скачать файл CSV"
  },
  "empty": {
    "noTransactions": "Нет операций за выбранный период и фильтры."
  }
}
```

---

## 11. Эдж-кейсы и особые ситуации (глобальные для проекта)

1. **Защита от выполнения формул (CSV Formula Injection / CWE-1236):**
   - Пользователь или сторонний импорт может ввести в поле `note` вредоносную строку: `=cmd|' /C calc'!A0`, `+1+1`, `@SUM(1,2)` или `-2+3`.
   - При открытии в Microsoft Excel такие строки без экранирования интерпретируются как формулы или DDE-команды.
   - Функция `sanitizeCsvFormula` проверяет первый символ очищенной строки и, если это `=`, `+`, `-`, `@`, `\t`, `\r`, `%`, предваряет значение символом `'` (апостроф). Excel воспринимает такое поле строго как строковый литерал.
2. **Корректное отображение кириллицы в Microsoft Excel (UTF-8 BOM):**
   - Без символа BOM (`\uFEFF`) Excel в Windows пытается открыть UTF-8 CSV в кодировке по умолчанию (Windows-1251 или CP1252), что приводит к повреждению русских символов.
   - Генератор `generateCsv` гарантированно вставляет `\uFEFF` в самое начало создаваемого файла.
3. **Разделитель колонок и десятичные знаки в европейских локалях:**
   - В Excel для локалей `ru-RU`, `de-DE`, `fr-FR` запятая `,` является разделителем дробной части числа (`12,50`). Если в таком файле разделителем колонок тоже является запятая, Excel объединяет все поля в одну неразборчивую строку.
   - При выборе разделителя `;` генератор автоматически форматирует числа с десятичной запятой (`125,50`), а при выборе `,` — с десятичной точкой (`125.50`).
4. **Экранирование кавычек и переносов строк (RFC 4180):**
   - Если в заметке содержатся переносы строк (`\n`) или кавычки (`"Покупка в "М.Видео""`), поле оборачивается в кавычки, а внутренние кавычки дублируются: `"""Покупка в ""М.Видео""""`.
   - Разделители строк в сгенерированном файле всегда CRLF (`\r\n`).
5. **Экспорт архивных категорий и счетов:**
   - Если транзакция ссылается на категорию или счёт, которые были заархивированы, экспорт корректно восстанавливает их исторические названия через `getCategoryDisplayName` / `getAccountDisplayName` и помечает суффиксом `(archived)`. Если сущность не найдена в кэше, выводится понятный фолбэк `[Deleted / Unknown]`.
6. **Выгрузка больших объемов данных (Memory & Spark Quota):**
   - Поскольку у среднего пользователя количество операций за год составляет 1 000–3 000 записей (несколько сотен килобайт текста), генерация в памяти клиента происходит за доли секунды без риска зависания браузера.
   - Запрос к Firestore выполняется однократно (`getDocs`), не создавая ресурсоемких слушателей реального времени для архивных данных.
7. **Отказоустойчивость к поврежденным документам:**
   - Функция `parseSnapshotDocs` безопасно пропускает поврежденные документы в Firestore, логируя предупреждение через `logger.warn`, позволяя экспортировать все корректные записи.

---

## 12. Acceptance criteria

- [ ] **AC1 (Генерация CSV по RFC 4180 с UTF-8 BOM):** Given набор транзакций пользователя, When инициируется экспорт, Then сгенерированный файл начинается с UTF-8 BOM (`\uFEFF`), использует разделители строк CRLF (`\r\n`), корректно экранирует кавычки (`""`) и переносы строк внутри полей.
- [ ] **AC2 (Защита от CSV Injection):** Given транзакция с заметкой `=1+1` или `@SUM()`, When генерируется CSV, Then опасное поле предваряется апострофом `'=1+1` и оборачивается в кавычки `"'=1+1"`.
- [ ] **AC3 (Выбор разделителя и локализация чисел):** Given выбран разделитель `;`, When формируется CSV, Then колонки разделяются точкой с запятой, а суммы форматируются с десятичной запятой (`100,50`). Для разделителя `,` суммы форматируются с десятичной точкой (`100.50`).
- [ ] **AC4 (Экспорт по пресетам периодов):** Given страница `/app/import-export`, When пользователь выбирает пресет «Текущий месяц» или «Последние 3 месяца», Then счетчик показывает точное число операций, а выгружаемый файл содержит только транзакции указанного интервала дат.
- [ ] **AC5 (Экспорт по произвольному диапазону и фильтрам):** Given пользователь задает произвольный диапазон `2026-01-01` – `2026-05-01` и фильтр «Только расходы», When нажимает «Экспорт в CSV», Then в файл попадают только расходные операции за выбранные даты.
- [ ] **AC6 (Быстрый экспорт на странице транзакций):** Given страница `/app/transactions` с активными фильтрами, When пользователь нажимает кнопку «Экспорт в CSV», Then файл выгружается мгновенно из памяти клиента без дополнительных сетевых запросов.
- [ ] **AC7 (Обработка пустого результата):** Given выбран период без операций, When форма обновляет состояние, Then счетчик показывает «0 операций», а кнопка экспорта становится неактивной (`disabled`).
- [ ] **AC-STATES:** Реализованы состояния: Loading (скелетон и спиннер на кнопке), Empty (предупреждение о 0 записей), Error (сообщение о сбое с повтором), Success (toast-уведомление и скачивание файла), Offline (работа из кэша).
- [ ] **AC-I18N:** Все строки интерфейса и заголовки колонок экспорта локализованы через namespace `importExport` (EN и RU), хардкод строк в коде отсутствует.
- [ ] **AC-A11Y:** Полноценная поддержка клавиатуры: фокус на контролах, доступные `aria-label` для кнопок экспорта, корректный `aria-live` для счетчика найденных записей.
- [ ] **AC-ARCH:** Доменный модуль `src/lib/csv.ts` изолирован и не имеет внешних зависимостей; фича `import-export` экспортируется строго через `index.ts`.

---

## 13. План тестов

| Уровень | Файлы тестов | Что проверяется |
|---|---|---|
| **Unit (Domain)** | `src/lib/csv.test.ts` | Полное покрытие `src/lib/csv.ts`: экранирование RFC 4180, дублирование кавычек, переносы строк, разделители `,` и `;`, CSV Injection (все префиксы `=`, `+`, `-`, `@`, `\t`, `\r`, `%`), UTF-8 BOM, генерация имени файла, форматирование чисел с запятой и точкой. |
| **Unit (Feature)** | `src/features/import-export/schemas.test.ts` | Валидация Zod-схем `exportConfigSchema`, проверка корректности пресетов и диапазонов дат. |
| **Unit (Feature)** | `src/features/import-export/services/exportService.test.ts` | Маппинг транзакций в CSV-строки: корректное разрешение названий категорий и счетов, обработка архивных сущностей, локализация колонок и типов операций. |
| **Unit / Hook** | `src/features/import-export/hooks/useExportTransactions.test.ts` | Логика хука экспорта: расчет дат для всех пресетов, подсчет записей, обработка состояний загрузки и ошибок. |
| **Unit / Hook** | `src/features/import-export/hooks/useQuickExport.test.ts` | Быстрый экспорт отфильтрованного массива транзакций из памяти. |
| **Component** | `src/features/import-export/components/ExportCard.test.tsx` | Рендеринг формы, смена пресетов, отображение кастомных дат, переключение разделителей, блокировка кнопки при 0 записей, вызов скачивания. |
| **Component** | `src/app/pages/ImportExportPage.test.tsx` | Страница импорта/экспорта: переключение вкладок «Экспорт» и «Импорт», отображение промо-карточки F10. |
| **E2E** | `e2e/export.spec.ts` | Сквозной сценарий Playwright: авторизация → создание транзакций → переход на `/app/import-export` → выбор периода и разделителя `;` → перехват скачиваемого файла `download.saveAs()` → верификация BOM `\uFEFF`, заголовков, кириллицы и значений → проверка кнопки быстрого экспорта на `/app/transactions`. |

---

## 14. Задачи (T1–T5)

Каждая задача представляет собой строго одну рабочую сессию и завершается одним атомарным коммитом по стандарту Conventional Commits на английском языке.

| # | Задача | Детали и затрагиваемые файлы | Проверка после задачи |
|---|---|---|---|
| **T1** | **Доменный модуль `src/lib/csv.ts` и исчерпывающие unit-тесты** | 1. Создать `src/lib/csv.ts`: функции `sanitizeCsvFormula`, `escapeCsvField`, `generateCsv`, `downloadCsvBlob`, `buildExportFilename`, `formatCsvDecimal`.<br>2. Реализовать поддержку UTF-8 BOM (`\uFEFF`), разделителей `,` и `;`, экранирования RFC 4180 и CRLF.<br>3. Написать unit-тесты `src/lib/csv.test.ts` с покрытием 100% ветвей. | `pnpm test`, `pnpm typecheck` |
| **T2** | **Схемы Zod, сервис маппинга и расширение репозитория транзакций** | 1. Создать `src/features/import-export/schemas.ts` (`exportConfigSchema`, `exportScopePresetSchema`).<br>2. Создать `src/features/import-export/services/exportService.ts` (`transformTransactionsToCsv`, `buildTransactionCsvColumns`).<br>3. Добавить функцию `getTransactionsByDateRange(uid, start, end)` в `src/features/transactions/repository.ts` и экспорт в `index.ts`.<br>4. Написать unit-тесты `schemas.test.ts`, `exportService.test.ts` и тест репозитория. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T3** | **Хуки фичи экспорта (`useExportTransactions` и `useQuickExport`)** | 1. Реализовать хук `src/features/import-export/hooks/useExportTransactions.ts` (управление пресетами дат, фильтрами, расчет количества транзакций, выгрузка и запуск скачивания).<br>2. Реализовать хук `src/features/import-export/hooks/useQuickExport.ts` (мгновенная выгрузка из памяти).<br>3. Покрыть хуки тестами `useExportTransactions.test.ts` и `useQuickExport.test.ts`. | `pnpm test`, `pnpm typecheck` |
| **T4** | **UI-компоненты экспорта, страница `ImportExportPage` и локализация** | 1. Создать `src/features/import-export/components/ExportCard.tsx` (форма с пресетами, фильтрами, выбором разделителя, счетчиком записей).<br>2. Создать `src/features/import-export/components/ExportQuickButton.tsx` и интегрировать на страницу `TransactionsPage.tsx`.<br>3. Создать `src/features/import-export/components/ImportPlaceholderCard.tsx` (промо-карточка F10).<br>4. Обновить страницу `src/app/pages/ImportExportPage.tsx` с табами Экспорт/Импорт.<br>5. Создать словари `src/i18n/locales/{en,ru}/importExport.json`, обновить `config.ts`, `types.ts`, `nav.json`. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T5** | **Тестирование, Playwright E2E сценарии, a11y, верификация и финализация** | 1. Написать компонентные тесты `ExportCard.test.tsx` и `ImportExportPage.test.tsx`.<br>2. Написать Playwright E2E-тест `e2e/export.spec.ts` с проверкой скачивания и содержимого файла.<br>3. Провести проверку доступности (a11y) и валидацию по чеклисту `verify`.<br>4. Обновить статус фичи F09 в `docs/06-roadmap.md` (`todo` → `done`). | `pnpm test`, `pnpm e2e`, скилл `verify` |

---

## 15. Definition of Done

- [ ] Все критерии приёмки (Acceptance Criteria AC1–AC7, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH) выполнены в полном объёме.
- [ ] Все тесты из плана (Unit в `src/lib/csv.test.ts`, Service, Hooks, Component, Playwright E2E) написаны и успешно проходят.
- [ ] Пройдены все обязательные проверки качества: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rules`, `pnpm build`.
- [ ] Никаких нарушений правил `AGENTS.md` (разделы 7, 8, 11, 13).
- [ ] Отсутствуют составные индексы Firestore, выборки укладываются в правила `firestore.indexes.json`.
- [ ] Защита от CSV Injection протестирована и подтверждена.
- [ ] Документация и статус фичи в `docs/06-roadmap.md` обновлены.

---

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос / Решение | Обоснование / Статус |
|---|---|---|
| 2026-10-10 | Чистый сериализатор CSV в `src/lib/csv.ts` вместо внешней библиотеки для экспорта | Для генерации CSV по стандарту RFC 4180 не требуется тяжелых рантайм-библиотек. Чистый доменный модуль в `src/lib/` гарантирует 100% контроль над UTF-8 BOM, санитизацией формул, разделителями и исключает раздувание клиентского бандла. |
| 2026-10-10 | Автоматический выбор разделителя по локали с ручным переключателем | Пользователи из РФ и Европы чаще всего открывают CSV в локализованном Excel, требующем `;` и десятичную запятую `,`. Пользователи Google Sheets предпочитают международный `,`. Предоставление двух явных пресетов решает проблему несовместимости. |
| 2026-10-10 | Быстрый экспорт прямо со страницы транзакций | Пользователю часто требуется выгрузить именно тот срез данных, который он сейчас видит на экране (например, расходы за текущий месяц по определенной категории). Добавление кнопки «Быстрый экспорт» на `TransactionsPage` использует данные из памяти без повторного чтения базы. |
