# План реализации фичи F00: Foundation (Задачи T3–T7)

> **Статус:** 
> - [x] **T1: Базовый каркас проекта** (Vite + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui init) — *Завершено*
> - [x] **T2: Линтинг и стандарты качества** (ESLint flat config, Prettier, Husky, lint-staged, commitlint) — *Завершено*
> - [x] **T3: Инфраструктура тестирования** (Vitest, Testing Library, Playwright) — *Завершено*
> - [x] **T4: Дизайн-система, темы и базовый лейаут** (Tailwind v4 tokens, ThemeProvider, AppLayout) — *Завершено*
> - [ ] **T5: Инфраструктура приложения** (Zod env validation, i18next EN/RU, ErrorBoundary)
> - [ ] **T6: Firebase Modular SDK и локальные эмуляторы** (`lib/firebase.ts`, `firestore.rules`)
> - [ ] **T7: GitHub Actions CI/CD и финализация verify-скилла**

---

## Контекст и системные соглашения
1. **Стек:** React 19, TypeScript (strict, `noUncheckedIndexedAccess: true`), Vite, pnpm, Tailwind CSS v4, shadcn/ui.
2. **Окружение:** Windows 11, Node.js 22 LTS, Java 21+ (для Firebase Emulators).
3. **Архитектура импортов:** Запрещен прямой импорт `firebase/firestore` вне `src/lib/firebase.ts` и `src/features/**/repository.ts`.
4. **Формат выполнения:** Каждая задача (T3–T7) выполняется в изолированной сессии агента в прямом режиме выполнения (Act Mode) без предварительного чтения лишних файлов документации.

---

## Задача T3: Инфраструктура тестирования

### 1. Цель
Развернуть трехуровневую пирамиду тестирования: быстрые модульные тесты бизнес-логики (Vitest), компонентные тесты (React Testing Library) и браузерные end-to-end тесты (Playwright).

