# F11 — Settings & Data Management (Настройки, экспорт всех данных и удаление аккаунта)

Статус: spec-ready
Зависит от: F01 (доменные типы, валюты, локали, схемы, ошибки), F02 (аутентификация, профиль, `AuthProvider`, `authService`), F03 (Security Rules v1), F04 (категории), F05 (транзакции), F07 (счета), F08 (бюджеты), F09 (экспорт CSV, `importExport`)
Размер: M (6 задач: T1–T6)
Ветка: `feat/F11-settings`

> **Контекст для агента:** Фича F11 закрывает веху **M6 Account** (`docs/00-project-spec.md` §3, §4): «Данные пользователя принадлежат ему. Экспорт всех данных и полное удаление аккаунта входят в MVP». На этой странице пользователь управляет ключевыми параметрами приложения (базовая валюта, язык, тема оформления, имя профиля), может выполнить полный экспорт всех финансовых данных в единый файл JSON (Data Portability / GDPR), а также безвозвратно удалить свой аккаунт со всеми связанными подколлекциями с обязательной предварительной повторной аутентификацией (Re-authentication) и пакетным удалением (batch deletion).
> Перед реализацией агент обязательно читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7), `docs/02-data-model.md` (§3.1, §4, §7, §11, §12), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2–§4, §5 строка Settings, §6, §8, §9, §10), `docs/05-testing-strategy.md`.
> Справка по API библиотек (`firebase/auth`, `firebase/firestore`, Radix UI, React Hook Form, Zod, Sonner, i18next) запрашивается исключительно через **Context7**.

---

## 1. Цель и пользовательские истории

Предоставить пользователю централизованный экран управления профилем, предпочтениями приложения, переносимостью данных (Full Data Export) и необратимым безопасным удалением аккаунта (GDPR Right to Erasure) с соблюдением всех инвариантов безопасности и целостности данных.

### Пользовательские истории

1. **Как пользователь**, я хочу настроить базовую валюту аккаунта, понимая, что исторические суммы не конвертируются по курсу, а обновляется только символ валюты.
2. **Как пользователь**, я хочу переключать язык интерфейса (EN / RU) и тему оформления (Light / Dark / System), чтобы приложение выглядело и функционировало комфортно на моём устройстве.
3. **Как пользователь**, я хочу редактировать своё отображаемое имя (Display Name), чтобы персонализировать интерфейс и меню профиля.
4. **Как пользователь**, заботящийся о своих данных (Data Ownership), я хочу в один клик скачать полный структурированный архив всех своих данных (профиль, счета, категории, бюджеты, операции) в машиночитаемом формате JSON.
5. **Как пользователь**, решивший покинуть сервис, я хочу полностью и безвозвратно удалить свой аккаунт и абсолютно все связанные финансовые записи из базы данных, пройдя подтверждение паролем или Google-аккаунтом для защиты от случайного или несанкционированного удаления.
6. **Как демо-пользователь**, я хочу иметь возможность сбросить или удалить демо-сессию без ввода паролей.

---

## 2. Контекст для агента

### 2.1 Готовые модули кодовой базы

- `src/lib/currencies.ts`: `SUPPORTED_CURRENCIES` (9 валют), `DEFAULT_CURRENCY = 'USD'`, `isSupportedCurrency`, `getFractionDigits`.
- `src/lib/locales.ts`: `SUPPORTED_LOCALES = ['en', 'ru']`, `DEFAULT_LOCALE = 'en'`, `isSupportedLocale`.
- `src/lib/schemas.ts`: `currencySchema`, `localeSchema`.
- `src/lib/limits.ts`: `DISPLAY_NAME_MAX_LENGTH = 60`, `IMPORT_CHUNK_SIZE = 400`.
- `src/lib/firestore/paths.ts`: `userDoc(uid)`, `accountsCol(uid)`, `categoriesCol(uid)`, `transactionsCol(uid)`, `budgetsCol(uid)`.
- `src/features/auth/`:
  - `types.ts`: `AuthUser`, `AuthState`, `AuthContextValue`, `UserProfile`.
  - `schemas.ts`: `themeSchema`, `userProfileSchema`, `userProfileInputSchema`.
  - `authService.ts`: изоляция `firebase/auth` (`auth`, `toAuthUser`, `updateProfile`, `signOutUser`).
  - `repository.ts`: `getUserProfile`, `subscribeUserProfile`, `userProfileConverter`.
  - `AuthProvider.tsx`: контекст `useAuth()` с реактивной подпиской на профиль в Firestore.
- `src/app/providers/ThemeProvider.tsx`: `useTheme()`, `setTheme('light' | 'dark' | 'system')`, `storageKey = 'fintrack-theme'`.
- `src/i18n/config.ts`: `changeAppLanguage('en' | 'ru')`, `STORAGE_LANG_KEY = 'fintrack-lang'`.
- `src/components/common/`: `PageHeader`, `ResponsiveDialog`, `ConfirmDialog`, `LoadingSkeleton`, `ErrorState`, `EmptyState`, `PasswordInput`.
- `src/components/ui/`: `card`, `button`, `input`, `label`, `select`, `separator`, `alert`.

### 2.2 Архитектурные ограничения и инварианты

- **Границы импортов Firebase:**
  - `firebase/auth` импортируется **строго и только** в `src/features/auth/authService.ts` и `src/lib/firebase.ts`. Никаких импортов `firebase/auth` в компонентах или репозиториях настроек! Все операции re-auth и удаления auth-пользователя объявляются в `authService.ts` и экспортируются через публичный API `features/auth/index.ts`.
  - `firebase/firestore` импортируется **только** в `features/*/repository.ts`, `lib/firebase.ts` и `lib/firestore/*`.
- **Правило `users/{uid}` в Firestore Rules (`02-data-model.md` §11):**
  - Обновление профиля обязано передавать `updatedAt: serverTimestamp()`, сохранять `createdAt == existing().createdAt`, содержать поля `baseCurrency`, `locale`, `theme`, `schemaVersion` и опционально `displayName`.
  - Удаление поля `displayName` выполняется через `deleteField()`, а не `null`.
- **Пакетное удаление (batch deletion):**
  - Лимит одного `writeBatch` — 500 операций.
  - Удаление подколлекций `transactions`, `budgets`, `accounts`, `categories` выполняется чанками до 400 документов на batch (`02-data-model.md` §7).
