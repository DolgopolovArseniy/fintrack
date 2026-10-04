# F04 — Categories и онбординг (эталонная фича)

Статус: spec-ready
Зависит от: F01 (доменные схемы, лимиты, конвертеры), F02 (аутентификация, AuthProvider, guard'ы), F03 (Security Rules v1)
Размер: M (7 задач)
Ветка: `feat/F04-categories`

> **Эталонная фича:** `features/categories` служит образцом архитектуры, организации слоёв, чистоты кода, типизации и тестов для всех последующих фич проекта (`transactions`, `accounts`, `budgets`, `dashboard`).
> Перед реализацией агент читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§4–§7, §8.4, §8.5), `docs/02-data-model.md` (§2, §3.1, §3.3, §7, §8), `docs/03-conventions.md`, `docs/04-ux-guidelines.md` (§2.2, §3, §4, §5, §6), `docs/05-testing-strategy.md`.
> Справка по API библиотек (`firebase/firestore`, Radix UI Dialog, Vaul Drawer, React Hook Form, Zod, Sonner) запрашивается через **Context7**.

---

## 1. Цель и пользовательская история

Обеспечить инициализацию стартового окружения пользователя при первом входе (онбординг: профиль, дефолтный счёт «Основной», 11 дефолтных категорий в одном атомарном batch) и предоставить полный функционал управления категориями расходов и доходов (создание, просмотр, редактирование, архивация/восстановление) с палитрой цветов и выбором иконок.

**Пользовательские истории:**
1. *Как новый пользователь*, я хочу при первом входе выбрать базовую валюту аккаунта и мгновенно получить готовый набор категорий и основной счёт, чтобы сразу начать вести учёт без ручной настройки с нуля.
2. *Как пользователь*, я хочу видеть свои категории расходов и доходов раздельно, фильтровать активные и архивные, чтобы быстро находить нужную статью бюджета.
3. *Как пользователь*, я хочу создавать собственные категории с понятным именем, иконкой и цветом, а также редактировать существующие, чтобы адаптировать учёт под свои привычки.
4. *Как пользователь*, я хочу архивировать неактуальные категории вместо их безвозвратного удаления, чтобы сохранить историческую целостность прошлых транзакций.

---

## 2. Контекст для агента

- **Готовые модули:**
  - `src/features/categories/constants.ts`: константы цветов `CATEGORY_COLOR_KEYS`, дефолтные ключи `DEFAULT_EXPENSE_CATEGORY_KEYS`, `DEFAULT_INCOME_CATEGORY_KEYS`, массив дефолтных категорий `DEFAULT_CATEGORIES`.
  - `src/features/categories/schemas.ts`: `categoryColorSchema`, `categoryInputSchema`, `categorySchema`, типы `CategoryInput`, `Category`.
  - `src/features/accounts/schemas.ts`: `accountInputSchema`, `accountSchema`.
  - `src/features/auth/schemas.ts`: `userProfileInputSchema`, `userProfileSchema`, `themeSchema`.
  - `src/lib/firestore/paths.ts`: типизированные фабрики путей (`userDoc`, `accountsCol`, `accountDoc`, `categoriesCol`, `categoryDoc`).
  - `src/lib/firestore/createConverter.ts`: `createConverter` и `parseSnapshotDocs`.
  - `src/hooks/useSubscription.ts`: хук реального времени с отпиской и обработкой StrictMode.
  - `src/lib/errors.ts`: `AppError`, `toAppError`.
- **Архитектурные ограничения:**
  - `components/common/` **не импортирует** `features/` (ESLint strict boundary). Компонент `CategoryBadge` в `components/common` принимает независимые пропсы и использует `@/lib/i18n`.
  - `firebase/firestore` импортируется **только** в `features/*/repository.ts`, `converters.ts`, `lib/firebase.ts`, `lib/firestore/*`.
  - `type` категории неизменяем после создания: Security Rules отклонят смену `type` при обновлении.
  - В Firestore нет `null`: необязательные поля отсутствуют.
  - Все строковые идентификаторы очищаются через `.trim()`.

---

## 3. Скоуп

### Входит
- **Онбординг:**
  - Атомарный `writeBatch` при первом входе пользователя: профиль (`users/{uid}`), счёт «Основной» (`systemKey: 'main'`), 11 дефолтных категорий (8 расходов, 3 дохода).
  - Расширение состояний в `AuthProvider`: переход `loading` → `unauthenticated` | `authenticated` с фазами `profileStatus: 'loading' | 'needsOnboarding' | 'ready'` и объектом `profile: UserProfile | null`.
  - Роут `/onboarding` с формой `OnboardingForm` (выбор базовой валюты из `SUPPORTED_CURRENCIES`, отображаемое имя, отправка).
  - Маршрутизация и guard'ы: закрытие `/app/**` для пользователей `needsOnboarding`, редирект с `/login` и `/` на `/onboarding` при отсутствии профиля.
