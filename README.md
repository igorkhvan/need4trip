Need4Trip — сервис для организации оффроуд-событий на Next.js + Supabase. Один монолит: фронт (App Router), API Route Handlers, UI (Tailwind + shadcn/ui), авторизация через Telegram + собственный JWT (`auth_token`).

## Требования
- Node.js 18.18+ (рекомендуется 20 LTS) и npm 9+
- Настроенные переменные окружения (см. `.env.example` / раздел «Окружение»)

## Скрипты
- `npm run dev` — локальная разработка (Turbopack)
- `npm run build` — сборка (`NEXT_FORCE_WEBPACK=1` для стабильности Next 16)
- `npm run start` — прод-режим после сборки
- `npm run lint` — eslint 9

## Стек
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 3.4 + shadcn/ui
- Supabase (Postgres) + supabase-js
- Auth: Telegram Login Widget → `/api/auth/telegram` → JWT (HttpOnly cookie `auth_token`)
- eslint 9, Turbopack для dev

## Дизайн-система и глобальные правила

### Цвета и токены
- Шрифт: Inter (latin+cyrillic), подключён глобально через `next/font`.
- Цвета: используем токены Tailwind/shadcn и точные HEX значения из Figma:
  - Primary: `#FF6F2C` (оранжевый), hover `#E86223`
  - Text: `#111827` (заголовки), `#374151` (основной), `#6B7280` (второстепенный), `#9CA3AF` (disabled)
  - Borders: `#E5E7EB` (основная), `#D1D5DB` (акцент)
  - Backgrounds: `#FFFFFF` (белый), `#F9FAFB` (muted), `#FFF4EF` (hover оранжевый)
  - Success: `#16A34A`, Warning: `#F59E0B`, Error: `#DC2626`
- Не добавляем инлайновых цветов, если есть токены или точные значения из Figma.

### Макет и ширина
- Контент: `.page-container` (max-w-7xl, px-5 md:px-8 lg:px-12)
- Секции: `section` (`py-24 md:py-32`), внутренности — `section-inner`
- Карточки: `Card` с `border border-[#E5E7EB]`, `rounded-2xl`, `p-5 md:p-6 lg:p-7`

### Типографика
- H1: `text-5xl font-bold leading-tight text-[#0F172A]` (страницы форм)
- H1 adaptive: `text-4xl md:text-5xl font-bold` (просмотр события)
- H2: `text-3xl font-semibold text-[#111827]`
- H3: `text-2xl font-semibold text-[#111827]` (модальные окна)
- H4 (CardTitle): `text-xl font-semibold text-[#111827]` (карточки)
- Body: `text-base` (16px), description: `text-sm` (14px), caption: `text-xs` (12px)
- Error text: `text-[13px]` (красный), hint text: `text-[13px] text-[#6B7280]`
- Семейство шрифта единое (Inter)

### Кнопки (из Figma)
- **Default (primary)**: 
  - Height: `h-12` (48px)
  - Border radius: `rounded-xl` (12px)
  - Padding: `px-6` (24px horizontal)
  - Font: `text-base font-medium` (16px)
  - Colors: `bg-[#FF6F2C] hover:bg-[#E86223]`
  - Transition: `transition-all duration-200`
  - Gap: `gap-2` (для иконок)
  
- **Secondary**:
  - Same dimensions
  - Colors: `border-2 border-[#FF6F2C] bg-white text-[#FF6F2C] hover:bg-[#FFF4EF]`
  - Disabled: `border-[#FECDB3] text-[#FECDB3] opacity-60`
  
- **Ghost**:
  - Same height (48px)
  - Colors: `hover:bg-muted hover:text-accent-foreground`
  
- **Size variants**: 
  - `sm` (h-9, 36px) - вторичные действия в таблицах
  - `lg` (h-14, 56px) - главные CTA на лендинге
  - `icon` (h-12 w-12) - иконочные кнопки