- **Порядок удаления аккаунта:**
  - Сначала **Re-authentication**. Если пароль неверен или Google popup отменён — прерываемся **до** любых удалений в базе данных.
  - Затем удаление всех документов подколлекций чанками batch.
  - Затем удаление профиля `users/{uid}`.
  - Затем вызов `deleteUser(auth.currentUser)`.
- **Валюта:** смена базовой валюты меняет только отображение в UI, суммы в базе **не конвертируются** (`02-data-model.md` §4). Пользователь обязан увидеть явное предупреждение с подтверждением.

---

## 3. Скоуп

### Входит

1. **Секция «Профиль» (Profile Section):**
   - Отображение аватара с инициалами (компонент `Avatar`), email (read-only) со статусом подтверждения (бейдж Verified / Unverified).
   - Редактирование поля `displayName` (0–60 символов, trim, очистка через `deleteField()`). Синхронизация с Firebase Auth `updateProfile` и Firestore `users/{uid}`.
2. **Секция «Предпочтения» (Preferences Section):**
   - Выбор базовой валюты из 9 поддерживаемых (`USD`, `EUR`, `GBP`, `UAH`, `PLN`, `CZK`, `CHF`, `CAD`, `AUD`). При попытке смены — диалог-предупреждение (`CurrencyChangeDialog`) о том, что исторические суммы не конвертируются по курсу.
   - Выбор языка интерфейса (`en`, `ru`) с мгновенным переключением через `changeAppLanguage` и сохранением в Firestore + `localStorage`.
   - Выбор темы оформления (`light`, `dark`, `system`) с применением через `ThemeProvider` и сохранением в Firestore + `localStorage`.
3. **Секция «Управление данными» (Data Management Section):**
   - Кнопка «Экспорт всех данных (JSON)»: скачивание структурированного JSON-файла со всеми коллекциями (`profile`, `accounts`, `categories`, `budgets`, `transactions`) и метаданными версии и времени экспорта.
   - Ссылка-переход на существующий экран импорта/экспорта транзакций CSV (`/app/import-export`).
4. **Секция «Опасная зона» (Danger Zone Section):**
   - Карточка с акцентным стилем `destructive`.
   - Модальное окно подтверждения удаления аккаунта (`DeleteAccountDialog`):
     - Двойное подтверждение: ввод проверочного слова (например, `DELETE` или `УДАЛИТЬ`) для исключения случайных кликов.
     - Для пользователей с паролем: поле ввода текущего пароля и вызов `reauthenticateWithPassword`.
     - Для пользователей с Google: кнопка повторного подтверждения через Google Popup (`reauthenticateWithGoogle`).
     - Для демо-пользователей (`isAnonymous`): упрощённое удаление без ввода пароля.
     - Индикация пошагового прогресса удаления.
     - Удаление всех 4 подколлекций чанками batch (по 400 документов), удаление документа `users/{uid}`, вызов `deleteUser` в Auth, очистка локального состояния и редирект на `/login` с toast-уведомлением.
5. **Интеграция:** замена страницы-заглушки `SettingsPage.tsx`, новый файл локализации `settings.json` (EN и RU), регистрация namespace `settings` в `src/i18n/config.ts`.
6. **Тестирование:** unit-тесты домена и схем, интеграционные тесты репозитория и authService, компонентные тесты секций и диалогов, сквозной e2e-тест (настройки + экспорт + удаление аккаунта).

### Не входит (явно)

