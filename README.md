Need4Trip — сервис для организации оффроуд-ивентов на Next.js 14 (App Router, TS) + Supabase. Один монолит: фронт, API Route Handlers, UI (Tailwind + shadcn/ui), авторизация через Telegram + собственный JWT (HttpOnly cookie `auth_token`).

## Стек
- Next.js 16 (App Router, TypeScript), Turbopack для dev
- Tailwind CSS 3.4 + shadcn/ui
- Supabase (Postgres) + supabase-js
- Auth: Telegram Login Widget → `/api/auth/telegram` → JWT (`auth_token`, HS256)
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
> На Vercel все переменные заведены во всех окружениях.

## Структура
- `src/app`
  - `/page.tsx` — лендинг
  - `/events/page.tsx` — список ивентов (SSR, сортировка; безопасная загрузка)
  - `/events/create/page.tsx` — создание ивента
  - `/events/[id]/page.tsx` — детали, участники, регистрация
  - `/events/[id]/edit/page.tsx` — редактирование ивента
  - `/events/[id]/participants/[participantId]/edit/page.tsx` — правка регистрации
  - API:
    - `/api/auth/telegram`, `/api/auth/me`, `/api/auth/logout`
    - `/api/events`, `/api/events/[id]`, `/api/events/[id]/participants`, `/api/events/[id]/participants/[participantId]`
    - `/api/car-brands` — список марок авто (для форм)
- `src/lib/db` — репозитории Supabase (events, participants, users, car_brands, event_allowed_brands, event_user_access)
- `src/lib/services` — бизнес-логика и безопасные загрузчики (listVisibleEventsForUser, getEventWithParticipants и т.д.)
- `src/lib/types` — доменные типы (User, Event, Participant, CustomFields, Visibility и т.д.)
- `src/lib/auth` — JWT-утилиты (`getCurrentUser`, `getCurrentUserSafe`, куки)
- `supabase/migrations` — SQL миграции

## Что уже сделано в рамках аудита
- Добавлены проверки приватности: приватные события теперь защищены на API и в SSR, доступ только авторизованным с правами/ссылкой.
- Регистрация на приватные события требует авторизации, при первом заходе создаётся доступ по ссылке.
- Telegram auth усилили TTL/anti-replay проверкой `auth_date` и детерминированным upsert по `telegram_id`.
- Обновлена схема `supabase/schema.sql` до актуальных таблиц/полей (visibility, vehicle_type_requirement, клубность/платность, бренды, доступы).
- В списке событий UI получает допустимые марки и реальное число участников.
- Supabase client типизирован, добавлены схемные типы в `src/lib/types/supabase.ts`.
## Архитектура авторизации
- Источник истины о пользователе — Supabase `users`.
- JWT содержит только `userId` + `exp`, кука `auth_token` HttpOnly, SameSite=Lax, 30 дней.
- `getCurrentUser` декодирует JWT и читает `users`; при ошибке БД/отсутствии записи возвращает `null`. `getCurrentUserSafe` логирует и возвращает `null`, не падает.
- `/api/auth/telegram`: проверка подписи Telegram, upsert в `users` по `telegram_id`, обязательный select, генерация JWT, установка куки. Ошибки Supabase → `503 db_error`.
- `/api/auth/me`: 200 `{ user }` или 401 + очистка куки.
- `/api/auth/logout`: очистка куки.
- UI использует серверный `getCurrentUser` и клиентский хук `useCurrentUser`; LoginButton убирает виджет после авторизации, LogoutButton дергает `/api/auth/logout` + `router.refresh()`.

## Бизнес-правила (базовые)
- Владелец ивента может редактировать/удалять; кастомные поля нельзя менять, если есть участники.
- maxParticipants нельзя опускать ниже текущего числа участников.
- Участник может редактировать/удалять свою регистрацию; владелец может удалить любого.
- Роли leader/tail уникальны; лимит участников соблюдается; валидация кастомных полей по типам.

## Новые поля/таблицы для ивентов (применена миграция `20241205_event_extensions.sql`)
- `events`: `visibility` (`public` | `link_registered`), `vehicle_type_requirement` (`any` | `sedan` | `crossover` | `suv`), `rules` (text), `is_club_event` (bool), `is_paid` (bool), `price`, `currency`, + ранее существующие поля.
- Справочник марок: `car_brands` (id, name, slug).
- Допустимые марки: `event_allowed_brands` (event_id, brand_id, PK).
- Доступы к приватным ивентам: `event_user_access` (event_id, user_id, source: owner/participant/link, unique(event_id,user_id)).

## Доменные типы (кратко)
- `Visibility = "public" | "link_registered"`
- `VehicleTypeRequirement = "any" | "sedan" | "crossover" | "suv"`
- `CarBrand { id; name; slug? }`
- `Event` расширен: `visibility`, `vehicleTypeRequirement`, `allowedBrands: CarBrand[]`, `rules`, `isClubEvent`, `isPaid`, `price`, `currency`.

