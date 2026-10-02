# F02 — Auth

Статус: spec-ready
Зависит от: F00 (влит в `main`). Рекомендуемый порядок: после F01 (используется `lib/logger.ts`; если F01 не влит, создать `logger` по контракту F01 §4.8)
Размер: M–L (8 задач)
Ветка: `feat/F02-auth`

> Агент читает: `AGENTS.md`, эту спеку, `docs/01-architecture.md` (§7, §8.4), `docs/04-ux-guidelines.md` (§4, §5, §8, §9), `docs/03-conventions.md`.
> Синтаксис `firebase/auth`, React Router (data router), React Hook Form, `@hookform/resolvers`, shadcn (формы), Zod 4, Playwright `webServer` и REST-эндпоинтов Auth-эмулятора сверяется через **Context7**.

## 1. Цель

Пользователь может зарегистрироваться, войти (email и Google), восстановить пароль и выйти. Все роуты `/app/**` закрыты, неавторизованного перекидывает на `/login` с возвратом на нужную страницу после входа. Экран логина не «мигает» при загрузке.

## 2. Состояние репозитория на старт (проверено по `main`, адаптация спеки)

| Что есть в коде | Следствие для F02 |
|---|---|
| `src/lib/firebase.ts` экспортирует `app`, `auth`, `db`, эмуляторы подключаются при `VITE_USE_EMULATORS=true` (Auth `127.0.0.1:9099`) | Используем готовый `auth`. Новую инициализацию не делаем |
| `router.tsx` без guard'ов, `/` ведёт на `/app/dashboard`, `/app` редиректит вне какого-либо layout | Перестраиваем дерево роутов (§9.5) |
| `app/pages/{Login,Register,ResetPassword}Page.tsx` это заглушки на `placeholder.*` | Заменяем содержимое на формы фичи `auth` |
| `AuthLayout` использует ключ `placeholder.notFound.goHome` и ссылку на dashboard (для гостя это тупик) | Очищаем: логотип ведёт на `ROUTES.root`, лишнюю кнопку убираем |
| `AppLayout` без меню пользователя и без выхода | Добавляем `UserMenu` и баннер подтверждения email |
| i18n разбит на namespace-файлы (`common`, `nav`, `errors`, `validation`, `layout`, `placeholder`, `dashboard`), `validation.json` пустой | Добавляем namespace `auth`, наполняем `validation` |
| `toAppError` сохраняет коды `auth/*`, `ErrorState` для них показывает `errors.unknown` | Для форм нужна собственная таблица сообщений (§10) |
| `firestore.rules` закрыт полностью (`allow ... if false`) | **F02 не читает и не пишет Firestore.** Профиль и онбординг в F04, после F03 |
| ESLint-границы имеют дефекты (см. ниже) | T1 исправляет их до начала работы над фичей |
| e2e в CI запускается без эмуляторов | T7 добавляет Auth-эмулятор и Java в e2e-джоб |
| В `ui/*` (`tooltip`, `sidebar`, `input`, `skeleton`) импорт `cn` идёт из npm-пакета `'cn'`, а не из `@/lib/cn` | Вынесено в T1 как исправление: заменить на `@/lib/cn`, удалить зависимость `cn` из `package.json` |

### Выявленные дефекты ESLint (исправляются в T1)

1. Паттерн `@/features/**` в `no-restricted-imports` блокирует **и публичный `index.ts`** (`@/features/auth`), потому что `**` матчит прямых потомков. Правильный паттерн: `@/features/*/*` (разрешён только индекс фичи).
2. Для `src/features/auth/**` правило `no-restricted-imports` отключено целиком, поэтому фича `auth` может импортировать `firebase/firestore` и внутренности чужих фич.
3. В flat config опции правила во втором объекте **заменяют**, а не дополняют предыдущие. Из-за блока для `src/lib/**` и `src/components/**` эти каталоги потеряли запрет на `firebase/firestore` и `firebase/auth`.

