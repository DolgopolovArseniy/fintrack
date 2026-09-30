# 02. Модель данных, индексы и Security Rules

Статус: draft v1 · Любое изменение схемы, rules или индексов требует явного согласования и обновления этого файла.

## 1. Структура

```
users/{uid}                        профиль
  ├─ accounts/{accountId}          счета
  ├─ categories/{categoryId}       категории
  ├─ transactions/{txId}           операции
  └─ budgets/{YYYY-MM_categoryId}  бюджеты
```

Все данные пользователя лежат под его `uid` (ADR-005). Другие пути запрещены правилами.

## 2. Общие правила документов

- **Деньги:** целые числа в minor units (ADR-003). Валюта берётся из профиля.
- **Даты транзакций:** строка `YYYY-MM-DD` (ADR-004). Месяц: `YYYY-MM`.
- **Служебные времена:** `createdAt`, `updatedAt` это серверные `Timestamp` (`serverTimestamp()`). В приложении преобразуются в `Date` в converter.
- **Нет `null`:** необязательное поле отсутствует. При очистке используется `deleteField()`.
- **Неизвестные поля запрещены** (rules проверяют `hasOnly`).
- **Мягкое удаление** для категорий и счетов (`archived: true`), так как на них ссылаются транзакции.
- **Ссылки по id, без денормализации названий.** Название категории подставляется на клиенте.
- **Валидация на чтении:** converter парсит документ схемой Zod. Битый документ логируется и пропускается, UI не падает.

## 3. Документы

### 3.1 `users/{uid}` — профиль

| Поле | Тип | Обязательно | Правило |
|---|---|---|---|
| `baseCurrency` | string | да | Из whitelist (см. rules), валюты с 2 знаками |
| `locale` | string | да | `en` или `ru` |
| `theme` | string | да | `light`, `dark`, `system` |
| `schemaVersion` | int | да | Сейчас `1` |
| `displayName` | string | нет | 0–60 |
| `createdAt`, `updatedAt` | timestamp | да | Серверные |

Наличие документа профиля означает, что онбординг завершён.

### 3.2 `accounts/{accountId}`

| Поле | Тип | Обязательно | Правило |
|---|---|---|---|
| `type` | string | да | `cash`, `card`, `bank` |
| `balance` | int | да | Текущий баланс, может быть отрицательным. ±10¹² |
| `initialBalance` | int | да | Начальный баланс (нужен для пересчёта) |
| `archived` | bool | да | |
| `name` | string | нет* | 1–40 |
| `systemKey` | string | нет* | 1–30, например `main` |
| `createdAt`, `updatedAt` | timestamp | да | |

\* Должно быть хотя бы одно из `name`, `systemKey`. Отображаемое имя: `name` если есть, иначе перевод по `systemKey` (ADR-011).

### 3.3 `categories/{categoryId}`

| Поле | Тип | Обязательно | Правило |
|---|---|---|---|
| `type` | string | да | `expense` или `income`. **Не меняется** после создания |
| `icon` | string | да | Имя иконки lucide, 1–40 |
| `color` | string | да | Ключ цвета из палитры (`04-ux-guidelines.md`), 1–20 |
| `archived` | bool | да | |
| `name` | string | нет* | 1–40 |
| `systemKey` | string | нет* | 1–30, например `food` |
| `createdAt`, `updatedAt` | timestamp | да | |

### 3.4 `transactions/{txId}`

| Поле | Тип | Обязательно | Правило |
|---|---|---|---|
| `type` | string | да | `expense` или `income` |
| `amount` | int | да | 1 … 10¹¹, **всегда положительный** |
| `accountId` | string | да | Существующий счёт (проверяет repository) |
| `categoryId` | string | да | Существующая категория того же `type` (проверяет repository) |
| `date` | string | да | `YYYY-MM-DD`, валидный формат |
| `note` | string | нет | 0–200 (пустая заметка не хранится) |
| `tags` | list | нет | До 10 элементов (Could) |
| `createdAt`, `updatedAt` | timestamp | да | |

### 3.5 `budgets/{YYYY-MM_categoryId}`

Id документа: `{month}_{categoryId}` (ADR-012). Так «один бюджет на категорию и месяц» гарантируется без запросов.

| Поле | Тип | Обязательно | Правило |
|---|---|---|---|
| `categoryId` | string | да | Категория расходов (проверяет repository) |
| `month` | string | да | `YYYY-MM` |
| `limit` | int | да | 1 … 10¹¹ |
| `createdAt`, `updatedAt` | timestamp | да | |

## 4. Деньги и валюта

- Поддерживаются валюты с двумя десятичными знаками. Whitelist в `lib/currencies.ts` **и** в rules, рассинхрон ловит тест.
- Смена `baseCurrency` в настройках меняет только отображение. Суммы **не конвертируются**. Пользователь видит предупреждение.
- Число знаков берётся из `Intl.NumberFormat(...).resolvedOptions()`, а не хардкодится.