### Выравнивание текста
- **КРИТИЧНО**: Все текстовые элементы должны иметь явное `text-left`
- Применяется к: заголовкам, описаниям, лейблам, ошибкам, подсказкам, уведомлениям
- Особенно важно в: модальных окнах, формах, grid layouts
- Контейнеры модальных окон: добавлять `text-left` к корневому `div`

### Spacing и отступы
- Card padding: `p-5 md:p-6 lg:p-7`
- Section spacing: `space-y-6` (формы), `space-y-8` (страницы)
- Grid gaps: `gap-4` (формы), `gap-6` (карточки)
- Utility classes: `.space-y-4`, `.space-y-6`, `.space-y-8` из globals.css

### Глобальные utility (globals.css)
- `.page-container`, `.section`, `.section-inner`
- `.heading-hero`, `.heading-section`, `.text-lead`
- `.space-y-4`, `.space-y-6`, `.space-y-8`
- `.container-custom`

### Правило унификации
- ❌ Не создавать кастомные стили для стандартных компонентов
- ✅ Использовать дефолтные варианты из `src/components/ui/*`
- ✅ Переиспользовать существующие компоненты
- ✅ При необходимости кастомизации - обновить базовый компонент
- ✅ Новые страницы собираем из utility - никаких уникальных размеров/паддингов

## Быстрый старт
```bash
npm install
cp .env.example .env.local   # заполните ключи Supabase, Telegram и секрет JWT
npm run dev
# http://localhost:3000
```

## Окружение
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (для серверных операций логина)
- `TELEGRAM_BOT_TOKEN` — подпись Telegram
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота для виджета
- `NEXT_PUBLIC_TELEGRAM_AUTH_URL` — опционально внешний URL для виджета; по умолчанию origin + `/api/auth/telegram`
- `AUTH_JWT_SECRET` — секрет подписи JWT (кука `auth_token`)

## Структура

### Страницы (`src/app`)
- `page.tsx` — лендинг (Hero, HowItWorks, Features, UpcomingEvents, CTA)
- `layout.tsx` — root layout с MainHeader и MainFooter
- `loading.tsx` — глобальный loader (FullPageLoader)
- `events/`:
  - `page.tsx` — список событий (EventsGrid: stats, tabs, search, cards)
  - `loading.tsx` — skeleton для списка
  - `create/page.tsx` — создание события (использует EventForm)
  - `create/loading.tsx` — skeleton для создания
  - `[id]/page.tsx` — детали/участники/регистрация (SSR)
  - `[id]/loading.tsx` — skeleton для просмотра
  - `[id]/edit/page.tsx` — редактирование (использует EventForm, client-side)
  - `[id]/edit/loading.tsx` — skeleton для редактирования

### API Routes
- `/api/auth/telegram`, `/api/auth/me`, `/api/auth/logout`
- `/api/events`, `/api/events/[id]` (GET/PUT/DELETE)
- `/api/events/[id]/participants` (GET/POST)
- `/api/events/[id]/participants/[participantId]` (PATCH/DELETE)
- `/api/car-brands` (GET)

### Компоненты (`src/components`)

**UI Components** (`ui/`):
- `button.tsx` - стандартизированные кнопки (default, secondary, ghost, sizes)
- `card.tsx` - карточки с CardHeader, CardTitle, CardDescription, CardContent
- `badge.tsx` - бейджи (default, secondary, success, warning, outline, destructive)
- `alert-dialog.tsx` - диалоги подтверждения (AlertDialog, ConfirmDialog)
- `spinner.tsx` - лоадеры (Spinner, PageLoader, FullPageLoader)
- Остальные shadcn/ui компоненты (Input, Select, Checkbox, Label, etc.)

**Layout Components** (`layout/`):
- `main-header.tsx` - шапка сайта (logo, navigation, user info, "Создать событие")
- `main-footer.tsx` - подвал (multi-column: logo, description, links)