Целевая матрица (проверяется временными файлами в T1):

| Файлы | `firebase/firestore` | `firebase/auth` | `@/features/*/*` (внутренности) | `@/features/*` (индекс) |
|---|---|---|---|---|
| `src/components/**`, `src/lib/**` (кроме `lib/firebase.ts`, `lib/firestore/**`) | запрещён | запрещён | запрещён | запрещён |
| `src/lib/firebase.ts` | разрешён | разрешён | запрещён | запрещён |
| `src/lib/firestore/**` | разрешён | запрещён | запрещён | запрещён |
| `src/features/auth/authService.ts` | запрещён | **разрешён** | запрещён | запрещён |
| `src/features/**/repository.ts`, `converters.ts` | разрешён | запрещён | запрещён | запрещён |
| Остальные файлы фич | запрещён | запрещён | запрещён | запрещён (импорт другой фичи только через индекс: разрешён) |
| `src/app/**` | запрещён | запрещён | запрещён | **разрешён** |

Уточнение к `docs/01-architecture.md` §7: `firebase/auth` разрешён только в `features/auth/authService.ts` и `lib/firebase.ts` (строже прежней формулировки «в `features/auth/*`»).

## 3. Скоуп

**Входит:**
- Регистрация по email и паролю, вход по email и паролю, вход через Google (popup), сброс пароля, выход.
- Письмо подтверждения email после регистрации, неблокирующий баннер с повторной отправкой.
- `authService` (единственная обёртка над `firebase/auth`), `AuthProvider`, `useAuth`.
- Guard'ы `RequireAuth`, `PublicOnly`, `RootRedirect`, безопасный `returnTo`.
- Страницы `/login`, `/register`, `/reset-password` с формами (RHF + Zod), общие компоненты `PasswordInput`, `AuthFormCard`, `GoogleButton`.
- `UserMenu` (имя, email, переход в настройки, выход).
- Очистка локального кеша Firestore при выходе (best effort).
- i18n (namespace `auth`, ключи `validation.*`), таблица сообщений об ошибках Auth.
- e2e на Auth-эмуляторе, обновление CI, исправление ESLint-границ.

**Не входит (явно):**
- Документ профиля `users/{uid}` и онбординг (F04), Security Rules (F03).
- Удаление аккаунта и повторная аутентификация (F11), смена email и пароля.
- Anonymous Auth и конвертация демо-аккаунта (F12). Но `AuthUser.isAnonymous` моделируется уже сейчас, guard'ы считают анонимного пользователя авторизованным.
- App Check (F13), MFA, magic link, другие провайдеры (Apple, GitHub).

## 4. Решения F02

| Вопрос | Решение |
|---|---|
| Провайдеры | Email и пароль, Google. Anonymous добавится в F12 |
| Поля регистрации | `displayName` (необязательное), `email`, `password`. Поля «повторите пароль» нет: вместо него переключатель показа пароля |
| Политика пароля | Минимум 8 символов, без требований к составу (Firebase допускает 6, поднимаем планку в клиенте) |
| Подтверждение email | Письмо отправляется после регистрации. Доступ не блокируется, показывается баннер с «Отправить ещё раз» (пауза 60 секунд) и «Я подтвердил» (перезагрузка пользователя) |
| Google | `signInWithPopup`. Redirect-вариант не используем (проблемы со сторонними cookie). Блокировку popup показываем понятным сообщением |
| Защита от перечисления email | Ожидаем `auth/invalid-credential` вместо «пользователь не найден» и «неверный пароль». Сброс пароля **всегда** показывает одинаковое сообщение об успехе |
| Состояние | `loading → unauthenticated \| authenticated`. Профиль Firestore в состоянии отсутствует (расширяется в F04: `needsOnboarding`, `ready`) |
| `returnTo` | Параметр `?returnTo=`, принимается только внутренний путь под `/app` (проверка разбором через `URL`), иначе dashboard |
| Выход | `signOut`, затем best-effort очистка локального кеша Firestore, затем **полная перезагрузка** на `/login` (ADR-0015) |
| Тесты сервиса | Компоненты мокают `authService`, а не `firebase/auth` |
| Файл схем форм | `features/auth/formSchemas.ts` (чтобы не пересекаться с `features/auth/schemas.ts`, который создаёт F01 для профиля) |