### 2. Зависимости
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react @playwright/test
```

### 3. Файлы к созданию / изменению
* `vitest.config.ts` [NEW] — конфигурация Vitest с окружением `jsdom` и алиасом `@/*`.
* `src/test/setup.ts` [NEW] — глобальный setup-файл с импортом `@testing-library/jest-dom/vitest`.
* `src/test/smoke.test.tsx` [NEW] — компонентный смоук-тест рендера `App`.
* `playwright.config.ts` [NEW] — базовый конфигурационный файл e2e тестов с dev-сервером на `http://localhost:5173`.
* `e2e/smoke.spec.ts` [NEW] — e2e тест на открытие главной страницы и проверку базового DOM-узла.
* `package.json` [MODIFY] — добавление тестовых скриптов.

### 4. Детали реализации
* **`vitest.config.ts`**:
  * `environment: 'jsdom'`.
  * `setupFiles: ['./src/test/setup.ts']`.
  * `globals: true`.
  * `resolve.alias: { '@': path.resolve(import.meta.dirname, './src') }`.
  * Исключить папку `e2e/**` из сканирования Vitest (`exclude: ['**/node_modules/**', '**/e2e/**']`).
* **`package.json`**:
  ```json
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
  ```
* **`e2e/smoke.spec.ts`**: проверка, что приложение загружается без падений по URL `/` и в DOM присутствует корневой контейнер `#root`.

### 5. Риски и Windows-специфика
* *React 19 & Testing Library*: Убедиться, что версия `@testing-library/react` поддерживает React 19 (версия 16.1.0+).
* *Playwright Browsers*: Не запускать принудительную установку всех браузеров в pre-commit. В `playwright.config.ts` ограничиться Chromium для локального прогона.

### 6. Чек-лист верификации
- [x] `pnpm test` отрабатывает с кодом 0 (смоук-тест проходит).
- [x] `pnpm typecheck` не выдает ошибок типизации в тестовых файлах.
- [x] `pnpm lint` не ругается на глобальные переменные Vitest.

---

## Задача T4: Дизайн-система, темы и базовый лейаут

### 1. Цель
Сконфигурировать токены shadcn/ui в Tailwind v4, реализовать переключатель тем (Light / Dark / System) с персистентностью в `localStorage` и построить базовый адаптивный каркас приложения (Sidebar на десктопе, Bottom Navigation Bar на мобильных).

### 2. Зависимости
```bash
pnpm add lucide-react
```
*Установить базовые компоненты shadcn:*
```bash
pnpm dlx shadcn@latest add button card dropdown-menu separator
```

### 3. Файлы к созданию / изменению
* `src/index.css` [MODIFY] — декларация семантических CSS-переменных (`--background`, `--foreground`, `--primary`, `--border` и др.) для `:root` и `.dark` в синтаксисе Tailwind v4.
* `src/app/providers/ThemeProvider.tsx` [NEW] — React Context для управления темами (`light`, `dark`, `system`) с сохранением в `localStorage` и переключением класса `dark` на элементе `<html>`.
* `src/app/layouts/AppLayout.tsx` [NEW] — адаптивный лейаут:
  * Десктоп (`>= 768px`): сворачиваемый сайдбар слева.
  * Мобилка (`< 768px`): фиксированный нижний бар навигации (Mobile Nav) с безопасными отступами (`pb-safe`).
* `src/app/components/ThemeToggle.tsx` [NEW] — доступная кнопка переключения темы с иконками `Sun` / `Moon` / `Laptop`.
* `src/App.tsx` [MODIFY] — интеграция `ThemeProvider` и `AppLayout` для проверки стилей.

### 4. Детали реализации
* Семантическая палитра: нейтральный фон (Slate/Zinc) + акцентный цвет (Indigo). Все цвета подключаются строго через CSS-переменные shadcn.
* Плавное переключение тем без дерганий экрана (FOUC).
* Мобильный лейаут обязан резервировать отступ снизу под Bottom Bar, чтобы контент не перекрывался.

### 5. Риски и Windows-специфика
* *Tailwind v4 & shadcn:* В Tailwind v4 директива `@tailwind` заменена на `@import "tailwindcss";`. Все расширения темы объявляются через директиву `@theme` или селекторы `:root`/`.dark`. Не создавать `tailwind.config.js`.

### 6. Чек-лист верификации
- [x] Переключение темы меняет класс на `<html>` и корректно перекрашивает фон/текст.
- [x] Тема сохраняется после перезагрузки страницы в браузере.
- [x] При ширине экрана `< 768px` отображается нижняя панель навигации, сайдбар скрывается.
- [x] `pnpm typecheck && pnpm lint && pnpm test` завершаются без ошибок.

---

## Задача T5: Инфраструктура приложения (Env, i18n, ErrorBoundary)

### 1. Цель
Обеспечить отказоустойчивость и интернационализацию: валидация переменных окружения при старте через Zod, мультиязычность (EN / RU) через i18next и глобальный перехват ошибок рендеринга.

### 2. Зависимости
```bash
pnpm add zod i18next react-i18next i18next-browser-languagedetector
```

### 3. Файлы к созданию / изменению
* `src/lib/env.ts` [NEW] — схема Zod для строгой валидации всех переменных `VITE_*` из `import.meta.env`. Безопасный экспорт типизированного объекта `env`.
* `src/i18n/config.ts` [NEW] — инициализация i18next: детекция языка, fallback на `'en'`, привязка React.
* `src/i18n/locales/en.json` [NEW] — словарь базовых строк на английском (common, navigation, errors, theme).
* `src/i18n/locales/ru.json` [NEW] — словарь базовых строк на русском.
* `src/app/components/ErrorBoundary.tsx` [NEW] — классовый React Error Boundary с фоллбэк-интерфейсом (кнопки "Обновить страницу" и "Копировать ошибку").
* `src/main.tsx` [MODIFY] — импорт `src/lib/env.ts` (ранний fail-fast), импорт `src/i18n/config.ts`, оборачивание корня в `ErrorBoundary`.

### 4. Детали реализации
* **`src/lib/env.ts`**:
  * Обязательные ключи: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
  * Опциональные: `VITE_USE_EMULATORS` (boolean с дефолтом `false`).
  * Если переменные не валидны — выводить информативную ошибку в консоль до монтирования DOM.
* **i18n**: Использование типизированных ключей через расширение интерфейса `CustomTypeOptions` в TypeScript.

### 5. Риски и Windows-специфика
* Переменная `VITE_USE_EMULATORS` приходит из окружения как строка `"true"` / `"false"`. Схема Zod должна корректно трансформировать её в `boolean` (`z.string().transform(v => v === 'true')`).

### 6. Чек-лист верификации
- [ ] При отсутствии любого обязательного ключа в `.env.local` сборка падает с понятным описанием ошибки.
- [ ] Переключение языка интерфейса работает без перезагрузки вкладки.
- [ ] Искусственно выброшенная в дочернем компоненте ошибка перехватывается `ErrorBoundary` без белого экрана.
- [ ] `pnpm typecheck && pnpm test` завершаются с кодом 0.

---

## Задача T6: Firebase SDK и локальные эмуляторы

### 1. Цель
Сконфигурировать клиентский модульный Firebase SDK (Auth, Firestore), подключить автоматическое переключение на локальные эмуляторы при локальной разработке и настроить правила безопасности `firestore.rules`.

### 2. Зависимости
```bash
pnpm add firebase
pnpm add -D firebase-tools
```

### 3. Файлы к созданию / изменению
* `src/lib/firebase.ts` [NEW] — инициализация Firebase App, экспорты `auth` и `db` (`initializeFirestore` с включенным офлайн-кешем `persistentLocalCache`).
* `firestore.rules` [NEW] — базовые строгие правила Firestore: запрет чтения/записи по умолчанию для всех коллекций (`allow read, write: if false;`).
* `firebase.json` [MODIFY] — конфигурация портов эмуляторов:
  * Firestore: `8080`
  * Auth: `9099`
  * UI: `4000`
* `package.json` [MODIFY] — добавление npm-скриптов для запуска эмуляторов с сохранением состояния.

### 4. Детали реализации
* **Ветвление на эмуляторы в `src/lib/firebase.ts`**:
  ```typescript
  import { env } from '@/lib/env';
  import { connectAuthEmulator } from 'firebase/auth';
  import { connectFirestoreEmulator } from 'firebase/firestore';

  if (env.VITE_USE_EMULATORS) {
    connectAuthEmulator(auth, '[http://127.0.0.1:9099](http://127.0.0.1:9099)', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  ```
* **Скрипты в `package.json`**:
  ```json
  "emulators": "firebase emulators:start --import=./.emulator-data --export-on-exit=./.emulator-data",
  "emulators:exec": "firebase emulators:exec --import=./.emulator-data"
  ```
* Защита от дублирующей инициализации эмуляторов при React Hot Module Replacement (HMR).

### 5. Риски и Windows-специфика
* *Порты на Windows:* Порт 8080 иногда блокируется локальными службами. Убедиться, что эмулятор слушает `127.0.0.1`, а не `localhost` (во избежание проблем с резолвом IPv6 `::1`).
* *Папка `.emulator-data`*: Убедиться, что `.emulator-data` присутствует в `.gitignore`.

### 6. Чек-лист верификации
- [ ] `pnpm emulators` успешно поднимает Auth (9099), Firestore (8080) и Emulator UI (4000).
- [ ] При `VITE_USE_EMULATORS=true` приложение соединяется с локальным эмулятором без сетевых ошибок в DevTools.
- [ ] ESLint правило `no-restricted-imports` не блокирует `src/lib/firebase.ts`.

---

## Задача T7: GitHub Actions CI/CD и verify-скилл

### 1. Цель
Собрать непрерывный пайплайн интеграции (CI) в GitHub Actions и актуализировать проектный скилл верификации `skills/verify/SKILL.md`.

### 2. Файлы к созданию / изменению
* `.github/workflows/ci.yml` [NEW] — CI-пайплайн для ветки `main` и pull requests.
* `skills/verify/SKILL.md` [MODIFY] — наполнение скилла реальными командами проверки проекта.
* `package.json` [MODIFY] — добавление сводного скрипта `"verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"`.

### 3. Детали реализации
* **Шаги в `.github/workflows/ci.yml`**:
  1. `actions/checkout@v4`
  2. `pnpm/action-setup@v3` (версия из `packageManager`)
  3. `actions/setup-node@v4` (кеширование `pnpm`, версия Node `22`)
  4. `pnpm install --frozen-lockfile`
  5. `pnpm format:check`
  6. `pnpm lint`
  7. `pnpm typecheck`
  8. `pnpm test`
  9. `pnpm build`
* **Обновление `skills/verify/SKILL.md`**:
  Заменить все временные заполнители на исполняемые команды проверки репозитория.

### 4. Риски и Windows-специфика
* Окружение GitHub Actions работает на `ubuntu-latest`. Все пути и команды обязаны быть кроссплатформенными (никаких специфичных для Windows вызовов PowerShell).

### 5. Чек-лист верификации
- [ ] Локальный запуск `pnpm verify` успешно проходит все 5 фаз проверок с кодом 0.
- [ ] Файл `.github/workflows/ci.yml` валиден синтаксически.
- [ ] Ветка `feat/F00-foundation` готова к открытию Pull Request в `main`.