## 5. Баланс счёта

Баланс хранится готовым числом. Считать его суммой всех транзакций дорого (платим за каждое прочитанное).

**Знак операции:** `signedAmount(tx) = tx.type === 'income' ? +amount : -amount`.

**Единая чистая функция** `balanceDeltas(before: Tx | null, after: Tx | null): Map<accountId, delta>` (domain) используется для создания, изменения и удаления. Она единственная знает логику баланса (DRY).

| Операция | `before` | `after` | Результат |
|---|---|---|---|
| Создание | `null` | tx | `+signed(tx)` на счёт |
| Удаление | tx | `null` | `−signed(tx)` со счёта |
| Изменение суммы, типа | tx₀ | tx₁ | Разница на счёте |
| Смена счёта | tx₀ | tx₁ | `−signed(tx₀)` на старом, `+signed(tx₁)` на новом |

**Запись:** один `writeBatch`: запись транзакции и `update(account, { balance: increment(delta), updatedAt: serverTimestamp() })` для каждого затронутого счёта с `delta ≠ 0`. `increment` и batch работают offline, `runTransaction` нет.

**Пересчёт (`recalculateAccountBalance`):** `initialBalance + Σ signed(tx)` по всем транзакциям счёта (запрос по `accountId`, без индексов). Результат записывается в `balance`. Функция покрыта тестом и доступна в UI (F07).

**Изменение `initialBalance`** применяется как `increment(newInitial − oldInitial)` к `balance` в том же batch.

## 6. Запросы и индексы

### 6.1 Дизайн запросов

| Экран | Запрос | Индекс |
|---|---|---|
| Транзакции, месяц | `where date >= 'YYYY-MM-01' and date <= 'YYYY-MM-31'`, `orderBy date desc` | Автоматический (одно поле) |
| Дашборд, последние N месяцев | Тот же запрос на диапазон из N месяцев | Автоматический |
| Пересчёт баланса | `where accountId == X` | Автоматический |
| Бюджеты месяца | `where month == 'YYYY-MM'` | Автоматический |
| Категории, счета | Все документы подколлекции | Не нужен |

**Фильтры** (категория, счёт, тип, поиск по заметке) **применяются на клиенте** к загруженной выборке месяца (ADR-010). Причины: не нужны составные индексы, фильтры мгновенные, нет повторных платных чтений. Порядок внутри дня: сортировка на клиенте по `createdAt desc` (pending-запись с оценкой времени идёт первой).

### 6.2 `firestore.indexes.json`

В v1 **составных индексов нет**. Файл хранится в репозитории с пустым списком `indexes`. Если агенту кажется, что нужен индекс, он останавливается и сообщает: скорее всего запрос нужно перепроектировать.

### 6.3 Стоимость и квоты

Бесплатный план Spark ограничен в сутки (порядок: 50 тыс. чтений, 20 тыс. записей, 20 тыс. удалений, 1 ГиБ). Точные цифры сверить в документации.

- Дашборд читает несколько месяцев одним диапазоном. Подписка `onSnapshot` с локальным кешем повторно читает только изменения.
- **Demo-сид** пишет порядка 100 документов на сессию (профиль, категории, счёт, ~80 транзакций за ~4 месяца). Это примерно 200 демо-сессий в сутки до лимита записей. Если лимит исчерпан, запись не пройдёт. Мониторим, план Б: in-memory демо (ADR-009).

## 7. Пакетные операции

- Лимит batch: **500 операций**. Рабочий размер: **до 400 транзакций на batch** плюс обновления балансов.
- В пределах одного batch дельты одного счёта **агрегируются** в один `increment` (нет горячих записей в один документ).
- Импорт CSV режется на чанки. Каждый чанк атомарен. Отчёт показывает, какие чанки записались.
- Онбординг: **один batch** (профиль, категории, счёт «Основной»).
- Удаление данных аккаунта: чтение страницами (например по 400) и удаление batch'ами по подколлекциям, затем профиль, затем `deleteUser` (нужна недавняя повторная аутентификация).

## 8. Онбординг и дефолтные данные

Создаются в момент, когда у пользователя нет профиля.

- **Профиль:** `locale` из браузера (`ru` → `ru`, иначе `en`), `baseCurrency` по выбору (по умолчанию USD), `theme: 'system'`, `schemaVersion: 1`.
- **Счёт:** `systemKey: 'main'`, `type: 'cash'`, `balance: 0`, `initialBalance: 0`.
- **Категории расходов (`systemKey`):** `food`, `transport`, `housing`, `utilities`, `health`, `entertainment`, `shopping`, `other_expense`.
- **Категории доходов:** `salary`, `gift`, `other_income`.
- Иконки и цвета для дефолтов задаются в одном файле-константе фичи `categories`.