## 5. Пользовательские сценарии

| # | Сценарий | Результат |
|---|---|---|
| 1 | Гость открывает `/app/transactions?month=2026-09` | Редирект на `/login?returnTo=%2Fapp%2Ftransactions%3Fmonth%3D2026-09`, без вспышки приложения |
| 2 | Регистрация с валидными данными | Пользователь авторизован, попадает на `returnTo` или dashboard, видит баннер подтверждения, имя в меню |
| 3 | Регистрация с занятым email | Сообщение «Этот email уже используется» у формы, поля сохранены |
| 4 | Вход с неверным паролем | Единое сообщение «Неверный email или пароль», пароль очищается |
| 5 | Вход через Google, пользователь закрыл окно | Ошибка не показывается, кнопка снова доступна |
| 6 | Сброс пароля для любого email | Одинаковое сообщение об успехе. Письмо уходит только существующему аккаунту |
| 7 | Авторизованный открывает `/login` | Редирект на `returnTo` или dashboard |
| 8 | Выход | Переход на `/login` (полная перезагрузка), `/app/**` снова закрыт |
| 9 | Обновление страницы при активной сессии | Экран загрузки, затем приложение. Страница логина не показывается |
| 10 | Потеря сети при входе | Понятное сообщение «Нет соединения», повтор возможен |
| 11 | `returnTo=https://evil.com` или `//evil.com` | Игнорируется, переход на dashboard |

## 6. UI

- **`/login`:** `AuthFormCard` с полями email и пароль, ссылка «Забыли пароль?», кнопка входа, разделитель «или», `GoogleButton`, ссылка на регистрацию.
- **`/register`:** имя (необязательное), email, пароль с переключателем показа, кнопка, `GoogleButton`, ссылка на вход.
- **`/reset-password`:** поле email, кнопка. После отправки форма заменяется сообщением об успехе и ссылкой «Вернуться ко входу».
- **Экран загрузки авторизации (`AuthLoadingScreen`):** полноэкранный скелет с `aria-busy` и подписью для скринридера (`auth.loading`).
- **`UserMenu`:** аватар с инициалами, имя и email, пункты «Настройки» и «Выйти». Desktop: футер сайдбара. Mobile: шапка рядом с переключателями.
- **`EmailVerificationBanner`:** под `OfflineBanner`, виден только если `emailVerified === false` и есть провайдер `password`. Кнопка отправки блокируется на время паузы с обратным отсчётом.
- Все пять состояний экрана: loading (кнопка с индикатором, `AuthLoadingScreen`), error (баннер формы `role="alert"`, ошибки полей), offline (сообщение сети), success (toast и экран успеха сброса), empty неприменимо.
- Mobile 360 px: карточка на всю ширину с отступами, клавиатура не перекрывает кнопку, нет горизонтального скролла. Тёмная тема, EN и RU (длинные русские строки).
- Доступность: `label` у каждого поля, `autocomplete` (`email`, `current-password`, `new-password`, `name`), ошибки через `aria-describedby`, фокус на первое невалидное поле, переключатель пароля с `aria-pressed` и подписью, форма отправляется по Enter.

### Переиспользование (DRY-проверка)