- **Категории (CRUD & Archive):**
  - Конвертер `src/features/categories/converters.ts` с безопасным парсингом и пропуском повреждённых документов.
  - Репозиторий `src/features/categories/repository.ts`: функции подписки, создания, редактирования, архивации и разархивации.
  - Хуки `useCategories` (realtime-подписка) и `useCategoryMutations` (мутации с toast-нотификациями).
  - Экран `/app/categories` (`CategoriesPage`) с вкладками «Расходы» и «Доходы», счетчиками категорий, переключателем «Показывать архивные».
  - Модальное окно создания/редактирования через адаптивный `ResponsiveDialog` (`Dialog` на desktop, `Drawer` на mobile).
  - Выбор иконки (`IconPicker`) из оптимизированного каталога Lucide-иконок.
  - Выбор цвета (`ColorPicker`) из 12 семантических токенов палитры.
  - Общий компонент `CategoryBadge` в `src/components/common/CategoryBadge.tsx` с поддержкой `systemKey` и статуса архивации.
  - Общие компоненты `ResponsiveDialog` и `ConfirmDialog` в `src/components/common/`.
  - Полный комплект локализации (EN/RU) для онбординга и категорий.
  - Интеграционные тесты на эмуляторе Firestore, компонентные тесты, Playwright e2e-тесты.

