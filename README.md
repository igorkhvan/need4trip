OffRoad Hub — каркас Next.js (App Router) + Supabase для организации оффроуд-ивентов. В репозитории один монолит: фронт, бэкенд (Route Handlers), UI (Tailwind + shadcn/ui).

## Технологии
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 3.4 + shadcn/ui (Radix)
- Supabase JS client, Supabase Auth (каркас)
- API через `/app/api`

## Быстрый старт
```bash
npm install
cp .env.example .env.local   # впишите ключи Supabase
npm run dev
```
Приложение поднимется на http://localhost:3000.

## Окружение
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (опционально для серверных операций)

## Структура
- `src/app` — страницы и API:
  - `/page.tsx` — лендинг с ближайшими ивентами (моки)
  - `/events/page.tsx` — список ивентов (моки)
  - `/events/create/page.tsx` — форма создания ивента + конструктор кастомных полей
  - `/events/[id]/page.tsx` — детали и участники (моки)
  - `/api/events` — GET/POST (моки)
  - `/api/events/[id]` — GET/PUT/DELETE (моки)
  - `/api/events/[id]/participants` — GET/POST (моки)
- `src/lib/db` — Supabase клиент и заглушки репозиториев
- `src/lib/services` — простая бизнес-обвязка над репозиториями
- `src/lib/types` — доменные типы (User, Event, EventParticipant, CustomFields)
- `src/components` — header + базовые shadcn/ui компоненты
- `supabase/schema.sql` — SQL для users/events/event_participants

## Supabase / Postgres
DDL в `supabase/schema.sql`. Создаются таблицы:
- `users` (experience_level: beginner|intermediate|pro)
- `events` (category: weekend_trip|technical_ride|meeting|training|service_day|other, custom_fields_schema jsonb)
- `event_participants` (role: leader|tail|participant, custom_field_values jsonb)

## Дальше
- Подключить реальные Supabase ключи и заменить заглушки в репозиториях.
- Добавить Supabase Auth (magic link/email).
- Написать интеграционные тесты для API и форм.