| Что нужно | Решение |
|---|---|
| Поле пароля с показом | Новый `components/common/PasswordInput` (понадобится в F11) |
| Оболочка формы (заголовок, описание, подвал-ссылка) | Новый `features/auth/components/AuthFormCard`, используется тремя формами |
| Баннер ошибки формы | Общий компонент на shadcn `alert` (`components/common/FormAlert`), не копировать разметку |
| Кнопка Google | Один `GoogleButton` для логина и регистрации |
| Перевод сообщения валидации | Один хелпер на проект (`translateValidationMessage`), не повторять `t(...)` в каждом поле |
| Загрузочные состояния | `LoadingSkeleton` и `RouteLoadingSkeleton` из F00 |
| Лейаут | `AuthLayout` из F00 (чистка) |
| Иконки, кнопки, карточки, `input` | shadcn из F00, плюс через CLI: `label`, `alert`, `avatar` и компонент форм по актуальной рекомендации shadcn |

## 7. Данные

Коллекций и запросов Firestore нет. Правила и индексы не меняются.

## 8. Зависимости

Новые (разрешены только перечисленные): `react-hook-form`, `@hookform/resolvers` (проверить совместимость с Zod 4 через Context7). Компоненты shadcn: `label`, `alert`, `avatar` и форм-компонент (`form` или `field`, по актуальной документации shadcn). Выбранный подход к формам записать в `docs/03-conventions.md` §5.

## 9. Контракты

### 9.1 Модель пользователя

```ts
// features/auth/types.ts
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  isAnonymous: boolean
  providerIds: readonly string[]      // например ['password'], ['google.com']
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }

export type AuthContextValue = AuthState & {
  refreshUser: () => Promise<void>    // перечитывает пользователя (emailVerified, displayName) и обновляет состояние
}
```

### 9.2 `authService.ts` (единственный файл с `firebase/auth`)

```ts
export interface FirebaseUserLike {      // структурный тип для тестов, без импорта типов Firebase
  uid: string; email: string | null; displayName: string | null; photoURL: string | null
  emailVerified: boolean; isAnonymous: boolean
  providerData: ReadonlyArray<{ providerId: string }>
}
export function toAuthUser(source: FirebaseUserLike): AuthUser       // чистая функция

export function subscribeToAuthState(onUser: (user: AuthUser | null) => void, onError: (error: AppError) => void): () => void
export function registerWithEmail(input: { email: string; password: string; displayName?: string }): Promise<AuthUser>
export function signInWithEmail(input: { email: string; password: string }): Promise<AuthUser>
export function signInWithGoogle(): Promise<AuthUser>
export function sendPasswordReset(email: string): Promise<void>
export function sendVerificationEmail(): Promise<void>
export function reloadCurrentUser(): Promise<AuthUser | null>
export function signOutUser(): Promise<void>
```

Правила: каждая асинхронная функция перехватывает ошибку и бросает `toAppError(e)` (код `auth/*` сохраняется). `registerWithEmail`: создание, затем `updateProfile` при наличии имени, затем письмо подтверждения. **Сбой отправки письма не отменяет регистрацию**: ошибка логируется через `logger.warn`.

### 9.3 Ошибки (`authErrors.ts`, чистая функция)

```ts
export type AuthErrorKey =
  | 'auth.errors.invalidCredential' | 'auth.errors.invalidEmail' | 'auth.errors.emailInUse'
  | 'auth.errors.weakPassword' | 'auth.errors.tooManyRequests' | 'auth.errors.network'
  | 'auth.errors.userDisabled' | 'auth.errors.popupBlocked' | 'auth.errors.accountExistsDifferentProvider'
  | 'auth.errors.operationNotAllowed' | 'errors.unknown'

// null означает «ошибку пользователю не показывать» (пользователь сам закрыл popup)
export function getAuthErrorKey(error: unknown): AuthErrorKey | null
```

### 9.4 Провайдер, хуки, guard'ы

```ts
// AuthProvider.tsx — подписка через authService.subscribeToAuthState, отписка в cleanup, безопасен под StrictMode.
// useAuth.ts — бросает понятную ошибку при использовании вне провайдера.
// useSignOut.ts — signOutUser() -> clearLocalFirestoreData() -> window.location.assign(ROUTES.login)

// returnTo.ts
export const RETURN_TO_PARAM = 'returnTo'
export function isSafeReturnTo(value: string | null | undefined): value is string
export function resolveReturnTo(value: string | null | undefined): string     // безопасный путь или ROUTES.dashboard
export function buildLoginPath(from: { pathname: string; search: string }): string

// guards: RequireAuth, PublicOnly, RootRedirect (элементы роутов, используют <Outlet /> и useAuth)
```

