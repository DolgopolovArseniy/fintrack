# F07 — Accounts (Счета и балансы)

Статус: spec-ready
Зависит от: F01 (доменные типы, деньги, лимиты, balanceDeltas), F02 (аутентификация), F03 (Security Rules v1), F04 (онбординг, CategoryBadge, ResponsiveDialog, ConfirmDialog), F05 (Transactions, AmountInput, MoneyText, useSubscription)
Размер: M (7 задач: T1–T7)
Ветка: `feat/F07-accounts`

> **Контекст для агента:** Фича F07 завершает фундаментальный блок управления финансовыми сущностями FinTrack. Она превращает трекер из односчётной системы в полноценную мультикабинетную среду: пользователь может создавать и настраивать счета различных типов (`cash`, `card`, `bank`), задавать начальные балансы, следить за распределением средств по типам активов, безопасно архивировать неактуальные счета и в любой момент запускать математическую реконсиляцию (пересчёт баланса `recalculateAccountBalance` на основе истории транзакций).
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7, §8.4, §8.5), `docs/02-data-model.md` (§2, §3.2, §5, §6, §11), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.1, §2.3, §3, §4, §5, §6), `docs/05-testing-strategy.md`.
> Справка по API библиотек (`firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Предоставить пользователю прозрачный, точный и удобный инструмент для управления своими финансовыми счетами (кошельками, банковскими картами, депозитами и счетами), отображения суммарного капитала (Net Worth), отслеживания баланса каждого счёта в реальном времени, безопасной архивации с сохранением целостности истории операций и выполнения гарантированной сверки (пересчёта) баланса счёта по всей цепочке его транзакций.

**Пользовательские истории:**
1. *Как пользователь*, я хочу создавать несколько счетов разных типов (наличные, дебетовая/кредитная карта, банковский счёт) с произвольным начальным балансом, чтобы раздельно учитывать сбережения и операционные деньги.
2. *Как пользователь*, я хочу видеть сводную панель общего баланса (Total Net Worth) и распределение сумм по типам счетов, чтобы мгновенно понимать своё общее финансовое положение.
3. *Как пользователь*, я хочу редактировать название, тип и начальный баланс счёта, при этом изменение начального баланса должно корректно и предсказуемо корректировать текущий баланс счёта без нарушения истории транзакций.
4. *Как пользователь*, я хочу иметь функцию «Пересчитать баланс» для любого счёта, которая автоматически просуммирует начальный остаток со всеми проведёнными операциями и восстановит точный баланс при любых подозрениях на рассинхрон.
5. *Как пользователь*, я хочу архивировать неиспользуемые или закрытые счета вместо их физического удаления, чтобы в транзакциях сохранялась историческая привязка, а интерфейс ввода операций не захламлялся старыми счетами.
6. *Как пользователь*, я хочу просматривать архивные счета по специальному переключателю и иметь возможность восстановить любой архивный счёт обратно в активное состояние в один клик.
7. *Как пользователь*, я хочу быть защищён от случайной архивации последнего активного счёта, чтобы в системе всегда оставался хотя бы один доступный счёт для проведения операций.

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы
- `src/lib/money.ts`: функции работы с minor units (`parseMoneyInput`, `formatMoney`, `formatMoneyInput`, `signedAmount`, `fromMinorUnits`).
- `src/lib/limits.ts`: константы доменных ограничений (`MAX_BALANCE = 1_000_000_000_000`, `NAME_MAX_LENGTH = 40`, `SYSTEM_KEY_MAX_LENGTH = 30`).
- `src/lib/firestore/paths.ts`: типизированные фабрики путей (`accountsCol`, `accountDoc`, `transactionsCol`, `transactionDoc`, `userDoc`).
- `src/lib/firestore/createConverter.ts`: `createConverter` и `parseSnapshotDocs`.
- `src/hooks/useSubscription.ts`: хук реального времени с защитой от двойного монтирования React StrictMode.
- `src/lib/errors.ts`: `AppError`, `toAppError`.
- `src/components/common/`: готовые компоненты `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `QueryBoundary`, `ResponsiveDialog`, `ConfirmDialog`, `CategoryBadge`, `MoneyText`, `AmountInput`.
- `src/features/accounts/schemas.ts`: схемы Zod `accountTypeSchema`, `accountBalanceSchema`, `accountInputSchema`, `accountSchema`, типы `AccountType`, `AccountInput`, `Account`.
- `src/features/accounts/constants.ts`: список типов `ACCOUNT_TYPES = ['cash', 'card', 'bank'] as const`.
- `src/features/accounts/converters.ts`: `accountConverter`, `accountsCollectionRef`.
- `src/features/accounts/hooks/useAccounts.ts`: базовый хук подписки на коллекцию счетов пользователя.

### 2.2 Архитектурные ограничения и инварианты
- **Строгие границы ESLint:**
  - `components/common/` **не импортирует** `features/**`. Компонент `AccountBadge` создаётся в `src/components/common/AccountBadge.tsx`, принимает примитивные пропсы (`name`, `systemKey`, `type`, `archived`, `size`) и использует `@/lib/i18n`.
  - Модули `features/` импортируют друг друга **только через `index.ts`** (публичный API).
  - `firebase/firestore` импортируется **только** в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
- **Деньги и балансы:** Всегда целые числа в minor units (копейки/центы, `100.00` = `10000`). Баланс счёта может быть отрицательным (например, овердрафт или кредитная карта), в диапазоне `[-MAX_BALANCE, +MAX_BALANCE]` (ADR-003, `02-data-model.md` §3.2).
- **Корректировка `initialBalance`:** При изменении начального остатка с `oldInitial` на `newInitial` разница `delta = newInitial - oldInitial` атомарно добавляется к текущему `balance` через `increment(delta)` в `writeBatch` (`02-data-model.md` §5).
- **Пересчёт баланса (`recalculateAccountBalance`):** Выполняется запрос к коллекции транзакций пользователя `where('accountId', '==', accountId)` (однополевой фильтр, не требует составного индекса). Сумма рассчитывается как `initialBalance + Σ signedAmount(tx.type, tx.amount)` и записывается в `balance` документа счёта.
- **Отображение системного счёта:** Счёт с `systemKey: 'main'` отображает локализованное название (например, «Основной счёт» / «Main account»), пока пользователь явно не задаст собственное имя в поле `name` (ADR-011).
- **Отсутствие `null` в Firestore:** Необязательные поля (`name`, `systemKey`) при очистке удаляются через `deleteField()`.

---

## 3. Скоуп

### Входит
1. **Доменные утилиты и схемы счетов (`features/accounts`):**
   - Схема обновления счёта `accountUpdateInputSchema` и тип `AccountUpdateInput`.
   - Утилиты разрешения имён и форматирования счетов `src/features/accounts/utils.ts` (`getAccountDisplayName`, `getAccountTypeLabel`, `getAccountIconName`, `sortAccounts`).
   - Расчёт агрегатов и суммарного баланса `calculateAccountTotals(accounts)` (общий баланс, разбивка по `cash`, `card`, `bank`, количество активных счетов).
2. **Общий компонент дизайн-системы:**
   - `src/components/common/AccountBadge.tsx` — компонент отображения счёта с иконкой типа (`Banknote`, `CreditCard`, `Landmark`), названием (с поддержкой `systemKey`), перечёркиванием и бейджем архива при `archived: true`.
3. **Хранилище и операции со счетами (`repository.ts`):**
   - Расширение репозитория `src/features/accounts/repository.ts`:
     - `createAccount(uid, input)`: создание счёта с гарантированной инициализацией `balance = initialBalance`.
     - `updateAccount(uid, accountId, currentAccount, input)`: обновление названия, типа счёта, а также атомарная корректировка `balance` через `increment(newInitial - oldInitial)` при изменении `initialBalance`.
     - `archiveAccount(uid, accountId)`: установка `archived: true`.
     - `unarchiveAccount(uid, accountId)`: установка `archived: false`.
     - `recalculateAccountBalance(uid, accountId)`: выборка всех транзакций счёта через `where('accountId', '==', accountId)`, точный расчёт `initialBalance + Σ signedAmount` и запись актуального `balance`. Возврат диагностических данных `{ previousBalance, newBalance, transactionCount, delta }`.
4. **Хуки фичи (`features/accounts/hooks/`):**
   - `useAccountMutations()`: операции создания, редактирования, архивации, разархивации и пересчёта баланса с toast-нотификациями (`sonner`) и состояниями загрузки `isSubmitting` / `isRecalculating`.
   - `useAccountTotals(accounts)`: мемоизированный расчёт суммарного капитала и разбивки по типам счетов.
5. **UI-компоненты фичи `src/features/accounts/components/`:**
   - `AccountSummaryHeader`: карточка суммарного капитала (Total Net Worth) с крупным `MoneyText`, количеством активных счетов и информативными бейджами/пиллами по типам счетов (`cash`, `card`, `bank`).
   - `AccountCard`: карточка отдельного счёта с акцентной иконкой типа, отображаемым именем, типом счёта, текущим балансом (`MoneyText` с адаптивным размером), начальным балансом и меню действий (`DropdownMenu`: «Редактировать», «Пересчитать баланс», «Архивировать» / «Восстановить»).
   - `AccountList`: сетка карточек с группировкой или фильтрацией, поддержкой переключателя архивных счетов и отображением всех 5 состояний.
   - `AccountForm`: форма создания и редактирования счёта в адаптивном `ResponsiveDialog` (`Dialog` на desktop, `Drawer` на mobile) с полями: название, выбор типа счёта, ввод начального баланса через `AmountInput`.
6. **Страница и маршрутизация:**
   - Полнофункциональная страница `src/app/pages/AccountsPage.tsx` (замена текущего `PlaceholderPage`).
   - Шапка `PageHeader` с тумблером «Показывать архивные» и кнопкой «Добавить счёт».
7. **Интеграция с существующим UI транзакций:**
   - Обновление `TransactionItem.tsx` и `TransactionForm.tsx` для использования `getAccountDisplayName` / `AccountBadge` вместо временных строковых заглушек.
8. **Локализация и тесты:**
   - Регистрация неймспейса `accounts` в `src/i18n/config.ts` и `src/i18n/types.ts`.
   - Полные словари локализации `src/i18n/locales/{en,ru}/accounts.json`.
   - Комплексные unit-тесты схем и утилит, интеграционные тесты репозитория на Firestore Emulator (включая проверку дельт и пересчёта), компонентные тесты форм/карточек и Playwright e2e-тесты.

### Не входит (явно)
- Переводы между счетами (Account-to-Account Transfers) — зафиксировано в Backlog (`06-roadmap.md` §7, Could).
- Мультивалютность и курсы конвертации между разными счетами (Won't v1, один `baseCurrency` на аккаунт).
- Физическое удаление счёта из Firestore через UI (только `archived: true` для защиты целостности внешних ключей `accountId` в транзакциях).
- Полнотекстовый банковский парсинг выписок (входит в F10 CSV import).

---

## 4. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Модель типов счетов** | Фиксированный набор из 3 типов: `cash` (наличные), `card` (банковская карта), `bank` (банковский счёт/депозит) | Полностью соответствует Security Rules v1 и `02-data-model.md` §3.2. Покрывает 99% потребностей личного учёта без усложнения структуры. |
| 2 | **Иконки типов счетов** | `cash` → `Banknote`, `card` → `CreditCard`, `bank` → `Landmark` из Lucide | Семантически точные, узнаваемые пиктограммы, согласованные с дизайн-системой проекта. |
| 3 | **Отображение системного счёта «Основной»** | При создании пишется `systemKey: 'main'` без поля `name`. `getAccountDisplayName` возвращает перевод `t('accounts.system.main')`. При переименовании пользователем записывается поле `name` | Обеспечивает автоматическую смену языка интерфейса (ADR-011) до тех пор, пока пользователь не дал счёту собственное уникальное имя (например, «Зарплатная карта T-Bank»). |
| 4 | **Изменение `initialBalance`** | В репозитории вычисляется `delta = newInitial - oldInitial`. В `writeBatch` обновляется `initialBalance = newInitial` и `balance = increment(delta)` | Математически строго: текущий баланс смещается ровно на величину изменения начального остатка. Не требует дорогой повторной калькуляции всех транзакций при обычном редактировании. |
| 5 | **Механизм пересчёта баланса** | Клиентская функция `recalculateAccountBalance` делает запрос `where('accountId', '==', accountId)` в `transactionsCol(uid)`, суммирует `signedAmount(type, amount)`, прибавляет `account.initialBalance` и записывает полученную сумму в `balance` | Позволяет пользователю в один клик ликвидировать любой дрейф баланса (например, после сетевых сбоев или ручных импортов). Запрос выполняется по стандартному однополевому индексу Firestore без необходимости составных индексов. |
| 6 | **Защита последнего активного счёта** | Если у пользователя остаётся ровно 1 неархивный счёт, кнопка/пункт меню «Архивировать» блокируется с тултипом/предупреждением или при попытке выдаётся предупреждающий toast | Предотвращает ситуацию «0 доступных счетов», при которой пользователь не сможет добавить ни один новый расход или доход в форме транзакций. |
| 7 | **Архитектурная изоляция `AccountBadge`** | Компонент `AccountBadge` размещается в `src/components/common/AccountBadge.tsx`, не зависит от `src/features/**`, принимает примитивные пропсы | Строго соблюдает границы ESLint layer boundaries (`components/common` не знает о `features`). |
| 8 | **Отрицательные балансы** | Поддерживаются штатно на уровне схемы и отображения. В `MoneyText` передаётся `amount={Math.abs(balance)}` и соответствующий признак знака, стилизуется цветом `expense` (красный) с минусом | Дебетовые карты могут уходить в овердрафт, а кредитные карты имеют отрицательный баланс при задолженности. |
| 9 | **Адаптивные диалоги** | Форма создания и редактирования открывается в общем `ResponsiveDialog` (`Dialog` на desktop ≥ 768px, `Drawer` на mobile < 768px) | Гарантирует комфорт мобильного взаимодействия со свайпом закрытия и соблюдение UX Guidelines §3. |

---

## 5. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Создание нового счёта (Happy Path)** | Пользователь авторизован, находится на `/app/accounts` | 1. Нажимает «Добавить счёт».<br>2. Вводит название «T-Bank Black».<br>3. Выбирает тип «Карта» (`card`).<br>4. Вводит начальный баланс `50 000,00 ₽`.<br>5. Нажимает «Сохранить». | Диалог закрывается, toast «Счёт создан». В списке мгновенно появляется карточка счёта с иконкой `CreditCard`, балансом `50 000,00 ₽`. Суммарный баланс на дашборде и в шапке счетов возрастает на 50 000 ₽. |
| 2 | **Создание счёта с нулевым балансом** | Пользователь на `/app/accounts` | 1. Открывает диалог добавления.<br>2. Вводит «Наличные евро», тип `cash`, начальный баланс оставляет `0`.<br>3. Сохраняет. | Счёт создаётся с балансом `0,00`, toast «Счёт создан». |
| 3 | **Редактирование названия и типа счёта** | Существует счёт «Мой банк» (`bank`) | 1. В меню карточки нажимает «Редактировать».<br>2. Меняет название на «Вклад Доходный» и тип на `bank`.<br>3. Нажимает «Сохранить». | Карточка обновляется с новым именем, toast «Счёт обновлён». Баланс остаётся неизменным. |
| 4 | **Редактирование начального остатка** | Счёт с `initialBalance = 1000` и текущим `balance = 1500` (была транзакция +500) | 1. Открывает редактирование счёта.<br>2. Меняет начальный баланс с `1000` на `2000`.<br>3. Сохраняет. | `initialBalance` становится `2000`, `balance` атомарно становится `2500` (разница +1000 учтена). Суммарный капитал увеличивается на 1000. |
| 5 | **Ручной пересчёт баланса счёта** | На счёте проведено 15 операций, пользователь хочет убедиться в точности остатка | 1. В меню действий карточки выбирает «Пересчитать баланс». | Кнопка отображает спиннер. Запрашиваются все транзакции счёта, вычисляется точная сумма. Появляется toast: «Баланс счёта актуален (обработано 15 операций)» (или с указанием скорректированной разницы, если был дрейф). |
| 6 | **Архивация счёта** | В системе есть 2 активных счёта («Основной» и «Старая карта») | 1. В меню счёта «Старая карта» выбирает «Архивировать».<br>2. Подтверждает действие в `ConfirmDialog`. | Счёт исчезает из активного списка, toast «Счёт архивирован». Счёт больше не предлагается в селекторе формы транзакций. Прошлые транзакции продолжают ссылаться на него с бейджем `(архив)`. |
| 7 | **Просмотр и разархивация счёта** | Есть архивные счета | 1. Включает тумблер «Показывать архивные».<br>2. Видит карточку архивного счёта со стилем opacity и бейджем «Архив».<br>3. В меню карточки выбирает «Восстановить». | Счёт становится активным (`archived: false`), toast «Счёт восстановлен», возвращается в общий селектор транзакций. |
| 8 | **Попытка архивировать единственный активный счёт** | В системе только 1 активный счёт | Пользователь открывает меню единственного счёта | Пункт «Архивировать» заблокирован (`disabled`) с подсказкой «Нельзя архивировать единственный активный счёт» (либо попытка клика вызывает предупреждающий toast). |
| 9 | **Отображение счёта с отрицательным балансом** | Баланс кредитной карты `-12 450,00 ₽` | Пользователь открывает `/app/accounts` | Баланс отображается со знаком `−` красным семантическим цветом `expense`. Общий суммарный капитал корректно уменьшается на эту величину. |
| 10 | **Офлайн-создание счёта** | Отсутствует сеть (активен `OfflineBanner`) | Пользователь создаёт счёт «Заначка» с балансом 5000 ₽ | Счёт оптимистично появляется в интерфейсе из локального кэша Firestore. При появлении интернета синхронизируется с сервером. |

---

## 6. UI и дизайн-система

### 6.1 Экраны и структура страницы (`AccountsPage`)
- **Маршрут:** `/app/accounts`.
- **Макет страницы:**
  1. **Шапка (`PageHeader`):**
     - Заголовок: `t('accounts.title')` («Счета» / «Accounts»).
     - Подзаголовок: `t('accounts.description')` («Управление счетами, картами и остатками средств»).
     - Правая зона действий:
       - Переключатель `Switch` с подписью `t('accounts.showArchived')` («Показывать архивные»).
       - Кнопка `Button` с иконкой `Plus`: `t('accounts.actions.add')` («Добавить счёт»).
  2. **Сводная панель суммарного капитала (`AccountSummaryHeader`):**
     - Главная карточка:
       - Подпись: `t('accounts.summary.totalBalance')` («Общий баланс» / «Total Balance»).
       - Крупное значение суммарного капитала: `MoneyText` (`size="lg"`, `tabular-nums`, полужирный).
       - Количество активных счетов: бейдж `t('accounts.summary.activeAccountsCount', { count })`.
     - Разбивка по категориям активов (3 компактных виджета / чипа):
       - **Наличные (`cash`):** иконка `Banknote`, сумма по всем наличным счетам.
       - **Карты (`card`):** иконка `CreditCard`, сумма по всем картам.
       - **Банковские счета (`bank`):** иконка `Landmark`, сумма по банковским счетам.
  3. **Сетка карточек счетов (`AccountList`):**
     - Адаптивная CSS-сетка: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
     - Каждая карточка (`AccountCard`):
       - Верхний ряд:
         - Круглый контейнер иконки типа (`bg-primary/10 text-primary` для карт/банков, `bg-emerald-500/10 text-emerald-600` для наличных).
         - Название счёта (`getAccountDisplayName`) с тултипом при длинном тексте.
         - Бейдж типа (`cash` / `card` / `bank`) через `Badge variant="secondary"`.
         - Кнопка выпадающего меню действий `DropdownMenu` (`MoreHorizontal`).
       - Средний ряд:
         - Подпись: `t('accounts.card.currentBalance')`.
         - Значение: `MoneyText` с размером `md`/`lg` (`showSign={false}` для положительных, автоматический минус и красный цвет для отрицательных).
       - Нижний ряд:
         - Начальный баланс: `t('accounts.card.initialBalance')`: `formatMoney(account.initialBalance, currency)`.
         - Индикатор статуса архива (если `archived: true`).
     - Меню действий карточки (`DropdownMenuContent`):
       - «Редактировать» (`Pencil`) → открывает `AccountForm` в режиме редактирования.
       - «Пересчитать баланс» (`RefreshCw`) → инициирует `recalculateAccountBalance`.
       - «Архивировать» (`Archive`) / «Восстановить» (`ArchiveRestore`).
  4. **Состояния данных через `QueryBoundary`:**
     - *Loading*: `LoadingSkeleton` (скелетон сводной панели + 3 карточки счетов).
     - *Empty*: `EmptyState` с иконкой `Wallet`, пояснением и кнопкой «Создать счёт» (показывается, если все счета заархивированы и тумблер выключен, либо при первичном сбое).
     - *Error*: `ErrorState` с локализованным текстом ошибки и кнопкой повтора подписки.
     - *Offline*: отображение данных из кэша с уведомлением в `OfflineBanner`.
     - *Success*: список счетов с реактивным обновлением при транзакциях.

### 6.2 Компоненты формы счёта (`AccountForm`)
- Открывается в `ResponsiveDialog` (`Dialog` на desktop ≥ 768px, `Drawer` на mobile < 768px).
- Поля формы:
  1. **Название (`name`)**:
     - Текстовый `Input` (1–40 символов).
     - Для системного счёта (`systemKey: 'main'`) плейсхолдер показывает текущее локализованное имя `t('accounts.system.main')`.
  2. **Тип счёта (`type`)**:
     - Селектор `Select` или сегментированный контрол из 3 вариантов с иконками:
       - `cash`: `Banknote` + `t('accounts.types.cash')` («Наличные»).
       - `card`: `CreditCard` + `t('accounts.types.card')` («Банковская карта»).
       - `bank`: `Landmark` + `t('accounts.types.bank')` («Банковский счёт»).
  3. **Начальный баланс (`initialBalance`)**:
     - Компонент `AmountInput` с поддержкой отрицательных и нулевых значений (для кредитных карт можно указать отрицательный старт или 0).
     - Подсказка: `t('accounts.form.initialBalanceHint')` («Остаток на счёте на момент начала ведения учёта»).
- Кнопки: «Отмена» (`Button variant="outline"`) и «Сохранить» (`Button` с индикатором загрузки `Loader2`).

### 6.3 Переиспользование (DRY-матрица)

| Элемент UI | Источник | Примечание |
|---|---|---|
| Заголовок страницы | `src/components/common/PageHeader.tsx` | Готовый из F00 |
| Пустое состояние | `src/components/common/EmptyState.tsx` | Готовый из F00 |
| Состояние ошибки | `src/components/common/ErrorState.tsx` | Готовый из F00 |
| Скелетон загрузки | `src/components/common/LoadingSkeleton.tsx` | Готовый из F00 |
| Граница запросов | `src/components/common/QueryBoundary.tsx` | Готовый из F00 |
| Адаптивный диалог | `src/components/common/ResponsiveDialog.tsx` | Готовый из F04 |
| Подтверждение архивации | `src/components/common/ConfirmDialog.tsx` | Готовый из F04 |
| Отображение сумм | `src/components/common/MoneyText.tsx` | Готовый из F05 |
| Ввод денег | `src/components/common/AmountInput.tsx` | Готовый из F05 |
| Бейдж счёта | `src/components/common/AccountBadge.tsx` | **Создаётся в F07** для унификации отображения счетов в транзакциях и списках |

---

## 7. Данные и запросы

### 7.1 Структура документа Firestore (`users/{uid}/accounts/{accountId}`)
Полностью соответствует спецификации `docs/02-data-model.md` §3.2 и Security Rules:

```ts
interface AccountFirestoreDoc {
  type: 'cash' | 'card' | 'bank';
  balance: number;           // целое число в minor units, [-10^12, +10^12]
  initialBalance: number;    // целое число в minor units, [-10^12, +10^12]
  archived: boolean;
  name?: string;             // 1–40 символов
  systemKey?: string;        // 1–30 символов (например, 'main')
  createdAt: Timestamp;      // serverTimestamp()
  updatedAt: Timestamp;      // serverTimestamp()
}
```

### 7.2 Запросы к Firestore
1. **Подписка на счета пользователя:**
   - Коллекция: `users/{uid}/accounts` (без условий `where`, все документы подколлекции).
   - Индекс: не требуется (встроенный в Firestore).
2. **Запрос для пересчёта баланса счёта (`recalculateAccountBalance`):**
   - Коллекция: `users/{uid}/transactions`.
   - Запрос: `query(transactionsCol(uid), where('accountId', '==', accountId))`.
   - Индекс: стандартный автоматический однополевой индекс Firestore по полю `accountId`. Составные индексы **не требуются** (ADR-010, `02-data-model.md` §6).
3. **Пакетная запись при обновлении начального баланса:**
   - Изменение `initialBalance` использует `writeBatch(db)`:
     ```ts
     const batch = writeBatch(db);
     batch.update(accountRef, {
       initialBalance: newInitial,
       balance: increment(newInitial - oldInitial),
       updatedAt: serverTimestamp(),
       // ...остальные поля (name, type)
     });
     await batch.commit();
     ```

### 7.3 Влияние на Security Rules и индексы
- Изменения `firestore.rules`: **не требуются** (правило `validAccount()` уже полностью покрывает создание и обновление счетов с валидацией `type`, `balance`, `initialBalance`, `archived`, `name`, `systemKey`).
- Изменения `firestore.indexes.json`: **не требуются** (файл остаётся пустым).

---

## 8. Контракты и интерфейсы

### 8.1 Доменные схемы и типы (`src/features/accounts/schemas.ts`)

```ts
import { z } from 'zod';
import {
  MAX_BALANCE,
  NAME_MAX_LENGTH,
  SYSTEM_KEY_MAX_LENGTH,
} from '@/lib/limits';
import { ACCOUNT_TYPES } from './constants';

export const accountTypeSchema = z.enum(ACCOUNT_TYPES, {
  error: () => 'validation.required',
});

export const accountBalanceSchema = z
  .number({ error: 'validation.required' })
  .int({ error: 'validation.required' })
  .min(-MAX_BALANCE, { error: 'validation.amountTooLarge' })
  .max(MAX_BALANCE, { error: 'validation.amountTooLarge' });

function hasNameOrSystemKey(data: {
  name?: string;
  systemKey?: string;
}): boolean {
  const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
  const hasSystemKey =
    typeof data.systemKey === 'string' && data.systemKey.trim().length > 0;
  return hasName || hasSystemKey;
}

export const accountInputSchema = z
  .object({
    type: accountTypeSchema,
    initialBalance: accountBalanceSchema,
    balance: accountBalanceSchema.optional(),
    archived: z.boolean().default(false),
    name: z
      .string()
      .min(1, { error: 'validation.required' })
      .max(NAME_MAX_LENGTH, { error: 'validation.tooLong' })
      .optional(),
    systemKey: z
      .string()
      .min(1, { error: 'validation.required' })
      .max(SYSTEM_KEY_MAX_LENGTH, { error: 'validation.tooLong' })
      .optional(),
  })
  .refine(hasNameOrSystemKey, {
    error: 'validation.required',
    path: ['name'],
  });

export const accountUpdateInputSchema = z.object({
  name: z
    .string()
    .max(NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  type: accountTypeSchema.optional(),
  initialBalance: accountBalanceSchema.optional(),
  archived: z.boolean().optional(),
});

export const accountSchema = z
  .object({
    id: z.string().min(1, { error: 'validation.required' }),
    type: accountTypeSchema,
    balance: accountBalanceSchema,
    initialBalance: accountBalanceSchema,
    archived: z.boolean({ error: 'validation.required' }),
    name: z.string().max(NAME_MAX_LENGTH).optional(),
    systemKey: z.string().max(SYSTEM_KEY_MAX_LENGTH).optional(),
    createdAt: z.date({ error: 'validation.required' }),
    updatedAt: z.date({ error: 'validation.required' }),
  })
  .refine(hasNameOrSystemKey, {
    error: 'validation.required',
    path: ['name'],
  });

export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateInputSchema>;
export type Account = z.infer<typeof accountSchema>;
```

### 8.2 Контракты репозитория (`src/features/accounts/repository.ts`)

```ts
export type Unsubscribe = () => void;

export interface RecalculateBalanceResult {
  previousBalance: number;
  newBalance: number;
  delta: number;
  transactionCount: number;
}

/** Подписка на коллекцию счетов пользователя в реальном времени */
export function subscribeAccounts(
  uid: string,
  onData: (accounts: Account[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;

/** Создание нового счёта */
export function createAccount(
  uid: string,
  input: AccountInput,
): Promise<string>;

/** Обновление данных счёта с атомарной корректировкой баланса при смене initialBalance */
export function updateAccount(
  uid: string,
  accountId: string,
  currentAccount: Account,
  input: AccountUpdateInput,
): Promise<void>;

/** Мягкое удаление (архивация) счёта */
export function archiveAccount(
  uid: string,
  accountId: string,
): Promise<void>;

/** Восстановление архивного счёта */
export function unarchiveAccount(
  uid: string,
  accountId: string,
): Promise<void>;

/** Полный пересчёт баланса счёта по всем его транзакциям */
export function recalculateAccountBalance(
  uid: string,
  accountId: string,
): Promise<RecalculateBalanceResult>;
```

### 8.3 Контракты хуков (`src/features/accounts/hooks/`)

```ts
// useAccounts.ts
export function useAccounts(): SubscriptionResult<Account[]>;

// useAccountMutations.ts
export interface UseAccountMutationsResult {
  createAccount: (input: AccountInput) => Promise<string>;
  updateAccount: (
    id: string,
    currentAccount: Account,
    input: AccountUpdateInput,
  ) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  unarchiveAccount: (id: string) => Promise<void>;
  recalculateBalance: (id: string) => Promise<RecalculateBalanceResult>;
  isSubmitting: boolean;
  isRecalculating: boolean;
}
export function useAccountMutations(): UseAccountMutationsResult;

// useAccountTotals.ts
export interface AccountTotalsResult {
  totalBalance: number;
  cashBalance: number;
  cardBalance: number;
  bankBalance: number;
  activeAccountsCount: number;
  archivedAccountsCount: number;
}
export function useAccountTotals(accounts: Account[]): AccountTotalsResult;
```

### 8.4 Общий компонент `AccountBadge` (`src/components/common/AccountBadge.tsx`)

```ts
export interface AccountBadgeProps {
  name?: string;
  systemKey?: string;
  type?: 'cash' | 'card' | 'bank';
  archived?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showArchivedBadge?: boolean;
  showTypeIcon?: boolean;
  className?: string;
}
export function AccountBadge(props: AccountBadgeProps): React.JSX.Element;
```

### 8.5 Публичный API фичи (`src/features/accounts/index.ts`)

```ts
export { ACCOUNT_TYPES } from './constants';
export type { AccountType } from './constants';

export {
  accountTypeSchema,
  accountBalanceSchema,
  accountInputSchema,
  accountUpdateInputSchema,
  accountSchema,
} from './schemas';
export type { AccountInput, AccountUpdateInput, Account } from './schemas';

export { accountConverter, accountsCollectionRef } from './converters';
export {
  subscribeAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
  recalculateAccountBalance,
} from './repository';
export type { Unsubscribe, RecalculateBalanceResult } from './repository';

export { useAccounts } from './hooks/useAccounts';
export { useAccountMutations } from './hooks/useAccountMutations';
export { useAccountTotals } from './hooks/useAccountTotals';
export type { AccountTotalsResult } from './hooks/useAccountTotals';

export {
  getAccountDisplayName,
  getAccountTypeLabel,
  getAccountIconName,
  sortAccounts,
} from './utils';

export { AccountCard } from './components/AccountCard';
export { AccountList } from './components/AccountList';
export { AccountSummaryHeader } from './components/AccountSummaryHeader';
export { AccountForm } from './components/AccountForm';
```

---

## 9. Эдж-кейсы и обработка ошибок

| # | Эдж-кейс / Ситуация | Риск / Поведение | Решение и обработка |
|---|---|---|---|
| 1 | **Пересчёт баланса счёта без транзакций** | Сумма транзакций пустая (`0`). Опасность обнуления `initialBalance` | Сумма транзакций равна `0`. Новый баланс строго равен `initialBalance`. Toast сообщает: «Обработано 0 операций. Баланс установлен в начальный остаток». |
| 2 | **Пользователь меняет `initialBalance` при наличии сотен транзакций** | Риск рассинхрона между накопленным балансом и новым стартом | Применяется атомарный `increment(newInitial - oldInitial)` к текущему `balance`. Все существующие дельты транзакций сохраняются. |
| 3 | **Попытка архивации последнего активного счёта** | Если все счета архивированы, форма транзакций не сможет выбрать валидный `accountId` | В меню действий карточки счёта пункт «Архивировать» отключается (`disabled`), если активных счетов всего 1, с поясняющим тултипом. При попытке вызова мутации возвращается ошибка валидации. |
| 4 | **Транзакция ссылается на архивный счёт** | Редактирование или удаление старой транзакции, привязанной к заархивированному счёту | `balanceDeltas` и атомарный `writeBatch` транзакций успешно обновляют баланс документа счёта в базе независимо от флага `archived`. В селекторе формы транзакции архивный счёт помечается суффиксом `(архив)`. |
| 5 | **Отрицательный баланс (кредитные карты / овердрафт)** | Ошибочное отображение знаков или отказ валидатора | Схема `accountBalanceSchema` разрешает диапазон `[-MAX_BALANCE, +MAX_BALANCE]`. `MoneyText` форматирует отрицательные балансы красным цветом со знаком `−`. В суммарном капитале отрицательный баланс корректно вычитается. |
| 6 | **Переименование дефолтного счёта (`systemKey: 'main'`)** | Потеря системного ключа или сброс имени при смене языка | Если поле `name` заполнено строкой `> 0`, сохраняется `name`. Поле `systemKey: 'main'` остаётся в документе. `getAccountDisplayName` отдаёт `name` в приоритете над `systemKey`. |
| 7 | **Повреждённый документ счёта в Firestore** | Падение всего приложения при чтении списка | `parseSnapshotDocs` безопасно логирует ошибку парсинга Zod в `console.warn` и пропускает битый документ, не ломая остальные счета. |
| 8 | **Длительный пересчёт при медленной сети** | Повторные клики и race condition | Мутация активирует локальный флаг `isRecalculating` для конкретного счёта, блокируя кнопку и отображая спиннер до завершения промиса. |

---

## 10. i18n-локализация

Регистрируется новый неймспейс `accounts` в `src/i18n/config.ts` и создаются файлы локализации:

### 10.1 `src/i18n/locales/en/accounts.json`
```json
{
  "title": "Accounts",
  "description": "Manage your wallets, cards, bank accounts and track balances",
  "showArchived": "Show archived",
  "system": {
    "main": "Main account"
  },
  "types": {
    "cash": "Cash",
    "card": "Card",
    "bank": "Bank account"
  },
  "summary": {
    "totalBalance": "Total Balance",
    "activeAccountsCount_one": "{{count}} active account",
    "activeAccountsCount_other": "{{count}} active accounts",
    "cashSubtotal": "Cash",
    "cardSubtotal": "Cards",
    "bankSubtotal": "Bank accounts"
  },
  "card": {
    "currentBalance": "Current balance",
    "initialBalance": "Initial",
    "archivedBadge": "Archived",
    "recalculating": "Recalculating..."
  },
  "actions": {
    "add": "Add account",
    "edit": "Edit account",
    "archive": "Archive account",
    "unarchive": "Restore account",
    "recalculate": "Recalculate balance"
  },
  "form": {
    "createTitle": "Create account",
    "createDescription": "Add a new account to track your finances",
    "editTitle": "Edit account",
    "editDescription": "Update account details and initial balance",
    "nameLabel": "Account name",
    "namePlaceholder": "e.g. Main card, Cash, Savings",
    "typeLabel": "Account type",
    "initialBalanceLabel": "Initial balance",
    "initialBalanceHint": "Account balance at the start of tracking"
  },
  "notifications": {
    "created": "Account created successfully",
    "updated": "Account updated successfully",
    "archived": "Account archived",
    "unarchived": "Account restored",
    "recalculateSuccess": "Balance is accurate ({{count}} transactions processed)",
    "recalculateAdjusted": "Balance adjusted: from {{oldBalance}} to {{newBalance}} ({{count}} transactions processed)"
  },
  "confirm": {
    "archiveTitle": "Archive account",
    "archiveDescription": "Are you sure you want to archive \"{{name}}\"? It will be hidden from transaction forms, but all past records will remain intact.",
    "archiveConfirm": "Archive",
    "lastAccountWarning": "Cannot archive the only active account. You must have at least one active account to record transactions."
  },
  "empty": {
    "title": "No active accounts",
    "description": "All your accounts are archived or no accounts exist yet.",
    "action": "Create account"
  },
  "errors": {
    "unauthorized": "You must be signed in to perform this action",
    "saveFailed": "Failed to save account. Please try again.",
    "recalculateFailed": "Failed to recalculate account balance",
    "lastAccountRestriction": "Cannot archive the only active account"
  }
}
```

### 10.2 `src/i18n/locales/ru/accounts.json`
```json
{
  "title": "Счета",
  "description": "Управление кошельками, картами, банковскими счетами и контроль остатков",
  "showArchived": "Показывать архивные",
  "system": {
    "main": "Основной счёт"
  },
  "types": {
    "cash": "Наличные",
    "card": "Банковская карта",
    "bank": "Банковский счёт"
  },
  "summary": {
    "totalBalance": "Общий баланс",
    "activeAccountsCount_one": "{{count}} активный счёт",
    "activeAccountsCount_few": "{{count}} активных счёта",
    "activeAccountsCount_many": "{{count}} активных счетов",
    "activeAccountsCount_other": "{{count}} активных счетов",
    "cashSubtotal": "Наличные",
    "cardSubtotal": "Карты",
    "bankSubtotal": "Счета в банке"
  },
  "card": {
    "currentBalance": "Текущий баланс",
    "initialBalance": "Начальный",
    "archivedBadge": "Архив",
    "recalculating": "Пересчёт..."
  },
  "actions": {
    "add": "Добавить счёт",
    "edit": "Редактировать",
    "archive": "Архивировать",
    "unarchive": "Восстановить",
    "recalculate": "Пересчитать баланс"
  },
  "form": {
    "createTitle": "Новый счёт",
    "createDescription": "Добавьте счёт для раздельного учёта средств",
    "editTitle": "Редактирование счёта",
    "editDescription": "Измените параметры счёта и начальный остаток",
    "nameLabel": "Название счёта",
    "namePlaceholder": "Например: Зарплатная карта, Наличные, Вклад",
    "typeLabel": "Тип счёта",
    "initialBalanceLabel": "Начальный баланс",
    "initialBalanceHint": "Остаток средств на счёте на момент начала учёта"
  },
  "notifications": {
    "created": "Счёт успешно создан",
    "updated": "Счёт успешно обновлён",
    "archived": "Счёт архивирован",
    "unarchived": "Счёт восстановлен",
    "recalculateSuccess": "Баланс счёта актуален (обработано операций: {{count}})",
    "recalculateAdjusted": "Баланс скорректирован: с {{oldBalance}} на {{newBalance}} (операций: {{count}})"
  },
  "confirm": {
    "archiveTitle": "Архивация счёта",
    "archiveDescription": "Вы уверены, что хотите архивировать счёт «{{name}}»? Он будет скрыт из выбора в операциях, но вся история транзакций сохранится.",
    "archiveConfirm": "Архивировать",
    "lastAccountWarning": "Нельзя архивировать единственный активный счёт. В системе должен оставаться хотя бы один счёт для записи операций."
  },
  "empty": {
    "title": "Нет активных счетов",
    "description": "Все счета заархивированы или ещё не созданы.",
    "action": "Создать счёт"
  },
  "errors": {
    "unauthorized": "Необходимо войти в систему для выполнения этого действия",
    "saveFailed": "Не удалось сохранить счёт. Попробуйте снова.",
    "recalculateFailed": "Не удалось выполнить пересчёт баланса",
    "lastAccountRestriction": "Нельзя архивировать единственный активный счёт"
  }
}
```

---

## 11. Acceptance criteria

- [x] **AC-1 (Создание счёта):** Given пользователь на странице `/app/accounts`, When нажимает «Добавить счёт», заполняет название, тип и `initialBalance` и отправляет форму, Then в Firestore создаётся документ с `balance = initialBalance`, модальное окно закрывается, карточка счёта отображается в списке, суммарный баланс пересчитывается.
- [x] **AC-2 (Редактирование счёта и начального баланса):** Given существующий счёт с балансом 1500 (начальный 1000), When пользователь меняет `initialBalance` на 2000, Then в базе `initialBalance` становится 2000, а `balance` атомарно корректируется на разницу (+1000) до 2500, отображается toast об успехе.
- [x] **AC-3 (Пересчёт баланса `recalculateAccountBalance`):** Given счёт с историей транзакций, When пользователь выбирает «Пересчитать баланс», Then выполняется запрос `where('accountId', '==', accountId)` к транзакциям, вычисляется точная сумма `initialBalance + Σ signedAmount`, баланс счёта в Firestore обновляется, toast выводит количество обработанных транзакций.
- [x] **AC-4 (Архивация и разархивация):** Given счёт в списке (при наличии >1 активного счёта), When пользователь архивирует счёт через меню действий, Then счёт получает `archived: true` и скрывается из активного списка; при включении тумблера «Показывать архивные» счёт отображается с бейджем «Архив» и может быть восстановлен (`archived: false`).
- [x] **AC-5 (Защита единственного счёта):** Given у пользователя остался только 1 активный счёт, When пользователь пытается архивировать его, Then действие блокируется, выводится понятное предупреждение о невозможности архивации последнего активного счёта.
- [x] **AC-6 (Сводная панель суммарного капитала):** Given открыта страница `/app/accounts`, Then шапка сводки отображает общий баланс всех активных счетов и корректную разбивку сумм по `cash`, `card`, `bank`.
- [x] **AC-7 (Унификация с транзакциями):** Given транзакции ссылаются на счета, Then в списке транзакций и форме добавления имена системных и архивных счетов отображаются корректно через `AccountBadge` / `getAccountDisplayName`.
- [x] **AC-STATES:** Для страницы `/app/accounts` реализованы все 5 обязательных состояний: `loading` (скелетоны), `empty` (при отсутствии активных счетов), `error` (ошибка с кнопкой повтора), `offline` (чтение из кэша с баннером), `success`.
- [x] **AC-I18N:** Все надписи, подсказки, типы счетов, уведомления и подтверждения вынесены в `accounts.json` (EN и RU), нет жёстких строк в JSX.
- [x] **AC-A11Y:** Фокус клавиатуры, aria-labels для иконок действий, контраст токенов, `role="status"` для toast-нотификаций, корректное закрытие модальных окон по `Esc`.
- [x] **AC-ARCH:** Соблюдены границы слоёв ESLint: `AccountBadge` находится в `components/common`, `repository.ts` — единственная точка доступа к `firebase/firestore` для счетов, публичный API фичи экспортируется через `features/accounts/index.ts`.

---

## 12. План тестов

| Уровень | Что проверяем | Файлы тестов |
|---|---|---|
| **Unit** | Валидация Zod-схем (`accountInputSchema`, `accountUpdateInputSchema`, `accountSchema`), утилиты форматирования (`getAccountDisplayName`, `getAccountTypeLabel`, `sortAccounts`), расчёт суммарного капитала `useAccountTotals` | `src/features/accounts/schemas.test.ts`, `src/features/accounts/utils.test.ts`, `src/features/accounts/hooks/useAccountTotals.test.ts` |
| **Component** | Рендеринг `AccountBadge`, поведение `AccountCard`, валидация и сабмит `AccountForm`, отображение сводки `AccountSummaryHeader`, интеграция `AccountsPage` | `src/components/common/AccountBadge.test.tsx`, `src/features/accounts/components/AccountCard.test.tsx`, `src/features/accounts/components/AccountForm.test.tsx`, `src/app/pages/AccountsPage.test.tsx` |
| **Integration (Emulator)** | Создание счёта, обновление с корректировкой `initialBalance` через `increment`, архивация/разархивация, полный пересчёт баланса `recalculateAccountBalance` на реальных транзакциях в Firestore Emulator | `src/features/accounts/repository.integration.test.ts` |
| **E2E (Playwright)** | Сценарий создания карты с начальным остатком, проведение транзакции, пересчёт баланса, архивация счёта, проверка выбора счёта в форме транзакции | `e2e/accounts.spec.ts` |

---

## 13. Задачи (T1–T7)

Каждая задача выполняется строго в рамках одной сессии агента и завершается одним коммитом (Conventional Commits, английский язык).

### T1: Доменная логика, схемы, утилиты, `AccountBadge` и unit-тесты
- **Что делаем:**
  1. Дополнить `src/features/accounts/schemas.ts` схемой `accountUpdateInputSchema` и типом `AccountUpdateInput`.
  2. Создать утилиты `src/features/accounts/utils.ts` (`getAccountDisplayName`, `getAccountTypeLabel`, `getAccountIconName`, `sortAccounts`).
  3. Создать общий компонент `src/components/common/AccountBadge.tsx` с поддержкой типов `cash`, `card`, `bank`, иконки, статуса архивации и локализации.
  4. Написать unit-тесты: `src/features/accounts/schemas.test.ts`, `src/features/accounts/utils.test.ts`, `src/components/common/AccountBadge.test.tsx`.
- **Файлы:**
  - `src/features/accounts/schemas.ts`
  - `src/features/accounts/utils.ts`
  - `src/components/common/AccountBadge.tsx`
  - `src/features/accounts/schemas.test.ts`
  - `src/features/accounts/utils.test.ts`
  - `src/components/common/AccountBadge.test.tsx`
- **Проверка:** `pnpm test`

### T2: Repository & Converters (+ Firestore Emulator Integration Tests)
- **Что делаем:**
  1. Расширить `src/features/accounts/repository.ts` функциями:
     - `updateAccount(uid, accountId, currentAccount, input)` (с атомарным `increment(newInitial - oldInitial)` при смене `initialBalance`).
     - `archiveAccount(uid, accountId)` и `unarchiveAccount(uid, accountId)`.
     - `recalculateAccountBalance(uid, accountId)` с выборкой транзакций через `where('accountId', '==', accountId)` и возвратом `RecalculateBalanceResult`.
  2. Обновить `src/features/accounts/converters.ts` при необходимости.
  3. Написать подробные интеграционные тесты в `src/features/accounts/repository.integration.test.ts` с запуском на Firestore Emulator.
- **Файлы:**
  - `src/features/accounts/repository.ts`
  - `src/features/accounts/converters.ts`
  - `src/features/accounts/repository.integration.test.ts`
- **Проверка:** `pnpm test:integration` (или `pnpm test` с запущенными эмуляторами)

### T3: Хуки фичи (`useAccountMutations`, `useAccountTotals`)
- **Что делаем:**
  1. Создать хук `src/features/accounts/hooks/useAccountMutations.ts` с поддержкой `createAccount`, `updateAccount`, `archiveAccount`, `unarchiveAccount`, `recalculateBalance`, флагами `isSubmitting`/`isRecalculating` и toast-уведомлениями (`sonner`).
  2. Создать хук `src/features/accounts/hooks/useAccountTotals.ts` для мемоизированного расчёта суммарного баланса и разбивки по типам (`cash`, `card`, `bank`).
  3. Написать тесты для хуков: `src/features/accounts/hooks/useAccountTotals.test.ts`, `src/features/accounts/hooks/useAccountMutations.test.ts`.
  4. Обновить публичный экспорт `src/features/accounts/index.ts`.
- **Файлы:**
  - `src/features/accounts/hooks/useAccountMutations.ts`
  - `src/features/accounts/hooks/useAccountTotals.ts`
  - `src/features/accounts/hooks/useAccountTotals.test.ts`
  - `src/features/accounts/hooks/useAccountMutations.test.ts`
  - `src/features/accounts/index.ts`
- **Проверка:** `pnpm test`

### T4: UI-компоненты фичи (`AccountCard`, `AccountSummaryHeader`, `AccountList`, `AccountForm`)
- **Что делаем:**
  1. Создать `src/features/accounts/components/AccountSummaryHeader.tsx` (KPI общего баланса и чипы по типам).
  2. Создать `src/features/accounts/components/AccountCard.tsx` (карточка счёта с иконкой, `MoneyText`, начальным балансом и меню действий).
  3. Создать `src/features/accounts/components/AccountList.tsx` (сетка счетов с поддержкой состояний и тумблера архива).
  4. Создать `src/features/accounts/components/AccountForm.tsx` (форма в `ResponsiveDialog` на базе React Hook Form + Zod с полями имени, типа и `AmountInput`).
  5. Написать компонентные тесты: `AccountSummaryHeader.test.tsx`, `AccountCard.test.tsx`, `AccountList.test.tsx`, `AccountForm.test.tsx`.
- **Файлы:**
  - `src/features/accounts/components/AccountSummaryHeader.tsx`
  - `src/features/accounts/components/AccountCard.tsx`
  - `src/features/accounts/components/AccountList.tsx`
  - `src/features/accounts/components/AccountForm.tsx`
  - `src/features/accounts/components/*.test.tsx`
  - `src/features/accounts/index.ts`
- **Проверка:** `pnpm test`

### T5: Страница `AccountsPage`, роутинг и i18n-локализация
- **Что делаем:**
  1. Зарегистрировать неймспейс `accounts` в `src/i18n/config.ts` и `src/i18n/types.ts`.
  2. Создать файлы локализации `src/i18n/locales/en/accounts.json` и `src/i18n/locales/ru/accounts.json`.
  3. Реализовать страницу `src/app/pages/AccountsPage.tsx` взамен плейсхолдера, связав `PageHeader`, `AccountSummaryHeader`, `AccountList`, `AccountForm` и `QueryBoundary`.
  4. Написать компонентные тесты страницы `src/app/pages/AccountsPage.test.tsx` (проверка всех 5 состояний, переключения архива, открытия диалогов).
- **Файлы:**
  - `src/i18n/config.ts`
  - `src/i18n/types.ts`
  - `src/i18n/locales/en/accounts.json`
  - `src/i18n/locales/ru/accounts.json`
  - `src/app/pages/AccountsPage.tsx`
  - `src/app/pages/AccountsPage.test.tsx`
- **Проверка:** `pnpm typecheck && pnpm lint && pnpm test`

### T6: Интеграция с транзакциями и Playwright E2E-тесты
- **Что делаем:**
  1. Обновить `src/features/transactions/components/TransactionItem.tsx` и `src/features/transactions/components/TransactionForm.tsx` для использования `getAccountDisplayName` и `AccountBadge`.
  2. Создать сценарии сквозного тестирования `e2e/accounts.spec.ts`:
     - Создание нового счёта карты с начальным остатком.
     - Создание расхода с привязкой к новому счёту и проверка списания баланса.
     - Запуск пересчёта баланса и подтверждение точного результата.
     - Архивация счёта и проверка его скрытия из селектора транзакций.
- **Файлы:**
  - `src/features/transactions/components/TransactionItem.tsx`
  - `src/features/transactions/components/TransactionForm.tsx`
  - `src/features/transactions/components/TransactionForm.test.tsx`
  - `e2e/accounts.spec.ts`
- **Проверка:** `pnpm test && pnpm e2e`

### T7: Верификация (`verify`), аудит качества и обновление документации
- **Что делаем:**
  1. Провести полный цикл проверок: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
  2. Проверить выполнение правил слоёв и DRY-соответствие.
  3. Обновить статус фичи F07 в `docs/06-roadmap.md` (`todo` → `done`).
  4. Составить финальный отчёт верификации.
- **Файлы:**
  - `docs/06-roadmap.md`
  - `docs/feature-specs/F07-accounts.md`
- **Проверка:** Полный прогон `verify`

---

## 14. Definition of Done

Фича считается завершённой, когда:
- [x] Все задачи T1–T7 выполнены, коммиты оформлены по Conventional Commits.
- [x] Все критерии приёмки (AC-1 — AC-7, AC-STATES, AC-I18N, AC-A11Y, AC-ARCH) выполнены и проверены.
- [x] Интеграционные тесты на эмуляторе Firestore подтверждают корректность атомарных дельт и пересчёта `recalculateAccountBalance`.
- [x] E2E-тесты Playwright в `e2e/accounts.spec.ts` успешно проходят.
- [x] Проверки `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` завершаются без ошибок и предупреждений.
- [x] Статус фичи в `docs/06-roadmap.md` обновлён на `done`.
- [x] Все открытые вопросы и ограничения зафиксированы в разделе 15.

---

## 15. Журнал решений и открытые вопросы

| Дата | Вопрос / Решение | Статус |
|---|---|---|
| 2026-10-06 | Создание общего компонента `AccountBadge` в `src/components/common/` для устранения дублирования рендеринга типов и имён счетов между транзакциями и счетами | Утверждено |
| 2026-10-06 | Однополевой запрос `where('accountId', '==', accountId)` в `recalculateAccountBalance` без добавления составных индексов | Утверждено |
| 2026-10-06 | Запрет на архивацию последнего активного счёта в UI | Утверждено |
