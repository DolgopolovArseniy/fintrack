# F08 — Budgets (Бюджеты и лимиты расходов)

Статус: implemented
Зависит от: F01 (доменные типы, деньги, даты, aggregations), F02 (аутентификация), F03 (Security Rules v1), F04 (категории, CategoryBadge), F05 (Transactions, AmountInput, MoneyText, MonthNavigator, useSubscription)
Размер: M (7 задач: T1–T7)
Ветка: `feat/F08-budgets`

> **Контекст для агента:** Фича F08 является ключевой составляющей вехи **M4 Finance** и представляет собой главный инструмент финансового планирования в FinTrack. Бюджеты позволяют пользователю устанавливать месячные лимиты расходов по категориям, отслеживать прогресс трат в реальном времени с наглядной цветовой индикацией (норма / предупреждение / превышение), оперативно видеть остаток средств или сумму перерасхода, а также мгновенно копировать настроенные лимиты из предыдущих месяцев. Бюджеты — это один из двух ключевых «вау»-элементов проекта (`docs/00-project-spec.md` §3), поэтому особое внимание уделяется UX, точности вычислений в minor units, доступности (WCAG 2.1 AA) и полному набору тестов.
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7, §8.5, §8.6), `docs/02-data-model.md` (§2, §3.5, §6.1, §11), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.1, §3, §4, §6), `docs/05-testing-strategy.md`.
> Справка по API библиотек (`firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner, date-fns) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Предоставить пользователю удобный, наглядный и высокоточный инструмент месячного бюджетирования, позволяющий задавать финансовые лимиты по категориям расходов на любой календарный месяц, автоматически сопоставлять их с фактическими тратами, предупреждать о приближении к исчерпанию лимита (≥ 80%) и сигнализировать о перерасходе (> 100%) без задержек и перезагрузок страниц.

**Пользовательские истории:**
1. *Как пользователь*, я хочу устанавливать месячный денежный лимит для любой категории расходов на выбранный месяц (`YYYY-MM`), чтобы контролировать свои траты и не выходить за рамки запланированного бюджета.
2. *Как пользователь*, я хочу видеть карточки бюджетов с прогресс-барами, на которых отображаются: установленный лимит, фактически потраченная сумма за месяц, оставшийся остаток или сумма превышения, а также процент использования.
3. *Как пользователь*, я хочу, чтобы статус бюджета визуально и семантически менялся в зависимости от процента трат:
   - Зеленый/акцентный (норма, < 80%) с текстом «Осталось X»;
   - Желтый/янтарный предупреждающий (80–100%) с иконкой внимания и текстом «Осталось X»;
   - Красный тревожный (> 100%) с иконкой ошибки и текстом «Превышено на X».
4. *Как пользователь*, я хочу видеть сводную панель общего бюджета месяца (Total Budget Summary), показывающую суммарный запланированный лимит, общую сумму расходов по бюджетированным категориям, общий остаток/перерасход и количество превышенных лимитов.
5. *Как пользователь*, переходя в новый месяц, я хочу иметь возможность в один клик скопировать все бюджеты из предыдущего месяца («Скопировать бюджеты из прошлого месяца»), чтобы не настраивать одинаковые лимиты вручную каждый месяц.
6. *Как пользователь*, я хочу видеть секцию категорий без бюджета («Категории без лимита») с возможностью быстро задать лимит в один клик.
7. *Как пользователь*, я хочу редактировать лимит существующего бюджета или удалять ненужный бюджет с подтверждением.
8. *Как пользователь*, я хочу переключаться между месяцами через `MonthNavigator` (с сохранением `?month=YYYY-MM` в URL), включая возможность планировать бюджеты на будущие месяцы и анализировать историю выполнения прошлых бюджетов.
9. *Как пользователь*, из карточки бюджета я хочу иметь возможность в один клик перейти к отфильтрованному списку транзакций этой категории (`/app/transactions?month=YYYY-MM&categoryId=...`).

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы
- `src/lib/money.ts`: функции работы с minor units (`parseMoneyInput`, `formatMoney`, `formatMoneyInput`, `signedAmount`, `fromMinorUnits`).
- `src/lib/limits.ts`: константы ограничений (`MAX_AMOUNT = 100_000_000_000`).
- `src/lib/dates.ts`: календарные утилиты (`isValidYearMonth`, `currentYearMonth`, `addMonths`, `monthRange`, `formatYearMonth`, `YearMonth`).
- `src/lib/aggregations.ts`: функции агрегации транзакций `totalsByCategory(txs, 'expense')`, `sumByType(txs)`.
- `src/lib/firestore/paths.ts`: типизированные пути `budgetsCol(uid)`, `budgetDoc(uid, budgetId)`, `transactionsCol(uid)`, `categoriesCol(uid)`.
- `src/lib/firestore/createConverter.ts`: фабрика `createConverter` и парсер документов `parseSnapshotDocs`.
- `src/hooks/useSubscription.ts`: базовый хук подписок с защитой от React StrictMode.
- `src/lib/errors.ts`: `AppError`, `toAppError`.
- `src/components/common/`: готовые компоненты `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`, `ResponsiveDialog`, `ConfirmDialog`, `CategoryBadge`, `MoneyText`, `AmountInput`, `MonthNavigator`.
- `src/features/categories/`: `useCategories`, `subscribeCategories`, `CategoryBadge`, `getCategoryDisplayName`.
- `src/features/transactions/`: `useTransactions`, `subscribeTransactionsByMonth`, типы `Transaction`.

### 2.2 Архитектурные ограничения и инварианты
- **Детерминированный ID документа бюджета:** Id документа формируется строго по шаблону `${month}_${categoryId}` (ADR-012, `02-data-model.md` §3.5). Это гарантирует уникальность правила «один бюджет на категорию в рамках одного месяца» на уровне БД без необходимости составных индексов и транзакционных блокировок.
- **Только для категорий расходов:** Бюджеты могут создаваться **исключительно для категорий с `type === 'expense'`**. В UI создания бюджета категории доходов не предлагаются, а репозиторий и валидатор проверяют валидность категории.
- **Деньги:** Лимиты, фактические расходы и остатки хранятся и вычисляются исключительно в целых minor units (`number`, int, `1..100_000_000_000`). Никаких `float` в расчетах (ADR-003).
- **Клиентская увязка с транзакциями:** Репозиторий подписывается на бюджеты месяца `where('month', '==', month)` и транзакции месяца `where('date', '>=', start) and where('date', '<=', end)`. Сопоставление факта трат с бюджетами выполняется на клиенте через чистую функцию `totalsByCategory` (ADR-010).
- **Строгие границы ESLint:**
  - `components/common/` **не импортирует** `features/**`.
  - Фичи взаимодействуют только через публичные `index.ts`.
  - `firebase/firestore` импортируется только в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
- **Без `null` в Firestore:** Все поля документа обязательны (`categoryId`, `month`, `limit`, `createdAt`, `updatedAt`).

---

## 3. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Идентификатор документа бюджета** | Детерминированный ID: `${month}_${categoryId}` (например, `2026-10_food_123`) | Соответствует ADR-012 и Security Rules `budgetId == incoming().month + '_' + incoming().categoryId`. Гарантирует атомарную уникальность без race conditions и исключает дублирование лимитов. |
| 2 | **Сопоставление фактических трат и лимитов** | Клиентский джойн: хук `useBudgetSummary` берет массив бюджетов месяца, агрегирует транзакции месяца через `totalsByCategory(txs, 'expense')` и сопоставляет траты по `categoryId` | Не требует денормализации сумм в документе бюджета и дорогостоящих триггеров Cloud Functions. При любой новой транзакции прогресс бюджета обновляется реактивно за 0 мс. |
| 3 | **Пороговые значения и семантические состояния** | 3 дискретных состояния:<br>1. **Normal** (`spent < 0.8 * limit`): цвет `primary`/`emerald`, текст «Осталось X»<br>2. **Warning** (`0.8 * limit <= spent <= limit`): цвет `warning` (amber), иконка `AlertCircle`, текст «Осталось X»<br>3. **Exceeded** (`spent > limit`): цвет `destructive` (rose-red), иконка `AlertTriangle`, текст «Превышено на X» | Соответствует `04-ux-guidelines.md` §6. Обеспечивает мгновенную понятность ситуации без необходимости вчитываться в цифры. |
| 4 | **Копирование бюджетов из прошлого месяца** | Пакетная операция `copyBudgetsFromMonth(uid, sourceMonth, targetMonth, { overwrite })` через `writeBatch` Firestore | Исключает рутинный ввод одних и тех же 8–10 категорий каждый месяц. Пользователь нажимает одну кнопку на пустом месяце и получает полную конфигурацию лимитов. |
| 5 | **Бюджетирование на будущее** | Разрешена навигация на любые будущие месяцы через `MonthNavigator`. В будущем месяце `spent = 0`, прогресс `0%`, статус `normal` | Пользователи часто планируют бюджет на следующий месяц заранее (в конце текущего). |
| 6 | **Категории расходов без бюджета** | Отображение блока «Категории без лимита» (Unbudgeted Categories) с быстрыми чипами добавления | Помогает пользователю сразу видеть, какие регулярные категории трат еще не охвачены планированием. |
| 7 | **Поведение архивных категорий** | Если категория была заархивирована, но в выбранном месяце для нее есть существующий бюджет, он отображается с бейджем `(архив)`. В форме создания нового бюджета архивные категории не предлагаются | Сохраняет историческую достоверность отчетов прошлых месяцев без захламления селектора новых бюджетов. |
| 8 | **Доступность прогресс-баров (a11y)** | Компонент `BudgetProgressBar` использует семантический `role="progressbar"`, атрибуты `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` и текстовый `aria-valuetext` с пояснением статуса | Соответствует WCAG 2.1 AA и `04-ux-guidelines.md` §1. Скринридеры озвучивают процент и статус словами. |
| 9 | **Интеграция со списком транзакций** | Пункт контекстного меню «Смотреть операции» ведет на `/app/transactions?month=YYYY-MM&categoryId={id}` | Обеспечивает бесшовный переход от аналитики бюджета к списку конкретных чеков, сформировавших перерасход. |

---

## 4. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Создание бюджета на категорию (Happy Path)** | Пользователь на `/app/budgets`, выбран текущий месяц | 1. Нажимает кнопку «Задать лимит» (или чип категории без бюджета).<br>2. Выбирает категорию «Продукты».<br>3. Вводит лимит `30 000,00 ₽`.<br>4. Нажимает «Сохранить». | Модальное окно закрывается, toast «Лимит установлен». Появляется карточка «Продукты» с лимитом 30 000 ₽. Если в этом месяце уже были траты на продукты на 12 000 ₽, прогресс-бар показывает 40% (зеленый), остаток 18 000 ₽. |
| 2 | **Предупреждение о приближении к лимиту (80–100%)** | Бюджет на «Кафе» 10 000 ₽. Траты составили 8 500 ₽ (85%) | Пользователь открывает страницу бюджетов | Карточка «Кафе» окрашивается в предупреждающий янтарный цвет (`warning`), отображается иконка внимания `AlertCircle`, прогресс-бар 85%, текст «Осталось 1 500,00 ₽». |
| 3 | **Превышение бюджета (> 100%)** | Бюджет на «Развлечения» 5 000 ₽. Траты составили 6 200 ₽ (124%) | Пользователь открывает страницу бюджетов | Карточка окрашивается в красный цвет (`destructive`), иконка тревоги `AlertTriangle`, прогресс-бар заполнен на 100% красным цветом, бейдж `124%`, текст «Превышено на 1 200,00 ₽». |
| 4 | **Копирование бюджетов из прошлого месяца** | В октябре 2026 настроено 5 бюджетов. Пользователь переключился на ноябрь 2026 (бюджетов нет) | 1. Видит плашку «В этом месяце нет бюджетов. Скопировать 5 бюджетов из октября?».<br>2. Нажимает кнопку «Скопировать бюджеты». | Пакетный batch создает 5 документов на ноябрь с теми же категориями и лимитами. Toast «Скопировано 5 бюджетов». Карточки отображаются с прогрессом трат ноября. |
| 5 | **Редактирование лимита бюджета** | Существует бюджет на «Транспорт» 7 000 ₽ | 1. В меню карточки нажимает «Изменить лимит».<br>2. В диалоге категория зафиксирована («Транспорт»), меняет сумму на `9 000,00 ₽`.<br>3. Сохраняет. | Документ бюджета обновляется, toast «Лимит обновлен». Прогресс и остаток мгновенно пересчитываются относительно нового лимита 9 000 ₽. |
| 6 | **Удаление бюджета** | Существует бюджет на категорию | 1. В меню карточки нажимает «Удалить бюджет».<br>2. Подтверждает удаление в `ConfirmDialog`. | Документ бюджета удаляется из Firestore, toast «Бюджет удален». Категория возвращается в секцию «Категории без лимита». Траты по категории не удаляются. |
| 7 | **Навигация по месяцам** | Пользователь на странице бюджетов | Переключает `MonthNavigator` на прошлый месяц | URL обновляется на `?month=YYYY-MM`. Загружаются исторические бюджеты и фактические траты выбранного месяца. |
| 8 | **Переход к операциям категории** | Карточка бюджета показывает перерасход | Пользователь в меню карточки выбирает «Смотреть операции» | Выполняется переход на страницу `/app/transactions?month=YYYY-MM&categoryId=food_123` с предзаполненными фильтрами месяца и категории. |
| 9 | **Создание бюджета в офлайне** | Устройство временно без сети (`OfflineBanner`) | Пользователь задает лимит 15 000 ₽ на категорию | Документ оптимистично сохраняется в IndexedDB, карточка сразу появляется на экране. При появлении сети синхронизируется с Firebase. |
| 10 | **Планирование на будущий месяц** | Пользователь переключается на следующий месяц | Создает бюджет на категорию | Бюджет создается, потрачено 0,00 ₽ (0%), остаток равен 100% лимита. |

---

## 5. UI и дизайн-система

### 5.1 Макет страницы (`BudgetsPage`)
- **Маршрут:** `/app/budgets` (с поддержкой URL query-параметра `?month=YYYY-MM`).
- **Компоновка (Layout):**
  ```
  PageHeader (Заголовок, Описание, MonthNavigator, Button "+ Задать лимит")
  ├── BudgetSummaryHeader (Сводная панель: Общий лимит, Всего потрачено, Остаток/Перерасход, Общий прогресс-бар, Бейджи статусов)
  ├── FastActionBanner (Баннер «Скопировать бюджеты из прошлого месяца», если текущий месяц пуст, а в прошлом были бюджеты)
  ├── BudgetList (Сетка карточек активных бюджетов с сортировкой: Сначала превышенные -> По проценту -> По названию)
  └── UnbudgetedCategoriesSection (Секция категорий расходов без лимита с быстрыми кнопками создания)
  ```

### 5.2 Сводная панель месяца (`BudgetSummaryHeader`)
- Карточка `Card` с акцентным оформлением:
  - **Верхний ряд метрик:**
    - *Общий лимит:* сумма `Σ limit` по всем бюджетам месяца через `MoneyText`.
    - *Потрачено:* общая сумма фактических трат по бюджетированным категориям через `MoneyText`.
    - *Остаток / Перерасход:* общая разница (`Σ limit - Σ spent`). Если перерасход — красный цвет со знаком `−`, если остаток — зеленый цвет.
  - **Общий прогресс-бар:**
    - Компонент `BudgetProgressBar` с индикацией суммарного процента расхода общего бюджета.
  - **Индикаторы состояния (Бейджи):**
    - Количество бюджетов в норме (`bg-emerald-500/10 text-emerald-600`).
    - Количество бюджетов в зоне внимания (`bg-warning/10 text-warning`).
    - Количество превышенных бюджетов (`bg-destructive/10 text-destructive`).

### 5.3 Карточка бюджета категории (`BudgetCard`)
- Адаптивная карточка `Card` со структурой:
  - **Шапка карточки:**
    - Слева: `CategoryBadge` (иконка, цвет темы, локализованное название категории, бейдж архива при необходимости).
    - Справа: бейдж статуса (Normal: зеленый `Check` / Warning: янтарный `AlertCircle` / Exceeded: красный `AlertTriangle`) + меню действий `DropdownMenu` (`MoreHorizontal`).
  - **Основная информация о суммах:**
    - Строка: Потрачено **X ₽** из **Y ₽** (`MoneyText`).
    - Процент: крупный бейдж процента (например, `45%`, `88%`, `125%`).
  - **Прогресс-бар (`BudgetProgressBar`):**
    - Высота 8px (`h-2 rounded-full`).
    - Плавное визуальное заполнение.
    - Динамический цвет трека:
      - `< 80%`: `bg-primary` (или токен `income`/`emerald`);
      - `80%–100%`: токен `warning` (`oklch(0.68 0.16 75)`);
      - `> 100%`: токен `destructive` (`oklch(0.55 0.2 25)`).
  - **Подвал карточки:**
    - При `spent <= limit`: текст `t('budgets.card.remaining')`: «Осталось **X ₽**».
    - При `spent > limit`: текст `t('budgets.card.overspent')`: «Превышено на **X ₽**» (красный акцент).
  - **Меню действий карточки (`DropdownMenu`):**
    - «Изменить лимит» (`Pencil`) → открывает `BudgetForm` в режиме редактирования.
    - «Смотреть операции» (`ListFilter` / `Receipt`) → переход на `/app/transactions?month=YYYY-MM&categoryId={id}`.
    - «Удалить бюджет» (`Trash2`, destructive) → открывает `ConfirmDialog`.

### 5.4 Секция категорий без бюджета (`UnbudgetedCategoriesSection`)
- Располагается под основным списком бюджетов при наличии категорий расходов без лимитов.
- Заголовок: «Категории без лимита» (`t('budgets.unbudgeted.title')`).
- Список компактных плашек/чипов:
  - `CategoryBadge` + кнопка `Button variant="outline" size="sm"` с иконкой `Plus` («Задать лимит»).
  - Клик сразу открывает `BudgetForm` с предвыбранной категорией.

### 5.5 Форма бюджета (`BudgetForm`)
- Открывается в общем `ResponsiveDialog` (`Dialog` на desktop, `Drawer` на mobile).
- **Поля формы:**
  1. **Категория (`categoryId`)**:
     - При создании: выпадающий список `Select` с поиском, содержащий **только активные категории расходов**, для которых еще нет бюджета в выбранном месяце.
     - При редактировании: заблокированное поле с отображением текущей категории через `CategoryBadge`.
  2. **Месяц (`month`)**:
     - Скрытое или информационное поле с текущим выбранным месяцем (`formatYearMonth`).
  3. **Лимит бюджета (`limit`)**:
     - Компонент `AmountInput` (валидация: целое число minor units > 0, не более `100_000_000_000`).
     - Подсказка: `t('budgets.form.limitHint')` («Максимальная сумма расходов по этой категории в месяц»).
- **Кнопки:** «Отмена» (`Button variant="outline"`) и «Сохранить» (`Button` со спиннером загрузки `Loader2`).

### 5.6 Диалог копирования бюджетов (`CopyBudgetsDialog`)
- Модальное окно подтверждения копирования:
  - Выбор исходного месяца (по умолчанию предыдущий календарный месяц `addMonths(currentMonth, -1)`).
  - Отображение списка бюджетов, которые будут скопированы.
  - Чекбокс «Перезаписать существующие бюджеты», если в текущем месяце уже есть часть лимитов.
  - Кнопка «Скопировать (N бюджетов)».

### 5.7 Переиспользование (DRY-матрица)

| Элемент UI | Источник | Назначение в F08 |
|---|---|---|
| Заголовок страницы | `src/components/common/PageHeader.tsx` | Шапка страницы с заголовком и кнопкой добавления |
| Переключатель месяца | `src/components/common/MonthNavigator.tsx` | Навигация по месяцам с синхронизацией в URL |
| Пустое состояние | `src/components/common/EmptyState.tsx` | Состояние отсутствия бюджетов и трат |
| Состояние ошибки | `src/components/common/ErrorState.tsx` | Ошибка подписки с кнопкой повтора |
| Скелетон загрузки | `src/components/common/LoadingSkeleton.tsx` | Скелетон карточек бюджетов (`variant="card"`) |
| Граница запросов | `src/components/common/QueryBoundary.tsx` | Обработка 5 состояний страницы |
| Адаптивный диалог | `src/components/common/ResponsiveDialog.tsx` | Модальное окно формы бюджета (Dialog / Drawer) |
| Подтверждение удаления | `src/components/common/ConfirmDialog.tsx` | Диалог подтверждения удаления лимита |
| Бейдж категории | `src/components/common/CategoryBadge.tsx` | Отображение иконки и имени категории |
| Форматирование денег | `src/components/common/MoneyText.tsx` | Вывод сумм лимитов, трат и остатков |
| Ввод суммы денег | `src/components/common/AmountInput.tsx` | Поле ввода суммы лимита в форме |
| Прогресс-бар бюджета | `src/features/budgets/components/BudgetProgressBar.tsx` | **Создается в F08:** семантический доступный прогресс-бар со сменой цветовых токенов |

---

## 6. Скоуп

### Входит
1. **Схемы, утилиты и типы (`features/budgets`):**
   - Схемы Zod `budgetInputSchema`, `budgetUpdateInputSchema`, `budgetSchema`, типы `BudgetInput`, `BudgetUpdateInput`, `Budget`.
   - Доменные утилиты `src/features/budgets/utils.ts`:
     - `calculateBudgetStatus(spent, limit)`: расчет статуса (`normal`, `warning`, `exceeded`).
     - `calculateBudgetProgress(spent, limit)`: расчет прогресса в процентах.
     - `calculateBudgetRemaining(spent, limit)`: расчет доступного остатка.
     - `calculateBudgetOverspent(spent, limit)`: расчет суммы перерасхода.
     - `enrichBudgets(budgets, categoryExpensesMap, categoriesMap)`: сборка обогащенных структур для UI.
     - `calculateOverallBudgetSummary(enrichedBudgets)`: расчет суммарных метрик месяца.
     - `getUnbudgetedCategories(categories, budgets)`: фильтрация категорий без лимита.
2. **Репозиторий и конвертеры (`features/budgets`):**
   - Конвертер `src/features/budgets/converters.ts` (`budgetConverter`, `budgetsCollectionRef`).
   - Репозиторий `src/features/budgets/repository.ts`:
     - `subscribeBudgetsByMonth(uid, month, onData, onError)`: подписка на бюджеты месяца.
     - `createBudget(uid, input)`: создание бюджета с детерминированным ID `${month}_${categoryId}`.
     - `updateBudget(uid, budgetId, input)`: обновление лимита существующего бюджета.
     - `deleteBudget(uid, budgetId)`: удаление документа бюджета.
     - `copyBudgetsFromMonth(uid, sourceMonth, targetMonth, options)`: пакетное копирование бюджетов через `writeBatch`.
3. **Хуки фичи (`features/budgets/hooks/`):**
   - `useBudgets(month)`: подписка на бюджеты выбранного месяца.
   - `useBudgetMutations()`: операции создания, обновления, удаления и копирования бюджетов с toast-нотификациями (`sonner`) и состояниями `isSubmitting`/`isCopying`.
   - `useBudgetSummary(month)`: объединенный хук, связывающий бюджеты месяца, категории (`useCategories`) и транзакции месяца (`useTransactions`), с мемоизированным расчетом обогащенных карточек, сводки и категорий без бюджета.
4. **UI-компоненты фичи `src/features/budgets/components/`:**
   - `BudgetProgressBar`: доступный семантический прогресс-бар с динамическими цветовыми токенами.
   - `BudgetCard`: карточка бюджета категории со статусом, прогрессом, суммами и меню действий.
   - `BudgetSummaryHeader`: сводная панель общего бюджета месяца.
   - `UnbudgetedCategoriesSection`: секция категорий без лимита с кнопками быстрого добавления.
   - `BudgetForm`: форма создания и редактирования лимита в `ResponsiveDialog`.
   - `CopyBudgetsDialog`: диалог копирования бюджетов из предыдущего месяца.
   - `BudgetList`: сетка карточек с поддержкой сортировки и состояний.
5. **Страница и интеграция:**
   - Полнофункциональная страница `src/app/pages/BudgetsPage.tsx` (замена `PlaceholderPage`).
   - Интеграция с `MonthNavigator` и параметром `?month=YYYY-MM` в URL.
   - Быстрый переход в транзакции категории: `/app/transactions?month=YYYY-MM&categoryId=...`.
6. **Локализация и тесты:**
   - Регистрация неймспейса `budgets` в `src/i18n/config.ts` и `src/i18n/types.ts`.
   - Файлы переводов `src/i18n/locales/{en,ru}/budgets.json`.
   - Комплексные unit-тесты схем и утилит, интеграционные тесты репозитория на Firestore Emulator (включая проверку детерминированных ID и batch-копирования), компонентные тесты всех виджетов/страницы и Playwright E2E-тесты.

### Не входит (явно)
- Бюджеты на доходы или сбережения (бюджетируются только расходы).
- Недельные, квартальные или годовые бюджетные периоды (в v1 строго календарный месяц `YYYY-MM`).
- Автоматический перенос неизрасходованного остатка на следующий месяц (Rollover budgets — Won't v1 / Backlog).
- Вложенные подкатегории бюджетов (в FinTrack категории плоские).
- Push-уведомления об исчерпании лимита (требует Cloud Messaging / Cloud Functions, Won't v1).

---

## 7. Эдж-кейсы фичи и обработка ошибок

| # | Эдж-кейс / Ситуация | Риск / Проблема | Решение и обработка |
|---|---|---|---|
| 1 | **Попытка создать дубликат бюджета на категорию в том же месяце** | Рассинхрон или двойной учет лимита | Детерминированный ID `${month}_${categoryId}`. При попытке повторного создания репозиторий либо перезаписывает лимит (`setDoc` с `merge: true`), либо форма валидирует отсутствие дубликата в селекторе категорий. |
| 2 | **Траты по категории отсутствуют (`spent = 0`)** | Деление на ноль или некорректный рендеринг прогресс-бара | `calculateBudgetProgress` возвращает `0%`. Карточка отображает статус `normal`, потрачено `0,00 ₽`, остаток равен `100%` лимита. |
| 3 | **Перерасход бюджета (`spent > limit`, например 250%)** | Выход шкалы прогресс-бара за пределы контейнера, `aria-valuenow > 100` | Ширина заполнения прогресс-бара CSS ограничивается `max-width: 100%`. В `aria-valuenow` передается `100`, а в `aria-valuetext` передается реальный процент (например, «150% исчерпано, превышение на 5 000 ₽»). Бейдж показывает точный процент `150%`. |
| 4 | **Копирование бюджетов при отсутствии лимитов в предыдущем месяце** | Пустой batch или ошибочное создание пустых документов | Кнопка копирования блокируется (`disabled`) или скрывается, если в предыдущем месяце `budgets.length === 0`. Если пользователь пытается вызвать мутацию вручную — выводится предупреждающий toast: «В предыдущем месяце нет настроенных бюджетов». |
| 5 | **Копирование бюджетов в месяц, где уже есть часть лимитов** | Перезапись пользовательских настроек без спроса | `CopyBudgetsDialog` показывает количество новых бюджетов и предлагает опцию «Перезаписать существующие лимиты» (по умолчанию `overwrite: false`, копируются только отсутствующие). |
| 6 | **Категория бюджета была заархивирована** | Ошибка отображения названия/иконки или крах формы | `CategoryBadge` корректно отображает архивную категорию со стилем `opacity-65` и бейджем «Архив». В списке бюджетов карточка отображается с пометкой, в меню доступно действие «Удалить бюджет». В форме создания *нового* бюджета архивная категория исключается из списка выбора. |
| 7 | **Категория была удалена (отсутствует в базе)** | `category == null` при клиентском джойне | Если категория не найдена в словаре категорий, `enrichBudgets` создает fallback-объект «Неизвестная категория» с нейтральной иконкой `Tag` и цветом `slate`, приложение не падает. |
| 8 | **Поврежденный документ бюджета в Firestore** | Сбой рендеринга всего списка | `parseSnapshotDocs` безопасно логирует ошибку парсинга Zod в `console.warn` и пропускает невалидный документ. |
| 9 | **Ввод нулевого или отрицательного лимита** | Некорректный лимит `0` или `-500` | Схема `budgetInputSchema` требует `limit >= 1` minor unit (положительное целое число). `AmountInput` и валидация формы подсвечивают ошибку `validation.positive`. |
| 10 | **Быстрое переключение месяцев в `MonthNavigator`** | Race condition подписок и мигание устаревших данных | Хук `useSubscription` отписывается от предыдущей подписки в cleanup и переводит статус в `loading` при изменении входного параметра `month`. |

---

## 8. Данные, запросы и безопасность

### 8.1 Структура документа Firestore (`users/{uid}/budgets/{YYYY-MM_categoryId}`)
Полностью соответствует спецификации `docs/02-data-model.md` §3.5 и Security Rules:

```ts
interface BudgetFirestoreDoc {
  categoryId: string; // ID категории расходов (1..64 символа)
  month: string;      // Формат 'YYYY-MM' (например, '2026-10')
  limit: number;      // Целое число minor units, [1 .. 100_000_000_000]
  createdAt: Timestamp; // serverTimestamp()
  updatedAt: Timestamp; // serverTimestamp()
}
```

### 8.2 Запросы к Firestore
1. **Подписка на бюджеты месяца:**
   - Коллекция: `users/{uid}/budgets`.
   - Запрос: `query(budgetsCol(uid), where('month', '==', month))`.
   - Индекс: стандартный автоматический однополевой индекс по полю `month`. Составные индексы **не требуются** (`02-data-model.md` §6.1).
2. **Подписка на транзакции месяца (для расчета факта расходов):**
   - Коллекция: `users/{uid}/transactions`.
   - Запрос: `subscribeTransactionsByMonth(uid, month)`.
   - Фильтрация трат: `totalsByCategory(transactions, 'expense')`.
3. **Подписка на категории:**
   - Коллекция: `users/{uid}/categories`.
   - Запрос: `subscribeCategories(uid)`.
4. **Пакетное копирование бюджетов (`copyBudgetsFromMonth`):**
   - Читаются все документы `budgets` за `sourceMonth`.
   - В `writeBatch` создаются документы для `targetMonth` с новыми ID `${targetMonth}_${categoryId}`:
     ```ts
     const batch = writeBatch(db);
     for (const budget of sourceBudgets) {
       const targetId = `${targetMonth}_${budget.categoryId}`;
       const docRef = budgetDoc(uid, targetId);
       batch.set(docRef, {
         categoryId: budget.categoryId,
         month: targetMonth,
         limit: budget.limit,
         createdAt: serverTimestamp(),
         updatedAt: serverTimestamp(),
       });
     }
     await batch.commit();
     ```

### 8.3 Влияние на Security Rules и индексы
- Изменения `firestore.rules`: **не требуются** (правило `validBudget(budgetId)` в `02-data-model.md` §11 уже проверяет `categoryId`, формат `month`, соответствие `budgetId == month + '_' + categoryId`, границы `limit` и серверные временные метки).
- Изменения `firestore.indexes.json`: **не требуются** (файл остается пустым).

---

## 9. Контракты и интерфейсы

### 9.1 Доменные схемы и типы (`src/features/budgets/schemas.ts`)

```ts
import { z } from 'zod';
import { moneyAmountSchema, yearMonthSchema } from '@/lib/schemas';
import { MAX_AMOUNT } from '@/lib/limits';

export const budgetInputSchema = z.object({
  categoryId: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(64, { error: 'validation.tooLong' }),
  month: yearMonthSchema,
  limit: moneyAmountSchema,
});

export const budgetUpdateInputSchema = z.object({
  limit: moneyAmountSchema,
});

const baseBudgetDocSchema = budgetInputSchema.extend({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export const budgetSchema = baseBudgetDocSchema.refine(
  (doc) => doc.id === `${doc.month}_${doc.categoryId}`,
  {
    error: 'validation.required',
    path: ['id'],
  },
);

export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateInputSchema>;
export type Budget = z.infer<typeof budgetSchema>;

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

export interface EnrichedBudget {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  spent: number;
  remaining: number;
  overspent: number;
  progress: number; // 0..100+
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummaryTotals {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverspent: number;
  overallProgress: number;
  overallStatus: BudgetStatus;
  budgetCount: number;
  normalCount: number;
  warningCount: number;
  exceededCount: number;
}
```

### 9.2 Доменные утилиты (`src/features/budgets/utils.ts`)

```ts
import type { Budget, BudgetInput, BudgetStatus, EnrichedBudget, BudgetSummaryTotals } from './schemas';
import type { Category } from '@/features/categories';
import type { CategoryTotal } from '@/lib/aggregations';

/**
 * Вычисляет статус бюджета по соотношению трат к лимиту:
 * - 'normal': spent < 80% от limit
 * - 'warning': 80% <= spent <= 100% от limit
 * - 'exceeded': spent > limit
 */
export function calculateBudgetStatus(spent: number, limit: number): BudgetStatus;

/**
 * Вычисляет процент исчерпания бюджета (может быть > 100).
 */
export function calculateBudgetProgress(spent: number, limit: number): number;

/**
 * Вычисляет оставшуюся сумму (>= 0).
 */
export function calculateBudgetRemaining(spent: number, limit: number): number;

/**
 * Вычисляет сумму превышения лимита (>= 0).
 */
export function calculateBudgetOverspent(spent: number, limit: number): number;

/**
 * Обогащает сырые бюджеты фактическими тратами из транзакций.
 */
export function enrichBudgets(
  budgets: readonly Budget[],
  categoryExpenses: readonly CategoryTotal[],
): EnrichedBudget[];

/**
 * Рассчитывает суммарные KPI по всем бюджетам месяца.
 */
export function calculateOverallBudgetSummary(
  enrichedBudgets: readonly EnrichedBudget[],
): BudgetSummaryTotals;

/**
 * Возвращает список активных категорий расходов, для которых еще нет бюджета в этом месяце.
 */
export function getUnbudgetedCategories(
  categories: readonly Category[],
  budgets: readonly Budget[],
): Category[];

/**
 * Формирует детерминированный ID документа бюджета.
 */
export function buildBudgetId(month: string, categoryId: string): string;
```

### 9.3 Контракты репозитория (`src/features/budgets/repository.ts`)

```ts
export type Unsubscribe = () => void;

export interface CopyBudgetsOptions {
  overwrite?: boolean;
}

export interface CopyBudgetsResult {
  copiedCount: number;
  skippedCount: number;
}

/** Подписка на бюджеты выбранного календарного месяца в реальном времени */
export function subscribeBudgetsByMonth(
  uid: string,
  month: string,
  onData: (budgets: Budget[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;

/** Создание нового бюджета с детерминированным ID `${month}_${categoryId}` */
export function createBudget(
  uid: string,
  input: BudgetInput,
): Promise<string>;

/** Обновление лимита существующего бюджета */
export function updateBudget(
  uid: string,
  budgetId: string,
  input: BudgetUpdateInput,
): Promise<void>;

/** Удаление документа бюджета */
export function deleteBudget(
  uid: string,
  budgetId: string,
): Promise<void>;

/** Пакетное копирование бюджетов из sourceMonth в targetMonth */
export function copyBudgetsFromMonth(
  uid: string,
  sourceMonth: string,
  targetMonth: string,
  options?: CopyBudgetsOptions,
): Promise<CopyBudgetsResult>;
```

### 9.4 Контракты хуков (`src/features/budgets/hooks/`)

```ts
// useBudgets.ts
export function useBudgets(month: string): SubscriptionResult<Budget[]>;

// useBudgetMutations.ts
export interface UseBudgetMutationsResult {
  createBudget: (input: BudgetInput) => Promise<string>;
  updateBudget: (budgetId: string, input: BudgetUpdateInput) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  copyBudgets: (sourceMonth: string, targetMonth: string, options?: CopyBudgetsOptions) => Promise<CopyBudgetsResult>;
  isSubmitting: boolean;
  isCopying: boolean;
}
export function useBudgetMutations(): UseBudgetMutationsResult;

// useBudgetSummary.ts
export interface UseBudgetSummaryResult {
  enrichedBudgets: EnrichedBudget[];
  summaryTotals: BudgetSummaryTotals;
  unbudgetedCategories: Category[];
  previousMonthBudgetsCount: number;
  isLoading: boolean;
  error: AppError | null;
}
export function useBudgetSummary(month: string): UseBudgetSummaryResult;
```

### 9.5 Публичный API фичи (`src/features/budgets/index.ts`)

```ts
export {
  budgetInputSchema,
  budgetUpdateInputSchema,
  budgetSchema,
} from './schemas';
export type {
  BudgetInput,
  BudgetUpdateInput,
  Budget,
  BudgetStatus,
  EnrichedBudget,
  BudgetSummaryTotals,
} from './schemas';

export { budgetConverter, budgetsCollectionRef } from './converters';
export {
  subscribeBudgetsByMonth,
  createBudget,
  updateBudget,
  deleteBudget,
  copyBudgetsFromMonth,
} from './repository';
export type { Unsubscribe, CopyBudgetsOptions, CopyBudgetsResult } from './repository';

export { useBudgets } from './hooks/useBudgets';
export { useBudgetMutations } from './hooks/useBudgetMutations';
export type { UseBudgetMutationsResult } from './hooks/useBudgetMutations';
export { useBudgetSummary } from './hooks/useBudgetSummary';
export type { UseBudgetSummaryResult } from './hooks/useBudgetSummary';

export {
  calculateBudgetStatus,
  calculateBudgetProgress,
  calculateBudgetRemaining,
  calculateBudgetOverspent,
  enrichBudgets,
  calculateOverallBudgetSummary,
  getUnbudgetedCategories,
  buildBudgetId,
} from './utils';

export { BudgetCard } from './components/BudgetCard';
export { BudgetList } from './components/BudgetList';
export { BudgetSummaryHeader } from './components/BudgetSummaryHeader';
export { BudgetProgressBar } from './components/BudgetProgressBar';
export { BudgetForm } from './components/BudgetForm';
export { CopyBudgetsDialog } from './components/CopyBudgetsDialog';
export { UnbudgetedCategoriesSection } from './components/UnbudgetedCategoriesSection';
```

---

## 10. i18n-локализация

Регистрируется новый неймспейс `budgets` в `src/i18n/config.ts` и `src/i18n/types.ts`:

### 10.1 `src/i18n/locales/en/budgets.json`
```json
{
  "title": "Budgets",
  "description": "Set category spending limits and monitor your monthly financial goals",
  "summary": {
    "title": "Monthly Budget Summary",
    "totalBudget": "Total Budgeted",
    "totalSpent": "Total Spent",
    "remaining": "Remaining",
    "overspent": "Overspent",
    "progress": "Overall Progress",
    "statusNormal_one": "{{count}} on track",
    "statusNormal_other": "{{count}} on track",
    "statusWarning_one": "{{count}} near limit",
    "statusWarning_other": "{{count}} near limit",
    "statusExceeded_one": "{{count}} exceeded",
    "statusExceeded_other": "{{count}} exceeded"
  },
  "card": {
    "spentOf": "Spent {{spent}} of {{limit}}",
    "remaining": "Remaining {{amount}}",
    "overspent": "Over budget by {{amount}}",
    "statusNormal": "On track",
    "statusWarning": "Near limit (≥80%)",
    "statusExceeded": "Exceeded (>100%)",
    "viewTransactions": "View transactions"
  },
  "actions": {
    "add": "Set budget",
    "edit": "Edit limit",
    "delete": "Delete budget",
    "copyFromPrevious": "Copy from last month",
    "copyAction": "Copy budgets"
  },
  "unbudgeted": {
    "title": "Categories without budget",
    "description": "Set limits for remaining expense categories to get complete budget control",
    "setLimit": "Set limit"
  },
  "form": {
    "createTitle": "Set category budget",
    "createDescription": "Define a monthly spending limit for this category",
    "editTitle": "Edit budget limit",
    "editDescription": "Update the monthly limit for {{category}}",
    "categoryLabel": "Expense category",
    "categoryPlaceholder": "Select category",
    "monthLabel": "Month",
    "limitLabel": "Monthly limit",
    "limitHint": "Maximum planned spending for this category"
  },
  "copyDialog": {
    "title": "Copy budgets from previous month",
    "description": "Copy all spending limits configured in {{sourceMonth}} to {{targetMonth}}.",
    "foundCount_one": "Found {{count}} budget to copy",
    "foundCount_other": "Found {{count}} budgets to copy",
    "overwriteLabel": "Overwrite existing limits in {{targetMonth}}",
    "confirmButton": "Copy budgets",
    "noBudgetsInSource": "No budgets found in {{sourceMonth}} to copy"
  },
  "copyBanner": {
    "message": "No budgets configured for this month. Would you like to copy {{count}} budgets from {{previousMonth}}?",
    "action": "Copy budgets"
  },
  "confirm": {
    "deleteTitle": "Delete budget",
    "deleteDescription": "Are you sure you want to remove the budget for \"{{category}}\"? Past transactions will not be affected.",
    "deleteConfirm": "Delete"
  },
  "notifications": {
    "created": "Budget limit created successfully",
    "updated": "Budget limit updated successfully",
    "deleted": "Budget limit removed",
    "copied_one": "Successfully copied {{count}} budget",
    "copied_other": "Successfully copied {{count}} budgets",
    "copyNoop": "No new budgets to copy"
  },
  "empty": {
    "title": "No budgets for this month",
    "description": "Plan your expenses by setting spending limits for categories.",
    "action": "Set first budget"
  },
  "errors": {
    "saveFailed": "Failed to save budget limit. Please try again.",
    "deleteFailed": "Failed to delete budget limit",
    "copyFailed": "Failed to copy budgets from previous month",
    "duplicateCategory": "A budget for this category already exists in this month",
    "onlyExpenseAllowed": "Budgets can only be set for expense categories"
  }
}
```

### 10.2 `src/i18n/locales/ru/budgets.json`
```json
{
  "title": "Бюджеты",
  "description": "Управление лимитами расходов по категориям и контроль выполнения бюджета",
  "summary": {
    "title": "Сводка бюджета за месяц",
    "totalBudget": "Запланировано",
    "totalSpent": "Потрачено",
    "remaining": "Остаток",
    "overspent": "Перерасход",
    "progress": "Общий прогресс",
    "statusNormal_one": "{{count}} в норме",
    "statusNormal_few": "{{count}} в норме",
    "statusNormal_many": "{{count}} в норме",
    "statusNormal_other": "{{count}} в норме",
    "statusWarning_one": "{{count}} на исходе",
    "statusWarning_few": "{{count}} на исходе",
    "statusWarning_many": "{{count}} на исходе",
    "statusWarning_other": "{{count}} на исходе",
    "statusExceeded_one": "{{count}} превышен",
    "statusExceeded_few": "{{count}} превышено",
    "statusExceeded_many": "{{count}} превышено",
    "statusExceeded_other": "{{count}} превышено"
  },
  "card": {
    "spentOf": "Потрачено {{spent}} из {{limit}}",
    "remaining": "Осталось {{amount}}",
    "overspent": "Превышено на {{amount}}",
    "statusNormal": "В норме",
    "statusWarning": "Почти исчерпан (≥80%)",
    "statusExceeded": "Превышен (>100%)",
    "viewTransactions": "Смотреть операции"
  },
  "actions": {
    "add": "Задать лимит",
    "edit": "Изменить лимит",
    "delete": "Удалить бюджет",
    "copyFromPrevious": "Скопировать из прошлого месяца",
    "copyAction": "Скопировать бюджеты"
  },
  "unbudgeted": {
    "title": "Категории без лимита",
    "description": "Установите лимиты на остальные категории расходов для полного контроля бюджета",
    "setLimit": "Задать лимит"
  },
  "form": {
    "createTitle": "Новый лимит бюджета",
    "createDescription": "Укажите максимальную сумму расходов по категории на месяц",
    "editTitle": "Изменение лимита",
    "editDescription": "Обновите месячный лимит для категории «{{category}}»",
    "categoryLabel": "Категория расхода",
    "categoryPlaceholder": "Выберите категорию",
    "monthLabel": "Месяц",
    "limitLabel": "Сумма лимита",
    "limitHint": "Максимальный запланированный расход по этой категории в месяц"
  },
  "copyDialog": {
    "title": "Копирование бюджетов",
    "description": "Скопировать все лимиты расходов из {{sourceMonth}} в {{targetMonth}}.",
    "foundCount_one": "Найден {{count}} бюджет для копирования",
    "foundCount_few": "Найдено {{count}} бюджета для копирования",
    "foundCount_many": "Найдено {{count}} бюджетов для копирования",
    "foundCount_other": "Найдено {{count}} бюджетов для копирования",
    "overwriteLabel": "Перезаписать существующие лимиты в {{targetMonth}}",
    "confirmButton": "Скопировать",
    "noBudgetsInSource": "В {{sourceMonth}} нет настроенных бюджетов для копирования"
  },
  "copyBanner": {
    "message": "В этом месяце еще нет бюджетов. Скопировать {{count}} бюджетов из {{previousMonth}}?",
    "action": "Скопировать бюджеты"
  },
  "confirm": {
    "deleteTitle": "Удаление бюджета",
    "deleteDescription": "Вы уверены, что хотите удалить бюджет для категории «{{category}}»? Сами транзакции останутся без изменений.",
    "deleteConfirm": "Удалить"
  },
  "notifications": {
    "created": "Лимит бюджета успешно установлен",
    "updated": "Лимит бюджета успешно обновлен",
    "deleted": "Лимит бюджета удален",
    "copied_one": "Скопирован {{count}} бюджет",
    "copied_few": "Скопировано {{count}} бюджета",
    "copied_many": "Скопировано {{count}} бюджетов",
    "copied_other": "Скопировано {{count}} бюджетов",
    "copyNoop": "Нет новых бюджетов для копирования"
  },
  "empty": {
    "title": "Нет бюджетов на этот месяц",
    "description": "Спланируйте свои траты, задав лимиты по категориям расходов.",
    "action": "Задать первый бюджет"
  },
  "errors": {
    "saveFailed": "Не удалось сохранить бюджет. Попробуйте снова.",
    "deleteFailed": "Не удалось удалить бюджет",
    "copyFailed": "Не удалось скопировать бюджеты из прошлого месяца",
    "duplicateCategory": "Бюджет для этой категории уже задан в текущем месяце",
    "onlyExpenseAllowed": "Бюджет можно задавать только для категорий расходов"
  }
}
```

---

## 11. Acceptance criteria

- [x] **AC-1 (Создание бюджета):** Given пользователь на `/app/budgets`, When нажимает «Задать лимит», выбирает категорию расхода и указывает лимит > 0, Then в Firestore создается документ с ID `${month}_${categoryId}`, диалог закрывается, карточка бюджета отображается в списке с актуальным процентом трат, toast сообщает об успехе.
- [x] **AC-2 (Индикация статусов):** Given существующий бюджет,
  - When потрачено < 80% лимита, Then прогресс-бар и бейдж имеют цвет `normal` (`primary`/`emerald`), отображается текст «Осталось X»;
  - When потрачено от 80% до 100%, Then статус переходит в `warning` (янтарный цвет, иконка `AlertCircle`);
  - When потрачено > 100%, Then статус переходит в `exceeded` (красный цвет `destructive`, иконка `AlertTriangle`, текст «Превышено на X»).
- [x] **AC-3 (Сводная панель месяца):** Given открыта страница бюджетов, Then панель `BudgetSummaryHeader` отображает суммарный лимит `Σ limit`, фактически потраченную сумму по бюджетированным категориям, общий остаток/перерасход, общий прогресс-бар и бейджи количества бюджетов в норме / на исходе / превышенных.
- [x] **AC-4 (Копирование бюджетов из прошлого месяца):** Given в предыдущем месяце есть настроенные бюджеты, а в текущем бюджетов нет, When пользователь нажимает «Скопировать бюджеты», Then в `writeBatch` создаются бюджеты на текущий месяц с теми же категориями и лимитами, карточки отображаются с тратами текущего месяца, выводится toast с количеством скопированных записей.
- [x] **AC-5 (Редактирование лимита):** Given существующий бюджет, When пользователь меняет сумму лимита, Then документ обновляется в базе, прогресс и остаток мгновенно пересчитываются.
- [x] **AC-6 (Удаление бюджета):** Given существующий бюджет, When пользователь удаляет его через подтверждающий диалог, Then документ удаляется из Firestore, карточка исчезает из списка, а категория появляется в блоке категорий без бюджета.
- [x] **AC-7 (Секция категорий без бюджета):** Given у пользователя есть категории расходов без лимитов в выбранном месяце, Then под списком бюджетов отображается секция «Категории без лимита» с кнопками быстрого назначения бюджета.
- [x] **AC-8 (Навигация по месяцам):** Given переключение месяца через `MonthNavigator`, Then URL синхронизируется (`?month=YYYY-MM`), загружаются бюджеты и фактические траты выбранного месяца.
- [x] **AC-9 (Переход к транзакциям):** Given карточка бюджета категории, When пользователь выбирает в меню «Смотреть операции», Then осуществляется переход на `/app/transactions?month=YYYY-MM&categoryId={id}` с примененными фильтрами.
- [x] **AC-STATES:** Для страницы `/app/budgets` реализованы все 5 обязательных состояний: `loading` (скелетоны карточек), `empty` (при отсутствии бюджетов и трат), `error` (ошибка подписки с кнопкой повтора), `offline` (чтение из кэша с `OfflineBanner`), `success`.
- [x] **AC-I18N:** Все надписи, подсказки, статусы, диалоги и уведомления вынесены в `budgets.json` (EN и RU), нет жестких строк в JSX.
- [x] **AC-A11Y:** Фокус клавиатуры, корректные `role="progressbar"`, `aria-valuenow`, `aria-valuetext`, `aria-label` для кнопок действий, корректный контраст цветов по WCAG 2.1 AA.
- [x] **AC-ARCH:** Соблюдены границы слоев ESLint, детерминированные ID документов `${month}_${categoryId}`, доступ к Firestore только через `repository.ts`, публичный экспорт через `features/budgets/index.ts`.

---

## 12. План тестов

| Уровень | Что проверяем | Файлы тестов |
|---|---|---|
| **Unit (domain)** | Валидация Zod-схем (`budgetInputSchema`, `budgetUpdateInputSchema`, `budgetSchema`), расчет статусов (`calculateBudgetStatus`), прогресса, остатка, перерасхода, обогащение `enrichBudgets`, агрегация сводки `calculateOverallBudgetSummary`, фильтрация `getUnbudgetedCategories` | `src/features/budgets/schemas.test.ts`, `src/features/budgets/utils.test.ts` |
| **Unit (hooks)** | Хуки `useBudgets`, `useBudgetMutations`, `useBudgetSummary` (подписка, расчеты, вызов toast) | `src/features/budgets/hooks/useBudgets.test.ts`, `src/features/budgets/hooks/useBudgetMutations.test.ts`, `src/features/budgets/hooks/useBudgetSummary.test.ts` |
| **Component** | Рендеринг `BudgetProgressBar` с разными статусами, карточки `BudgetCard`, формы `BudgetForm`, сводки `BudgetSummaryHeader`, диалога `CopyBudgetsDialog`, секции `UnbudgetedCategoriesSection`, страницы `BudgetsPage` (все 5 состояний) | `src/features/budgets/components/BudgetProgressBar.test.tsx`, `src/features/budgets/components/BudgetCard.test.tsx`, `src/features/budgets/components/BudgetForm.test.tsx`, `src/features/budgets/components/BudgetSummaryHeader.test.tsx`, `src/app/pages/BudgetsPage.test.tsx` |
| **Integration (Emulator)** | Создание бюджета с детерминированным ID, обновление лимита, удаление, пакетное копирование `copyBudgetsFromMonth` с флагом `overwrite` и без него на Firestore Emulator | `src/features/budgets/repository.integration.test.ts` |
| **E2E (Playwright)** | Создание бюджета, добавление транзакции расхода и проверка обновления прогресс-бара, превышение лимита (>100%), переключение месяца, копирование бюджетов из прошлого месяца, удаление бюджета | `e2e/budgets.spec.ts` |

---

## 13. Задачи реализации (T1–T7)

Каждая задача выполняется строго в рамках одной сессии агента и завершается одним коммитом (Conventional Commits, английский язык).

### T1: Доменная логика, схемы, утилиты бюджетов и unit-тесты
- **Что делаем:**
  1. Расширить `src/features/budgets/schemas.ts` схемами `budgetUpdateInputSchema`, `budgetSchema`, типами `BudgetStatus`, `EnrichedBudget`, `BudgetSummaryTotals`.
  2. Создать модуль `src/features/budgets/utils.ts` с чистыми функциями (`calculateBudgetStatus`, `calculateBudgetProgress`, `calculateBudgetRemaining`, `calculateBudgetOverspent`, `enrichBudgets`, `calculateOverallBudgetSummary`, `getUnbudgetedCategories`, `buildBudgetId`).
  3. Написать подробные unit-тесты: `src/features/budgets/schemas.test.ts`, `src/features/budgets/utils.test.ts` (покрытие граничных случаев: 0 трат, 100%, перерасход 200%, отсутствие категорий, пустые массивы).
- **Файлы:**
  - `src/features/budgets/schemas.ts`
  - `src/features/budgets/utils.ts`
  - `src/features/budgets/schemas.test.ts`
  - `src/features/budgets/utils.test.ts`
- **Проверка:** `pnpm test`

### T2: Repository & Converters (+ Firestore Emulator Integration Tests)
- **Что делаем:**
  1. Создать `src/features/budgets/converters.ts` (`budgetConverter`, `budgetsCollectionRef`).
  2. Создать `src/features/budgets/repository.ts`:
     - `subscribeBudgetsByMonth(uid, month, onData, onError)` (запрос `where('month', '==', month)`).
     - `createBudget(uid, input)` (запись в `budgetDoc(uid, `${month}_${categoryId}`)` со штампами времени).
     - `updateBudget(uid, budgetId, input)` (обновление `limit` и `updatedAt`).
     - `deleteBudget(uid, budgetId)` (удаление документа).
     - `copyBudgetsFromMonth(uid, sourceMonth, targetMonth, options)` (чтение исходных бюджетов и пакетная запись через `writeBatch`).
  3. Написать интеграционные тесты в `src/features/budgets/repository.integration.test.ts` с запуском на Firestore Emulator.
- **Файлы:**
  - `src/features/budgets/converters.ts`
  - `src/features/budgets/repository.ts`
  - `src/features/budgets/repository.integration.test.ts`
- **Проверка:** `pnpm test`

### T3: Хуки фичи (`useBudgets`, `useBudgetMutations`, `useBudgetSummary`)
- **Что делаем:**
  1. Создать `src/features/budgets/hooks/useBudgets.ts` (подписка на бюджеты месяца через `useSubscription`).
  2. Создать `src/features/budgets/hooks/useBudgetMutations.ts` (`createBudget`, `updateBudget`, `deleteBudget`, `copyBudgets`, управление `isSubmitting`/`isCopying`, toast-нотификации через `sonner`).
  3. Создать `src/features/budgets/hooks/useBudgetSummary.ts` (объединение бюджетов, транзакций месяца и категорий, расчет `enrichedBudgets`, `summaryTotals`, `unbudgetedCategories`).
  4. Написать unit-тесты для хуков: `src/features/budgets/hooks/useBudgets.test.ts`, `src/features/budgets/hooks/useBudgetMutations.test.ts`, `src/features/budgets/hooks/useBudgetSummary.test.ts`.
  5. Обновить публичный экспорт `src/features/budgets/index.ts`.
- **Файлы:**
  - `src/features/budgets/hooks/useBudgets.ts`
  - `src/features/budgets/hooks/useBudgetMutations.ts`
  - `src/features/budgets/hooks/useBudgetSummary.ts`
  - `src/features/budgets/hooks/*.test.ts`
  - `src/features/budgets/index.ts`
- **Проверка:** `pnpm test`

### T4: UI-компоненты фичи (`BudgetProgressBar`, `BudgetCard`, `BudgetSummaryHeader`, `BudgetForm`, `CopyBudgetsDialog`, `UnbudgetedCategoriesSection`, `BudgetList`)
- **Что делаем:**
  1. Создать `src/features/budgets/components/BudgetProgressBar.tsx` (доступный прогресс-бар с цветовыми токенами темы).
  2. Создать `src/features/budgets/components/BudgetCard.tsx` (карточка бюджета с `CategoryBadge`, суммами, прогрессом, статусом и `DropdownMenu`).
  3. Создать `src/features/budgets/components/BudgetSummaryHeader.tsx` (сводная карточка с общим лимитом, тратами, остатком, суммарным прогресс-баром и бейджами).
  4. Создать `src/features/budgets/components/UnbudgetedCategoriesSection.tsx` (секция категорий расходов без бюджета с быстрыми кнопками).
  5. Создать `src/features/budgets/components/BudgetForm.tsx` (форма в `ResponsiveDialog` на базе React Hook Form + Zod с селектором категории и `AmountInput`).
  6. Создать `src/features/budgets/components/CopyBudgetsDialog.tsx` (модальное окно подтверждения копирования лимитов из прошлого месяца).
  7. Создать `src/features/budgets/components/BudgetList.tsx` (сетка карточек с сортировкой: превышенные -> по проценту -> по алфавиту).
  8. Написать компонентные тесты для всех созданных виджетов: `src/features/budgets/components/*.test.tsx`.
- **Файлы:**
  - `src/features/budgets/components/BudgetProgressBar.tsx`
  - `src/features/budgets/components/BudgetCard.tsx`
  - `src/features/budgets/components/BudgetSummaryHeader.tsx`
  - `src/features/budgets/components/UnbudgetedCategoriesSection.tsx`
  - `src/features/budgets/components/BudgetForm.tsx`
  - `src/features/budgets/components/CopyBudgetsDialog.tsx`
  - `src/features/budgets/components/BudgetList.tsx`
  - `src/features/budgets/components/*.test.tsx`
  - `src/features/budgets/index.ts`
- **Проверка:** `pnpm test`

### T5: Страница `BudgetsPage`, интеграция с URL и i18n-локализация
- **Что делаем:**
  1. Зарегистрировать неймспейс `budgets` в `src/i18n/config.ts` и `src/i18n/types.ts`.
  2. Создать файлы локализации `src/i18n/locales/en/budgets.json` и `src/i18n/locales/ru/budgets.json`.
  3. Реализовать страницу `src/app/pages/BudgetsPage.tsx` взамен `PlaceholderPage`, связав `PageHeader`, `MonthNavigator`, `BudgetSummaryHeader`, `BudgetList`, `UnbudgetedCategoriesSection`, `BudgetForm`, `CopyBudgetsDialog` и `QueryBoundary`.
  4. Написать компонентные тесты страницы `src/app/pages/BudgetsPage.test.tsx` (проверка всех 5 состояний, навигации по месяцам, открытия диалогов).
- **Файлы:**
  - `src/i18n/config.ts`
  - `src/i18n/types.ts`
  - `src/i18n/locales/en/budgets.json`
  - `src/i18n/locales/ru/budgets.json`
  - `src/app/pages/BudgetsPage.tsx`
  - `src/app/pages/BudgetsPage.test.tsx`
- **Проверка:** `pnpm typecheck && pnpm lint && pnpm test`

### T6: Сквозные Playwright E2E-тесты (`e2e/budgets.spec.ts`)
- **Что делаем:**
  1. Создать сценарии сквозного тестирования `e2e/budgets.spec.ts`:
     - Создание бюджета на категорию «Еда» с лимитом 10 000 ₽.
     - Добавление операции расхода на 5 000 ₽ и проверка обновления прогресс-бара (50%, зеленый).
     - Добавление операции на 6 000 ₽ (итого 11 000 ₽) и проверка перехода в статус «Превышен» (110%, красный цвет, бейдж перерасхода 1 000 ₽).
     - Переключение на следующий месяц и копирование бюджетов в один клик.
     - Редактирование лимита и удаление бюджета.
     - Мобильный вьюпорт (Drawer формы и нижняя навигация).
- **Файлы:**
  - `e2e/budgets.spec.ts`
- **Проверка:** `pnpm e2e`

### T7: Верификация (`verify`), аудит качества и обновление дорожной карты
- **Что делаем:**
  1. Провести полный цикл проверок: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
  2. Проверить соблюдение границ слоев, правил токенов и отсутствие жестких строк в JSX.
  3. Обновить статус фичи F08 в `docs/06-roadmap.md` (`todo` → `done`).
  4. Составить финальный отчет верификации.
- **Файлы:**
  - `docs/06-roadmap.md`
  - `docs/feature-specs/F08-budgets.md`
- **Проверка:** Полный прогон `verify`

---

## 14. Definition of Done

Фича считается завершенной, когда:
- [x] Все задачи T1–T7 выполнены, коммиты оформлены по Conventional Commits на английском языке.
- [x] Все критерии приемки (AC-1 — AC-9, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH) выполнены и проверены.
- [x] Интеграционные тесты на эмуляторе Firestore подтверждают корректность детерминированных ID `${month}_${categoryId}` и batch-копирования лимитов.
- [x] E2E-тесты Playwright в `e2e/budgets.spec.ts` успешно проходят.
- [x] Проверки `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` завершаются без ошибок и предупреждений.
- [x] Статус фичи в `docs/06-roadmap.md` обновлен на `done`.
- [x] Все открытые вопросы и решения зафиксированы в разделе 15.

---

## 15. Журнал решений и открытые вопросы

| Дата | Вопрос / Решение | Статус |
|---|---|---|
| 2026-10-09 | Детерминированный ID документа `${month}_${categoryId}` для гарантии уникальности одного лимита на категорию в рамках месяца без race condition | Утверждено |
| 2026-10-09 | Бюджетирование разрешено только для категорий с `type === 'expense'` | Утверждено |
| 2026-10-09 | 3 дискретных состояния прогресса: Normal (< 80%), Warning (80–100%), Exceeded (> 100%) с двойной индикацией цветом и текстом/иконкой | Утверждено |
| 2026-10-09 | Функция пакетного копирования бюджетов из предыдущего месяца `copyBudgetsFromMonth` через `writeBatch` | Утверждено |
| 2026-10-09 | Клиентский джойн фактических трат из `subscribeTransactionsByMonth` без денормализации данных в Firestore | Утверждено |