- Смена email и смена пароля (отдельный скоуп безопасности, при необходимости — Backlog / F13).
- Загрузка пользовательских фото-аватаров в Cloud Storage (в v1 используются initials и Google photoURL).
- Автоматическая конвертация исторических сумм при смене валюты (мультивалютность и курсы — Won't v1).
- Серверные триггеры / Cloud Functions (все операции выполняются клиентом в рамках Security Rules).
- Восстановление удалённого аккаунта (удаление окончательное и необратимое).

---

## 4. Решения фичи

| # | Вопрос / Проблема | Принятое решение | Обоснование |
|---|---|---|---|
| 1 | **Архитектурная изоляция Firebase Auth** | Функции `reauthenticateWithPassword`, `reauthenticateWithGoogle` и `deleteCurrentUserAccount` размещаются в `features/auth/authService.ts`. Фича `settings` вызывает их строго через публичный API `features/auth` | Правило `AGENTS.md` §7 строго запрещает импорт `firebase/auth` вне `authService.ts` и `lib/firebase.ts`. Полное соблюдение границ слоёв. |
| 2 | **Предупреждение при смене валюты** | Модальный диалог `CurrencyChangeDialog` (или `ConfirmDialog`) перед сохранением новой базовой валюты | Суммы в базе не конвертируются по курсу (`02-data-model.md` §4). Пользователь должен осознанно подтвердить, что меняется только символ отображения. |
| 3 | **Синхронизация языка и темы** | Двойное сохранение: реактивный вызов локальных провайдеров (`changeAppLanguage`, `setTheme`) + запись в документ `users/{uid}` в Firestore | Гарантирует мгновенный отклик UI без мерцания и перезагрузки, а также сохранение предпочтений в облачном профиле пользователя для других устройств. |
| 4 | **Формат полного экспорта данных** | Единый файл `fintrack-data-export-YYYY-MM-DD.json` (MIME: `application/json;charset=utf-8`), содержащий профиль и массивы документов всех 4 подколлекций | Простой, прозрачный формат без сторонних тяжелых библиотек архивации (типа JSZip). Полностью удовлетворяет требованиям GDPR Data Portability (`00-project-spec.md` §3). |
| 5 | **Защита от случайного удаления аккаунта** | Двойная защита: ввод контрольного слова подтверждения (`DELETE` / `УДАЛИТЬ`) + re-authentication провайдером входа | Исключает случайное нажатие. Предотвращает ошибки Firebase Auth `requires-recent-login`. |
| 6 | **Отказоустойчивость удаления (Failure Isolation)** | Проверка повторной аутентификации выполняется **ДО** удаления каких-либо данных из Firestore | Если введён неверный пароль или пользователь закрыл Google popup, ни один документ в базе не будет удалён. Исключается рассинхрон «данные удалены, а логин остался». |
| 7 | **Пакетное удаление больших объёмов данных** | Запрос документов каждой подколлекции (`transactions`, `budgets`, `accounts`, `categories`) и удаление чанками по 400 документов в отдельных `writeBatch` | Соответствует лимиту Firestore batch (500) и паттерну из `02-data-model.md` §7. Не вызывает переполнения транзакции. |
| 8 | **Особенности демо-пользователя (`isAnonymous`)** | Демо-аккаунт маркируется бейджем «Demo». При удалении не запрашивается пароль или Google re-auth; выполняется очистка подколлекций и `deleteUser` | У анонимного пользователя нет пароля и провайдеров. Сценарий сброса демки работает гладко в 1 клик подтверждения. |
| 9 | **Offline-поведение** | Просмотр настроек и изменение профиля/предпочтений работают offline через кеш Firestore. Экспорт всех данных и удаление аккаунта блокируются offline с понятным объяснением | Экспорт и Auth Re-authentication требуют живого сетевого подключения к серверам Firebase. |

---

## 5. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги пользователя | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Редактирование имени профиля** | Авторизован, открыт `/app/settings` | 1. Вводит новое имя в поле Display Name.<br>2. Нажимает «Сохранить». | Обновляется `users/{uid}` в Firestore и Firebase Auth. Toast «Имя профиля обновлено». Имя мгновенно обновляется в сайдбаре и шапке |
| 2 | **Смена языка интерфейса** | Язык EN, открыт `/app/settings` | 1. Выбирает в селекте «Русский». | Язык интерфейса мгновенно переключается на RU. Сохраняется в Firestore и `localStorage`. Toast на русском языке |
| 3 | **Смена темы оформления** | Тема Light, открыт `/app/settings` | 1. Выбирает тему «Dark» или «System». | Класс `dark` применяется к `html` без перезагрузки. Настройка сохраняется в Firestore и `localStorage` |
| 4 | **Смена базовой валюты с подтверждением** | Валюта USD, открыт `/app/settings` | 1. Выбирает EUR в селекте валюты.<br>2. Открывается диалог предупреждения.<br>3. Нажимает «Понимаю, изменить валюту». | Документ профиля обновляется (`baseCurrency: 'EUR'`). Toast об успешном изменении. Все суммы в приложении теперь отображаются со знаком € |
| 5 | **Отмена смены валюты** | Валюта USD | 1. Выбирает GBP.<br>2. В диалоге предупреждения нажимает «Отмена». | Значение в селекте возвращается к USD. Запись в базу не производится |
| 6 | **Полный экспорт всех данных в JSON** | Есть счета, категории, операции | 1. В секции данных нажимает «Экспортировать всё в JSON». | Кнопка переходит в loading. Читаются все коллекции, формируется JSON. Браузер скачивает `fintrack-data-export-YYYY-MM-DD.json`. Toast успеха |
| 7 | **Удаление аккаунта (Password Auth)** | Авторизован по email/паролю | 1. В Опасной зоне нажимает «Удалить аккаунт».<br>2. Вводит проверочное слово `DELETE`.<br>3. Вводит свой текущий пароль.<br>4. Нажимает «Удалить всё навсегда». | Re-auth успешен. Показывается прогресс удаления. Все подколлекции, профиль и auth-пользователь удаляются. Редирект на `/login` с toast об успешном удалении |
| 8 | **Удаление аккаунта: неверный пароль** | Авторизован по email/паролю | 1. Вводит неверный пароль в диалоге удаления.<br>2. Подтверждает. | Ошибка под полем «Неверный пароль». Ноль удалений в Firestore. Пользователь остаётся в системе |
| 9 | **Удаление аккаунта (Google Auth)** | Авторизован через Google | 1. В диалоге подтверждения вводит `DELETE`.<br>2. Нажимает кнопку «Подтвердить через Google».<br>3. Проходит Google popup. | Re-auth успешен. Запускается удаление данных и аккаунта, редирект на `/login` |
| 10 | **Офлайн-режим** | Пропала сеть (`OfflineBanner`) | 1. Открывает настройки. | Профиль, валюта, тема и язык доступны для редактирования (кешируются). Кнопки экспорта и удаления заблокированы с подсказкой «Недоступно в офлайн-режиме» |

---

## 6. UI и дизайн-система

### 6.1 Маршрут и структура страницы

- **Маршрут:** `/app/settings` (уже зарегистрирован в `ROUTES.settings` и в сайдбаре `navItems.ts`).
- **Заголовок страницы:** компонент `PageHeader` (`titleKey="settings.title"`, `descriptionKey="settings.description"`).
- **Контейнер страницы:** `max-w-4xl space-y-6 pb-12`.

### 6.2 Секции страницы

```
┌──────────────────────────────────────────────────────────────────┐
│ PageHeader: Settings / Настройки                                 │
├──────────────────────────────────────────────────────────────────┤
│ 1. ProfileSection (Card)                                         │
│    - Avatar (initials / photoURL) + Email + Verified Badge       │
│    - Form: Display Name (Input, 0-60 chars) + Button "Save"      │
├──────────────────────────────────────────────────────────────────┤
│ 2. PreferencesSection (Card)                                     │
│    - Base Currency (Select: USD, EUR...) -> CurrencyChangeDialog │
│    - Language (Select: English, Русский)                         │
│    - Theme (Select: Light, Dark, System)                         │
├──────────────────────────────────────────────────────────────────┤
│ 3. DataManagementSection (Card)                                  │
│    - Full Data Export (Button with Download icon -> JSON file)   │
│    - Quick link to CSV Import / Export page                      │
├──────────────────────────────────────────────────────────────────┤
│ 4. DangerZoneSection (Card with border-destructive/40)           │
│    - Description of permanent account erasure                    │
│    - Delete Account Button (variant="destructive")               │
│      -> DeleteAccountDialog (Double confirmation + Re-auth)      │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Диалоги фичи

1. **`CurrencyChangeDialog` (`ResponsiveDialog`):**
   - Заголовок: «Изменить базовую валюту?».
   - Описание: предупреждение о том, что существующие транзакции не конвертируются по обменному курсу.
   - Кнопки: «Отмена» (`variant="outline"`) и «Изменить валюту» (`variant="default"`).
2. **`DeleteAccountDialog` (`ResponsiveDialog`):**
   - Заголовок: «Удаление аккаунта и данных».
   - Предупреждение: блок `Alert variant="destructive"` с перечислением удаляемых сущностей (счета, категории, операции, бюджеты).
   - Шаг 1: Инпут подтверждения — ввод точной строки `DELETE` (или `УДАЛИТЬ` в русской локали).
   - Шаг 2 (для email-пользователей): `PasswordInput` для ввода текущего пароля.
   - Шаг 2 (для Google-пользователей): кнопка «Войти через Google для подтверждения».
   - Состояние удаления: индикатор прогресса (спиннер + текстовый статус: «Удаление операций...», «Удаление профиля...»).
   - Кнопка подтверждения: `Button variant="destructive"`, активна только при совпадении проверочного слова и заполненном пароле (для email-пользователей).

### 6.4 Переиспользование (DRY-матрица)

| UI-элемент | Источник | Статус в F11 |
|---|---|---|
| Заголовок страницы | `src/components/common/PageHeader` | Готовый |
| Карточки и сетка | `src/components/ui/card` | Готовые |
| Диалоги и модалки | `src/components/common/ResponsiveDialog`, `ConfirmDialog` | Готовые |
| Поле ввода пароля | `src/components/common/PasswordInput` | Готовый |
| Селекты и выпадающие списки | `src/components/ui/select` | Готовые |
| Инпуты и формы | `src/components/ui/input`, `form`, `label` | Готовые |
| Кнопки и спиннеры | `src/components/ui/button` | Готовые |
| Предупреждения | `src/components/ui/alert` | Готовый |
| Бейджи | `src/components/ui/badge` (или локальный бейдж) | Готовый |
| Тосты уведомлений | `sonner` (`toast.success`, `toast.error`) | Готовые |
| Секции настроек | `src/features/settings/components/` | **Создать в T4** |
| Диалог удаления аккаунта | `src/features/settings/components/DeleteAccountDialog` | **Создать в T4** |
| Замена плейсхолдера страницы | `src/app/pages/SettingsPage.tsx` | **Обновить в T5** |

### 6.5 Обязательные состояния экрана

- **Loading:** при первичной загрузке страницы, пока `auth.profileStatus === 'loading'`, рендерится `LoadingSkeleton` по форме карточек настроек.
- **Empty:** для страницы настроек отсутствует (профиль всегда существует после онбординга).
- **Error:** при критическом сбое чтения профиля отображается `ErrorState` с кнопкой «Повторить».
- **Offline:** сверху страницы активен `OfflineBanner`. Секция профиля и предпочтений остаётся активной. Кнопки «Экспорт всех данных» и «Удалить аккаунт» становятся неактивными (`disabled`) с подсказкой о недоступности без сети.
- **Success:** при успешном сохранении настроек или скачивании файла выводится toast уведомление `sonner`.

---

## 7. Данные и безопасность

### 7.1 Структура экспортируемого JSON (`FullUserDataDump`)

```ts
export interface FullUserDataDump {
  version: number; // 1
  exportedAt: string; // ISO 8601 UTC string: 2026-10-19T12:00:00.000Z
  appName: string; // 'FinTrack'
  profile: {
    uid: string;
    email: string | null;
    displayName: string | null;
    baseCurrency: string;
    locale: string;
    theme: string;
    createdAt: string;
    updatedAt: string;
  };
  accounts: Array<{
    id: string;
    name?: string;
    systemKey?: string;
    type: string;
    balance: number;
    initialBalance: number;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  categories: Array<{
    id: string;
    name?: string;
    systemKey?: string;
    type: string;
    icon: string;
    color: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  budgets: Array<{
    id: string;
    categoryId: string;
    month: string;
    limit: number;
    createdAt: string;
    updatedAt: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    accountId: string;
    categoryId: string;
    date: string;
    note?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}
```

### 7.2 Пакетное удаление данных (Batch Deletion Protocol)

В Firestore удаление родительского документа **не удаляет** его подколлекции автоматически. Поэтому удаление пользователя выполняется строго по следующему протоколу:

```
[1. Re-authenticate user via AuthProvider]
       │
       ▼ (if success)
[2. Query all users/{uid}/transactions] ──► Chunk by 400 ──► writeBatch.delete() loop
       │
       ▼
[3. Query all users/{uid}/budgets]      ──► Chunk by 400 ──► writeBatch.delete() loop
       │
       ▼
[4. Query all users/{uid}/accounts]     ──► Chunk by 400 ──► writeBatch.delete() loop
       │
       ▼
[5. Query all users/{uid}/categories]   ──► Chunk by 400 ──► writeBatch.delete() loop
       │
       ▼
[6. Delete users/{uid} profile doc]     ──► deleteDoc(userDoc(uid))
       │
       ▼
[7. Delete Firebase Auth User]          ──► deleteUser(currentUser)
       │
       ▼
[8. Clear Local Storage & Redirect]     ──► navigate('/login')
```

- Все запросы выполняются по подколлекциям текущего `uid` пользователя. Согласно `firestore.rules`, владелец имеет полные права на чтение и удаление всех документов внутри своего пути `users/{uid}/**`.

---

## 8. Контракты и архитектура

### 8.1 Дополнения в `src/features/auth/authService.ts`

```ts
/**
 * Re-authenticates the current user using email and password.
 * Throws AppError on failure (e.g. wrong password).
 */
export async function reauthenticateWithPassword(password: string): Promise<void>;

/**
 * Re-authenticates the current user using Google popup.
 * Throws AppError on failure or cancellation.
 */
export async function reauthenticateWithGoogle(): Promise<void>;

/**
 * Permanently deletes the current Firebase Auth user record.
 * Throws AppError if re-authentication is expired.
 */
export async function deleteCurrentUserAccount(): Promise<void>;
```

### 8.2 Репозиторий `src/features/settings/repository.ts`

```ts
export interface UpdateProfileInput {
  displayName?: string;
  baseCurrency?: CurrencyCode;
  locale?: Locale;
  theme?: Theme;
}

export type DeletionPhase =
  | 'reauth'
  | 'transactions'
  | 'budgets'
  | 'accounts'
  | 'categories'
  | 'profile'
  | 'auth'
  | 'done';

export interface DeletionProgress {
  phase: DeletionPhase;
  deletedItems: number;
  totalItems?: number;
}

/**
 * Updates user profile fields in users/{uid}.
 * Ensures exact keys rule and updatedAt serverTimestamp().
 */
export async function updateUserProfile(
  uid: string,
  input: UpdateProfileInput,
): Promise<void>;

/**
 * Fetches all user data across all subcollections for JSON export.
 */
export async function fetchAllUserData(uid: string): Promise<FullUserDataDump>;

/**
 * Deletes all user documents in batches of 400, then deletes user profile.
 */
export async function deleteAllUserFirestoreData(
  uid: string,
  onProgress?: (progress: DeletionProgress) => void,
): Promise<void>;
```

### 8.3 Хуки `src/features/settings/hooks/`

- **`useProfileSettings()`**:
  - Возвращает `{ profile, isSaving, updateDisplayName, updateCurrency, updateLocale, updateTheme }`.
  - Инкапсулирует вызовы `updateUserProfile`, синхронизацию с `i18n`, `ThemeProvider`, Firebase Auth `updateProfile`, и отображение тостов.
- **`useFullDataExport()`**:
  - Возвращает `{ exportData, isExporting }`.
  - Загружает данные через `fetchAllUserData`, генерирует JSON Blob, инициирует загрузку через скрытый `<a>` элемент, обрабатывает ошибки.
- **`useAccountDeletion()`**:
  - Возвращает `{ deleteAccount, isDeleting, progress, error, resetState }`.
  - Управляет последовательностью Re-auth → Firestore batch deletion → Auth deletion → Sign out / Redirect.

### 8.4 Публичный API фичи `src/features/settings/index.ts`

```ts
export { SettingsPage } from './components/SettingsPage';
export { ProfileSection } from './components/ProfileSection';
export { PreferencesSection } from './components/PreferencesSection';
export { DataManagementSection } from './components/DataManagementSection';
export { DangerZoneSection } from './components/DangerZoneSection';
export { CurrencyChangeDialog } from './components/CurrencyChangeDialog';
export { DeleteAccountDialog } from './components/DeleteAccountDialog';

export { useProfileSettings } from './hooks/useProfileSettings';
export { useFullDataExport } from './hooks/useFullDataExport';
export { useAccountDeletion } from './hooks/useAccountDeletion';

export {
  updateUserProfile,
  fetchAllUserData,
  deleteAllUserFirestoreData,
} from './repository';
export type { FullUserDataDump, DeletionProgress } from './repository';
```

---

## 9. Валидация и ошибки

### 9.1 Zod-схемы (`src/features/settings/schemas.ts`)

```ts
import { z } from 'zod';
import { currencySchema, localeSchema } from '@/lib/schemas';
import { themeSchema } from '@/features/auth';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';

export const updateDisplayNameSchema = z.object({
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .transform((val) => val.trim()),
});

export const updateCurrencySchema = z.object({
  baseCurrency: currencySchema,
});

export const deleteAccountConfirmationSchema = z.object({
  confirmationPhrase: z.string().min(1, { error: 'validation.required' }),
  password: z.string().optional(),
});
```

### 9.2 Матрица ошибок

| Ситуация | Код / Тип | Сообщение для пользователя (i18n ключ) |
|---|---|---|
| Слишком длинное имя (> 60) | `validation.tooLong` | `validation.tooLong` |
| Ошибка сети при сохранении профиля | `unavailable` | `settings.errors.saveFailed` |
| Неверный пароль при Re-auth | `auth/wrong-password` / `auth/invalid-credential` | `settings.dangerZone.wrongPassword` |
| Ошибка Google Popup при Re-auth | `auth/popup-closed-by-user` | `settings.dangerZone.popupClosed` |
| Сбой экспорта данных | `export_failed` | `settings.data.exportFailed` |
| Сбой пакетного удаления в Firestore | `deletion_failed` | `settings.dangerZone.deletionFailed` |
| Несовпадение слова подтверждения | `phrase_mismatch` | `settings.dangerZone.phraseMismatch` |

---

## 10. i18n-ключи (`settings.json`)

### 10.1 English (`src/i18n/locales/en/settings.json`)

```json
{
  "title": "Settings",
  "description": "Manage your profile, application preferences, data export and account",
  "profile": {
    "title": "Profile",
    "description": "Personal information and account credentials",
    "emailLabel": "Email address",
    "verifiedBadge": "Verified",
    "unverifiedBadge": "Unverified",
    "displayNameLabel": "Display Name",
    "displayNamePlaceholder": "Enter your name",
    "saveButton": "Save changes",
    "saving": "Saving...",
    "successToast": "Profile updated successfully"
  },
  "preferences": {
    "title": "Preferences",
    "description": "Customize your display currency, language, and theme",
    "currencyLabel": "Base currency",
    "currencyHelp": "Currency used across all account balances and transaction totals",
    "languageLabel": "Language",
    "themeLabel": "Theme",
    "themeLight": "Light",
    "themeDark": "Dark",
    "themeSystem": "System",
    "currencyChangeDialog": {
      "title": "Change base currency?",
      "warning": "Changing your base currency only updates the currency symbol displayed across your accounts and reports. Historical transaction amounts will NOT be converted using exchange rates.",
      "confirmButton": "I understand, change currency",
      "cancelButton": "Cancel"
    },
    "currencyUpdatedToast": "Base currency updated to {{currency}}",
    "languageUpdatedToast": "Language changed to English",
    "themeUpdatedToast": "Theme updated"
  },
  "data": {
    "title": "Data Management",
    "description": "Export your financial history or transfer data",
    "exportJsonTitle": "Full Data Export (JSON)",
    "exportJsonDescription": "Download a comprehensive backup of your profile, accounts, categories, budgets, and all transactions in JSON format.",
    "exportJsonButton": "Export All Data (JSON)",
    "exporting": "Generating export...",
    "exportSuccessToast": "Data export downloaded successfully",
    "exportFailed": "Failed to export data. Please try again.",
    "csvLink": "Looking for CSV format? Visit Import & Export transactions page"
  },
  "dangerZone": {
    "title": "Danger Zone",
    "description": "Irreversible account and data actions",
    "deleteAccountTitle": "Delete Account & Data",
    "deleteAccountDescription": "Permanently remove your account, profile, all accounts, categories, budgets, and financial transactions. This action cannot be undone.",
    "deleteAccountButton": "Delete Account",
    "dialog": {
      "title": "Delete account and all data",
      "warning": "This action is permanent and completely irreversible. All your transactions, accounts, categories, and budgets will be permanently deleted.",
      "confirmationPrompt": "To confirm deletion, please type DELETE below:",
      "expectedPhrase": "DELETE",
      "passwordLabel": "Enter your password to confirm:",
      "passwordPlaceholder": "Current account password",
      "googlePrompt": "Confirm deletion by signing in with your Google account:",
      "googleButton": "Re-authenticate with Google",
      "confirmButton": "Permanently Delete Everything",
      "deleting": "Deleting data: {{phase}}...",
      "cancelButton": "Cancel"
    },
    "phases": {
      "reauth": "Verifying credentials",
      "transactions": "Deleting transactions",
      "budgets": "Deleting budgets",
      "accounts": "Deleting accounts",
      "categories": "Deleting categories",
      "profile": "Deleting profile",
      "auth": "Removing account"
    },
    "wrongPassword": "The password you entered is incorrect",
    "popupClosed": "Authentication was cancelled. Account was not deleted.",
    "phraseMismatch": "Please type the exact confirmation word",
    "deletionFailed": "Failed to complete account deletion. Please try again.",
    "successToast": "Your account and data have been successfully deleted"
  },
  "errors": {
    "saveFailed": "Failed to save settings. Please check your connection.",
    "offlineNotice": "This action requires an active internet connection."
  }
}
```

### 10.2 Russian (`src/i18n/locales/ru/settings.json`)

```json
{
  "title": "Настройки",
  "description": "Управление профилем, параметрами приложения, экспортом данных и аккаунтом",
  "profile": {
    "title": "Профиль",
    "description": "Персональные данные и учетная запись",
    "emailLabel": "Электронная почта",
    "verifiedBadge": "Подтвержден",
    "unverifiedBadge": "Не подтвержден",
    "displayNameLabel": "Отображаемое имя",
    "displayNamePlaceholder": "Введите ваше имя",
    "saveButton": "Сохранить изменения",
    "saving": "Сохранение...",
    "successToast": "Профиль успешно обновлен"
  },
  "preferences": {
    "title": "Предпочтения",
    "description": "Настройка валюты отображения, языка интерфейса и темы",
    "currencyLabel": "Базовая валюта",
    "currencyHelp": "Валюта, используемая во всех балансах счетов и суммах операций",
    "languageLabel": "Язык интерфейса",
    "themeLabel": "Тема оформления",
    "themeLight": "Светлая",
    "themeDark": "Темная",
    "themeSystem": "Системная",
    "currencyChangeDialog": {
      "title": "Изменить базовую валюту?",
      "warning": "Смена базовой валюты обновляет только символ валюты во всех отображаемых счетах и отчетах. Исторические суммы операций НЕ пересчитываются по курсу обмена.",
      "confirmButton": "Я понимаю, изменить валюту",
      "cancelButton": "Отмена"
    },
    "currencyUpdatedToast": "Базовая валюта изменена на {{currency}}",
    "languageUpdatedToast": "Язык переключен на русский",
    "themeUpdatedToast": "Тема оформления обновлена"
  },
  "data": {
    "title": "Управление данными",
    "description": "Экспорт истории операций и переносимость данных",
    "exportJsonTitle": "Полный экспорт всех данных (JSON)",
    "exportJsonDescription": "Скачать полную резервную копию профиля, счетов, категорий, бюджетов и всех транзакций в формате JSON.",
    "exportJsonButton": "Экспортировать все данные (JSON)",
    "exporting": "Формирование выгрузки...",
    "exportSuccessToast": "Файл экспорта успешно скачан",
    "exportFailed": "Не удалось экспортировать данные. Попробуйте снова.",
    "csvLink": "Нужен формат CSV? Перейдите на страницу «Импорт и экспорт операций»"
  },
  "dangerZone": {
    "title": "Опасная зона",
    "description": "Необратимые действия с аккаунтом и данными",
    "deleteAccountTitle": "Удаление аккаунта и данных",
    "deleteAccountDescription": "Безвозвратно удалить учетную запись, профиль, все счета, категории, бюджеты и финансовые операции. Действие невозможно отменить.",
    "deleteAccountButton": "Удалить аккаунт",
    "dialog": {
      "title": "Удаление аккаунта и всех данных",
      "warning": "Это действие окончательное и абсолютно необратимое. Все ваши транзакции, счета, категории и бюджеты будут удалены навсегда.",
      "confirmationPrompt": "Для подтверждения введите слово УДАЛИТЬ ниже:",
      "expectedPhrase": "УДАЛИТЬ",
      "passwordLabel": "Введите текущий пароль для подтверждения:",
      "passwordPlaceholder": "Текущий пароль от аккаунта",
      "googlePrompt": "Подтвердите удаление, войдя через ваш Google-аккаунт:",
      "googleButton": "Повторно войти через Google",
      "confirmButton": "Безвозвратно удалить всё",
      "deleting": "Удаление данных: {{phase}}...",
      "cancelButton": "Отмена"
    },
    "phases": {
      "reauth": "Проверка авторизации",
      "transactions": "Удаление операций",
      "budgets": "Удаление бюджетов",
      "accounts": "Удаление счетов",
      "categories": "Удаление категорий",
      "profile": "Удаление профиля",
      "auth": "Удаление аккаунта"
    },
    "wrongPassword": "Введен неверный пароль",
    "popupClosed": "Авторизация отменена. Аккаунт не был удален.",
    "phraseMismatch": "Пожалуйста, введите точное слово подтверждения",
    "deletionFailed": "Не удалось завершить удаление аккаунта. Попробуйте снова.",
    "successToast": "Ваш аккаунт и данные были успешно удалены"
  },
  "errors": {
    "saveFailed": "Не удалось сохранить настройки. Проверьте соединение.",
    "offlineNotice": "Это действие требует подключения к интернету."
  }
}
```

---

## 11. Acceptance criteria

- [ ] **AC1: Отображение профиля.** Given авторизованный пользователь, When он открывает `/app/settings`, Then отображаются его аватар, email, бейдж подтверждения почты и текущее имя `displayName`.
- [ ] **AC2: Редактирование имени.** Given пользователь вводит имя до 60 символов и нажимает «Сохранить», When запрос выполняется, Then имя обновляется в Firestore и Firebase Auth, в сайдбаре мгновенно обновляется имя, выводится toast об успехе.
- [ ] **AC3: Очистка имени.** Given пользователь стирает имя и нажимает «Сохранить», When запрос выполняется, Then в документе `users/{uid}` поле удаляется через `deleteField()`, а в интерфейсе отображается email или инициалы по умолчанию.
- [ ] **AC4: Предупреждение при смене валюты.** Given пользователь выбирает другую валюту в селекте, When он делает выбор, Then открывается модальный диалог `CurrencyChangeDialog` с пояснением об отсутствии автоматической конвертации.
- [ ] **AC5: Подтверждение смены валюты.** Given открыт диалог смены валюты, When пользователь нажимает «Я понимаю, изменить валюту», Then `baseCurrency` обновляется в профиле, все балансы и суммы в приложении начинают отображаться с новым символом валюты.
- [ ] **AC6: Отмена смены валюты.** Given открыт диалог смены валюты, When пользователь нажимает «Отмена» или `Esc`, Then диалог закрывается, а значение селекта возвращается к исходной валюте.
- [ ] **AC7: Переключение языка.** Given пользователь выбирает язык (EN или RU), When выбор сделан, Then интерфейс мгновенно переключается на выбранный язык, настройка сохраняется в Firestore и `localStorage`.
- [ ] **AC8: Переключение темы.** Given пользователь выбирает тему (Light, Dark, System), When выбор сделан, Then класс `dark` на элементе `html` обновляется мгновенно без перезагрузки страницы, настройка сохраняется в Firestore и `localStorage`.
- [ ] **AC9: Экспорт всех данных в JSON.** Given у пользователя есть данные в счетах, категориях, транзакциях и бюджетах, When он нажимает «Экспортировать все данные (JSON)», Then скачивается валидный JSON-файл `fintrack-data-export-YYYY-MM-DD.json`, содержащий секции `profile`, `accounts`, `categories`, `budgets`, `transactions`.
- [ ] **AC10: Защита удаления аккаунта от случайного нажатия.** Given пользователь открыл диалог удаления, When он не ввёл точное проверочное слово (`DELETE` / `УДАЛИТЬ`), Then кнопка удаления остаётся заблокированной.
- [ ] **AC11: Удаление аккаунта по паролю.** Given пользователь с Email/Password авторизацией подтвердил проверочное слово и ввёл верный пароль, When запускается удаление, Then выполняется Re-auth, удаляются все транзакции, бюджеты, счета, категории чанками по 400, удаляется профиль, удаляется auth-пользователь, и происходит редирект на `/login`.
- [ ] **AC12: Защита данных при ошибке пароля.** Given пользователь ввёл неверный пароль в диалоге удаления, When нажимает «Удалить», Then выводится ошибка «Неверный пароль», и ни один документ из Firestore не удаляется.
- [ ] **AC13: Удаление аккаунта через Google.** Given пользователь вошёл через Google, When он подтверждает удаление через Google popup, Then re-auth проходит успешно и запускается процесс удаления данных.
- [ ] **AC14: Демо-аккаунт.** Given в системе находится анонимный пользователь (`isAnonymous: true`), When он открывает настройки, Then отображается бейдж Demo, а удаление аккаунта не требует ввода пароля.
- [ ] **AC15: Офлайн-блокировка.** Given соединение с сетью отсутствует, When пользователь находится на странице настроек, Then кнопки полного экспорта и удаления аккаунта заблокированы с подсказкой о недоступности в офлайн.
- [ ] **AC-STATES:** Для страницы настроек реализованы состояния loading (скелетон), error (ошибка загрузки профиля) и offline.
- [ ] **AC-I18N:** 100% текста на странице и в диалогах переведено на EN и RU через namespace `settings`.
- [ ] **AC-A11Y:** Фокус в диалогах заперт, доступен выход по `Esc`, поля форм связаны с `label` и `aria-describedby`, поддержка скринридеров.

---

## 12. Эдж-кейсы и инварианты

1. **Большой объем транзакций при удалении (> 1000 записей):**
   - *Проблема:* Превышение лимита Firestore `writeBatch` (500 операций).
   - *Решение:* Чтение идентификаторов транзакций и разбиение на чанки по `IMPORT_CHUNK_SIZE = 400`. Последовательный коммит батчей.
2. **Истекший токен авторизации (Stale Auth Token):**
   - *Проблема:* `deleteUser()` в Firebase Auth падает с ошибкой `auth/requires-recent-login`, если пользователь вошел давно.
   - *Решение:* Принудительный Re-authentication непосредственно перед удалением документов. Проверка свежести токена до первого удаления из Firestore.
3. **Сбой сети в процессе многоэтапного удаления:**
   - *Проблема:* Часть транзакций удалена, но соединение оборвалось до вызова `deleteUser`.
   - *Решение:* Поскольку re-auth был выполнен первым, аккаунт пользователя остаётся активным. При возобновлении связи пользователь видит ошибку с возможностью нажать «Повторить удаление», которая дочистит оставшиеся коллекции.
4. **Удаление `displayName`:**
   - *Проблема:* Правило `validProfile()` в Security Rules требует отсутствия ключа `displayName` при пустом значении (`hasOnly` и `isOptionalText`). Запись `displayName: null` нарушит rules.
   - *Решение:* Использование `deleteField()` из `firebase/firestore` при пустой строке имени.
5. **Регистрозависимость проверочного слова при удалении:**
   - *Проблема:* Пользователь вводит `delete` строчными буквами или с пробелами.
   - *Решение:* Нормализация ввода (trim, uppercase) с проверкой равенства целевой фразе `DELETE` (или `УДАЛИТЬ`).
6. **Синхронизация профиля с локальными провайдерами:**
   - *Проблема:* Рассинхрон между значением темы/языка в Firestore и в `localStorage`.
   - *Решение:* Централизованный хук `useProfileSettings` атомарно обновляет провайдеры приложения (`i18n.changeLanguage`, `themeProvider.setTheme`) и документ Firestore.

---

## 13. План тестов

| Уровень | Что проверяем | Инструмент / Файл |
|---|---|---|
| **Unit** | Валидация схем настроек: `updateDisplayNameSchema`, `deleteAccountConfirmationSchema` | `src/features/settings/schemas.test.ts` |
| **Unit** | Доменный генератор дампа `generateFullDataJson`: корректность структуры, ISO-дат, экранирование | `src/features/settings/utils/exportJson.test.ts` |
| **Integration** | Репозиторий: `updateUserProfile` (смена валюты, темы, языка, очистка имени через `deleteField`) | `src/features/settings/repository.integration.test.ts` (Firestore эмулятор) |
| **Integration** | Пакетное удаление `deleteAllUserFirestoreData`: очистка транзакций (>400 шт), категорий, счетов, бюджетов и профиля | `src/features/settings/repository.integration.test.ts` (Firestore эмулятор) |
| **Component** | `ProfileSection`: рендер полей, валидация длины имени, сохранение, toast | `src/features/settings/components/ProfileSection.test.tsx` |
| **Component** | `PreferencesSection`: выбор валюты, открытие `CurrencyChangeDialog`, отмена и подтверждение, смена языка и темы | `src/features/settings/components/PreferencesSection.test.tsx` |
| **Component** | `DangerZoneSection` и `DeleteAccountDialog`: ввод проверочной фразы, ввод пароля, блокировка кнопки, вызовы reauth | `src/features/settings/components/DeleteAccountDialog.test.tsx` |
| **E2E** | Сквозной сценарий настроек: изменение имени и темы, подтверждение смены валюты, скачивание JSON-экспорта, удаление аккаунта с редиректом | `e2e/settings.spec.ts` (Playwright) |

---

## 14. Задачи (T1–T6)

### T1: Схемы, доменные утилиты экспорта и unit-тесты
- **Цель:** Создать структуры валидации настроек, функцию сериализации полного экспорта данных в JSON и покрыть их unit-тестами.
- **Файлы:**
  - `src/features/settings/schemas.ts`
  - `src/features/settings/schemas.test.ts`
  - `src/features/settings/utils/exportJson.ts`
  - `src/features/settings/utils/exportJson.test.ts`
- **Проверка:** `pnpm test src/features/settings`

### T2: Методы AuthService и Firestore Repository
- **Цель:** Реализовать методы повторной аутентификации в `features/auth/authService.ts`, операции обновления профиля, чтения всех данных и пакетного удаления в `features/settings/repository.ts`.
- **Файлы:**
  - `src/features/auth/authService.ts` (добавление `reauthenticateWithPassword`, `reauthenticateWithGoogle`, `deleteCurrentUserAccount`)
  - `src/features/auth/authService.test.ts`
  - `src/features/auth/index.ts` (экспорт новых методов)
  - `src/features/settings/repository.ts`
  - `src/features/settings/repository.integration.test.ts`
- **Проверка:** `pnpm test`

### T3: Пользовательские хуки (State & Actions)
- **Цель:** Реализовать реактивные хуки управления профилем, экспортом данных и процессом удаления аккаунта.
- **Файлы:**
  - `src/features/settings/hooks/useProfileSettings.ts`
  - `src/features/settings/hooks/useProfileSettings.test.ts`
  - `src/features/settings/hooks/useFullDataExport.ts`
  - `src/features/settings/hooks/useFullDataExport.test.ts`
  - `src/features/settings/hooks/useAccountDeletion.ts`
  - `src/features/settings/hooks/useAccountDeletion.test.ts`
- **Проверка:** `pnpm test`

### T4: UI-компоненты секций и диалогов
- **Цель:** Создать компоненты карточек профиля, предпочтений (с диалогом смены валюты), экспорта данных и опасной зоны с диалогом удаления.
- **Файлы:**
  - `src/features/settings/components/ProfileSection.tsx`
  - `src/features/settings/components/PreferencesSection.tsx`
  - `src/features/settings/components/CurrencyChangeDialog.tsx`
  - `src/features/settings/components/DataManagementSection.tsx`
  - `src/features/settings/components/DangerZoneSection.tsx`
  - `src/features/settings/components/DeleteAccountDialog.tsx`
  - Component tests для каждого компонента (`*.test.tsx`)
- **Проверка:** `pnpm test`

### T5: Страница SettingsPage, локализация i18n и доступность
- **Цель:** Заменить заглушку `SettingsPage.tsx`, подключить словарь `settings.json` (EN и RU), зарегистрировать namespace в `i18n/config.ts`, проверить адаптивность и a11y.
- **Файлы:**
  - `src/app/pages/SettingsPage.tsx`
  - `src/i18n/locales/en/settings.json`
  - `src/i18n/locales/ru/settings.json`
  - `src/i18n/config.ts`
  - `src/features/settings/index.ts`
- **Проверка:** `pnpm typecheck && pnpm lint && pnpm test`

### T6: Сквозные тесты (E2E), верификация и закрытие фичи
- **Цель:** Написать сквозной тест Playwright, пройти полный чеклист верификации проекта, обновить статус в дорожной карте.
- **Файлы:**
  - `e2e/settings.spec.ts`
  - `docs/06-roadmap.md` (обновление статуса F11: `done`)
- **Проверка:** `pnpm test && pnpm e2e`, скилл `verify`

---

## 15. Definition of Done

- [ ] Все 15 пунктов Acceptance Criteria выполнены и проверены.
- [ ] Все задачи T1–T6 реализованы отдельными атомарными коммитами.
- [ ] Границы слоёв соблюдены: `firebase/auth` используется строго внутри `features/auth/authService.ts`.
- [ ] Все тексты вынесены в `settings.json` (EN и RU), нет жестко закодированных строк в JSX.
- [ ] Пакетное удаление протестировано на объеме более 400 документов на эмуляторе.
- [ ] Пройден полный цикл верификации: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- [ ] Сквозные тесты Playwright проходят успешно.
- [ ] Статус фичи в `docs/06-roadmap.md` обновлён на `done`.

---

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос / Проблема | Принятое решение | Статус |
|---|---|---|---|
| 2026-10-19 | Формат полного экспорта данных (JSON vs ZIP) | Выбран единый структурированный JSON-файл: не требует тяжелых сторонних зависимостей, нативно парсится и поддерживается любыми платформами | Закрыто |
| 2026-10-19 | Защита от случайного удаления аккаунта | Двойной контур защиты: ввод проверочного слова (`DELETE` / `УДАЛИТЬ`) + Re-authentication (пароль / Google) | Закрыто |
| 2026-10-19 | Изоляция Firebase Auth | Фича `settings` не импортирует `firebase/auth` напрямую; все методы re-auth и удаления объявлены в `features/auth/authService.ts` | Закрыто |
| 2026-10-19 | Предупреждение о смене валюты | Обязательный диалог подтверждения перед сохранением новой базовой валюты с разъяснением отсутствия курсовой конвертации | Закрыто |
