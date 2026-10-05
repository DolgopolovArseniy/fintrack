# F06 — Dashboard (Аналитический дашборд и KPI)

Статус: spec-ready  
Зависит от: F01 (доменное ядро, деньги, даты, aggregations), F02 (аутентификация), F03 (Security Rules v1), F04 (категории, CategoryBadge), F05 (транзакции, TransactionItem, TransactionForm, MonthNavigator, MoneyText)  
Размер: M (6 задач: T1–T6)  
Ветка: `feat/F06-dashboard`  

> **Контекст для агента:** Фича F06 закрывает ключевую веху **M2 Core** («Рабочий продукт»). Дашборд является главным экраном входа в приложение (`/app/dashboard`), агрегирующим финансовое состояние пользователя: ключевые метрики (KPI) за выбранный месяц с динамикой к предыдущему периоду, визуальное распределение расходов по категориям (Donut chart: топ-5 + «Другое»), 6-месячную динамику доходов и расходов (Bar chart), а также 5 последних операций с возможностью быстрого добавления трат прямо с дашборда.  
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§2, §4, §6), `docs/02-data-model.md` (§6.1), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.1, §2.5, §5, §7), `docs/05-testing-strategy.md`.  
> Справка по API библиотек (`recharts`, Radix UI, date-fns) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Обеспечить пользователю наглядный, информативный и мгновенно реагирующий аналитический центр его личных финансов за любой выбранный календарный месяц, объединяющий расчет ключевых показателей (доходы, расходы, сальдо, общий капитал), структурный анализ трат по категориям, исторический тренд за полгода и список свежих операций с соблюдением стандартов доступности (WCAG 2.1 AA) и оптимизацией производительности (ленивая загрузка графиков Recharts).

**Пользовательские истории:**
1. *Как пользователь*, открывая приложение, я хочу сразу видеть на главной странице свой текущий финансовый итог за месяц (доходы, расходы, накопления и общий баланс счетов), чтобы понимать свое текущее финансовое положение без ручных расчетов.
2. *Как пользователь*, я хочу видеть сравнение текущих показателей с предыдущим месяцем в процентах (рост/падение доходов и расходов), чтобы оценивать динамику своего финансового поведения.
3. *Как пользователь*, я хочу видеть круговую диаграмму (Donut chart) распределения расходов по категориям за выбранный месяц (топ-5 категорий и сегмент «Другие»), чтобы мгновенно выявлять основные статьи трат.
4. *Как пользователь*, я хочу видеть столбчатую диаграмму (Bar chart) доходов и расходов за последние 6 месяцев, чтобы отслеживать тренды, сезонность и стабильность накоплений.
5. *Как пользователь*, я хочу видеть список 5 последних операций прямо на дашборде с возможностью перейти ко всей истории месяца в один клик.
6. *Как пользователь*, я хочу переключать месяц с помощью `MonthNavigator` (с сохранением `?month=YYYY-MM` в URL), чтобы изучать аналитику за любой исторический период.
7. *Как пользователь*, я хочу иметь возможность быстро добавить трату кнопкой «Новая операция» прямо с дашборда, чтобы зафиксировать расход за пару секунд без перехода на другие экраны.
8. *Как пользователь со скринридером*, я хочу, чтобы все визуальные графики дублировались доступными скрытыми таблицами с точными числовыми значениями.

---

