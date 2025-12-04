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
- `SUPABASE_SERVICE_ROLE_KEY` (используется для серверных операций логина)
- `TELEGRAM_BOT_TOKEN` — токен бота для проверки подписи
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота для виджета логина
- `NEXT_PUBLIC_TELEGRAM_AUTH_URL` — опциональный полный URL, если виджет должен слать запросы на внешний домен; по умолчанию текущий origin + `/api/auth/telegram`
- `AUTH_JWT_SECRET` — секрет подписи JWT (cookie `auth_token`)
> На проде (Vercel) все эти переменные уже заведены во всех окружениях: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_TELEGRAM_AUTH_URL`, `AUTH_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

## Структура
- `src/app`
  - `/page.tsx` — лендинг
  - `/events/page.tsx` — список ивентов (таблица с сортировкой)
  - `/events/create/page.tsx` — создание ивента + кастомные поля
  - `/events/[id]/page.tsx` — детали и участники, кнопки владельца/участника
  - `/events/[id]/edit/page.tsx` — редактирование ивента с правилами
  - `/events/[id]/participants/[participantId]/edit/page.tsx` — правка регистрации
  - API:
    - `/api/auth/telegram` — логин через Telegram, выдача JWT после успешного upsert/read в Supabase
    - `/api/auth/logout` — очистка `auth_token`
    - `/api/auth/me` — проверка сессии, 200/401
    - `/api/events`, `/api/events/[id]`, `/api/events/[id]/participants`, `/api/events/[id]/participants/[participantId]`
- `src/lib/db` — репозитории Supabase (events, participants, users)
- `src/lib/services` — бизнес-правила/валидация, проверки прав, работа с лимитами и кастомными полями
- `src/lib/types` — доменные типы (User, Event, Participant, CustomFields)
- `src/lib/auth` — чтение JWT из cookie, загрузка профиля из Supabase, helpers для куки
- `src/components` — UI-компоненты (шапка, таблицы, формы, тосты, кнопки логина/логаута)
- `supabase/schema.sql` — DDL (users/events/event_participants) с полями `telegram_id`, `avatar_url`

## Архитектура авторизации

### Ключевые инварианты
- Единственный источник истины о пользователе — таблица `users` в Supabase.
- JWT несёт только `userId` + `exp` и не содержит данных Telegram; кука `auth_token` HttpOnly, 30 дней, SameSite=Lax.
- `getCurrentUser` всегда декодирует JWT и читает профиль из Supabase; при любой ошибке БД или отсутствии записи возвращает `null`.
- Кука выставляется только после успешного upsert + обязательного чтения `users`; удаляется через `/api/auth/logout` или `401` на `/api/auth/me`.

### Поток
1. Telegram Login Widget (`LoginButton`) отправляет GET/POST на `/api/auth/telegram` с подписью Telegram.
2. Хендлер проверяет подпись, делает `upsert` в `users` по `telegram_id` и сразу `select().single()` для чтения записи.
3. Если запись существует — генерируется JWT (`userId`), ставится HttpOnly cookie `auth_token`.
4. `getCurrentUser` (сервер) или `/api/auth/me` (клиент) декодируют токен, читают `users` и возвращают профиль либо `401/null`.
5. UI использует только эти функции: серверный `MainHeader` и клиентский `useCurrentUser` → `{user ? Avatar+Logout : LoginButton}`.

Диаграмма:
```
Telegram Widget
      |
      v
/api/auth/telegram (signature check)
      |
      v
Supabase.users upsert -> select().single()
      |
      v
JWT { userId, exp } -> HttpOnly cookie auth_token
      |
      v
getCurrentUser (decode -> Supabase.users.select)
      |
      v
/api/auth/me | server components (MainHeader) | client hook useCurrentUser
      |
      v
UI (avatar + LogoutButton) / LoginButton
```

### Таблица `users`
- `id` (uuid, pk, default gen_random_uuid)
- `name` (text, not null)
- `phone`, `email` (text, nullable)
- `telegram_handle`, `telegram_id` (text, `telegram_id` unique)
- `avatar_url`, `car_model` (text)
- `experience_level` (`beginner` | `intermediate` | `pro`)
- `created_at`, `updated_at` (timestamptz)