**Event Components** (`events/`):
- `event-form.tsx` - универсальная форма создания/редактирования (mode: create|edit)
- `events-grid.tsx` - сетка событий (stats, filters, cards)
- `participant-modal.tsx` - универсальная модалка регистрации (mode: create|edit)
- `participant-form.tsx` - форма регистрации участника
- `participant-actions.tsx` - кнопки действий для участников (edit/delete)
- `owner-actions.tsx` - кнопки действий для владельца события (edit/delete)

**Auth Components** (`auth/`):
- `telegram-login.tsx` - Telegram Login Widget
- `use-current-user.tsx` - React hook для текущего пользователя

### Библиотеки (`src/lib`)
- `db/` — репозитории Supabase (events, participants, users, car_brands, event_allowed_brands, event_user_access)
- `services/` — бизнес-логика (events, participants)
- `types/` — доменные типы (event, participant, user, supabase)
- `auth/` — JWT/куки, `getCurrentUser`, `guestSession`
- `mappers.ts` — маппинг DB ↔ Domain
- `errors.ts` — кастомные ошибки (AppError, ValidationError, etc.)

### Миграции
- `supabase/migrations/` — SQL миграции
  - `20241209_add_guest_session_id.sql` - добавление поддержки гостевых сессий

## Авторизация

### Telegram Users
- JWT (`auth_token`, HS256) хранит `userId` + `exp`; HttpOnly, SameSite=Lax, 30 дней.
- `/api/auth/telegram`: проверка подписи Telegram, upsert в `users` по `telegram_id`, генерация JWT, установка куки. Anti-replay/TTL включены.
- `/api/auth/me`: 200 `{ user }` или 401 + очистка куки.
- `/api/auth/logout`: очистка куки.
- Клиент: `useCurrentUser`, сервер: `getCurrentUser` / `getCurrentUserSafe`.

### Guest Sessions (незарегистрированные пользователи)
- Cookie `guest_session_id` (UUID v4, HttpOnly, 1 год) для идентификации гостей
- Утилиты: `getOrCreateGuestSessionId()`, `getGuestSessionId()`, `getGuestSessionIdClient()`
- БД: поле `guest_session_id` в таблице `event_participants`
- Гости могут:
  - Регистрироваться на события (только один раз на событие)
  - Редактировать свою регистрацию (по sessionId)
  - Удалять свою регистрацию (по sessionId)
- Владелец события может редактировать/удалять все регистрации (включая гостей)
- Предотвращение дублей: unique constraint (event_id, guest_session_id, display_name)

## Схема БД (кратко)
- `users`: базовые поля + telegram_handle/id/avatar.
- `events`: `visibility` (`public` | `link_registered`), `vehicle_type_requirement` (`any` | `sedan` | `crossover` | `suv`), `rules`, `is_club_event`, `is_paid`, `price`, `currency`, `custom_fields_schema`, гео/тайм/лимиты.
- `event_participants`: роли leader/tail/participant, кастомные значения.
- `car_brands`, `event_allowed_brands` (допустимые марки).
- `event_user_access`: доступы к приватным событиям (owner/participant/link).

## Бизнес-правила

### Видимость событий
- `public` — всегда доступна всем
- `link_registered` — только авторизованным с доступом/участием/владельцу
- При переходе по ссылке авторизованным добавляется access в `event_user_access`

### События
- Кастомные поля регистрации нельзя менять, если есть участники
- `maxParticipants` нельзя опускать ниже текущего числа участников
- Лимит участников строго соблюдается при регистрации
- Владелец может редактировать/удалять событие

### Участники и роли
- Роли: `participant` (участник), `leader` (лидер), `tail` (замыкающий)
- Лидер и замыкающий уникальны (только один на событие)
- Валидация роли на фронтенде и бэкенде