## 2. Решения фичи и архитектурные инварианты

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Единый диапазон запроса Firestore** | Один real-time запрос на 6-месячный интервал: `where('date', '>=', start6Months)`, `where('date', '<=', endSelectedMonth)`, `orderBy('date', 'desc')` | Соответствует `02-data-model.md` §6.1. Использует стандартный автоматический индекс по полю `date`. Предотвращает множественные параллельные подписки, снижает нагрузку на сеть и укладывается в Spark-квоту. |
| 2 | **Клиентская агрегация** | Использование чистых функций `src/lib/aggregations.ts` (`sumByType`, `totalsByCategory`, `totalsByMonth`, `topNWithOther`) над полученным массивом | Архитектурный принцип: клиентские вычисления на чистых типах (F01). Нулевая задержка UI при реактивных обновлениях, консистентность расчетов между экранами. |
| 3 | **Ленивая загрузка Recharts (Code Splitting)** | Выделение компонентов графиков в отдельный модуль и загрузка через `React.lazy()` + `Suspense` со скелетоном `LoadingSkeleton variant="chart"` | Recharts весит ~130 КБ. Ленивая загрузка сохраняет размер начального чанка страницы минимальным, обеспечивая Lighthouse Performance ≥ 90 (NFR §6). |
| 4 | **Адаптация UI-компонента shadcn `Chart`** | Добавление `src/components/ui/chart.tsx` на базе официального рецепта shadcn/ui с привязкой CSS-токенов темы (`--chart-1`…`--chart-5`, `--income`, `--expense`) | Исключает жестко заданные цвета в SVG. Графика автоматически и бесшовно адаптируется к светлой и темной теме Linear/Stripe. |
| 5 | **Доступность графиков (a11y)** | Каждый график оборачивается в контейнер с `role="region"`, осмысленным `aria-label` и содержит визуально скрытую (`sr-only`) HTML-таблицу со всеми точными значениями | Требование WCAG 2.1 AA и `04-ux-guidelines.md` §7. Скринридеры озвучивают структурированную таблицу вместо недоступного canvas/svg. |
| 6 | **Группировка Donut Chart (Топ-5 + Другое)** | Категории расходов ранжируются по убыванию суммы: первые 5 рендерятся отдельно, остальные объединяются в категорию `__other__` («Другие») | Предотвращает визуальную кашу из 15+ мелких секторов на круговой диаграмме. Использует уже готовую функцию `topNWithOther`. |
| 7 | **Обработка граничных случаев сравнения (%)** | При сравнении с прошлым месяцем: если прошлый = 0 и текущий > 0 → `+100%`; если оба = 0 → `0%` (нейтрально); если текущий = 0 и прошлый > 0 → `-100%` | Предотвращает появление `Infinity`, `NaN` и деления на ноль. Реализуется чистой утилитой `calculatePercentageChange`. |
| 8 | **Связь с транзакциями месяца** | Кнопка «Смотреть все» в блоке последних операций передает выбранный месяц в URL: `/app/transactions?month=YYYY-MM` | Сохраняет контекст навигации: пользователь переходит к полному списку ровно того месяца, который он изучал на дашборде. |

---

## 3. Скоуп

### Входит
1. **Инфраструктура запроса по диапазону дат в `features/transactions`:**
   - Функция `subscribeTransactionsByDateRange(uid, startDate, endDate, onData, onError)` в `src/features/transactions/repository.ts`.
   - Рефакторинг `subscribeTransactionsByMonth` как частного случая диапазона месяца (DRY).
   - Экспорт функции через публичный API `src/features/transactions/index.ts`.
2. **Зависимость Recharts и компонент shadcn Chart:**
   - Добавление `recharts` в `package.json`.
   - Компонент `src/components/ui/chart.tsx` (конфигурация темы, Tooltip, Legend).
3. **Модуль дашборда `src/features/dashboard/`:**
   - Доменные утилиты расчёта KPI и процентов: `src/features/dashboard/utils.ts` (`calculatePercentageChange`, `computeDashboardMetrics`).
   - Хук сбора и агрегации данных: `src/features/dashboard/hooks/useDashboardData.ts` (объединяет 6-месячные транзакции, категории и счета).
   - Компонент карточек KPI: `src/features/dashboard/components/DashboardKpiGrid.tsx` (Чистый капитал, Доходы, Расходы, Сальдо/Норма сбережений с бейджами тренда).
   - Ленивые компоненты графиков:
     - `src/features/dashboard/components/charts/ExpenseDonutChart.tsx` (расходы по категориям, легенда, центр диаграммы, sr-only таблица).
     - `src/features/dashboard/components/charts/MonthlyBarChart.tsx` (доходы и расходы за 6 месяцев, sr-only таблица).
     - Контейнер отложенной загрузки `src/features/dashboard/components/charts/DashboardCharts.tsx` (обёртка с `Suspense`).
   - Компонент недавних операций: `src/features/dashboard/components/RecentTransactionsCard.tsx` (5 последних записей выбранного месяца, повторное использование `TransactionItem`, ссылка «Смотреть все»).
   - Модальное окно быстрого добавления операции (`ResponsiveDialog` + `TransactionForm` + `useTransactionMutations`).
   - Публичный API фичи `src/features/dashboard/index.ts`.
4. **Страница и интеграция:**
   - Обновление страницы `src/app/pages/DashboardPage.tsx`: подключение реальных данных, состояний (`QueryBoundary`), шапки с `MonthNavigator` и кнопкой «Новая операция».
   - Мобильный плавающий контрол (FAB) для добавления операций.
5. **Локализация и тесты:**
   - Обновление ключей в `src/i18n/locales/{en,ru}/dashboard.json`.
   - Unit-тесты утилит и хука агрегации.
   - Компонентные тесты KPI, графиков (с моком ResizeObserver) и страницы дашборда.
   - Playwright e2e тест на сценарии переключения месяца и отображения аналитики.