`isSafeReturnTo`: путь разбирается через `new URL(value, 'http://localhost')`, принимается только если `origin` не изменился, путь начинается с `/app` (точно `/app` или `/app/...`), нет обратных слэшей и управляющих символов.

### 9.5 Дерево роутов

```
/            -> <RootRedirect />                       (loading: AuthLoadingScreen; auth: dashboard; иначе login)
<RequireAuth>                                          (loading: AuthLoadingScreen; гость: /login?returnTo=...)
  /app       -> <Navigate to dashboard />
  <AppLayout> dashboard, transactions, accounts, budgets, categories, import-export, settings
<PublicOnly>                                           (loading: AuthLoadingScreen; авторизован: resolveReturnTo)
  <AuthLayout> login, register, reset-password
*            -> NotFoundPage
```

`AuthProvider` монтируется в `App.tsx` внутри `I18nProvider`, снаружи `RouterProvider`.

### 9.6 Очистка локальных данных

```ts
// lib/firestore/session.ts (разрешённое место для firebase/firestore)
// Best effort: terminate(db), затем clearIndexedDbPersistence(db). Ошибки (в том числе от других вкладок
// или неотправленных записей) перехватываются и логируются, выход не прерывается.
export function clearLocalFirestoreData(): Promise<void>
```

### 9.7 Публичный API фичи (`features/auth/index.ts`)

`AuthProvider`, `useAuth`, `useSignOut`, `RequireAuth`, `PublicOnly`, `RootRedirect`, `LoginForm`, `RegisterForm`, `ResetPasswordForm`, `UserMenu`, `EmailVerificationBanner`, типы `AuthUser`, `AuthState`. Внутренности (`authService`, `authErrors`, `formSchemas`) наружу не экспортируются.

## 10. Валидация и сообщения

| Поле | Правило | Ключ |
|---|---|---|
| email | Обязательно, формат email (обрезка пробелов) | `validation.required`, `validation.emailInvalid` |
| password (вход) | Обязательно | `validation.required` |
| password (регистрация) | Минимум 8 символов | `validation.passwordTooShort` (с `{{count}}`) |
| displayName | Необязательно, до `DISPLAY_NAME_MAX_LENGTH` (60) после обрезки | `validation.tooLong` |

Сообщения схем это **ключи i18n**, а не тексты. Хелпер `translateValidationMessage(t, message)` переводит их без `as any`. Если ключ `validation.required` или `validation.tooLong` уже создан в F01, не дублировать.

Сопоставление кодов Firebase с ключами (`getAuthErrorKey`):

| Код Firebase | Ключ |
|---|---|
| `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` | `auth.errors.invalidCredential` |
| `auth/invalid-email` | `auth.errors.invalidEmail` |
| `auth/email-already-in-use` | `auth.errors.emailInUse` |
| `auth/weak-password` | `auth.errors.weakPassword` |
| `auth/too-many-requests` | `auth.errors.tooManyRequests` |
| `auth/network-request-failed`, `AppError('offline')` | `auth.errors.network` |
| `auth/user-disabled` | `auth.errors.userDisabled` |
| `auth/popup-blocked` | `auth.errors.popupBlocked` |
| `auth/account-exists-with-different-credential` | `auth.errors.accountExistsDifferentProvider` |
| `auth/operation-not-allowed` | `auth.errors.operationNotAllowed` |
| `auth/popup-closed-by-user`, `auth/cancelled-popup-request` | `null` (не показывать) |
| любой другой | `errors.unknown` |

## 11. i18n-ключи (EN и RU, одним коммитом)