## Сервисы и репозитории
- Безопасная загрузка: `listEventsSafe`, `getCurrentUserSafe`.
- Видимость: `listVisibleEventsForUser(userId)` учитывает public + владельца + участие + `event_user_access`.
- Приватный доступ: `grantEventAccessByLink(eventId,userId)` upsert в `event_user_access`.
- Бренды: `carBrandRepo.listCarBrands()`, `eventRepo.replaceAllowedBrands/getAllowedBrands`.
- При создании/обновлении ивента сохраняются allowedBrandIds, новые поля; для владельца создаётся запись доступа (source=owner).

## UI (текущее состояние)
- Create/Edit: поля видимости, требований к машине, клубность, платность (цена/валюта), правила, допустимые марки (чекбоксы из `/api/car-brands`), базовые поля и кастомные поля (text/number/boolean).
- View: показывает клубность, платность (стоимость), требования к машине, локацию, рекомендованные марки, правила. Кнопка регистрации убрана из hero. Приватный ивент по ссылке: авторизованным даёт доступ (grantEventAccessByLink), неавторизованным — алерт без формы. Регистрация: информбаннер про платность/правила, блокировка формы для приватного и неавторизованного, алерт при повторной регистрации.
- /events: использует `listVisibleEventsForUser`, но таблица ещё без индикаторов клуб/платно/owner.
- Регистрация: кнопка переименована в “Зарегистрироваться”; ошибки 409 теперь показывают общий конфликт (дубликат/лимит/роль).

## Отказоустойчивость Supabase
- safe-функции (`listEventsSafe`, `getCurrentUserSafe`) логируют и возвращают []/null при сбоях Supabase/Cloudflare, чтобы SSR не падал.
- Страницы используют safe-версии для событий/пользователя.

## Валидация форм (клиент)
- Браузерные `required`/тултипы отключены; ошибки показываются нашим UI (красный бордер + текст под полем).
- Под каждым полем зарезервирован небольшой блок (`min-h`), чтобы при появлении ошибок лэйаут не прыгал.
- Используем `fieldErrors` для конкретных инпутов (title/description/date/location в create/edit event, имя экипажа и кастомные поля в регистрациях) и общий текст только для серверных/авторизационных ошибок.
- Проверки на клиенте повторяют базовые правила серверных Zod-схем (длина имени, обязательность, валидная дата в будущем, обязательные кастомные поля), но источник истины остаётся на сервере.

## Миграции
- `20241204_add_telegram_columns.sql` — добавляет telegram_id/handle/avatar_url + unique.
- `20241204_fix_telegram_duplicates.sql` — дедуп по telegram_id, перекидывает ссылки, включает уникальный констрейнт.
- `20241205_event_extensions.sql` — новые поля событий, бренды, доступы, связи.

## TODO / открытые задачи
- UI допилить: /events список — индикаторы клуб/платно/владелец, фильтры; отображение новых атрибутов в таблице.
- Регистрация: выбор марки участника из car_brands, предупреждения о несоответствии брендов/типа авто, чекбокс согласия с правилами.
- Видимость: на страницах enforce link_registered (видна авторизованным по ссылке, добавлять access), возможно фильтры/мои ивенты.
- Оптимизация multi-select марок (сейчас чекбоксы, требуется поиск/чипы).
- Тесты e2e/интеграция новых полей, safe-пути при сбоях Supabase.
- Документировать/добавить payments UI (пока информативно, без оплаты).

## Итоговый промпт для продолжения в новом чате
«Ты — ведущий разработчик Need4Trip (Next.js 14 App Router + TS + Tailwind + shadcn/ui + Supabase). Система событий с Telegram-авторизацией (JWT в HttpOnly `auth_token`). Миграции применены: события имеют поля visibility, vehicle_type_requirement, rules, is_club_event, is_paid, price, currency; есть таблицы car_brands, event_allowed_brands, event_user_access. Типы/сервисы обновлены: Event включает новые поля, есть listVisibleEventsForUser, grantEventAccessByLink, replaceAllowedBrands/getAllowedBrands, safe-функции для Supabase (listEventsSafe, getCurrentUserSafe). Create/Edit формы уже содержат новые поля (видимость, требования к авто, клубность, платность, правила, допустимые марки через /api/car-brands). View страницы показывают клуб/платно, требования, правила, бренды; регистрация скрыта для приватных без авторизации и информирует про платность/правила. /events использует listVisibleEventsForUser, но таблица ещё без индикаторов клуб/платно/owner. Регистрация не выбирает марку участника и не предупреждает о несоответствии. Твои задачи: довести UI списка/регистрации/предупреждений, фильтры, индикаторы, учёт брендов участника, согласие с правилами, и прочие TODO из README. Строгий TS, без any, Supabase не трогать по схеме (уже мигрировано), безопасные обёртки оставить. Документируй изменения.»