### Не входит (явно)
- Настройка и редактирование бюджетов (F08).
- Управление счетами и их создание (F07).
- Фильтрация графиков по отдельным счетам или тегам (Backlog / Could).
- Экспорт графиков в PNG/PDF (Backlog).
- Индивидуальная настройка расположения виджетов (Backlog).

---

## 4. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Просмотр наполненного дашборда (Happy Path)** | Пользователь авторизован, есть операции за текущий и прошлые месяцы | Открывает `/app/dashboard` | 1. Отображаются 4 карточки KPI (Баланс, Доходы, Расходы, Итог) с корректными суммами и процентами тренда.<br>2. Donut отображает до 5 ключевых категорий расходов с легендой и долями в %.<br>3. Bar chart отображает 6 столбцов с доходами и расходами.<br>4. Отображаются до 5 последних операций месяца. |
| 2 | **Навигация по месяцам** | Пользователь на дашборде | В `MonthNavigator` нажимает стрелку влево (предыдущий месяц) | URL меняется на `?month=YYYY-MM`. Данные мгновенно пересчитываются для выбранного месяца: KPI отражает выбранный месяц, Bar chart сдвигает 6-месячное окно, Donut показывает расходы выбранного месяца. |
| 3 | **Пустой месяц (нет операций)** | Выбран месяц, в котором нет транзакций | Переходит на месяц без операций | 1. KPI доходов и расходов равны `0,00` (тренд показывает 0% или нейтральный статус).<br>2. Карточки графиков показывают дружелюбный `EmptyState` («В этом месяце еще нет расходов/операций»).<br>3. Блок последних операций показывает `EmptyState` с кнопкой «Добавить первую операцию». |
| 4 | **Быстрое добавление операции с дашборда** | Пользователь на дашборде | 1. Нажимает «Новая операция» в шапке (или FAB).<br>2. Заполняет форму расхода на 500 ₽ и сохраняет. | Модальное окно закрывается, всплывает toast об успехе. KPI расходов увеличивается на 500 ₽, Donut chart динамически перерисовывается, операция появляется первой в блоке «Недавние операции». |
| 5 | **Первый месяц использования (нет предыдущего месяца)** | У пользователя есть данные только за текущий месяц | Просматривает карточки KPI | Для показателей доходов и расходов бейдж сравнения корректно отображает «Новый период» или `+100%`, без технических артефактов (`NaN%`, `Infinity%`). |
| 6 | **Работа в офлайн-режиме** | Пропала связь с интернетом | Пользователь просматривает дашборд | Сверху отображается `OfflineBanner`. Данные загружаются из локального кэша Firestore IndexedDB. Графики и KPI работают стабильно. |
| 7 | **Доступность со скринридером (a11y)** | Включен скринридер (NVDA / VoiceOver) | Навигация по карточкам диаграмм через Tab | Скринридер объявляет заголовок региона графика, а затем последовательно зачитывает строки скрытой таблицы с точными названиями категорий/месяцев и суммами. |

---

## 5. UI и дизайн-система

### 5.1 Структура страницы (`DashboardPage`)
- **Маршрут:** `/app/dashboard` (с поддержкой URL query-параметра `?month=YYYY-MM`).
- **Компоновка (Layout):**
  ```
  PageHeader (Заголовок, Описание, MonthNavigator, Button "+ Новая операция")
  ├── DashboardKpiGrid (4 карточки: Общий баланс, Доходы, Расходы, Сальдо/Норма сбережений)
  ├── Сетка аналитики (2 колонки на lg, 1 колонка на mobile):
  │   ├── ExpenseDonutCard (Suspense -> ExpenseDonutChart)
  │   └── MonthlyBarCard (Suspense -> MonthlyBarChart)
  └── RecentTransactionsCard (Последние 5 операций выбранного месяца + кнопка «Смотреть все»)
  ```