Новый namespace `auth` (добавить в `namespaces` и `resources` в `src/i18n/config.ts`, ключи типизированы):

- `auth.login.{title,description,submit,forgotPassword,noAccount,register}`
- `auth.register.{title,description,submit,haveAccount,login}`
- `auth.reset.{title,description,submit,successTitle,successDescription,backToLogin}`
- `auth.fields.{email,password,displayName,displayNameOptional,showPassword,hidePassword}`
- `auth.google.continue`, `auth.divider.or`, `auth.loading`
- `auth.errors.*` (по таблице §10)
- `auth.verify.{title,description,resend,resendCooldown,iVerified,sent,stillUnverified}`
- `auth.userMenu.{account,settings,signOut}`
- `validation.{required,emailInvalid,passwordTooShort,tooLong}` (без дублей)

Повторяющиеся тексты используют `common.actions.*`.

## 12. Acceptance criteria

- [ ] AC1: Given гость, When открывает любой `/app/**`, Then редирект на `/login` с корректным `returnTo`, содержимое приложения не отрисовывалось.
- [ ] AC2: Given обновление страницы с активной сессией, When идёт определение состояния, Then показывается `AuthLoadingScreen`, страница логина **не** показывается.
- [ ] AC3: Given валидные данные, When регистрация, Then пользователь создан, имя сохранено и отображается в `UserMenu`, письмо подтверждения запрошено, пользователь на `returnTo` или dashboard.
- [ ] AC4: Given сбой отправки письма подтверждения, When регистрация, Then регистрация успешна, ошибка залогирована.
- [ ] AC5: Given неверные данные входа, When submit, Then единое сообщение `invalidCredential`, пароль очищен, форма снова доступна.
- [ ] AC6: Given Google popup закрыт пользователем, When вход, Then сообщение не показывается.
- [ ] AC7: Given любой email, When сброс пароля, Then всегда одинаковый экран успеха (в том числе при `auth/user-not-found`).
- [ ] AC8: Given авторизованный пользователь, When открывает `/login`, `/register`, `/reset-password`, Then редирект на безопасный `returnTo` или dashboard.
- [ ] AC9: `isSafeReturnTo` отклоняет `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:alert(1)`, `/login`, пустое значение, и принимает `/app`, `/app/transactions?month=2026-09`.
- [ ] AC10: Given выход, When нажата кнопка, Then вызваны `signOut`, очистка кеша, переход на `/login` с полной перезагрузкой. Ошибка очистки не блокирует выход.
- [ ] AC11: Given `emailVerified === false` и провайдер `password`, Then виден баннер. Повторная отправка блокируется на 60 секунд с обратным отсчётом. «Я подтвердил» обновляет состояние и скрывает баннер.
- [ ] AC12: Ошибки Firebase на формах показываются через `getAuthErrorKey`, без сырых кодов и технических текстов.
- [ ] AC13: Формы доступны с клавиатуры, имеют `label`, `autocomplete`, `aria-describedby` для ошибок, фокус переходит на первое невалидное поле. axe не находит critical и serious нарушений на `/login` и `/register` в обеих темах.
- [ ] AC14: Все тексты через i18n в EN и RU, длинные русские строки не ломают вёрстку на 360 px.
- [ ] AC15: `AuthProvider` отписывается при размонтировании и корректно работает под `StrictMode` (нет лишних подписок).
- [ ] AC16: `firebase/auth` импортируется только в `authService.ts` и `lib/firebase.ts`. Временные нарушения из матрицы §2 ломают `pnpm lint`.
- [ ] AC17: Импорт `cn` во всех `components/ui/*` идёт из `@/lib/cn`, зависимость `cn` удалена.
- [ ] AC-STATES: Реализованы loading, error, offline, success для каждой формы.
- [ ] AC-ARCH: Нет дублирования (оболочка формы, поле пароля, баннер ошибки, перевод валидации вынесены), нет `any`, нет обращений к Firestore из фичи.

## 13. План тестов

