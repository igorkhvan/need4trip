Need4Trip — каркас Next.js (App Router, TS) + Supabase для организации оффроуд-ивентов. Один монолит: фронт, бэкенд (Route Handlers), UI (Tailwind + shadcn/ui), авторизация через Telegram.

## Технологии
- Next.js 16 (App Router, TypeScript), Turbopack для dev
- Tailwind CSS 3.4 + shadcn/ui (Radix)
- Supabase (Postgres) + supabase-js
- Auth: Telegram Login Widget + собственный JWT (cookie `auth_token`)
- eslint 9

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
- `SUPABASE_SERVICE_ROLE_KEY` (опционально для серверных операций)
- `TELEGRAM_BOT_TOKEN` — токен бота для проверки подписи
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота для виджета логина
- `AUTH_JWT_SECRET` — секрет подписи JWT (cookie `auth_token`)

## Структура
- `src/app`
  - `/page.tsx` — лендинг
  - `/events/page.tsx` — список ивентов (таблица с сортировкой)
  - `/events/create/page.tsx` — создание ивента + кастомные поля
  - `/events/[id]/page.tsx` — детали и участники, кнопки владельца/участника
  - `/events/[id]/edit/page.tsx` — редактирование ивента с правилами
  - `/events/[id]/participants/[participantId]/edit/page.tsx` — правка регистрации
  - API:
    - `/api/auth/telegram` — логин через Telegram, выдача JWT
    - `/api/auth/logout` — очистка `auth_token`
    - `/api/events`, `/api/events/[id]`, `/api/events/[id]/participants`, `/api/events/[id]/participants/[participantId]`
- `src/lib/db` — репозитории Supabase (events, participants, users)
- `src/lib/services` — бизнес-правила/валидация, проверки прав, работа с лимитами и кастомными полями
- `src/lib/types` — доменные типы (User, Event, Participant, CustomFields)
- `src/lib/auth/currentUser.ts` — чтение JWT из cookie, загрузка профиля из Supabase, createAuthToken
- `src/components` — UI-компоненты (шапка, таблицы, формы, тосты, кнопки логина/логаута)
- `supabase/schema.sql` — DDL (users/events/event_participants) с полями `telegram_id`, `avatar_url`

## Auth (Telegram)
- В шапке кнопка «Войти через Telegram» (виджет Telegram Login), успешный логин дергает `/api/auth/telegram`, ставит HttpOnly `auth_token`.
- `getCurrentUser()` проверяет JWT (HS256, `AUTH_JWT_SECRET`), подтягивает профиль из Supabase.
- Кнопка «Выйти» — POST `/api/auth/logout`, `router.refresh()`.

## Бизнес-правила (фаза 1)
- Владелец ивента может редактировать/удалять ивент; менять `custom_fields_schema` только если нет участников; удаление каскадно удаляет участников.
- При обновлении `maxParticipants` — нельзя опускать ниже текущего числа зарегистрированных.
- Участник может редактировать/удалять свою регистрацию; владелец может удалить любого.
- Проверка лимита участников, уникальности ролей (leader/tail), дубликатов по userId/имени; валидация кастомных полей по схеме и типам.

## UI
- Таблица ивентов с сортировкой по дате/созданию/названию/категории.
- Страница ивента: бейдж владельца, бейджи ролей и владельца в списке участников, действия владельца/участника, тосты/ошибки на русском.
- Формы создания/редактирования ивента, редактирования регистрации; тосты и confirm на действия (русские сообщения).

## Команды
- `npm run dev` — dev сервер
- `npm run build` — сборка
- `npm run start` — запуск сборки
- `npm run lint` — линт

## Что можно доработать
- Middleware для SSR-защиты на основе `auth_token`.
- Улучшить UX авторизации (модальный логин, состояния).
- Тесты (e2e/интеграционные) для API и бизнес-правил.