### 5.2 Карточки KPI (`DashboardKpiGrid`)
Сетка из 4 карточек (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`):
1. **Общий баланс счетов (Net Worth):**
   - Иконка: `Wallet` в сером контейнере `bg-secondary`.
   - Значение: сумма `balance` всех неархивных счетов через `MoneyText` (`tabular-nums text-2xl sm:text-3xl font-semibold`).
   - Подпись: `t('dashboard.kpi.totalBalanceHint')` (количество активных счетов).
2. **Доходы за месяц (Income):**
   - Иконка: `TrendingUp` в зеленом контейнере `bg-income/10 text-income`.
   - Значение: общая сумма доходов месяца через `MoneyText`.
   - Бейдж динамики: процент изменения к прошлому месяцу (зеленый при росте, серый при 0%).
3. **Расходы за месяц (Expenses):**
   - Иконка: `ArrowDownRight` в красном контейнере `bg-expense/10 text-expense`.
   - Значение: общая сумма расходов месяца через `MoneyText`.
   - Бейдж динамики: процент изменения к прошлому месяцу (зеленый при снижении расходов, красный при увеличении).
4. **Чистый итог / Сальдо (Net Savings):**
   - Иконка: `PiggyBank` или `Scale`.
   - Значение: разница доходов и расходов (`net = income - expense`).
   - Бейдж: норма сбережений в процентах `(net / income * 100)` при `income > 0`.

### 5.3 Круговая диаграмма расходов (`ExpenseDonutChart`)
- **Компонент:** Recharts `PieChart` + `Pie` с `innerRadius={70}`, `outerRadius={100}`, `paddingAngle={3}`.
- **Центральная плашка:** Внутри кольца отображается мелкий текст «Всего расходов» и крупная итоговая сумма.
- **Цвета сегментов:**
  - Топ-5 категорий окрашиваются в соответствующие цвета темы: из палитры категорий `--cat-<color>` или токенов `--chart-1`…`--chart-5`.
  - Сегмент `__other__` («Другие») окрашивается в нейтральный цвет `--color-muted-foreground` (`oklch(0.55 0.03 260)`).
- **Интерактивность:** Кастомный `ChartTooltip` с показом названия категории, суммы в валюте и доли в процентах.
- **Легенда:** Аккуратный список под диаграммой с бейджами категорий (`CategoryBadge`), долями в % и суммами.
- **Empty State:** Если сумма расходов за месяц равна 0, вместо пустой рамки рендерится `EmptyState` с иконкой `PieChart` и текстом «В этом месяце расходов не зафиксировано».

### 5.4 Столбчатая диаграмма динамики (`MonthlyBarChart`)
- **Компонент:** Recharts `BarChart` + 2 `Bar` (сгруппированные столбцы: «Доход» и «Расход»).
- **Период:** 6 месяцев (начиная с `addMonths(selectedMonth, -5)` по `selectedMonth`).
- **Стилизация баров:**
  - Доход: заливка `var(--income)` со скруглением верхних углов `radius={[4, 4, 0, 0]}`.
  - Расход: заливка `var(--expense)` со скруглением верхних углов `radius={[4, 4, 0, 0]}`.
- **Оси:**
  - Ось X: сокращенное локализованное название месяца («Янв», «Фев» / «Jan», «Feb»).
  - Ось Y: компактный денежный формат (например, 10k, 25k).
  - Сетка: пунктирные горизонтальные линии `border-border/40`.
- **Empty State:** Если за все 6 месяцев нет ни одной операции, отображается `EmptyState` («Недостаточно данных для построения графика»).

### 5.5 Блок недавних операций (`RecentTransactionsCard`)
- Карточка `Card` с заголовком «Недавние операции» и кнопкой-ссылкой «Смотреть все» (`/app/transactions?month=YYYY-MM`).
- Отображает до 5 последних операций выбранного месяца.
- Строки рендерятся через проверенный компонент `TransactionItem` с передачей категории и счёта.
- Если операций нет — `EmptyState` с кнопкой «Добавить первую операцию».

### 5.6 Переиспользование (DRY-проверка)

| Элемент UI | Берём готовое из кодовой базы | Создаём новое | Обоснование |
|---|---|---|---|
| Шапка страницы | `PageHeader` | — | Единый стиль заголовка и блока действий |
| Переключатель месяца | `MonthNavigator` | — | Уже протестирован и синхронизирован с форматом `YYYY-MM` |
| Суммы и знаки | `MoneyText` | — | Гарантирует правильный цвет, знак, minor units и `tabular-nums` |
| Бейджи категорий | `CategoryBadge` | — | Поддерживает иконки lucide, цвета и fallback `systemKey` |
| Строка транзакции | `TransactionItem` | — | Готовый компонент из `features/transactions` |
| Форма добавления | `TransactionForm` + `ResponsiveDialog` | — | Единый диалог на desktop и drawer на mobile |
| Обработка состояний | `QueryBoundary`, `LoadingSkeleton`, `EmptyState`, `ErrorState` | — | Стандарт 5 обязательных состояний |
| Графическая обёртка | — | `src/components/ui/chart.tsx` | Официальный shadcn-компонент для интеграции Recharts с CSS-токенами |
| Ленивые диаграммы | — | `ExpenseDonutChart`, `MonthlyBarChart` | Уникальная визуализация аналитики F06 |

---

## 6. Данные и модель запросов Firestore

### 6.1 Стратегия запросов к базе
- Коллекция: `users/{uid}/transactions`.
- В соответствии с `docs/02-data-model.md` §6.1, запрос выполняется по 6-месячному интервалу:
  ```ts
  const startMonth = addMonths(selectedMonth, -5);
  const startDate = monthRange(startMonth).start; // 'YYYY-MM-01'
  const endDate = monthRange(selectedMonth).end;   // 'YYYY-MM-31'

  const q = query(
    transactionsCol(uid),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );
  ```
- **Индексы:** Запрос использует **стандартный автоматический индекс** по полю `date`. Составные индексы не требуются. `firestore.indexes.json` остается пустым.
- **Подписка на счета:** `subscribeAccounts(uid)` используется для мгновенного получения общего баланса (`totalBalance`) по всем неархивным счетам.
- **Подписка на категории:** `subscribeCategories(uid)` используется для сопоставления категорий в легенде диаграммы и списке последних операций.

### 6.2 Чистые агрегации на клиенте
Над полученным 6-месячным массивом транзакций выполняются чистые трансформации:
1. `selectedMonthTxs`: фильтрация по `toYearMonth(tx.date) === selectedMonth`.
2. `prevMonthTxs`: фильтрация по `toYearMonth(tx.date) === addMonths(selectedMonth, -1)`.
3. `kpiCurrent = sumByType(selectedMonthTxs)`.
4. `kpiPrevious = sumByType(prevMonthTxs)`.
5. `categoryExpenses = totalsByCategory(selectedMonthTxs, 'expense')`.
6. `topCategories = topNWithOther(categoryExpenses, 5, (otherTotal) => ({ categoryId: '__other__', total: otherTotal }))`.
7. `sixMonthsTotals = totalsByMonth(all6MonthsTxs, { fillGaps: true })` с гарантией наличия всех 6 месяцев в массиве.
8. `recentTransactions = selectedMonthTxs.slice(0, 5)`.

---

## 7. Контракты и API

### 7.1 Расширение репозитория транзакций (`src/features/transactions/repository.ts`)

```ts
/**
 * Subscribes to the user's transactions within an arbitrary ISO date range [startDate, endDate] inclusive.
 * Ordered by date descending, then createdAt descending.
 */
export function subscribeTransactionsByDateRange(
  uid: string,
  startDate: IsoDate,
  endDate: IsoDate,
  onData: (transactions: Transaction[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;
```

### 7.2 Доменные утилиты дашборда (`src/features/dashboard/utils.ts`)

```ts
export interface PercentageChangeResult {
  percent: number;      // Абсолютное округленное значение процентов (например, 15)
  direction: 'increase' | 'decrease' | 'neutral';
  isNewPeriod: boolean; // true, если в прошлом периоде было 0, а в текущем > 0
}

/**
 * Рассчитывает процент изменения текущего значения к предыдущему.
 * Безопасно обрабатывает нули, отрицательные величины и исключает деление на ноль.
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): PercentageChangeResult;

export interface DashboardMetrics {
  totalBalance: number;
  currentIncome: number;
  currentExpense: number;
  netSavings: number;
  savingsRate: number | null; // null, если доход <= 0
  incomeChange: PercentageChangeResult;
  expenseChange: PercentageChangeResult;
}

export function computeDashboardMetrics(params: {
  accounts: Account[];
  selectedMonthTxs: Transaction[];
  previousMonthTxs: Transaction[];
}): DashboardMetrics;
```

### 7.3 Хук данных дашборда (`src/features/dashboard/hooks/useDashboardData.ts`)

```ts
export interface DashboardData {
  metrics: DashboardMetrics;
  categoryExpenses: Array<{
    categoryId: string;
    total: number;
    percentage: number;
  }>;
  monthlyHistory: Array<{
    month: YearMonth;
    label: string; // Локализованное имя месяца (например, "Окт" / "Oct")
    income: number;
    expense: number;
  }>;
  recentTransactions: Transaction[];
}

export function useDashboardData(
  selectedMonth: YearMonth,
): SubscriptionResult<DashboardData>;
```

### 7.4 Публичный API фичи (`src/features/dashboard/index.ts`)

```ts
export { useDashboardData } from './hooks/useDashboardData';
export type { DashboardData } from './hooks/useDashboardData';

export { DashboardKpiGrid } from './components/DashboardKpiGrid';
export { RecentTransactionsCard } from './components/RecentTransactionsCard';
export { DashboardCharts } from './components/charts/DashboardCharts';

export { calculatePercentageChange, computeDashboardMetrics } from './utils';
export type { DashboardMetrics, PercentageChangeResult } from './utils';
```

---

## 8. Эдж-кейсы фичи и особенности синхронизации

| # | Эдж-кейс | Поведение системы |
|---|---|---|
| 1 | **Новый пользователь (0 операций)** | На дашборде не должно быть пустых поломанных графиков. Отображаются карточки KPI с 0,00, и красивые информативные `EmptyState` с призывом добавить первую операцию. |
| 2 | **Отсутствие расходов в выбранном месяце (доходы есть)** | Donut chart не может построить окружность с нулевой суммой. Donut заменяется на `EmptyState` («В этом месяце нет расходов»), при этом Bar chart и KPI продолжают отображать доходы. |
| 3 | **Прошлый месяц равен 0 при текущем > 0** | Расчет процента тренда не должен выдавать `Infinity%` или падать с ошибкой деления на 0. Утилита возвращает `isNewPeriod: true`, в UI рендерится бейдж «Новый период» или `+100%`. |
| 4 | **Оба месяца равны 0** | Процент равен 0%, отображается нейтральный серый бейдж «Без изменений». |
| 5 | **Удаленная или архивированная категория в транзакции** | `CategoryBadge` корректно обрабатывает отсутствие категории или флаг `archived: true`, выводя fallback-имя и нейтральный серый цвет. |
| 6 | **Более 5 категорий расходов в месяце** | Функция `topNWithOther` автоматически сворачивает категории с 6-й и далее в сектор `__other__` («Другие»), сохраняя баланс суммы и читаемость легенды. |
| 7 | **Переключение между годами в 6-месячном окне** | Например, при выборе `2026-02`, 6-месячное окно охватывает `2025-09` … `2026-02`. `monthRange` и `addMonths` корректно вычисляют переход через границу года. |
| 8 | **Нулевая высота контейнера графика при первом рендере** | Recharts `ResponsiveContainer` чувствителен к нулевым размерам flex/grid контейнеров. Карточкам графиков задается явный `min-h-[300px]` и фиксированная минимальная высота для предотвращения предупреждений консоли. |
| 9 | **Офлайн-состояние** | При потере сети Firestore отдает кэшированные данные за 6 месяцев. Пользователь видит индикатор `OfflineBanner`, все расчеты продолжают работать автономно. |

---

## 9. Локализация (i18n)

Ключи в `src/i18n/locales/en/dashboard.json` и `src/i18n/locales/ru/dashboard.json`:

```json
{
  "title": "Dashboard",
  "description": "Financial overview and key metrics",
  "addTransaction": "New transaction",
  "kpi": {
    "totalBalance": "Total Balance",
    "totalBalanceHint": "{{count}} active account",
    "totalBalanceHint_plural": "{{count}} active accounts",
    "monthlyIncome": "Monthly Income",
    "monthlyExpenses": "Monthly Expenses",
    "netSavings": "Net Savings",
    "savingsRate": "Savings rate: {{rate}}%",
    "vsLastMonth": "vs last month",
    "newPeriod": "New period",
    "noChange": "No change"
  },
  "charts": {
    "expensesByCategory": "Expenses by Category",
    "expensesByCategoryDesc": "Top 5 categories and others for the selected month",
    "incomeVsExpense": "Income & Expense Trend",
    "incomeVsExpenseDesc": "6-month financial trajectory",
    "totalExpense": "Total expenses",
    "otherCategory": "Other",
    "emptyExpenses": "No expenses recorded this month",
    "emptyHistory": "Not enough data to display trend",
    "table": {
      "category": "Category",
      "amount": "Amount",
      "share": "Share",
      "month": "Month",
      "income": "Income",
      "expense": "Expense",
      "net": "Net"
    }
  },
  "recentTransactions": {
    "title": "Recent Transactions",
    "viewAll": "View all transactions",
    "empty": "No transactions for this month yet",
    "addFirst": "Add first transaction"
  }
}
```

---

## 10. Acceptance criteria

- [ ] **AC1 (KPI Grid):** На дашборде отображаются 4 карточки: Общий баланс всех активных счетов, Доходы месяца, Расходы месяца, Сальдо/Норма сбережений. Все суммы отображаются через `MoneyText` в базовой валюте пользователя.
- [ ] **AC2 (Сравнение с прошлым месяцем):** Доходы и расходы содержат бейдж изменения в % по отношению к предшествующему календарному месяцу. При отсутствии трат в прошлом месяце не возникает ошибок `NaN` или `Infinity`.
- [ ] **AC3 (Donut Chart):** Расходы месяца визуализируются в Donut Chart: первые 5 категорий ранжируются по убыванию суммы, остальные агрегируются в «Другие». Центр кольца содержит итоговую сумму.
- [ ] **AC4 (Monthly Bar Chart):** Столбчатая диаграмма отображает 6 месяцев в хронологическом порядке с группировкой по доходам (`--income`) и расходам (`--expense`). Все пропущенные промежуточные месяцы заполнены нулевыми значениями.
- [ ] **AC5 (Доступность графиков a11y):** Каждая диаграмма содержит скрытую для глаз, но доступную для скринридеров таблицу (`sr-only`) со всеми числовыми значениями и заголовками колонок.
- [ ] **AC6 (Ленивая загрузка):** Графики Recharts загружаются через `React.lazy()` / `Suspense` и не увеличивают размер начального бандла страницы. Во время загрузки отображается `LoadingSkeleton variant="chart"`.
- [ ] **AC7 (Недавние операции):** Блок последних операций отображает до 5 операций выбранного месяца через `TransactionItem`. Кнопка «Смотреть все» перенаправляет на `/app/transactions?month=YYYY-MM`.
- [ ] **AC8 (Быстрое добавление):** Кнопка «Новая операция» открывает `TransactionForm` в диалоговом окне. После успешного добавления операции метрики и графики дашборда обновляются автоматически в реальном времени.
- [ ] **AC-STATES:** Для всей страницы и отдельных блоков диаграмм реализованы все состояния: loading, empty, error, offline, success.
- [ ] **AC-I18N:** Все надписи, подписи графиков, единицы и подсказки переведены на английский и русский языки.
- [ ] **AC-A11Y:** Контраст элементов соответствует WCAG 2.1 AA, все интерактивные кнопки имеют видимый фокус и `cursor-pointer`.
- [ ] **AC-ARCH:** Архитектурные границы соблюдены: `features/dashboard` не импортирует `firebase/firestore` напрямую, а использует репозитории и публичные API.

---

## 11. План тестов

| Уровень | Что проверяем | Файлы |
|---|---|---|
| **Unit** | Расчет процентов изменения `calculatePercentageChange` (нули, дельта, направление, граничные случаи). | `src/features/dashboard/utils.test.ts` |
| **Unit** | Агрегация метрик дашборда `computeDashboardMetrics`. | `src/features/dashboard/utils.test.ts` |
| **Integration** | `subscribeTransactionsByDateRange` на эмуляторе Firestore (выборка по диапазону, порядок дат). | `src/features/transactions/repository.test.ts` |
| **Component** | `DashboardKpiGrid`: рендер сумм, бейджей динамики и состояний. | `src/features/dashboard/components/DashboardKpiGrid.test.tsx` |
| **Component** | `ExpenseDonutChart` и `MonthlyBarChart`: рендер с моком Recharts, проверка наличия доступной `sr-only` таблицы, рендер `EmptyState` при отсутствии данных. | `src/features/dashboard/components/charts/*.test.tsx` |
| **Component** | `RecentTransactionsCard`: отображение списка операций и кнопки перехода. | `src/features/dashboard/components/RecentTransactionsCard.test.tsx` |
| **Component** | `DashboardPage`: интеграция страницы, переключение месяца, открытие модального окна добавления. | `src/app/pages/DashboardPage.test.tsx` |
| **E2E** | Полный пользовательский сценарий на эмуляторе: вход, просмотр дашборда, переключение месяца, добавление операции и проверка обновления KPI. | `e2e/dashboard.spec.ts` |

---

## 12. Задачи (T1–T6)

> Каждая задача выполняется в отдельной сессии агента и завершается одним коммитом с полным прохождением проверок (`typecheck`, `lint`, `test`).

### T1: Инфраструктура запроса по диапазону дат и утилиты аналитики
- Добавить `subscribeTransactionsByDateRange` в `src/features/transactions/repository.ts` с тестами на эмуляторе.
- Экспортировать функцию через `src/features/transactions/index.ts`.
- Создать чистые утилиты `calculatePercentageChange` и `computeDashboardMetrics` в `src/features/dashboard/utils.ts`.
- Покрыть утилиты исчерпывающими unit-тестами `src/features/dashboard/utils.test.ts`.
- **Проверка:** `pnpm test`.

### T2: Установка Recharts и компонент shadcn Chart
- Добавить библиотеку `recharts` в `package.json`.
- Создать компонент `src/components/ui/chart.tsx` с поддержкой тем (`ChartContainer`, `ChartTooltip`, `ChartLegend`).
- Настроить маппинг семантических CSS-переменных темы для графиков.
- Написать базовый тест компонента `chart.test.tsx`.
- **Проверка:** `pnpm typecheck && pnpm lint && pnpm test`.

### T3: Карточки KPI и хук агрегации данных дашборда
- Реализовать хук `useDashboardData(selectedMonth)` в `src/features/dashboard/hooks/useDashboardData.ts`.
- Создать компонент `DashboardKpiGrid.tsx` с выводом общего баланса, доходов, расходов и сальдо с индикаторами изменения.
- Написать компонентные тесты `DashboardKpiGrid.test.tsx` (включая проверку `tabular-nums` и семантических цветов).
- **Проверка:** `pnpm test`.

### T4: Компоненты диаграмм (Donut Chart и Monthly Bar Chart)
- Создать `src/features/dashboard/components/charts/ExpenseDonutChart.tsx` (топ-5 категорий + «Другие», центр с итогом, скрытая таблица).
- Создать `src/features/dashboard/components/charts/MonthlyBarChart.tsx` (6 месяцев, доходы и расходы, скрытая таблица).
- Создать контейнер `src/features/dashboard/components/charts/DashboardCharts.tsx` с ленивой загрузкой через `React.lazy` и скелетоном `LoadingSkeleton`.
- Покрыть диаграммы тестами (с проверкой наличия `sr-only` таблиц и обработки `EmptyState`).
- **Проверка:** `pnpm test`.

### T5: Блок недавних операций, модальное окно добавления и публичный API
- Создать компонент `RecentTransactionsCard.tsx` (5 последних операций, переиспользование `TransactionItem`, ссылка на `/app/transactions?month=YYYY-MM`).
- Интегрировать диалог добавления операции (`ResponsiveDialog` + `TransactionForm` + `useTransactionMutations`).
- Оформить публичный API фичи в `src/features/dashboard/index.ts`.
- Покрыть `RecentTransactionsCard` компонентными тестами.
- **Проверка:** `pnpm test`.

### T6: Сборка страницы DashboardPage, локализация и e2e тесты
- Переписать `src/app/pages/DashboardPage.tsx`: замена мок-данных на реальную связку хуков, `PageHeader`, `MonthNavigator`, `QueryBoundary`.
- Добавить полные наборы переводов в `src/i18n/locales/{en,ru}/dashboard.json`.
- Написать интеграционный тест страницы `DashboardPage.test.tsx`.
- Создать Playwright e2e тест `e2e/dashboard.spec.ts`.
- Провести полную проверку через скилл `verify` (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`).
- Обновить статус фичи F06 в `docs/06-roadmap.md` на `done`.
- **Проверка:** Полный прогон `verify`.

---

## 13. Definition of Done

- [ ] Все задачи T1–T6 выполнены, код разбит на аккуратные атомарные коммиты.
- [ ] Все acceptance criteria (AC1–AC8, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH) удовлетворены.
- [ ] Графики Recharts загружаются лениво, не блокируя начальный рендер страницы.
- [ ] У каждого графика есть доступная скрытая таблица для скринридеров (WCAG 2.1 AA).
- [ ] Нет нарушений архитектурных границ (`eslint` без предупреждений и ошибок).
- [ ] Нет использования `any`, невалидированных приведений типов или хардкода строк в JSX.
- [ ] Все тесты из плана проходят успешно, покрытие кода соответствует требованиям `docs/05-testing-strategy.md`.
- [ ] Статус фичи в `docs/06-roadmap.md` переведен в `done`.

---

## 14. Журнал решений и открытые вопросы

| Дата | Вопрос / Проблема | Принятое решение | Статус |
|---|---|---|---|
| 2026-10-05 | Диапазон выборки для дашборда | Выбирать единым запросом 6-месячный диапазон, оканчивающийся выбранным месяцем | Принято |
| 2026-10-05 | Количество категорий в Donut Chart | Ограничить 5 ключевыми категориями, а остальные объединять в сектор «Другие» через `topNWithOther` | Принято |
| 2026-10-05 | Ленивая загрузка графиков | Обязательное использование `React.lazy()` и `Suspense` для компонентов графиков Recharts | Принято |
| 2026-10-05 | Четвертая карточка KPI | Добавить «Чистый капитал» (сумма балансов всех активных счетов) к трем метрикам месяца (доход, расход, сальдо) | Принято |