| Уровень | Что |
|---|---|
| Unit | `isSafeReturnTo`, `resolveReturnTo`, `buildLoginPath`; `getAuthErrorKey` (каждый код из таблицы); `toAuthUser` (password, google, anonymous, без email); схемы форм (границы email, пароля, имени); `getInitials` |
| Component | `AuthProvider` (loading, authenticated, unauthenticated, отписка, StrictMode); `RequireAuth`, `PublicOnly`, `RootRedirect` (включая `returnTo` и отсутствие вспышки логина); `LoginForm`, `RegisterForm`, `ResetPasswordForm` (валидация, отправка, отображение ошибок, блокировка при отправке, silent при закрытии popup, одинаковый успех сброса); `PasswordInput` (переключение, `aria-pressed`); `UserMenu` (выход вызывает цепочку); `EmailVerificationBanner` (условия показа, пауза с fake timers) |
| Integration | Нет (e2e покрывает связку с эмулятором). Rules не затрагиваются |
| E2E (Auth-эмулятор) | см. ниже |

### E2E-сценарии (Playwright + Auth-эмулятор)

1. Гость на `/app/dashboard` перенаправляется на `/login?returnTo=...`.
2. Регистрация нового пользователя, переход в приложение, баннер подтверждения, имя в меню.
3. Выход, затем проверка закрытости `/app/**`.
4. Вход созданным пользователем с учётом `returnTo`. Неверный пароль показывает сообщение.
5. Сброс пароля: сообщение об успехе, письмо видно через эмулятор (`oobCodes`).
6. Авторизованный на `/login` попадает в приложение.
7. Смена языка на страницах Auth сохраняется.
8. axe на `/login` и `/register` в светлой и тёмной теме. Mobile viewport 360 px: форма входа пригодна к использованию.
9. Вход через Google проверяется **вручную** (popup), в автотесты не входит.

Правила: каждый тест создаёт пользователя с уникальным email, очистка Auth-эмулятора между тестами через REST (`DELETE .../accounts`, точный URL сверить в документации эмулятора через Context7), без `sleep`.

## 14. Задачи (одна задача = одна сессия = один коммит)

| # | Задача | Файлы | Проверка после |
|---|---|---|---|
| T1 | **ESLint-границы и `cn`** . Исправить правила по матрице §2 (общие константы сообщений, без копирования блоков), заменить импорт `cn` в `components/ui/*` на `@/lib/cn`, удалить пакет `cn`, обновить `AGENTS.md` §7 и `docs/01-architecture.md` §7. Проверить временными файлами каждую строку матрицы | `eslint.config.js`, `components/ui/*`, `package.json`, документы | `pnpm lint`, `pnpm typecheck`, `pnpm test`, временные нарушения |
| T2 | **Зависимости, shadcn, i18n.** `react-hook-form`, `@hookform/resolvers`, компоненты `label`, `alert`, `avatar`, форм-компонент. Namespace `auth`, ключи `validation`, регистрация в `config.ts`. Запись подхода к формам в `docs/03-conventions.md` | `package.json`, `components/ui/*`, `i18n/*` | `pnpm typecheck`, `pnpm test` (тесты i18n) |
| T3 | **`authService`, типы, ошибки.** `types.ts`, `authService.ts`, `authErrors.ts`, unit-тесты (`toAuthUser`, `getAuthErrorKey`, обёртки с мокнутым `firebase/auth`) | `features/auth/*` | `pnpm test` |
| T4 | **Провайдер, guard'ы, роуты.** `AuthProvider`, `useAuth`, `returnTo.ts`, `RequireAuth`, `PublicOnly`, `RootRedirect`, `AuthLoadingScreen`, перестройка `router.tsx`, подключение в `App.tsx`, `features/auth/index.ts`, тесты | `features/auth/*`, `app/router.tsx`, `App.tsx` | `pnpm test`, `pnpm dev` (сценарии 1, 7, 9) |
| T5 | **Формы и страницы.** `PasswordInput`, `FormAlert`, `translateValidationMessage`, `AuthFormCard`, `GoogleButton`, `formSchemas.ts`, три формы, обновление страниц и `AuthLayout`, тесты | `components/common/*`, `features/auth/*`, `app/pages/*`, `app/layouts/AuthLayout.tsx` | `pnpm test`, ручная проверка на эмуляторе |
| T6 | **Меню, баннер, выход.** `UserMenu`, `getInitials`, `EmailVerificationBanner`, `useSignOut`, `lib/firestore/session.ts`, интеграция в `AppLayout`, тесты | `features/auth/*`, `lib/firestore/session.ts`, `app/layouts/AppLayout.tsx` | `pnpm test`, ручной выход |
| T7 | **E2E и CI.** Playwright: массив `webServer` (Auth-эмулятор `--only auth --project demo-fintrack` и dev-сервер на **отдельном порту** со `strictPort`, чтобы не подхватить уже запущенный dev-сервер с реальным `.env.local`, env: `VITE_USE_EMULATORS=true`, `VITE_FIREBASE_PROJECT_ID=demo-fintrack`), хелперы `e2e/helpers/auth.ts`, сценарии §13, в CI e2e-джоб: `actions/setup-java` (JDK 21) и кеш эмуляторов | `playwright.config.ts`, `e2e/*`, `.github/workflows/ci.yml` | `pnpm e2e` локально и в CI |
| T8 | **Финализация.** ADR-0015 (очистка кеша при выходе), обновление `docs/01-architecture.md` §8.4 и `docs/05-testing-strategy.md` (e2e с эмулятором), roadmap (F02 `done`), прогон `verify`, ручная проверка Google и писем на реальном dev-проекте | `docs/*` | Скилл `verify` |

