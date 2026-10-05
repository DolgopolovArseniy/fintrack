# F05 — Transactions (Операции и баланс)

Статус: spec-ready
Зависит от: F01 (доменные типы, деньги, даты, balanceDeltas), F02 (аутентификация), F03 (Security Rules v1), F04 (категории, онбординг, CategoryBadge, ResponsiveDialog, ConfirmDialog)
Размер: L (7 задач: T1–T7)
Ветка: `feat/F05-transactions`

> **Контекст для агента:** Фича F05 является ключевым рабочим ядром финансового трекера («Core MVP»). Она реализует ежедневный пользовательский опыт: быстрый ввод операций, отображение трат по дням, навигацию по календарным месяцам, фильтрацию без серверных задержек и поддержание математической точности балансов счетов через атомарные пакетные обновления Firestore (`writeBatch`).
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7, §8.5, §8.6), `docs/02-data-model.md` (§2, §3.2, §3.4, §5, §6), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.1, §2.3, §3, §4, §5, §6), `docs/05-testing-strategy.md`.
> Справка по API библиотек (`firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner, date-fns) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Обеспечить пользователю удобный, отзывчивый и надежный инструмент для фиксации, просмотра, фильтрации и редактирования финансовых операций (расходов и доходов) с группировкой по дням и календарным месяцам, гарантируя при этом непрерывную точность балансов счетов без необходимости выполнения дорогостоящих полных сканирований базы данных.

**Пользовательские истории:**
1. *Как пользователь*, я хочу быстро добавить расход или доход за несколько секунд с любого устройства (компьютер или телефон), указав сумму, категорию, счёт, дату и примечание, чтобы регулярно фиксировать свои траты без трения.
2. *Как пользователь*, я хочу просматривать свои операции, сгруппированные по дням с отображением суточных итогов, чтобы видеть четкую хронологию и динамику расходов.
3. *Как пользователь*, я хочу переключаться между месяцами и видеть операции за выбранный период, при этом сохраняя текущий месяц в URL для удобства навигации и закладок.
4. *Как пользователь*, я хочу мгновенно фильтровать список операций по типу (доход/расход), категории, счёту и текстовому поиску по заметке, чтобы быстро находить нужные записи.
5. *Как пользователь*, я хочу иметь возможность отредактировать любую операцию (изменить сумму, дату, категорию или счёт) или удалить её с возможностью мгновенной отмены (Undo), чтобы оперативно исправлять ошибки ввода без риска случайной потери данных.
6. *Как пользователь*, я хочу быть уверен, что баланс моего счёта изменяется строго синхронно с каждой операцией, включая работу в офлайн-режиме.

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы
- `src/lib/money.ts`: функции работы с minor units (`parseMoneyInput`, `formatMoney`, `formatMoneyInput`, `signedAmount`, `fromMinorUnits`).
- `src/lib/dates.ts`: календарные утилиты без привязки к TZ (`isValidIsoDate`, `toIsoDate`, `todayIso`, `toYearMonth`, `currentYearMonth`, `addMonths`, `monthRange`, `compareIsoDates`, `formatIsoDate`, `formatYearMonth`).
- `src/lib/balance.ts`: эталонные функции расчёта балансов `balanceDeltas(before, after)` и агрегации дельт `mergeDeltas`.
- `src/lib/aggregations.ts`: функции суммирования `sumByType`, `totalsByCategory`, `totalsByMonth`.
- `src/lib/firestore/paths.ts`: типизированные фабрики путей (`transactionsCol`, `transactionDoc`, `accountsCol`, `accountDoc`, `categoriesCol`, `categoryDoc`).
- `src/lib/firestore/createConverter.ts`: `createConverter` и `parseSnapshotDocs`.
- `src/hooks/useSubscription.ts`: хук для подписок реального времени с защитой от React StrictMode.
- `src/features/transactions/schemas.ts`: схемы Zod `transactionInputSchema`, `transactionSchema`, типы `TransactionInput`, `Transaction`.
- `src/components/common/`: готовые компоненты `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`, `ResponsiveDialog`, `ConfirmDialog`, `CategoryBadge`.

### 2.2 Архитектурные ограничения и инварианты
- **Строгие границы ESLint:**
  - `components/common` **не импортирует** `features/**`. Новые общие компоненты (`MoneyText`, `AmountInput`, `MonthNavigator`) создаются в `src/components/common/` и принимают только примитивные пропсы или типы из `src/lib/`.
  - Модули `features/` импортируют друг друга **только через `index.ts`**.
  - `firebase/firestore` импортируется **только** в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
- **Деньги:** Всегда целые числа в minor units (копейки/центы, `12.50` хранится как `1250`). Никаких `float` и `toFixed` в расчетах (ADR-003).
- **Даты:** Дата транзакции — строго строка формата `YYYY-MM-DD` (`IsoDate`), без времени и часовых поясов (ADR-004). Месяц — строка `YYYY-MM` (`YearMonth`).
- **Синхронизация баланса:** Любое создание, обновление или удаление транзакции обязано производиться в **едином атомарном `writeBatch`** совместно с обновлением `balance` затронутых счетов через `increment(delta)` (ADR-005, `02-data-model.md` §5).
- **Отсутствие составных индексов:** Запрос к Firestore выполняется строго по диапазону месяца: `where('date', '>=', start)`, `where('date', '<=', end)`, `orderBy('date', 'desc')`. Все фильтры (по категории, счёту, типу, поиск) применяются **на клиенте** к выборке месяца (ADR-010).

---

## 3. Скоуп

### Входит
1. **Инфраструктура счетов для транзакций (минимальный ридер):**
   - Конвертер `src/features/accounts/converters.ts` (`accountConverter`, `accountsCollectionRef`).
   - Функция подписки `subscribeAccounts` в `src/features/accounts/repository.ts`.
   - Хук `useAccounts` в `src/features/accounts/hooks/useAccounts.ts` для выбора счёта в транзакциях.
   - Экспорт ридера через публичный API `src/features/accounts/index.ts`.
2. **Базовые UI-компоненты дизайн-системы в `src/components/common/`:**
   - `MoneyText`: отображение сумм с правильным знаком (`+`/`−`), семантическим цветом (`income`/`expense`/нейтральный), выравниванием `tabular-nums` и стрелочной иконкой.
   - `AmountInput`: специализированный доступный ввод денежных сумм (поддержка точки и запятой, `inputMode="decimal"`, валидация на лету, форматирование по blur).
   - `MonthNavigator`: контрол переключения месяцев (стрелки назад/вперед, локализованное название месяца, кнопка «Текущий месяц», интеграция с URL).
3. **Хранилище и операции транзакций (`features/transactions`):**
   - Конвертер `src/features/transactions/converters.ts` с безопасным пропуском поврежденных документов (`parseSnapshotDocs`).
   - Репозиторий `src/features/transactions/repository.ts`:
     - Подписка по календарному месяцу (`subscribeTransactionsByMonth`).
     - Атомарное создание транзакции с обновлением баланса счёта (`createTransaction`).
     - Атомарное обновление транзакции с пересчётом баланса через `balanceDeltas` (`updateTransaction`).
     - Атомарное удаление транзакции с откатом баланса (`deleteTransaction`).
     - Восстановление транзакции при отмене удаления (`restoreTransaction`).
4. **Хуки фичи:**
   - `useTransactions(month)`: подписка на транзакции месяца.
   - `useTransactionMutations()`: создание, обновление, удаление с toast-нотификацией и действием «Отменить» (Undo).
   - `useTransactionFilters()`: управление фильтрами (тип, категория, счёт, поисковая строка) с двусторонней синхронизацией в URL (`searchParams`).
   - `useGroupedTransactions()`: клиентская фильтрация и группировка списка операций по дням с расчётом суточных итогов.
5. **UI-компоненты фичи `src/features/transactions/components/`:**
   - `TransactionForm`: форма создания/редактирования в `ResponsiveDialog` (типы операций, сумма через `AmountInput`, выбор категории с `CategoryBadge`, выбор счёта, дата, заметка).
   - `TransactionItem`: строка операции (категория, бейдж, заметка, счёт, сумма через `MoneyText`, контекстное меню действий Edit/Delete).
   - `TransactionDayGroup`: заголовок дня (дата, день недели, итоговая сумма суток) и список операций дня.
   - `TransactionList`: список дней с отображением всех 5 состояний (`loading`, `empty`, `error`, `offline`, `success`).
   - `TransactionFilters`: панель фильтров (чипы выбора типа, селекты категории и счёта, поле поиска с debounce, кнопка сброса).
   - `TransactionSummaryBar`: компактная сводка месяца (доходы, расходы, дельта).
6. **Страница и маршрутизация:**
   - Полнофункциональная страница `src/app/pages/TransactionsPage.tsx` (взамен текущего `PlaceholderPage`).
   - Добавление плавающей кнопки быстрого добавления (FAB) для мобильных устройств.
7. **Локализация и тесты:**
   - Полные переводы на английский и русский языки в `src/i18n/locales/{en,ru}/transactions.json` и обновления в `common.json`, `nav.json`, `validation.json`.
   - Комплексные unit-тесты, интеграционные тесты репозитория на эмуляторе Firestore, компонентные тесты форм и списков, Playwright e2e-сценарии.

### Не входит (явно)
- Полнофункциональный CRUD счетов, перевод между счетами и ручной пересчёт баланса (F07).
- Бюджетные лимиты по категориям на месяц (F08).
- Аналитические диаграммы и графики расходов (F06).
- Экспорт и импорт файлов CSV (F09, F10).
- Серверная пагинация или составные индексы Firestore (запрещено архитектурой v1, ADR-010).

---

## 4. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Единица загрузки данных** | Календарный месяц (`YearMonth`, `YYYY-MM`), передаваемый через URL-параметр `?month=YYYY-MM` | Месяц заменяет постраничную пагинацию. Обеспечивает естественный финансовый цикл человека, простое кэширование и предсказуемый объем чтения (ADR-006). |
| 2 | **Место применения фильтров** | Клиентская фильтрация выборки текущего месяца (ADR-010) | Избавляет от необходимости создания составных индексов Firestore, гарантирует нулевую задержку UI при переключении фильтров и экономит квоты Spark (нет платных повторных запросов). |
| 3 | **Синхронизация баланса** | Атомарный `writeBatch`: запись транзакции + `update(account, { balance: increment(delta) })` | Единственная чистая функция `balanceDeltas(before, after)` исключает расхождение баланса при создании, редактировании суммы/счёта/типа или удалении. Работает в офлайне (ADR-003, ADR-005). |
| 4 | **Механика отмены удаления (Undo)** | Немедленное удаление из базы с показом toast (`sonner`) с кнопкой «Отменить» на 6 секунд. При нажатии вызывается `restoreTransaction` | Исключает зависшие таймеры в памяти клиента и потерю намерений при закрытии вкладки. В случае отмены транзакция атомарно перезаписывается с прежним `id`, а баланс восстанавливается обратной дельтой. |
| 5 | **Группировка в списке** | Двухуровневая группировка: по датам (`YYYY-MM-DD` по убыванию), а внутри суток — по времени создания (`createdAt` по убыванию) | Обеспечивает мгновенный визуальный контекст: сколько потрачено за конкретный день. Новые локальные транзакции (с `serverTimestamps: 'estimate'`) сразу отображаются вверху текущего дня. |
| 6 | **Формат отображения на экранах** | Список по дням на всех устройствах. Desktop расширяет строку дополнительными колонками (счёт, заметка, действия), mobile использует компактный вид карточки | Гарантирует единство дизайн-системы, читаемость на узких экранах (360px) и предотвращает раздувание горизонтальной вёрстки (UX Guidelines §5). |
| 7 | **Ввод денежных сумм** | Компонент `AmountInput` с парсингом через `parseMoneyInput` | Разрешает пользователю вводить как запятую, так и точку, корректно обрабатывает пробелы разрядов, исключает ошибки с плавающей точкой. |
| 8 | **Поведение архивных сущностей** | В форме создания транзакции архивные категории и счета скрыты. В форме редактирования старой транзакции её текущая архивная категория/счёт отображается с пометкой `(архив)` | Сохраняет историческую целостность данных без блокировки возможности скорректировать сумму или заметку в старых записях. |

---

## 5. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Добавление расхода (Happy Path)** | Пользователь авторизован, находится на `/app/transactions` | 1. Нажимает «Добавить операцию» (или FAB на мобильном).<br>2. Тип «Расход» выбран по умолчанию.<br>3. Вводит сумму `15.50`.<br>4. Выбирает категорию «Еда».<br>5. Счёт «Основной» выбран по умолчанию.<br>6. Вводит заметку «Обед».<br>7. Нажимает «Сохранить». | Модальное окно закрывается. Появляется toast «Операция добавлена». Транзакция мгновенно появляется в текущем дне. Баланс счёта «Основной» уменьшается на `1550`. |
| 2 | **Добавление дохода** | Пользователь на `/app/transactions` | 1. Открывает форму добавления.<br>2. Переключает тип на «Доход».<br>3. Список категорий мгновенно фильтруется, показывая только доходные.<br>4. Вводит `2500`, выбирает «Зарплата».<br>5. Сохраняет. | Транзакция появляется с зелёной суммой `+2 500,00`. Баланс счёта увеличивается на `250000`. |
| 3 | **Редактирование суммы и категории** | Существует операция на 500 ₽ | 1. В меню карточки нажимает «Редактировать».<br>2. Меняет сумму на 750 ₽ и категорию на «Транспорт».<br>3. Сохраняет. | Операция обновлена. Баланс счёта атомарно корректируется на разницу `-250` minor units. |
| 4 | **Редактирование со сменой счёта** | Существуют два счёта: «Наличные» и «Карта». Транзакция расхода 100 ₽ на «Наличных» | 1. Открывает редактирование.<br>2. Меняет счёт на «Карта».<br>3. Сохраняет. | `balanceDeltas` возвращает +10000 для «Наличных» и -10000 для «Карты». В одном batch баланс «Наличных» возрастает, «Карты» — списывается. |
| 5 | **Удаление с отменой (Undo)** | В списке есть операция | 1. Нажимает «Удалить» в меню операции.<br>2. Транзакция исчезает из списка, баланс счёта восстанавливается.<br>3. Появляется toast «Операция удалена» с кнопкой «Отменить».<br>4. В течение 6 секунд пользователь нажимает «Отменить». | Вызывается `restoreTransaction`. Транзакция возвращается на своё место с прежним `id`, баланс счёта снова списывается. |
| 6 | **Навигация по месяцам** | Пользователь на странице транзакций | 1. Нажимает стрелку «Назад» в `MonthNavigator`. | URL обновляется на `?month=YYYY-MM`. Загружается выборка предшествующего месяца. Если транзакций нет — отображается `EmptyState` с предложением добавить первую трату за этот месяц. |
| 7 | **Фильтрация и поиск** | В месяце 20+ транзакций | 1. Пользователь выбирает категорию «Еда».<br>2. В строке поиска вводит «кофе». | Список мгновенно фильтруется без перезагрузки страницы. Заголовок месяца и итоги отображают статистику только по отфильтрованным операциям. В URL добавляются параметры `categoryId` и `search`. |
| 8 | **Сброс активных фильтров** | Активны фильтры категории и поиска | Пользователь нажимает кнопку «Сбросить фильтры» | Все фильтры очищаются, URL сбрасывается к базовому `?month=YYYY-MM`, отображается полный список месяца. |
| 9 | **Офлайн-добавление** | Устройство потеряло связь с сетью (активен `OfflineBanner`) | Пользователь добавляет расход 300 ₽ | Форма закрывается, транзакция оптимистично появляется в списке с маркером локального сохранения. Баланс счёта локально пересчитывается. При восстановлении сети данные синхронизируются с сервером. |
| 10 | **Валидация некорректного ввода** | Открыта форма транзакции | Пользователь оставляет сумму пустой или вводит 0, либо дату в неверном формате | Под соответствующими полями появляются ошибки валидации. Кнопка сохранения блокируется или при попытке клика фокус переводится на первое ошибочное поле. |

---

## 6. UI и дизайн-система

### 6.1 Экраны и структура страницы (`TransactionsPage`)
- **Маршрут:** `/app/transactions` (с параметрами запроса `?month=YYYY-MM&type=...&categoryId=...&accountId=...&search=...`).
- **Макет страницы:**
  1. **Шапка (`PageHeader`):**
     - Заголовок: `t('transactions.title')` («Операции» / «Transactions»).
     - Подзаголовок: `t('transactions.description')`.
     - Блок действий: контрол `MonthNavigator` и кнопка `Button` «Добавить операцию» (со скрытием текста на мобильных и отображением иконки `Plus`).
  2. **Сводная панель месяца (`TransactionSummaryBar`):**
     - Компактная плашка с 3 метриками месяца: «Доходы» (зеленый плюс), «Расходы» (красный минус), «Итог за месяц» (дельта).
     - Все суммы отображаются через `MoneyText` с выравниванием `tabular-nums`.
  3. **Панель фильтров (`TransactionFilters`):**
     - Desktop: строка элементов управления (кнопки выбора типа `All / Expense / Income`, выпадающие списки `CategorySelect`, `AccountSelect`, поле поиска `Input` с иконкой лупы и кнопка сброса при наличии активных фильтров).
     - Mobile: кнопка вызова фильтров в `Sheet` (выезжающая шторка) с бейджем количества активных фильтров и быстрый поиск.
  4. **Основная область контента (через `QueryBoundary`):**
     - *Loading:* `LoadingSkeleton` в виде списка сгруппированных строк.
     - *Error:* `ErrorState` с кнопкой «Повторить».
     - *Empty (в месяце нет операций):* `EmptyState` с иконкой чека/кошелька и кнопкой «Добавить первую операцию».
     - *Empty (результат фильтрации пуст):* `EmptyState` с текстом «Ничего не найдено по выбранным фильтрам» и кнопкой «Сбросить фильтры».
     - *Success:* список групп транзакций `TransactionList`.
  5. **Мобильная плавающая кнопка (FAB):**
     - Круглая кнопка с иконкой `Plus`, зафиксированная в правом нижнем углу над нижней панелью навигации (`bottom-20 right-4 lg:hidden z-30`).

### 6.2 Новые общие компоненты (`src/components/common/`)

#### 1. `MoneyText.tsx`
- **Назначение:** Единый компонент форматирования денежных сумм проекта.
- **Пропсы:**
  - `amount: number` (целое число в minor units).
  - `type?: 'expense' | 'income' | 'neutral'` (по умолчанию определяется по знаку или явно).
  - `currency?: CurrencyCode` (по умолчанию берётся из профиля пользователя).
  - `locale?: Locale` (по умолчанию системная локаль).
  - `showSign?: boolean` (принудительный вывод знака `+` или `−`).
  - `showIcon?: boolean` (отображение стрелки `ArrowUpRight` / `ArrowDownLeft`).
  - `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'kpi'`.
- **Стили:** Цветовые семантические токены `text-income` (`oklch(0.52 0.17 155)`), `text-expense` (`oklch(0.55 0.2 25)`), `text-foreground`, обязательный класс `tabular-nums`.

#### 2. `AmountInput.tsx`
- **Назначение:** Доступное специализированное поле ввода денежных сумм для форм.
- **Поведение:**
  - Поддерживает ввод как с точкой, так и с запятой на мобильных клавиатурах (`inputMode="decimal"`).
  - При вводе отсекает недопустимые символы и более 2 знаков после разделителя.
  - По потере фокуса (blur) форматирует отображаемое значение согласно локали (`formatMoneyInput`).
  - Интегрируется с React Hook Form через интерфейс `value` (в minor units) и `onChange(minorUnits: number)`.
  - Отображает символ валюты сбоку.

#### 3. `MonthNavigator.tsx`
- **Назначение:** Контрол переключения календарного месяца с доступной клавиатурной навигацией.
- **Компоненты:**
  - Кнопка «Предыдущий месяц» (`ChevronLeft`) с доступным `aria-label`.
  - Заголовок текущего выбранного месяца (`formatYearMonth`, например «Сентябрь 2026»).
  - Кнопка «Следующий месяц» (`ChevronRight`).
  - Кнопка быстрого возврата «Текущий месяц» (активна, если выбран не текущий месяц).
- **Синхронизация:** обновляет URL параметр `?month=YYYY-MM`.

### 6.3 Форма транзакции (`TransactionForm`)
- Располагается внутри `ResponsiveDialog` (`Dialog` на desktop ≥ 768px, `Drawer` на mobile < 768px).
- **Поля по порядку:**
  1. **Тип:** Вкладки `Tabs` (Расход / Доход). При переключении сбрасывается или фильтруется выбранная категория.
  2. **Сумма:** `AmountInput` с автофокусом при открытии.
  3. **Категория:** Выпадающий список или всплывающее меню с поиском. Отображает активные категории выбранного типа с `CategoryBadge`. Если форма открыта на редактирование старой транзакции с архивной категорией, эта архивная категория отображается в списке с пометкой архива.
  4. **Счёт:** Выпадающий список доступных активных счетов (по умолчанию счёт с `systemKey === 'main'` или последний использованный).
  5. **Дата:** Поле выбора даты (по умолчанию сегодня `todayIso()`, не более допустимого диапазона).
  6. **Заметка:** Поле `Input` (до 200 символов, счетчик символов).
- Кнопка отправки «Сохранить» с отображением состояния загрузки (`Loader2`).

### 6.4 Переиспользование компонентов (DRY-матрица)

| UI-элемент | Источник | Статус в F05 |
|---|---|---|
| Заголовок страницы | `components/common/PageHeader` | Готовый из F00 |
| Пустое состояние | `components/common/EmptyState` | Готовый из F00 |
| Состояние ошибки | `components/common/ErrorState` | Готовый из F00 |
| Скелетон загрузки | `components/common/LoadingSkeleton` | Готовый из F00 |
| Граница запросов | `components/common/QueryBoundary` | Готовый из F00 |
| Бейдж категории | `components/common/CategoryBadge` | Готовый из F04 |
| Адаптивный диалог | `components/common/ResponsiveDialog` | Готовый из F04 |
| Диалог подтверждения | `components/common/ConfirmDialog` | Готовый из F04 |
| Форматирование денег | `components/common/MoneyText` | **Создаётся в F05 (T1)** |
| Поле ввода суммы | `components/common/AmountInput` | **Создаётся в F05 (T1)** |
| Навигатор месяца | `components/common/MonthNavigator` | **Создаётся в F05 (T1)** |
| Меню действий карточки | `components/ui/dropdown-menu` | Готовый shadcn |
| Всплывающая шторка | `components/ui/sheet` | Готовый shadcn |

---

## 7. Модель данных и запросы Firestore

### 7.1 Пути документов
- Коллекция транзакций: `users/{uid}/transactions/{txId}`
- Счёт транзакции: `users/{uid}/accounts/{accountId}`
- Категория транзакции: `users/{uid}/categories/{categoryId}`

### 7.2 Структура документа (`users/{uid}/transactions/{txId}`)
```ts
{
  type: 'expense' | 'income',     // тип операции
  amount: number,                 // целое число в minor units (1 .. 100_000_000_000)
  accountId: string,              // id счета (1..64 симв.)
  categoryId: string,             // id категории (1..64 симв.)
  date: string,                   // ISO-дата 'YYYY-MM-DD'
  note?: string,                  // необязательная заметка (1..200 симв., trim)
  tags?: string[],                // необязательный список тегов (до 10 элементов)
  createdAt: Timestamp,           // серверное время создания
  updatedAt: Timestamp            // серверное время обновления
}
```

### 7.3 Запросы и индексы
- **Запрос выборки месяца:**
  ```ts
  query(
    transactionsCol(uid),
    where('date', '>=', `${month}-01`),
    where('date', '<=', `${month}-31`),
    orderBy('date', 'desc')
  )
  ```
- **Индексы:** Запрос использует диапазон по полю `date` и сортировку по тому же полю `date`. Для этого в Firestore достаточно стандартного **автоматического индекса по одному полю** (`Single-field index`).
- В `firestore.indexes.json` новые составные индексы **не добавляются** (полное соответствие ADR-010).
- Сортировка внутри дня по времени создания (`createdAt desc`) выполняется **на клиенте**.

---

## 8. Контракты и API

### 8.1 Репозиторий транзакций (`src/features/transactions/repository.ts`)
```ts
import type { Transaction, TransactionInput } from './schemas';
import type { AppError } from '@/lib/errors';
import type { YearMonth } from '@/lib/dates';

export type Unsubscribe = () => void;

export interface TransactionUpdateInput {
  type?: Transaction['type'];
  amount?: number;
  accountId?: string;
  categoryId?: string;
  date?: string;
  note?: string;
  tags?: string[];
}

/**
 * Подписывается на операции пользователя за указанный месяц в реальном времени.
 */
export function subscribeTransactionsByMonth(
  uid: string,
  month: YearMonth,
  onData: (transactions: Transaction[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;

/**
 * Создаёт транзакцию и атомарно обновляет баланс счёта в одном writeBatch.
 * Возвращает сгенерированный ID транзакции.
 */
export function createTransaction(
  uid: string,
  input: TransactionInput,
): Promise<string>;

/**
 * Обновляет поля транзакции и атомарно корректирует баланс затронутых счетов через balanceDeltas.
 */
export function updateTransaction(
  uid: string,
  txId: string,
  currentTx: Transaction,
  input: TransactionUpdateInput,
): Promise<void>;

/**
 * Удаляет транзакцию и атомарно списывает её сумму с баланса счёта.
 */
export function deleteTransaction(
  uid: string,
  tx: Transaction,
): Promise<void>;

/**
 * Восстанавливает ранее удалённую транзакцию (действие Undo) с прежним ID и балансом.
 */
export function restoreTransaction(
  uid: string,
  tx: Transaction,
): Promise<void>;
```

### 8.2 Ридер счетов (`src/features/accounts/repository.ts` и `converters.ts`)
```ts
// src/features/accounts/converters.ts
export const accountConverter: FirestoreDataConverter<Account>;
export function accountsCollectionRef(uid: string): CollectionReference<Account>;

// src/features/accounts/repository.ts
export function subscribeAccounts(
  uid: string,
  onData: (accounts: Account[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;

// src/features/accounts/hooks/useAccounts.ts
export function useAccounts(): SubscriptionResult<Account[]>;
```

### 8.3 Хуки транзакций

```ts
// src/features/transactions/hooks/useTransactions.ts
export function useTransactions(month: YearMonth): SubscriptionResult<Transaction[]>;

// src/features/transactions/hooks/useTransactionMutations.ts
export function useTransactionMutations(): {
  create: (input: TransactionInput) => Promise<string>;
  update: (txId: string, currentTx: Transaction, input: TransactionUpdateInput) => Promise<void>;
  remove: (tx: Transaction) => Promise<void>;
  isSubmitting: boolean;
};

// src/features/transactions/hooks/useTransactionFilters.ts
export interface TransactionFilterState {
  month: YearMonth;
  type: 'all' | 'expense' | 'income';
  categoryId: string; // 'all' или id
  accountId: string;  // 'all' или id
  search: string;
}

export function useTransactionFilters(): {
  filters: TransactionFilterState;
  setMonth: (month: YearMonth) => void;
  setType: (type: 'all' | 'expense' | 'income') => void;
  setCategory: (categoryId: string) => void;
  setAccount: (accountId: string) => void;
  setSearch: (search: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
};

// src/features/transactions/hooks/useGroupedTransactions.ts
export interface DayGroup {
  date: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  transactions: Transaction[];
}

export function useGroupedTransactions(
  transactions: Transaction[],
  filters: TransactionFilterState,
): {
  groups: DayGroup[];
  totalIncome: number;
  totalExpense: number;
  net: number;
  filteredCount: number;
};
```

### 8.4 Публичный API фичи (`src/features/transactions/index.ts`)
```ts
export * from './schemas';
export {
  subscribeTransactionsByMonth,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
} from './repository';
export { useTransactions } from './hooks/useTransactions';
export { useTransactionMutations } from './hooks/useTransactionMutations';
export { useTransactionFilters } from './hooks/useTransactionFilters';
export { useGroupedTransactions } from './hooks/useGroupedTransactions';
export { TransactionForm } from './components/TransactionForm';
export { TransactionList } from './components/TransactionList';
export { TransactionFilters } from './components/TransactionFilters';
export { TransactionSummaryBar } from './components/TransactionSummaryBar';
```

---

## 9. Валидация и ошибки

| Поле / Ситуация | Правило | Поведение UI / Сообщение | Ключ i18n |
|---|---|---|---|
| `amount` | Обязательное целое число > 0 и ≤ `100_000_000_000` minor units | Подсветка поля, сообщение об ошибке | `validation.required` / `validation.amountPositive` / `validation.amountTooLarge` |
| `type` | Обязательно `expense` или `income` | Радиокнопки/вкладки | `validation.required` |
| `categoryId` | Обязательный выбор из существующих категорий | Сообщение под селектом | `validation.required` |
| `accountId` | Обязательный выбор из существующих счетов | Сообщение под селектом | `validation.required` |
| `date` | Формат `YYYY-MM-DD`, реальная дата календаря | Сообщение под селектором даты | `validation.dateInvalid` |
| `note` | Опционально, длина до 200 символов | Счетчик символов, блокировка ввода свыше лимита | `validation.tooLong` |
| Ошибка сети при записи | Ошибка Firestore (`unavailable` / `permission-denied`) | Всплывающий toast с локализованной ошибкой | `errors.network` / `transactions.errors.saveFailed` |
| Повреждённый документ в базе | Не прошел парсинг Zod `transactionSchema` | Документ пропускается, логируется `logger.warn`, список не падает | — |

---

## 10. Локализация (i18n)

Создается отдельный файл пространства имен `src/i18n/locales/{en,ru}/transactions.json` и дополняются общие словари (`nav.json`, `common.json`, `validation.json`).

### Структура `transactions.json`:
```json
{
  "title": "Transactions",
  "description": "Manage your daily expenses and income",
  "actions": {
    "add": "Add transaction",
    "edit": "Edit",
    "delete": "Delete",
    "undo": "Undo",
    "resetFilters": "Reset filters"
  },
  "summary": {
    "income": "Income",
    "expense": "Expenses",
    "net": "Net"
  },
  "filters": {
    "allTypes": "All types",
    "expensesOnly": "Expenses",
    "incomesOnly": "Income",
    "allCategories": "All categories",
    "allAccounts": "All accounts",
    "searchPlaceholder": "Search by note...",
    "activeFiltersCount": "{{count}} active filter",
    "activeFiltersCount_plural": "{{count}} active filters"
  },
  "form": {
    "createTitle": "New transaction",
    "editTitle": "Edit transaction",
    "typeLabel": "Type",
    "amountLabel": "Amount",
    "categoryLabel": "Category",
    "accountLabel": "Account",
    "dateLabel": "Date",
    "noteLabel": "Note (optional)",
    "notePlaceholder": "e.g. Supermarket, Coffee with friends...",
    "selectCategory": "Select category",
    "selectAccount": "Select account",
    "archivedSuffix": "(archived)"
  },
  "empty": {
    "monthTitle": "No transactions for this month",
    "monthDescription": "Start tracking by adding your first expense or income.",
    "filteredTitle": "No matching transactions",
    "filteredDescription": "Try changing your search terms or clearing active filters."
  },
  "notifications": {
    "created": "Transaction added",
    "updated": "Transaction updated",
    "deleted": "Transaction deleted",
    "restored": "Transaction restored",
    "deleteFailed": "Failed to delete transaction",
    "saveFailed": "Failed to save transaction"
  }
}
```

---

## 11. Эдж-кейсы и особые ситуации (глобальные для проекта)

1. **Целостность балансов счетов при конкурентных операциях:**
   - Для изменения баланса используется `FieldValue.increment(delta)`, а не перезапись абсолютного значения.
   - Благодаря `increment` два независимых изменения баланса на клиенте или разных вкладках не перезатирают друг друга и корректно применяются в Firestore.
2. **Смена счёта при редактировании транзакции:**
   - Если пользователь переносит расход 1000 ₽ со счёта «А» на счёт «Б», функция `balanceDeltas` формирует сразу две дельты: `Map { 'acc-A' => +1000, 'acc-B' => -1000 }`.
   - Внутри единого `writeBatch` обновляется транзакция и оба счета. Ошибка обновления одного из счетов откатывает всю операцию целиком.
3. **Работа с архивными категориями и счетами:**
   - В исторических транзакциях архивная категория/счёт продолжают полноценно отображаться в списке (через `CategoryBadge` с приглушением и пометкой `archived`).
   - При редактировании существующей транзакции её текущая архивная категория сохраняется в значении поля. При попытке сменить категорию пользователю предлагаются только активные.
4. **Отмена удаления (Undo) при потере сети:**
   - При удалении транзакции документ стирается, баланс откатывается, а снимок транзакции сохраняется в памяти хука мутаций.
   - Если пользователь нажимает «Отменить» в офлайн-режиме, Firestore SDK фиксирует операцию `restoreTransaction` в локальном журнале изменений, транзакция мгновенно появляется в интерфейсе, а при появлении соединения синхронизируется с сервером.
5. **Календарные границы и часовые пояса:**
   - Дата транзакции не использует объект `Date` со смещением времени, а оперирует чистой строкой `YYYY-MM-DD`.
   - Границы месяца для запроса строятся как `YYYY-MM-01` и `YYYY-MM-31`. Вне зависимости от часового пояса клиента (UTC-12 или UTC+14) транзакция за 31 число всегда попадает строго в свой календарный месяц.
6. **Отказоустойчивость к поврежденным документам:**
   - В случае наличия в базе документа без обязательного поля (например, ручное удаление поля в консоли), `parseSnapshotDocs` безопасно логирует предупреждение через `logger.warn` и пропускает поврежденную запись, не ломая отрисовку остальных транзакций месяца.

---

## 12. Acceptance criteria

- [ ] **AC1 (Атомарное создание расхода и доход):** Given авторизованный пользователь, When он отправляет форму с расходом 1 250,00 ₽ по счёту «Основной», Then в Firestore создается документ `users/{uid}/transactions/{id}` с `amount: 125000` и `type: 'expense'`, а у счёта `users/{uid}/accounts/main` баланс атомарно уменьшается на `125000`. Для дохода баланс увеличивается.
- [ ] **AC2 (Смена счёта и суммы при редактировании):** Given существующий расход 500 ₽ на счёте А, When пользователь редактирует его, выставляя сумму 800 ₽ и счёт Б, Then в одном batch обновляется транзакция, счёт А увеличивается на 500 ₽, а счёт Б уменьшается на 800 ₽.
- [ ] **AC3 (Удаление с восстановлением Undo):** Given существующая операция, When пользователь нажимает «Удалить», Then операция исчезает из списка, баланс счёта откатывается, и появляется toast с кнопкой «Отменить». При клике «Отменить» транзакция восстанавливается в базе с прежним `id`, а баланс счёта корректируется обратно.
- [ ] **AC4 (Группировка по дням и суточные итоги):** Given список операций месяца, When пользователь открывает страницу транзакций, Then операции сгруппированы по датам по убыванию. В шапке каждого дня отображается локализованная дата и чистый суточный итог. Внутри дня операции отсортированы по времени создания (`createdAt desc`).
- [ ] **AC5 (Навигация по месяцам и URL):** Given открыта страница транзакций, When пользователь переключает месяц в `MonthNavigator`, Then URL меняется на `?month=YYYY-MM`, подписка переключается на новый диапазон дат, а при перезагрузке страницы выбранный месяц сохраняется.
- [ ] **AC6 (Фильтры и текстовый поиск):** Given загруженный месяц с разнообразными операциями, When пользователь задает фильтр по категории, типу или поисковую фразу, Then список транзакций мгновенно отфильтровывается на клиенте без отправки сетевых запросов в Firestore, а активные фильтры отражаются в URL.
- [ ] **AC7 (Отображение пустых состояний):** Given выбран месяц без транзакций, When страница загрузилась, Then отображается `EmptyState` месяца с призывом добавить первую запись. Если месяц содержит транзакции, но фильтры вернули 0 результатов — отображается `EmptyState` с кнопкой «Сбросить фильтры».
- [ ] **AC8 (Архивные сущности):** Given транзакция, привязанная к архивированной категории, When пользователь просматривает список, Then категория отображается с бейджем и приглушенным стилем. При редактировании форма сохраняет эту категорию, но при выборе новой категории архивные не предлагаются.
- [ ] **AC-STATES:** Реализованы все 5 обязательных состояний: Loading (скелетон списка), Empty (два варианта), Error (сообщение с повтором), Offline (индикатор и локальный кеш), Success (мгновенное оптимистичное появление и toast).
- [ ] **AC-A11Y:** Полноценная поддержка клавиатуры: закрытие модалок по `Esc`, фокус на первом поле, доступные `aria-label` для кнопок навигатора месяца и контекстных меню, контрастность цветов сумм `text-income` и `text-expense` ≥ 4.5:1.
- [ ] **AC-I18N:** Все строки локализованы через namespace `transactions` и `common`, поддержка английского и русского языков без жестко закодированных текстов.
- [ ] **AC-ARCH:** Соблюдены правила слоев: `components/common` не зависит от `features`, фичи импортируются строго через `index.ts`, нет составных индексов Firestore.

---

## 13. План тестов

| Уровень | Файлы тестов | Что проверяется |
|---|---|---|
| **Unit** | `src/components/common/MoneyText.test.tsx` | Форматирование положительных, отрицательных и нулевых сумм, вывод знака `+`/`−`, цвета токенов, `tabular-nums`. |
| **Unit** | `src/components/common/AmountInput.test.tsx` | Ввод с точкой и запятой, ограничение 2 знаков после запятой, отсечение букв, вызов `onChange` с minor units, форматирование при blur. |
| **Unit** | `src/components/common/MonthNavigator.test.tsx` | Переход назад/вперед по месяцам, форматирование названия месяца, доступность кнопок, кнопка возврата к текущему месяцу. |
| **Unit** | `src/features/transactions/converters.test.ts` | Конвертер Firestore: преобразование Timestamp в Date, отсечение `id` при записи, пропуск поврежденных документов через `parseSnapshotDocs`. |
| **Unit** | `src/features/transactions/hooks/useGroupedTransactions.test.ts` | Группировка массива транзакций по дням, сортировка дат по убыванию, расчет итогов дня, фильтрация по категории, типу и заметке. |
| **Integration** | `src/features/transactions/repository.integration.test.ts` | Работа с эмулятором Firestore: создание транзакции и инкремент баланса в одном batch, изменение суммы/типа, смена счёта с двойной дельтой, удаление и восстановление через `restoreTransaction`. |
| **Integration** | `src/features/accounts/repository.integration.test.ts` | Чтение и подписка на счета пользователя (`subscribeAccounts`). |
| **Component** | `src/features/transactions/components/TransactionForm.test.tsx` | Валидация полей, переключение типа, выбор активных категорий, скрытие архивных, отправка формы. |
| **Component** | `src/features/transactions/components/TransactionFilters.test.tsx` | Изменение фильтров, текстовый поиск, кнопка сброса, отображение счетчика активных фильтров. |
| **Component** | `src/app/pages/TransactionsPage.test.tsx` | Интеграция страницы: состояния loading, empty месяца, empty фильтров, вызов модалки добавления, мобильный FAB. |
| **E2E** | `e2e/transactions.spec.ts` | Сквозные сценарии Playwright: создание расхода и дохода → проверка баланса счёта → переключение месяцев → фильтрация по заметке → удаление с нажатием Undo → мобильный viewport с Drawer. |

---

## 14. Задачи (T1–T7)

Каждая задача представляет собой строго одну рабочую сессию и завершается одним атомарным коммитом по стандарту Conventional Commits на английском языке.

| # | Задача | Детали и затрагиваемые файлы | Проверка после задачи |
|---|---|---|---|
| **T1** | **Базовые UI-компоненты (`MoneyText`, `AmountInput`, `MonthNavigator`) и ридер счетов** | 1. Создать `src/components/common/MoneyText.tsx` и тесты `MoneyText.test.tsx`.<br>2. Создать `src/components/common/AmountInput.tsx` и тесты `AmountInput.test.tsx`.<br>3. Создать `src/components/common/MonthNavigator.tsx` и тесты `MonthNavigator.test.tsx`.<br>4. Реализовать `src/features/accounts/converters.ts`, `repository.ts` (`subscribeAccounts`), хук `useAccounts.ts` и экспорт в `src/features/accounts/index.ts`.<br>5. Интеграционный тест счетов на эмуляторе. | `pnpm test`, `pnpm typecheck` |
| **T2** | **Конвертеры и репозиторий транзакций с атомарным балансом** | 1. Создать `src/features/transactions/converters.ts` (`transactionConverter`, `transactionsCollectionRef`).<br>2. Реализовать `src/features/transactions/repository.ts` (`subscribeTransactionsByMonth`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `restoreTransaction`).<br>3. Использовать `balanceDeltas` из `@/lib/balance` и `writeBatch` Firestore.<br>4. Написать unit-тесты конвертеров `converters.test.ts` и интеграционные тесты `repository.integration.test.ts` на эмуляторе Firestore. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T3** | **Хуки фичи транзакций и логика фильтрации** | 1. Создать хук `useTransactions.ts` (подписка по месяцу на базе `useSubscription`).<br>2. Создать хук `useTransactionMutations.ts` (вызовы репозитория с toast-уведомлениями Sonner и кнопкой отмены «Undo»).<br>3. Создать хук `useTransactionFilters.ts` (управление состоянием в `searchParams` URL).<br>4. Создать хук `useGroupedTransactions.ts` (клиентская фильтрация, группировка по датам, расчёт суточных и месячных итогов).<br>5. Покрыть хук группировки тестами `useGroupedTransactions.test.ts`. | `pnpm test`, `pnpm typecheck` |
| **T4** | **Компоненты формы и элементов списка транзакций** | 1. Создать `src/features/transactions/components/TransactionForm.tsx` (RHF + Zod, `AmountInput`, выбор категории и счёта, дата, заметка, внутри `ResponsiveDialog`).<br>2. Создать `TransactionItem.tsx` (строка операции, `CategoryBadge`, `MoneyText`, dropdown меню действий).<br>3. Создать `TransactionDayGroup.tsx` (заголовок дня с локализованной датой и суммой, список элементов).<br>4. Написать компонентные тесты `TransactionForm.test.tsx` и `TransactionItem.test.tsx`. | `pnpm test`, `pnpm typecheck` |
| **T5** | **Компоненты фильтров, сводки, страница `TransactionsPage` и i18n** | 1. Создать `TransactionFilters.tsx` (кнопки типов, селекты категорий и счетов, строка поиска, мобильный `Sheet`).<br>2. Создать `TransactionSummaryBar.tsx` (сводка месяца: доходы, расходы, дельта).<br>3. Создать `TransactionList.tsx` с обработкой состояний через `QueryBoundary`.<br>4. Реализовать полноценную страницу `src/app/pages/TransactionsPage.tsx` с плавающей мобильной кнопкой добавления (FAB).<br>5. Создать полные файлы локализации `transactions.json` (EN и RU), обновить `config.ts`, `common.json`, `nav.json`, `validation.json`. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T6** | **Компонентные тесты страницы и Playwright E2E тесты** | 1. Написать компонентные тесты `TransactionsPage.test.tsx` (loading, empty, success, фильтры).<br>2. Написать сквозной E2E-тест `e2e/transactions.spec.ts` (добавление расхода и дохода, изменение баланса, удаление с отменой Undo, навигация по месяцам, мобильный viewport).<br>3. Проверить доступность (a11y) ключевых элементов страницы. | `pnpm test`, `pnpm e2e` |
| **T7** | **Верификация, проверка по чеклисту и финализация** | 1. Запустить полный цикл проверок: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rules`, `pnpm build`.<br>2. Проверить отсутствие нарушений архитектурных границ слоёв.<br>3. Обновить статус фичи F05 в `docs/06-roadmap.md` (`todo` → `done`).<br>4. Зафиксировать результаты в журнале решений. Прогон скилла `verify`. | Скилл `verify`, CI зелёный |

---

## 15. Definition of Done

- [ ] Все критерии приёмки (Acceptance Criteria AC1–AC8, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH) выполнены в полном объёме.
- [ ] Все тесты из плана (Unit, Integration на эмуляторе, Component, E2E Playwright) написаны и успешно проходят.
- [ ] Пройдены все проверки качества: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rules`, `pnpm build`.
- [ ] Никаких нарушений правил `AGENTS.md` (разделы 7, 8, 11, 13).
- [ ] Нет составных индексов Firestore, запрос укладывается в правила `firestore.indexes.json`.
- [ ] Балансы счетов гарантированно обновляются атомарно через `writeBatch` и `balanceDeltas`.
- [ ] Документация и статус фичи в `docs/06-roadmap.md` обновлены.

---

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос / Решение | Обоснование / Статус |
|---|---|---|
| 2026-10-05 | Выбор архитектуры отмены удаления (Undo) | Принято решение выполнять немедленное удаление в Firestore с показом Sonner toast с кнопкой «Отменить» (Undo) и вызовом `restoreTransaction`. Это гарантирует надежность при перезагрузке вкладки и избавляет от ненадежных таймеров задержки удаления на клиенте. |
| 2026-10-05 | Минимальный ридер счетов в F05 | Принято решение реализовать `subscribeAccounts` и `useAccounts` в рамках фичи счетов `features/accounts` уже в задаче T1 фичи F05, чтобы форма транзакций не использовала хардкод, а брала реальные счета пользователя. Полноценный UI управления счетами остается за F07. |
| 2026-10-05 | Расположение общих компонентов форматирования сумм и навигации | Принято решение поместить `MoneyText`, `AmountInput` и `MonthNavigator` в `src/components/common/`, так как они понадобятся не только в транзакциях, но и в дашборде (F06), счетах (F07) и бюджетах (F08). |
