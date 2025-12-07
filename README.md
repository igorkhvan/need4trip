Need4Trip — сервис для организации оффроуд-ивентов на Next.js + Supabase. Один монолит: фронт (App Router), API Route Handlers, UI (Tailwind + shadcn/ui), авторизация через Telegram + собственный JWT (`auth_token`).

## Стек
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 3.4 + shadcn/ui
- Supabase (Postgres) + supabase-js
- Auth: Telegram Login Widget → `/api/auth/telegram` → JWT (HttpOnly cookie `auth_token`)
- eslint 9, Turbopack для dev

## Дизайн-система и глобальные правила
- Шрифт: Inter (latin+cyrillic), подключён глобально через `next/font`.
- Цвета: используем токены Tailwind/shadcn (`bg-white`, `border-muted`, primary #FF6F2C / hover #E86223, акцент #F7F7F8 и т.д.). Не добавляем инлайновых цветов, если есть токены.
- Макет/ширина: контент через `.page-container` (max-w-7xl, px-8), секции — `section` (`py-24 md:py-32`), внутренности — `section-inner`.
- Типографика: `heading-hero` (32–48px), `heading-section` (36px), базовый текст 16px (`text-lead` для описаний), мелкие подписи 14px/12px через стандартные utility. Семейство шрифта единое (Inter).
- Кнопки/компоненты: используем дефолтные варианты `Button`/`Card` из `src/components/ui/*`, без локальных кастомных стилей. Размер кнопок по умолчанию (`size="default"`). Фоновые заливки секций/CTA — full-bleed, контент центрирован `page-container`.
- Глобальные utility заданы в `src/app/globals.css`:
  - `.page-container`, `.section`, `.section-inner`
  - `.heading-hero`, `.heading-section`, `.text-lead`
- Новые страницы собираем из этих utility — никаких уникальных размеров/паддингов вне токенов.

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
- `src/app`
  - `page.tsx` — лендинг
  - `events/page.tsx` — список ивентов
  - `events/create/page.tsx` — создание
  - `events/[id]/page.tsx` — детали/участники/регистрация
  - `events/[id]/edit/page.tsx` — редактирование
  - `events/[id]/participants/[participantId]/edit/page.tsx` — правка регистрации
  - API:
    - `/api/auth/telegram`, `/api/auth/me`, `/api/auth/logout`
    - `/api/events`, `/api/events/[id]`, `/api/events/[id]/participants`, `/api/events/[id]/participants/[participantId]`
    - `/api/car-brands`
- `src/lib/db` — репозитории Supabase (events, participants, users, car_brands, event_allowed_brands, event_user_access)
- `src/lib/services` — бизнес-логика (видимость, доступы, подсчёты)
- `src/lib/types` — доменные типы
- `src/lib/auth` — JWT/куки, `getCurrentUser`
- `supabase/migrations` — SQL миграции

## Авторизация
- JWT (`auth_token`, HS256) хранит `userId` + `exp`; HttpOnly, SameSite=Lax, 30 дней.
- `/api/auth/telegram`: проверка подписи Telegram, upsert в `users` по `telegram_id`, генерация JWT, установка куки. Anti-replay/TTL включены.
- `/api/auth/me`: 200 `{ user }` или 401 + очистка куки.
- `/api/auth/logout`: очистка куки.
- Клиент: `useCurrentUser`, сервер: `getCurrentUser` / `getCurrentUserSafe`.

## Схема БД (кратко)
- `users`: базовые поля + telegram_handle/id/avatar.
- `events`: `visibility` (`public` | `link_registered`), `vehicle_type_requirement` (`any` | `sedan` | `crossover` | `suv`), `rules`, `is_club_event`, `is_paid`, `price`, `currency`, `custom_fields_schema`, гео/тайм/лимиты.
- `event_participants`: роли leader/tail/participant, кастомные значения.
- `car_brands`, `event_allowed_brands` (допустимые марки).
- `event_user_access`: доступы к приватным ивентам (owner/participant/link).

## Бизнес-правила (основное)
- Видимость: public всегда доступна; `link_registered` — только авторизованным с доступом/участием/владельцу; при переходе по ссылке авторизованным добавляется access.
- Кастомные поля нельзя менять, если есть участники; maxParticipants нельзя опускать ниже текущего числа; лидер/замыкающий уникальны; лимит участников соблюдается.
- Участник может редактировать/удалять себя; владелец — любого участника; владелец может редактировать/удалять событие.

## Сервисы/фичи
- `listVisibleEventsForUser`, `getEventWithVisibility/Participants`, `hydrateEvent` (allowedBrands, participantsCount).
- Allowed brands: `replaceAllowedBrands`, `getAllowedBrands`; бренды подгружаются через `/api/car-brands`.
- Безопасные методы (`listEventsSafe`, `getCurrentUserSafe`) не валят SSR при сбоях Supabase.

## Что ещё планируется
- Сохранение anti-replay для Telegram в общем сторе (Redis/БД).
- Оптимизация загрузки событий (без N+1, фильтр на сервере).
- Индикаторы клуб/платно/owner в /events, фильтры; предупреждения о несоответствии авто/бренда при регистрации.
- Интеграционные/e2e-тесты; `supabase gen types` вместо ручных типов; `npm run build` в прод окружении.