После каждой задачи: `pnpm typecheck && pnpm lint && pnpm test`, коммит по Conventional Commits (английский).

## 15. Действия владельца

| Когда | Действие |
|---|---|
| До T7 | JDK 21+ установлен (нужен Auth-эмулятору), `firebase login` выполнен |
| До T8 | В dev-проекте (`fintrack-dev-4fb7e`): Authentication, Sign-in method: включить **Email/Password** и **Google** (указать support email). Проверить включённую защиту от перечисления email (Authentication, Settings). Домен `localhost` по умолчанию в Authorized domains. Опционально: язык шаблонов писем (Templates) |
| T8 | Ручная проверка на реальном dev-проекте: Google popup, получение письма подтверждения и письма сброса пароля |
| Перед prod | Те же настройки в prod-проекте, домен `*.web.app` в Authorized domains |

## 16. Definition of Done

- [ ] AC1–AC17 и AC-* выполнены
- [ ] Тесты из плана написаны и проходят локально и в CI (включая e2e на эмуляторе)
- [ ] Скилл `verify` пройден, отчёт приложен к PR
- [ ] Нет нарушений `AGENTS.md` (разделы 7, 8, 11), матрица ESLint проверена
- [ ] `docs/01-architecture.md`, `docs/03-conventions.md`, `docs/05-testing-strategy.md`, ADR-0015 обновлены
- [ ] Статус F02 в `docs/06-roadmap.md` = `done`

## 17. Журнал решений и открытые вопросы

| Дата | Вопрос или решение | Статус |
|---|---|---|
| 2026-10-02 | Использован компонент `form` (`components/ui/form.tsx`) с обёртками RHF (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) | resolved |
| 2026-10-02 | `@hookform/resolvers` 5.9+ нативно поддерживает Zod 4 через trait-проверки (`$ZodError`) | resolved |
| — | Точный URL очистки аккаунтов и чтения `oobCodes` Auth-эмулятора | open |
| — | Поведение `email-already-in-use` при включённой защите от перечисления email (проверить на эмуляторе и dev-проекте) | open |
| — | Расширение `AuthState` до `needsOnboarding` и `ready` после F03 и F04 | planned |