## 9. Схемы и контракты (Zod, эталон)

Доменные типы выводятся из схем (`z.infer`). Zod-синтаксис и версия сверяются через Context7. Пример для транзакции:

```ts
// features/transactions/schemas.ts
export const transactionTypeSchema = z.enum(['expense', 'income'])

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive().max(MAX_AMOUNT),
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  date: isoDateSchema,              // 'YYYY-MM-DD', из lib/dates
  note: z.string().max(200).optional(),
})

export type TransactionInput = z.infer<typeof transactionInputSchema>
export type Transaction = TransactionInput & {
  id: string
  createdAt: Date
  updatedAt: Date
}
```

Общая фабрика `createConverter(schema)` в `lib/firestore/` превращает `Timestamp` в `Date`, парсит схему и применяется ко всем коллекциям. Это исключает дублирование converter'ов.

## 10. Версионирование схемы

В профиле хранится `schemaVersion` (сейчас `1`). Изменения схемы: новое поле делаем необязательным, `Zod` читает старые документы с дефолтом. Если нужна миграция, при старте приложения выполняется функция миграции по `schemaVersion`, документируется отдельным ADR.

## 11. Security Rules (`firestore.rules`)

Правила выполняются на стороне Google перед каждой операцией. Принцип: **запрещено всё, что не разрешено явно.** Совпадение путей вне `users/{uid}/...` даёт отказ.

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ---------- Общие функции ----------
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }

    // Только перечисленные поля: все обязательные и, возможно, необязательные.
    function hasExactKeys(required, optional) {
      let keys = incoming().keys();
      return keys.hasAll(required) && keys.hasOnly(required.concat(optional));
    }

    function isText(value, minLen, maxLen) {
      return value is string && value.size() >= minLen && value.size() <= maxLen;
    }

    function isIntBetween(value, minValue, maxValue) {
      return value is int && value >= minValue && value <= maxValue;
    }

    function isOptionalText(field, minLen, maxLen) {
      return !(field in incoming()) || isText(incoming()[field], minLen, maxLen);
    }

    // createdAt и updatedAt обязаны быть серверным временем запроса.
    function createStamps() {
      return incoming().createdAt == request.time
          && incoming().updatedAt == request.time;
    }

    // createdAt неизменяем, updatedAt обновляется сервером.
    function updateStamps() {
      return incoming().createdAt == existing().createdAt
          && incoming().updatedAt == request.time;
    }

    // ---------- Валидаторы документов ----------
    function validProfile() {
      let d = incoming();
      return hasExactKeys(
               ['baseCurrency', 'locale', 'theme', 'schemaVersion', 'createdAt', 'updatedAt'],
               ['displayName'])
        && d.baseCurrency in ['USD', 'EUR', 'GBP', 'UAH', 'PLN', 'CZK', 'CHF', 'CAD', 'AUD']
        && d.locale in ['en', 'ru']
        && d.theme in ['light', 'dark', 'system']
        && isIntBetween(d.schemaVersion, 1, 1000)
        && isOptionalText('displayName', 0, 60);
    }

    function validAccount() {
      let d = incoming();
      return hasExactKeys(
               ['type', 'balance', 'initialBalance', 'archived', 'createdAt', 'updatedAt'],
               ['name', 'systemKey'])
        && ('name' in d || 'systemKey' in d)
        && d.type in ['cash', 'card', 'bank']
        && isIntBetween(d.balance, -1000000000000, 1000000000000)
        && isIntBetween(d.initialBalance, -1000000000000, 1000000000000)
        && d.archived is bool
        && isOptionalText('name', 1, 40)
        && isOptionalText('systemKey', 1, 30);
    }

    function validCategory() {
      let d = incoming();
      return hasExactKeys(
               ['type', 'icon', 'color', 'archived', 'createdAt', 'updatedAt'],
               ['name', 'systemKey'])
        && ('name' in d || 'systemKey' in d)
        && d.type in ['expense', 'income']
        && isText(d.icon, 1, 40)
        && isText(d.color, 1, 20)
        && d.archived is bool
        && isOptionalText('name', 1, 40)
        && isOptionalText('systemKey', 1, 30);
    }

    function validTransaction() {
      let d = incoming();
      return hasExactKeys(
               ['type', 'amount', 'accountId', 'categoryId', 'date', 'createdAt', 'updatedAt'],
               ['note', 'tags'])
        && d.type in ['expense', 'income']
        && isIntBetween(d.amount, 1, 100000000000)
        && isText(d.accountId, 1, 64)
        && isText(d.categoryId, 1, 64)
        && d.date is string
        && d.date.matches('^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$')
        && isOptionalText('note', 0, 200)
        && (!('tags' in d) || (d.tags is list && d.tags.size() <= 10));
    }

    function validBudget(budgetId) {
      let d = incoming();
      return hasExactKeys(
               ['categoryId', 'month', 'limit', 'createdAt', 'updatedAt'],
               [])
        && isText(d.categoryId, 1, 64)
        && d.month is string
        && d.month.matches('^[0-9]{4}-(0[1-9]|1[0-2])$')
        && budgetId == d.month + '_' + d.categoryId
        && isIntBetween(d.limit, 1, 100000000000);
    }

    // ---------- Пути ----------
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && validProfile() && createStamps();
      allow update: if isOwner(uid) && validProfile() && updateStamps();
      allow delete: if isOwner(uid);

      match /accounts/{accountId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && validAccount() && createStamps();
        allow update: if isOwner(uid) && validAccount() && updateStamps();
        allow delete: if isOwner(uid);
      }

      match /categories/{categoryId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && validCategory() && createStamps();
        allow update: if isOwner(uid) && validCategory() && updateStamps()
                      && incoming().type == existing().type;
        allow delete: if isOwner(uid);
      }

      match /transactions/{txId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && validTransaction() && createStamps();
        allow update: if isOwner(uid) && validTransaction() && updateStamps();
        allow delete: if isOwner(uid);
      }

      match /budgets/{budgetId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && validBudget(budgetId) && createStamps();
        allow update: if isOwner(uid) && validBudget(budgetId) && updateStamps();
        allow delete: if isOwner(uid);
      }
    }
  }
}
```

### Что rules намеренно НЕ проверяют

- **Существование счёта и категории** (`exists()`/`get()`). У Firestore есть лимит на число таких обращений в одном запросе (для batch он невелик), а импорт пишет сотни транзакций одним batch. Целостность ссылок проверяет repository.
- **Соответствие `type` транзакции и `type` категории**, **совпадение баланса с операциями**. Проверяет repository, баланс можно восстановить пересчётом.

Это осознанный компромисс, фиксируется в ADR.

### Синтаксис rules

Возможности языка rules (`concat`, `matches`, `in`, `let`) сверяются в документации Firebase и проверяются тестами. Если синтаксис в этом файле не проходит на эмуляторе, правим **по ошибке эмулятора** и обновляем файл.

## 12. Матрица доступа

| Путь | Владелец (свой uid) | Чужой пользователь | Аноним (не залогинен) |
|---|---|---|---|
| `users/{uid}` | read, create (валидный), update (валидный), delete | ✗ | ✗ |
| `users/{uid}/accounts/*` | read, create, update, delete (с валидацией) | ✗ | ✗ |
| `users/{uid}/categories/*` | то же, `type` не меняется | ✗ | ✗ |
| `users/{uid}/transactions/*` | то же, валидация полей | ✗ | ✗ |
| `users/{uid}/budgets/*` | то же, id совпадает с `month_categoryId` | ✗ | ✗ |
| Любой другой путь | ✗ | ✗ | ✗ |

Анонимный вход Firebase (demo) считается залогиненным пользователем со своим `uid` и имеет те же права на **свои** данные.

## 13. Тесты Security Rules (минимальный набор)

Запускаются на эмуляторе (`pnpm test:rules`), входят в CI.

| Группа | Проверка |
|---|---|
| Изоляция | Владелец читает и пишет своё. Чужой `uid` и незалогиненный получают отказ на read, write, list в каждой подколлекции |
| Пути | Запись в путь вне `users/{uid}/...` отклоняется |
| Схема | Лишнее поле, отсутствующее обязательное поле, неверный тип: отказ для каждого документа |
| Transactions | `amount` 0, отрицательный, не целое, слишком большой: отказ. Невалидные `date` (`2026-13-01`, `2026-9-1`): отказ. `note` > 200: отказ |
| Временные метки | `createdAt` не равен серверному времени при create: отказ. Изменение `createdAt` при update: отказ. `updatedAt` не обновлён: отказ |
| Categories | Смена `type` при update: отказ. Нет ни `name`, ни `systemKey`: отказ |
| Budgets | id не совпадает с `month_categoryId`: отказ. Неверный формат `month`: отказ |
| Профиль | Неподдерживаемая валюта, язык или тема: отказ |
| Whitelist | Список валют в `lib/currencies.ts` совпадает со списком в rules |
| Удаление | Владелец удаляет свои документы, чужой нет |

## 14. Миграции и изменения

1. Изменение схемы: обновить этот файл, Zod-схемы, rules, rules-тесты и добавить ADR.
2. Менять rules можно только с явным согласованием и с тестами в том же PR.
3. Деплой правил и индексов: `firebase deploy --only firestore`, выполняется CI при merge.