### Приведение продовой БД к схеме
В проде должны быть колонки `telegram_id`, `telegram_handle`, `avatar_url` **и уникальный индекс/констрейнт по `telegram_id`**. Без уникального индекса каждый вход создаст новую строку, и пользователь потеряет право на свои ивенты. Если база старее, примените миграцию:
```
supabase/migrations/20241204_add_telegram_columns.sql
```
или выполните SQL в Supabase SQL Editor/psql:
```sql
alter table if exists public.users
  add column if not exists telegram_id text,
  add column if not exists telegram_handle text,
  add column if not exists avatar_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_telegram_id_key'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add constraint users_telegram_id_key unique (telegram_id);
  end if;
end
$$;
```

Если в базе уже успели появиться дубликаты по `telegram_id`, сначала прогоните дедупликацию, чтобы вернуть права на ивенты/участников:
```
supabase/migrations/20241204_fix_telegram_duplicates.sql
```
Скрипт оставляет самую раннюю запись на каждый `telegram_id`, переназначает `events.created_by_user_id` и `event_participants.user_id` на неё и удаляет дубликаты, затем снова включает уникальный констрейнт.

### API
- **`POST/GET /api/auth/telegram`**  
  Вход: Telegram payload (`id`, `hash`, `auth_date`, optional `first_name`, `last_name`, `username`, `photo_url`).  
  Поведение: проверка подписи, upsert по `telegram_id`, обязательный `select().single()` + проверка повторным `select` по `id`, генерация JWT (`userId`), установка HttpOnly `auth_token`.  
  Успех: `200 { ok: true, user: { id, name, telegramHandle, avatarUrl } }` + кука.  
  Ошибки: `AuthNotConfigured` (500), `BadRequest` (400), `Forbidden` (403), `db_error` (503 на любой сбой Supabase), `user_not_created` (500 если запись не получена).
- **`GET /api/auth/me`**  
  Читает куку, декодирует JWT, обращается в Supabase. 200 `{ user }` или `401 { error: "unauthorized" }` с очисткой куки.
- **`POST/GET /api/auth/logout`**  
  Очищает `auth_token` и возвращает `{ ok: true }`.

### Серверные утилиты
- `getCurrentUser()` — читает `auth_token`, декодирует JWT (`HS256`, `AUTH_JWT_SECRET`), загружает профиль из Supabase; ошибки БД и отсутствие пользователя → `null`.
- `createAuthToken(userId: string)` — генерирует JWT с TTL 30 дней.
- `setAuthCookie` / `clearAuthCookie` — единые опции куки (HttpOnly, SameSite=Lax, secure в проде).

### UI авторизации
- `MainHeader` (сервер) вызывает `getCurrentUser` и рендерит `{user ? Avatar + LogoutButton : LoginButton}` — нет двух источников истины.
- `LoginButton` (клиент) не рендерит виджет при `isAuthenticated`, очищает контейнер сразу после `onTelegramAuth` и вызывает `router.refresh()`.
- `LogoutButton` — `POST /api/auth/logout` + `router.refresh()`.
- `useCurrentUser` — клиентский хук, читает `/api/auth/me` с `credentials: "include"` и отдаёт `{ user, isAuthenticated, isLoading }`.

### Обработка ошибок и деградация
- Supabase недоступен → `/api/auth/telegram` возвращает `503 db_error`, токен не ставится; UI остаётся в состоянии «не залогинен».
- `getCurrentUser` при ошибке БД/отсутствии записи возвращает `null`; `/api/auth/me` отдаёт `401` и очищает куку.
- JWT просрочен → `getCurrentUser`/`/api/auth/me` возвращают `null/401`, кука удаляется через `/api/auth/me` или `/api/auth/logout`.

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
- Тесты (e2e/интеграционные) для API и бизнес-правил, включая happy-path и сбои Supabase в логине.
- UX авторизации (модальный логин, состояния загрузки/ошибок).