### Права доступа
**Владелец события:**
- Может редактировать/удалять событие
- Может редактировать/удалять любую регистрацию (включая гостей)
- Видит кнопки действий для всех участников

**Авторизованный участник:**
- Может зарегистрироваться один раз на событие (проверка по `userId`)
- Может редактировать свою регистрацию (включая имя и роль)
- Может удалить свою регистрацию
- Видит кнопки действий только для своей записи

**Гость (guest):**
- Может зарегистрироваться один раз на событие (проверка по `guest_session_id`)
- Может редактировать свою регистрацию (включая имя и роль)
- Может удалить свою регистрацию
- Видит кнопки действий только для своей записи
- Идентификация через cookie `guest_session_id`

## Сервисы/фичи
- `listVisibleEventsForUser`, `getEventWithVisibility/Participants`, `hydrateEvent` (allowedBrands, participantsCount).
- Allowed brands: `replaceAllowedBrands`, `getAllowedBrands`; бренды подгружаются через `/api/car-brands`.
- Безопасные методы (`listEventsSafe`, `getCurrentUserSafe`) не валят SSR при сбоях Supabase.

## Паттерны и best practices

### Загрузка страниц
- Каждая страница/route должна иметь `loading.tsx` с skeleton UI
- Используем компоненты: `<PageLoader />`, `<FullPageLoader />`, или custom skeleton
- Для длительных операций: spinner внутри кнопок (`isSubmitting ? "Сохраняем..." : "Сохранить"`)
- SSR страницы: показывают skeleton автоматически через loading.tsx
- Client-side загрузка: используем `useState` + `useEffect` + `<PageLoader />`

### Унификация компонентов
**Принцип DRY (Don't Repeat Yourself):**
- Один компонент для create/edit режимов (через проп `mode`)
- Примеры: `EventForm`, `ParticipantModal`, `ParticipantForm`
- Переиспользуем UI компоненты из `src/components/ui/*`

**Модальные окна:**
- Используем единый паттерн: триггер (кнопка) + overlay + контент
- Заголовок и описание через пропсы
- Обязательно `text-left` для всего контента
- ESC для закрытия, backdrop click для закрытия

**Диалоги подтверждения:**
- Замена `window.confirm()` на `<ConfirmDialog />`
- Более информативные сообщения
- Кастомизация кнопок (confirmText, cancelText, destructive)
- Используется для: удаление записей, отмена изменений, деструктивные действия

**Формы:**
- Валидация на фронтенде (перед отправкой)
- Валидация на бэкенде (в services layer)
- Отображение ошибок под полями (`min-h-[28px]` для выравнивания)
- Disabled state для всей формы при отсутствии прав
- ConfirmDialog для кнопки "Отмена"

### Обработка ошибок
- Кастомные классы ошибок: `AppError`, `ValidationError`, `ConflictError`, `AuthError`, `NotFoundError`, `InternalError`
- API возвращает структурированные ошибки: `{ message, code?, details? }`
- UI показывает пользовательские сообщения (не технические детали)
- Красный текст для ошибок: `text-red-600`, размер `text-sm` или `text-[13px]`

### Типизация
- Строгая типизация через TypeScript
- Doменные типы в `src/lib/types/`
- DB типы в `src/lib/types/supabase.ts`
- Zod схемы для валидации API input/output

### Стандартизация терминологии
- "Событие" (не "ивент")
- "Участник" (не "партиципант")
- "Регистрация" (не "партисипейшн")
- Единообразные тексты кнопок, заголовков, сообщений

## Что ещё планируется
- Сохранение anti-replay для Telegram в общем сторе (Redis/БД)
- Оптимизация загрузки событий (без N+1, фильтр на сервере)
- Предупреждения о несоответствии авто/бренда при регистрации
- Email уведомления (опционально)
- Push уведомления через Telegram Bot
- Интеграционные/e2e-тесты
- `supabase gen types` вместо ручных типов
- `npm run build` в прод окружении