### Не входит (явно)
- Балансы счетов и переводы (F05, F07).
- Создание транзакций и привязка к категориям (F05).
- Бюджетные лимиты по категориям (F08).
- Полное физическое удаление категории из базы в UI (только архивация `archived: true`, ADR-005, защита от dangling references).
- Мультивалютность и курсы конвертации (Won't v1).
- Кастомные цвета вне утверждённой палитры 12 токенов.

---

## 4. Решения фичи

| # | Вопрос | Решение | Обоснование |
|---|---|---|---|
| 1 | Где выполняется онбординг | Выделенный экран `/onboarding`, управляемый `RequireAuth` и расширенным `AuthProvider` | Предотвращает доступ к основному интерфейсу до создания профиля и дефолтных сущностей. Исключает частичные состояния |
| 2 | Атомарность онбординга | Единый `writeBatch` (13 документов: 1 профиль + 1 счёт + 11 категорий) | Гарантирует «всё или ничего». Тесты правил F03 подтвердили корректность такого batch'а |
| 3 | Логика имен системных категорий | При создании в базе пишется `systemKey` (например `food`) без поля `name`. Если пользователь переименовывает категорию, заполняется `name` | При смене языка системы категории автоматически отображаются на новом языке, пока пользователь не дал им собственное имя (ADR-011) |
| 4 | Неизменяемость `type` | В форме редактирования выбор типа блокируется (disabled) | Security Rules запрещают изменение `type` (`incoming().type == existing().type`). Блокировка на клиенте предотвращает ошибки Firestore |
| 5 | Архивация вместо удаления | В UI доступна только архивация (`archived: true`) и восстановление | На категории ссылаются транзакции. Физическое удаление сломало бы историю трат. Rules разрешают delete, но UI делает soft-delete |
| 6 | Каталог иконок | Курируемый список ~40 релевантных Lucide-иконок в константах фичи | Динамический импорт всей библиотеки Lucide (~1500 иконок) раздул бы бандл на сотни килобайт и нарушил бюджет бандла F13 |
| 7 | Архитектурная изоляция `CategoryBadge` | Компонент `CategoryBadge` помещается в `src/components/common/`, не импортирует `src/features/**`, принимает примитивные пропсы (`name`, `systemKey`, `icon`, `color`, `archived`) | Строго соблюдает границу ESLint: `components/common` не может зависеть от фич |
| 8 | Адаптивные диалоги | Единый `ResponsiveDialog` (`Dialog` на desktop ≥ 768px, `Drawer` на mobile < 768px) | Соблюдение UX-гайдлайнов (`docs/04-ux-guidelines.md` §3), устранение дублирования кода модалок |

---

## 5. Пользовательские сценарии

| # | Сценарий | Предусловие | Шаги | Ожидаемый результат |
|---|---|---|---|---|
| 1 | **Онбординг нового пользователя** (Happy path) | Пользователь зарегистрировался через email или Google, документа в `users/{uid}` нет | 1. Авторизация перенаправляет на `/onboarding`.<br>2. Пользователь выбирает валюту (USD/EUR/RUB/...), вводит имя.<br>3. Нажимает «Продолжить». | Выполняется batch-запись (профиль, счёт «Основной», 11 категорий). `profileStatus` переходит в `'ready'`, открывается `/app/dashboard`. |
| 2 | **Повторный вход пользователем без онбординга** | Аккаунт создан, но вкладка была закрыта до завершения онбординга | Пользователь логинится на `/login` | Guard перенаправляет на `/onboarding`. Доступ к `/app/**` заблокирован до создания профиля. |
| 3 | **Пользователь с профилем открывает `/onboarding`** | Профиль уже существует | Пользователь вручную переходит на URL `/onboarding` | Автоматический редирект на `/app/dashboard`. |
| 4 | **Просмотр категорий по типам** | Пользователь авторизован, находится на `/app/categories` | 1. Просматривает вкладку «Расходы» (8 дефолтных).<br>2. Переключается на «Доходы» (3 дефолтных). | Отображаются соответствующие списки с иконками, бейджами и цветами. Вкладки показывают счетчики элементов. |
| 5 | **Создание новой категории** | Пользователь на `/app/categories` | 1. Нажимает «Добавить категорию».<br>2. Вводит имя «Книги».<br>3. Выбирает иконку `book` и цвет `indigo`.<br>4. Сохраняет. | Диалог закрывается, toast «Категория создана», новая категория мгновенно появляется в списке без перезагрузки. |
| 6 | **Редактирование категории** | Существует категория | 1. В меню карточки нажимает «Редактировать».<br>2. Меняет имя и иконку.<br>3. Поле типа заблокировано.<br>4. Сохраняет. | Категория обновляется, в списке отображаются новые параметры. |
| 7 | **Архивация категории** | Активная категория | 1. В меню категории нажимает «Архивировать».<br>2. Подтверждает действие. | Категория исчезает из основного списка (если переключатель архива выключен), toast «Категория архивирована». |
| 8 | **Просмотр и разархивация** | Есть архивные категории | 1. Включает тумблер «Показывать архивные».<br>2. Видит архивную категорию со специальным бейджем.<br>3. В меню нажимает «Восстановить». | Категория становится активной (`archived: false`), toast «Категория восстановлена». |
| 9 | **Попытка создания дубликата** | Существует категория «Еда» | Пользователь пытается создать категорию с тем же именем в том же типе | Валидатор формы сообщает об ошибке «Категория с таким именем уже существует». Запрос в базу не отправляется. |
| 10 | **Офлайн-сохранение категории** | Нет сетевого подключения | Пользователь нажимает «Сохранить» в форме категории | Запись фиксируется в локальном кэше Firestore, диалог закрывается, категория отображается локально, синхронизация произойдет при появлении сети. |

---

## 6. UI и дизайн-система

### 6.1 Экраны и роуты
1. **`/onboarding` (`OnboardingPage`)**:
   - Макет: центрированная карточка на базе `AuthFormCard`.
   - Заголовок: «Добро пожаловать в FinTrack!». Описание: короткое пояснение о стартовой настройке.
   - Поля:
     - Выбор базовой валюты (`Select`, список `SUPPORTED_CURRENCIES` с символами и названиями, значение по умолчанию `USD`).
     - Отображаемое имя (`Input`, необязательное, предзаполняется из `AuthUser.displayName`).
   - Кнопка действия: «Начать работу» с индикатором загрузки (`Loader2`).
2. **`/app/categories` (`CategoriesPage`)**:
   - Шапка: `PageHeader` (заголовок, описание, тумблер `Switch` «Показывать архивные», кнопка `Button` «Добавить категорию»).
   - Вкладки: `Tabs` со значениями `expense` («Расходы») и `income` («Доходы»). Каждая вкладка содержит `Badge` со счетчиком доступных категорий.
   - Сетка/список категорий: карточки с `CategoryBadge`, названием, типом и выпадающим меню действий (`DropdownMenu`: «Редактировать», «Архивировать» / «Восстановить»).
   - Состояния данных через `QueryBoundary`:
     - *Loading*: `LoadingSkeleton` (вариант карточек/списка).
     - *Empty*: `EmptyState` с иконкой папки/тегов и кнопкой быстрого создания.
     - *Error*: `ErrorState` с локализованным текстом ошибки и кнопкой повтора.
     - *Offline*: отображение данных из кэша с уведомлением в `OfflineBanner`.

### 6.2 Компоненты формы категории (`CategoryForm`)
- Поля:
  1. **Тип (`type`)**: `expense` или `income`. При редактировании переключатель **disabled** с поясняющей подсказкой.
  2. **Название (`name`)**: `Input` (1–40 символов). Для системных категорий плейсхолдер показывает текущее переведённое системное имя.
  3. **Иконка (`icon`)**: `IconPicker` — кнопка с текущей иконкой, открывающая поповер/диалог с сеткой иконок, разделенных по тематикам (базовые, еда, транспорт, дом, досуг, финансы) и полем поиска.
  4. **Цвет (`color`)**: `ColorPicker` — сетка 12 круговых свотчей палитры с фокусом клавиатуры, тултипами и отметкой выбранного цвета.

### 6.3 Адаптивность и модальные окна
- Использование `ResponsiveDialog` для формы создания/редактирования:
  - Desktop (≥ 768px): центрированный `Dialog`.
  - Mobile (< 768px): выезжающий снизу `Drawer` с поддержкой свайпа закрытия и учета `safe-area-inset-bottom`.
- Все интерактивные элементы на мобильных устройствах имеют размер тач-зоны ≥ 44×44px.

### 6.4 Переиспользование (DRY-матрица)

| Элемент UI | Источник | Примечание |
|---|---|---|
| Заголовок страницы | `components/common/PageHeader` | Готовый из F00 |
| Пустое состояние | `components/common/EmptyState` | Готовый из F00 |
| Состояние ошибки | `components/common/ErrorState` | Готовый из F00 |
| Скелетон загрузки | `components/common/LoadingSkeleton` | Готовый из F00 |
| Граница запросов | `components/common/QueryBoundary` | Готовый из F00 |
| Адаптивный диалог | `components/common/ResponsiveDialog` | **Создаётся в F04 (T3)**, основан на Dialog и Drawer |
| Диалог подтверждения | `components/common/ConfirmDialog` | **Создаётся в F04 (T3)** для подтверждения архивации |
| Бейдж категории | `components/common/CategoryBadge` | **Создаётся в F04 (T3)** для категорий, транзакций и бюджетов |
| Табы | `components/ui/tabs` | Добавляется shadcn CLI |
| Свитч | `components/ui/switch` | Добавляется shadcn CLI |
| Селект | `components/ui/select` | Добавляется shadcn CLI |
| Диалог / Дровер | `components/ui/dialog`, `components/ui/drawer` | Добавляются shadcn CLI |

---

## 7. Модель данных и Firestore

### 7.1 Структура путей
- Профиль: `users/{uid}`
- Счета: `users/{uid}/accounts/{accountId}`
- Категории: `users/{uid}/categories/{categoryId}`

### 7.2 Схема документа категории (`categories/{categoryId}`)
```ts
{
  type: 'expense' | 'income',     // неизменяемо после создания
  icon: string,                   // имя иконки Lucide (1-40 симв.)
  color: CategoryColorKey,        // один из 12 ключей палитры
  archived: boolean,              // false по умолчанию
  name?: string,                  // 1-40 символов (если задано пользователем)
  systemKey?: string,             // 1-30 символов (для дефолтных категорий)
  createdAt: Timestamp,           // серверное время создания
  updatedAt: Timestamp            // серверное время обновления
}
```
*Инвариант:* в документе обязательно присутствует хотя бы одно из полей: `name` или `systemKey`.

### 7.3 Запросы и индексы
- Чтение категорий: `collection(db, 'users', uid, 'categories')` без условий сортировки и фильтрации в запросе.
- Сортировка (по алфавиту, сначала системные или активные) и фильтрация по `type` и `archived` выполняются **на клиенте**.
- Составные индексы **не требуются** (соответствует `firestore.indexes.json`, ADR-010).

---

## 8. Контракты и API

### 8.1 Репозиторий категорий (`src/features/categories/repository.ts`)
```ts
import type { Category, CategoryInput } from './schemas';
import type { AppError } from '@/lib/errors';

export type Unsubscribe = () => void;

export interface CategoryUpdateInput {
  name?: string;
  icon?: string;
  color?: Category['color'];
  archived?: boolean;
}

/**
 * Подписывается на коллекцию категорий пользователя в реальном времени.
 */
export function subscribeCategories(
  uid: string,
  onData: (categories: Category[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe;

/**
 * Создаёт новую пользовательскую категорию.
 */
export function createCategory(
  uid: string,
  input: CategoryInput,
): Promise<string>;

/**
 * Обновляет поля существующей категории (смена type запрещена).
 */
export function updateCategory(
  uid: string,
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<void>;

/**
 * Переводит категорию в архив.
 */
export function archiveCategory(
  uid: string,
  categoryId: string,
): Promise<void>;

/**
 * Восстанавливает категорию из архива.
 */
export function unarchiveCategory(
  uid: string,
  categoryId: string,
): Promise<void>;
```

### 8.2 Онбординг (`src/features/auth/onboarding.ts`)
```ts
import type { CurrencyCode } from '@/lib/currencies';
import type { Locale } from '@/lib/locales';
import type { Theme } from './schemas';

export interface OnboardingInput {
  baseCurrency: CurrencyCode;
  locale: Locale;
  theme: Theme;
  displayName?: string;
}

/**
 * Выполняет атомарную пакетную инициализацию профиля, счета «Основной» и 11 категорий.
 */
export function executeOnboardingBatch(
  uid: string,
  input: OnboardingInput,
): Promise<void>;

/**
 * Проверяет наличие профиля пользователя в Firestore.
 */
export function checkProfileExists(uid: string): Promise<boolean>;
```

### 8.3 Расширение `AuthState` (`src/features/auth/types.ts`)
```ts
import type { UserProfile } from './schemas';

export type ProfileStatus = 'loading' | 'needsOnboarding' | 'ready';

export interface AuthContextValue {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  user: AuthUser | null;
  profileStatus: ProfileStatus;
  profile: UserProfile | null;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

### 8.4 Хуки фичи
```ts
// src/features/categories/hooks/useCategories.ts
export function useCategories(): SubscriptionResult<Category[]>;

// src/features/categories/hooks/useCategoryMutations.ts
export function useCategoryMutations(): {
  createCategory: (input: CategoryInput) => Promise<string>;
  updateCategory: (id: string, input: CategoryUpdateInput) => Promise<void>;
  archiveCategory: (id: string) => Promise<void>;
  unarchiveCategory: (id: string) => Promise<void>;
  isSubmitting: boolean;
};
```

### 8.5 Публичный API фичи (`src/features/categories/index.ts`)
```ts
export * from './constants';
export * from './schemas';
export { subscribeCategories, createCategory, updateCategory, archiveCategory, unarchiveCategory } from './repository';
export { useCategories } from './hooks/useCategories';
export { useCategoryMutations } from './hooks/useCategoryMutations';
export { CategoryForm } from './components/CategoryForm';
export { CategoryList } from './components/CategoryList';
export { getCategoryDisplayName } from './utils';
```

---

## 9. Валидация и ошибки

| Поле / Ситуация | Правило | Поведение / Ошибка | Ключ i18n |
|---|---|---|---|
| `name` категории | Обязательно (если нет `systemKey`), 1–40 символов | Ошибка под полем | `validation.required` / `validation.tooLong` |
| `name` дубликат | Имя уникально в рамках одного `type` (без учета регистра) | Ошибка под полем | `categories.validation.duplicateName` |
| `type` категории | `expense` или `income`, неизменяемо при edit | Поле заблокировано | `categories.form.typeLocked` |
| `icon` категории | Обязательный выбор из каталога | Валидация формы | `validation.required` |
| `color` категории | Обязательный выбор из 12 ключей | Валидация формы | `validation.required` |
| Ошибка сети при мутации | Ошибка Firestore | Toast-уведомление | `errors.network` / `categories.errors.saveFailed` |
| Онбординг: базовая валюта | Обязательный выбор из `SUPPORTED_CURRENCIES` | Блокировка кнопки | `validation.required` |
| Повреждённый документ в Firestore | Не проходит парсинг `categorySchema` | Документ пропускается, логируется `logger.warn`, список не падает | — |

---

## 10. Локализация (i18n)

Создается отдельный namespace-файл `src/i18n/locales/{en,ru}/categories.json` и дополняются `common.json`, `nav.json`, `validation.json`.

### Ключевая структура `categories.json` (RU/EN):
- `categories.title` («Категории» / «Categories»)
- `categories.description` («Управление статьями расходов и доходов» / «Manage your expense and income categories»)
- `categories.actions.add` («Добавить категорию» / «Add category»)
- `categories.actions.edit` («Редактировать» / «Edit»)
- `categories.actions.archive` («Архивировать» / «Archive»)
- `categories.actions.unarchive` («Восстановить» / «Restore»)
- `categories.showArchived` («Показывать архивные» / «Show archived»)
- `categories.tabs.expenses` («Расходы» / «Expenses»)
- `categories.tabs.incomes` («Доходы» / «Income»)
- `categories.empty.expenses` («Нет категорий расходов» / «No expense categories»)
- `categories.empty.incomes` («Нет категорий доходов» / «No income categories»)
- `categories.system.<key>`:
  - `food`: «Еда и продукты» / «Food & Groceries»
  - `transport`: «Транспорт» / «Transportation»
  - `housing`: «Жильё» / «Housing»
  - `utilities`: «Коммунальные услуги» / «Utilities»
  - `health`: «Здоровье» / «Healthcare»
  - `entertainment`: «Развлечения» / «Entertainment»
  - `shopping`: «Покупки» / «Shopping»
  - `other_expense`: «Прочие расходы» / «Other Expenses»
  - `salary`: «Зарплата» / «Salary»
  - `gift`: «Подарки» / «Gifts»
  - `other_income`: «Прочие доходы» / «Other Income»
- `categories.onboarding.title` («Добро пожаловать в FinTrack!» / «Welcome to FinTrack!»)
- `categories.onboarding.description` («Выберите базовую валюту для ведения учета» / «Choose your base currency to get started»)
- `categories.onboarding.submit` («Начать работу» / «Get Started»)

---

## 11. Эдж-кейсы и особые ситуации (глобальные для проекта)

1. **Архивация категорий и целостность транзакций (влияние на F05, F06, F08, F10):**
   - Архивные категории **не удаляются** из базы данных.
   - В выпадающих списках создания новых транзакций (F05) и бюджетов (F08) архивные категории скрываются.
   - В исторических транзакциях (F05, F06) архивная категория продолжает корректно отображаться через `CategoryBadge` с приглушенным стилем или маркером `(архив)`.
2. **Смена системного языка и переименование:**
   - Если категория содержит только `systemKey`, её имя динамически вычисляется через `t('categories.system.' + systemKey)`. При переключении языка приложения название мгновенно обновляется без перезаписи Firestore.
   - Если пользователь переименовал системную категорию, в документ записывается поле `name`. Значение `name` получает приоритет над `systemKey`.
3. **Неизменяемость типа категории:**
   - Security Rules v1 содержат проверку: `incoming().type == existing().type`. Попытка послать обновление со сменой типа завершится отказом безопасности. UI обязан блокировать смену типа в форме редактирования.
4. **Конкурентный онбординг (React StrictMode и мульти-таб):**
   - При двойном вызове эффекта в React 19 / StrictMode или открытии двух вкладок не должно создаваться несколько комплектов категорий.
   - `executeOnboardingBatch` предваряется проверкой `checkProfileExists(uid)`. Внутри пакетной записи создается `users/{uid}`. Если документ уже создан, повторный онбординг игнорируется.
5. **Отказоустойчивость к повреждённым данным:**
   - Если в коллекции окажется документ без обязательных полей или с недопустимыми значениями, метод `parseSnapshotDocs` безопасно логирует предупреждение через `logger.warn` и пропускает битую запись, не ломая рендеринг остальных категорий.
6. **Офлайн-сохранение и реалтайм:**
   - Запись новой категории через Firestore SDK оптимистично отображается в локальном кеше (`serverTimestamps: 'estimate'`), `useSubscription` мгновенно получает локальное обновление без ожидания ответа сервера.

---

## 12. Acceptance criteria

- [ ] **AC1 (Онбординг-batch):** Given авторизованный пользователь без документа `users/{uid}`, When он отправляет форму на `/onboarding` с валютой `EUR`, Then в Firestore одним batch создаются документ `users/{uid}` (с `baseCurrency: 'EUR'`), документ счета `main` (с `balance: 0`) и 11 документов дефолтных категорий (8 расходов, 3 дохода).
- [ ] **AC2 (Защита онбординга):** Given авторизованный пользователь без профиля, When он пытается открыть любой роут `/app/**`, Then происходит безусловный редирект на `/onboarding`.
- [ ] **AC3 (Редирект завершенного онбординга):** Given пользователь с существующим профилем, When он открывает `/onboarding`, Then происходит редирект на `/app/dashboard`.
- [ ] **AC4 (Просмотр категорий):** Given пользователь на странице `/app/categories`, When выбрана вкладка «Расходы», Then отображаются только категории с `type === 'expense'`. При переключении на «Доходы» отображаются категории с `type === 'income'`.
- [ ] **AC5 (Создание категории):** Given валидная форма категории (уникальное имя, выбранная иконка и цвет), When пользователь нажимает «Сохранить», Then документ создается в `users/{uid}/categories`, форма закрывается, появляется toast-уведомление, и новая категория появляется в списке.
- [ ] **AC6 (Валидация уникальности):** Given существующая категория «Кафе» с типом `expense`, When пользователь пытается создать категорию с именем «кафе» (в любом регистре) и типом `expense`, Then форма блокирует отправку и выводит ошибку дубликата.
- [ ] **AC7 (Редактирование категории):** Given существующая категория, When пользователь открывает форму редактирования, Then поле `type` отключено (disabled), а изменение имени, иконки или цвета успешно обновляет категорию в Firestore.
- [ ] **AC8 (Архивация и фильтрация):** Given активная категория, When пользователь выбирает действие «Архивировать», Then поле `archived` становится `true`. При выключенном тумблере «Показывать архивные» категория скрывается; при включенном — отображается с визуальным маркером архивации.
- [ ] **AC9 (Восстановление):** Given архивная категория, When пользователь нажимает «Восстановить», Then категория возвращается в статус `archived: false`.
- [ ] **AC-STATES:** Страница категорий реализует все 5 обязательных состояний: Loading (скелетон), Empty (призыв к действию), Error (сообщение с кнопкой повтора), Offline (индикатор и локальный кеш), Success (toast).
- [ ] **AC-A11Y:** Все модальные окна (`ResponsiveDialog`, `ConfirmDialog`) поддерживают фокус-ловушку, закрытие по `Esc`, управление стрелками в пикере цветов и иконок, контрастность токенов соответствует WCAG 2.1 AA.
- [ ] **AC-I18N:** Ни одной жестко закодированной строки в интерфейсе, полные переводы для EN и RU.
- [ ] **AC-ARCH:** Соблюдены правила слоев: `components/common/CategoryBadge` не импортирует `features/categories`, фичи импортируются только через `index.ts`.

---

## 13. План тестов

| Уровень | Файлы тестов | Что проверяется |
|---|---|---|
| **Unit** | `src/features/categories/converters.test.ts` | Конвертер `createConverter`: корректное преобразование `Timestamp` в `Date`, удаление `id` при записи, пропуск невалидных документов в `parseSnapshotDocs`. |
| **Unit** | `src/features/categories/utils.test.ts` | Функция получения имени категории (`getCategoryDisplayName`): приоритет `name` над `systemKey`, корректная локализация дефолтов. |
| **Unit** | `src/features/auth/onboarding.test.ts` | Валидация входных данных онбординга, формирование 13 документов batch-пакета. |
| **Integration** | `src/features/categories/repository.integration.test.ts` | Работа с эмулятором Firestore: создание, чтение, обновление, архивация, проверка запрета изменения `type` правилами безопасности. |
| **Integration** | `src/features/auth/onboarding.integration.test.ts` | Выполнение batch-онбординга на эмуляторе, проверка атомарности и создания всех связанных сущностей. |
| **Component** | `src/components/common/CategoryBadge.test.tsx` | Рендеринг иконки, текста, цветов палитры, статуса архива. |
| **Component** | `src/components/common/ResponsiveDialog.test.tsx` | Переключение между Dialog и Drawer в зависимости от медиа-запроса `useMediaQuery`. |
| **Component** | `src/features/categories/components/CategoryForm.test.tsx` | Валидация, блокировка `type` на редактировании, выбор цвета и иконки. |
| **Component** | `src/app/pages/CategoriesPage.test.tsx` | Переключение вкладок, фильтр архивных, состояния loading/empty/error. |
| **E2E** | `e2e/onboarding-categories.spec.ts` | Полный цикл: регистрация пользователя → форма онбординга → переход на дашборд → переход в категории → создание пользовательской категории → архивация → отображение в фильтре архивных. |

---

## 14. Задачи (T1–T7)

Каждая задача представляет собой строго одну рабочую сессию и завершается одним коммитом по стандарту Conventional Commits на английском языке.

| # | Задача | Детали и файлы | Проверка |
|---|---|---|---|
| **T1** | **Инфраструктура онбординга и профиля** | 1. Добавить `executeOnboardingBatch` и `checkProfileExists` в `src/features/auth/onboarding.ts`.<br>2. Расширить `AuthState` в `src/features/auth/types.ts` (`profileStatus`, `profile`).<br>3. Обновить `AuthProvider.tsx`: подписка на `userDoc(uid)` при авторизации.<br>4. Обновить guard'ы (`RequireAuth.tsx`, `RootRedirect.tsx`, `PublicOnly.tsx`).<br>5. Добавить роут `/onboarding` в `routes.ts` и `router.tsx`.<br>6. Интеграционный тест онбординг-batch на эмуляторе. | `pnpm test`, `pnpm typecheck` |
| **T2** | **Конвертеры и репозиторий категорий** | 1. Создать `src/features/categories/converters.ts` (`categoryConverter`, `categoriesCollectionRef`).<br>2. Реализовать `src/features/categories/repository.ts` (`subscribeCategories`, `createCategory`, `updateCategory`, `archiveCategory`, `unarchiveCategory`).<br>3. Написать модульные тесты конвертеров и интеграционные тесты репозитория на эмуляторе Firestore. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T3** | **Общие UI-компоненты (`CategoryBadge`, `ResponsiveDialog`, `ConfirmDialog`)** | 1. Установить shadcn-компоненты: `dialog`, `drawer` (через CLI).<br>2. Создать `src/components/common/ResponsiveDialog.tsx` (Dialog на desktop, Drawer на mobile).<br>3. Создать `src/components/common/ConfirmDialog.tsx`.<br>4. Создать `src/components/common/CategoryBadge.tsx` (цветовые токены `--cat-*`, Lucide-иконка, поддержка `systemKey`).<br>5. Покрыть тестами в `src/components/common/*.test.tsx`. | `pnpm test`, `pnpm typecheck` |
| **T4** | **Хуки категорий и компоненты выбора (Pickers & Form)** | 1. Реализовать `useCategories.ts` (на базе `useSubscription`) и `useCategoryMutations.ts`.<br>2. Создать константу доступных иконок `src/features/categories/icons.ts`.<br>3. Создать `ColorPicker.tsx` (12 цветов палитры) и `IconPicker.tsx`.<br>4. Создать `CategoryForm.tsx` (RHF + Zod, валидация дубликатов, блокировка `type` на редактировании).<br>5. Тесты формы и пикеров. | `pnpm test`, `pnpm typecheck` |
| **T5** | **Экран категорий, страница онбординга и i18n** | 1. Установить shadcn: `tabs`, `switch`, `select`.<br>2. Создать `OnboardingForm.tsx` и `src/app/pages/OnboardingPage.tsx`.<br>3. Создать `CategoryList.tsx`, `CategoryItem.tsx` и обновить `src/app/pages/CategoriesPage.tsx` (вкладки, переключатель архива, QueryBoundary).<br>4. Добавить полные файлы локализации `categories.json` (EN и RU), обновить `nav.json`, `common.json`, `validation.json`. | `pnpm test`, `pnpm typecheck`, `pnpm lint` |
| **T6** | **Компонентные тесты и Playwright E2E** | 1. Написать компонентные тесты для `CategoriesPage` и `OnboardingPage`.<br>2. Добавить сквозной E2E-тест `e2e/onboarding-categories.spec.ts` с запуском эмуляторов.<br>3. Проверить доступность (a11y: aria-labels, клавиатурный фокус). | `pnpm test`, `pnpm e2e` |
| **T7** | **Верификация, документация и финализация** | 1. Полный прогон проверок: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rules`, `pnpm build`.<br>2. Обновить статус F04 в `docs/06-roadmap.md` (`todo` → `done`).<br>3. Зафиксировать принятые решения в журнале. Прогон скилла `verify`. | Скилл `verify`, CI зелёный |

---

## 15. Definition of Done

- [ ] Все критерии приёмки (AC1–AC9, AC-STATES, AC-A11Y, AC-I18N, AC-ARCH) выполнены.
- [ ] Все задачи T1–T7 закрыты отдельными коммитами по стандарту Conventional Commits.
- [ ] Покрытие тестами: unit, integration (на эмуляторе Firestore), component и Playwright e2e проходят без ошибок.
- [ ] Отсутствуют регрессии в существующих тестах правил безопасности (`pnpm test:rules`).
- [ ] Пройдены все проверки качества: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- [ ] Никаких нарушений архитектурных границ (`AGENTS.md` §7, `eslint.config.js`): `components/common` не импортирует `features/`, `firebase/firestore` изолирован в `repository.ts` и `converters.ts`.
- [ ] Статус фичи F04 в `docs/06-roadmap.md` переведен в `done`.
- [ ] Документация и журнал решений обновлены.

---

## 16. Журнал решений и открытые вопросы

| Дата | Вопрос / Решение | Статус |
|---|---|---|
| 2026-10-04 | Выбор механизма онбординга: выделенный роут `/onboarding` с формой выбора базовой валюты против скрытого авто-создания | Принято: выделенный экран `/onboarding`, так как базовая валюта аккаунта выбирается один раз и не подлежит автоматической конвертации |
| 2026-10-04 | Архивация vs удаление категорий: запретить физическое удаление в UI | Принято: в UI доступна только архивация (`archived: true`) во избежание появления повисших ссылок в транзакциях (F05) |
| 2026-10-04 | Курируемый набор иконок Lucide (~40 шт) против динамической загрузки всей библиотеки | Принято: курируемый массив с tree-shaking для соблюдения бюджета бандла приложения |
