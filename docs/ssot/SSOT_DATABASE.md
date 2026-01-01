# Need4Trip Database Schema (SSOT)

> **Single Source of Truth для структуры базы данных**  
> Последнее обновление: 2026-01-01  
> PostgreSQL + Supabase

---

## Change Log (SSOT)

### 2026-01-01 (v5+ Alignment)
- **Updated §8.1 credit consumption triggers** — Changed "event publish" to "event save" to reflect v5+ model (no separate publish step).
- **Updated §8.2 cross-reference** — Reflects v5+ save-time consumption semantics.

### 2026-01-01 (Polish Pass)
- **Replaced §8.2 with DB-centric rules only** — Removed duplicated timing rules; now contains only DB invariants + cross-reference to SSOT_CLUBS_EVENTS_ACCESS.md §10. Rationale: No rule duplication across SSOTs.
- **Added role='pending' semantics note** — Near club_members.role CHECK constraint. Rationale: Prevent interpretation drift.

### 2026-01-01
- **Added "Billing Credits State Machine" section** — Explicit statuses (available/consumed), invariants, allowed transitions, disallowed states. Rationale: Production alignment with `chk_billing_credits_consumed_state` constraint.
- **Added "Billing – Consumption Timing & Binding" section** — Canonical rules for when/how credits are consumed. Rationale: Cross-SSOT consistency with SSOT_CLUBS_EVENTS_ACCESS.md.
- **Documented CHECK constraint `chk_billing_credits_consumed_state`** — Production-enforced invariants now explicit in SSOT. Rationale: SSOT must match production reality.
- **Updated billing_credits table notes** — Clarified consumed_event_id nullability rules. Rationale: Precision and testability.
- **Fixed club_members role CHECK constraint** — Updated to canonical roles (owner/admin/member/pending), removed deprecated 'organizer'. Rationale: Alignment with SSOT_CLUBS_EVENTS_ACCESS.md §2 and migration 20241230.
- **Added SSOT governance cross-reference** — Points to SSOT_ARCHITECTURE.md for precedence rules. Rationale: Conflict resolution clarity.

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Core Tables](#core-tables)
3. [Reference Tables (Справочники)](#reference-tables)
4. [Club & Billing Tables](#club--billing-tables)
5. [Notification Tables](#notification-tables)
6. [Performance Indexes](#performance-indexes)
7. [RLS Policies Summary](#rls-policies-summary)
8. [Database Functions & Triggers](#database-functions--triggers)
9. [Migration History](#migration-history)
10. [Maintenance Rules](#maintenance-rules)

---

## 🎯 Обзор

### Принципы архитектуры БД:

1. **Нормализация**: Все справочники вынесены в отдельные таблицы
2. **UUID Primary Keys**: Все таблицы используют UUID
3. **Soft Deletes**: `ON DELETE SET NULL` для audit trails
4. **Row Level Security**: Все критичные таблицы защищены RLS
5. **Timestamps**: `created_at` / `updated_at` на всех таблицах
6. **Performance**: Compound indexes для часто используемых запросов

### Статистика:

- **Core Tables**: 7 (users, events, event_participants, event_user_access, event_locations, event_allowed_brands, idempotency_keys) ⚡
- **Reference Tables**: 6 (cities, currencies, event_categories, car_brands, vehicle_types, club_plans) ⚡
- **Club & Billing**: 7 (clubs, club_members, club_cities, club_subscriptions, billing_transactions, billing_products, billing_credits) ⚡
- **Notifications**: 3 (user_notification_settings, notification_queue, notification_logs)
- **User Extensions**: 1 (user_cars)
- **Итого**: 24 таблицы ⚡

---

## 🗂️ Core Tables

### 1. `users`

**Назначение**: Пользователи платформы (через Telegram Login Widget)

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_handle TEXT,
  telegram_id TEXT UNIQUE,
  avatar_url TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  bio TEXT,
  plan_id TEXT, -- Legacy, not used in billing
  guest_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `users_pkey` (PRIMARY KEY on id)
- `users_telegram_id_key` (UNIQUE on telegram_id)
- `users_guest_session_id_key` (UNIQUE on guest_session_id)
- `idx_users_city_id` (on city_id)

**RLS**: 4 policies
- `authenticated_users_read_all`
- `authenticated_users_update_own`
- `anon_users_read_all`
- `service_role_full_access`

**Связи**:
- → `cities` (city_id)
- ← `events` (created_by_user_id)
- ← `user_cars` (user_id)
- ← `clubs` (created_by)
- ← `club_members` (user_id)

---

### 2. `events`

**Назначение**: События/мероприятия

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL,
  category TEXT,  -- ⚠️ DEPRECATED: Use category_id. Will be removed in future.
  date_time TIMESTAMPTZ NOT NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
  custom_fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'restricted')),
  vehicle_type_requirement TEXT NOT NULL DEFAULT 'any',
  rules TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2),
  currency_code TEXT REFERENCES public.currencies(code) ON DELETE SET NULL,
  currency TEXT,  -- ⚠️ DEPRECATED: Use currency_code. Will be removed in future.
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  is_club_event BOOLEAN NOT NULL DEFAULT false,  -- ⚡ Auto-synced with club_id via trigger
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1,  -- ⚡ Auto-incremented on update via trigger
  
  -- Registration controls (added 2024-12-20)
  allow_anonymous_registration BOOLEAN NOT NULL DEFAULT true,  -- ⚡ Allow guest registrations
  registration_manually_closed BOOLEAN NOT NULL DEFAULT false,  -- ⚡ Manual override to close reg
  registration_deadline TIMESTAMPTZ,
  
  -- ⚡ Constraints (added 2024-12-12)
  CONSTRAINT events_club_consistency_check CHECK (
    (is_club_event = TRUE AND club_id IS NOT NULL) OR
    (is_club_event = FALSE AND club_id IS NULL)
  )
);
```

**Indexes**:
- `events_pkey` (PRIMARY KEY on id)
- `idx_events_created_by_user_id` (on created_by_user_id)
- `idx_events_club_id` (on club_id)
- `idx_events_city_id` (on city_id)
- `idx_events_category_id` (on category_id)
- `idx_events_visibility_datetime` (on visibility, date_time DESC WHERE visibility = 'public')
- `idx_events_creator_datetime` (on created_by_user_id, date_time DESC WHERE created_by_user_id IS NOT NULL)

**Notes**:
- ⚡ **Location data moved to `event_locations` table** (2024-12-18):
  - `location_text`, `location_lat`, `location_lng` удалены из `events`
  - Данные мигрированы в отдельную таблицу `event_locations` (поддержка множественных точек)
  - Каждое событие имеет минимум 1 локацию (sort_order=1, обязательная)
- ⚡ **`is_club_event`** (добавлен 2024-12-05, constraint 2024-12-12):
  - Автоматически синхронизируется с `club_id` через trigger `sync_event_club_flag()`
  - Constraint гарантирует: `is_club_event = TRUE ⇔ club_id IS NOT NULL`
  - **НЕ требует ручной установки** — всегда вычисляется автоматически
- ⚡ **`version`** (добавлен 2024-12-17):
  - Автоматически инкрементируется при каждом UPDATE через trigger `increment_event_version()`
  - Используется для оптимистичной блокировки и отслеживания изменений
- ⚡ **Registration controls** (добавлены 2024-12-20):
  - `allow_anonymous_registration`: разрешить гостевые регистрации
  - `registration_manually_closed`: ручное закрытие регистрации (приоритет над deadline)
- ⚠️ **Deprecated columns**:
  - `category` (TEXT) — заменено на `category_id` (FK). Будет удалено в будущей миграции.
  - `currency` (TEXT) — заменено на `currency_code` (FK). Будет удалено в будущей миграции.

**RLS**: 7 policies
- `anon_read_public_events`
- `anon_read_unlisted_events`
- `authenticated_read_public_unlisted`
- `authenticated_read_restricted_with_access`
- `authenticated_create_own`
- `authenticated_update_own`
- `authenticated_delete_own`

**Связи**:
- → `users` (created_by_user_id)
- → `clubs` (club_id)
- → `cities` (city_id)
- → `event_categories` (category_id)
- → `currencies` (currency_code)
- ← `event_participants` (event_id)
- ← `event_user_access` (event_id)
- ← `event_locations` (event_id)
- ← `event_allowed_brands` (event_id)

---

### 3. `event_participants`

**Назначение**: Участники событий (регистрации)

```sql
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_session_id TEXT,
  custom_fields_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one registration per user per event
  CONSTRAINT event_participants_event_user_unique UNIQUE (event_id, user_id)
);
```

**Indexes**:
- `event_participants_pkey` (PRIMARY KEY on id)
- `event_participants_event_user_unique` (UNIQUE on event_id, user_id)
- `idx_event_participants_event_id` (on event_id)
- `idx_event_participants_user_id` (on user_id)
- `idx_event_participants_guest_session` (on guest_session_id WHERE guest_session_id IS NOT NULL)
- `idx_event_participants_event_count` (on event_id INCLUDE (id)) -- covering index for COUNT
- `idx_event_participants_user_event` (on user_id, event_id WHERE user_id IS NOT NULL)

**RLS**: 6 policies
- `anon_read_public_event_participants`
- `authenticated_read_all_participants`
- `authenticated_create_own`
- `authenticated_update_own`
- `authenticated_delete_own`
- `event_owner_manage_participants`

**Связи**:
- → `events` (event_id)
- → `users` (user_id)

---

### 4. `event_user_access`

**Назначение**: Доступ пользователей к restricted событиям

```sql
CREATE TABLE public.event_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('owner', 'participant', 'link')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one access record per user per event
  CONSTRAINT event_user_access_unique UNIQUE (event_id, user_id)
);
```

**Indexes**:
- `event_user_access_pkey` (PRIMARY KEY on id)
- `event_user_access_unique` (UNIQUE on event_id, user_id)
- `idx_event_user_access_event_id` (on event_id)
- `idx_event_user_access_user_id` (on user_id)
- `idx_event_user_access_user_event` (on user_id, event_id)

**RLS**: 5 policies
- `authenticated_read_own_access`
- `authenticated_create_own_access`
- `event_owner_manage_access`
- `auto_grant_on_register`
- `auto_grant_on_create`

**Связи**:
- → `events` (event_id)
- → `users` (user_id)

---

### 5. `event_locations`

**Назначение**: Маршрутные точки для событий (множественные локации)

```sql
CREATE TABLE public.event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL CHECK (sort_order > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  latitude NUMERIC(10, 7),  -- nullable until coordinates are entered
  longitude NUMERIC(10, 7),  -- nullable until coordinates are entered
  raw_input TEXT,  -- stores original user input for audit/debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Guarantee unique sort_order per event
  CONSTRAINT uq_event_location_sort UNIQUE(event_id, sort_order),
  
  -- Coordinate validation constraints
  CONSTRAINT chk_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT chk_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);
```

**Indexes**:
- `event_locations_pkey` (PRIMARY KEY on id)
- `idx_event_locations_event_id` (on event_id)
- `idx_event_locations_sort_order` (on event_id, sort_order) -- pre-sorted results

**Notes**:
- ⚡ **Множественные локации** (добавлено 2024-12-18):
  - Каждое событие имеет минимум 1 локацию (sort_order=1, "Точка сбора")
  - Первая локация (sort_order=1) не может быть удалена (trigger защита)
  - Пользователи могут добавлять неограниченное количество дополнительных точек маршрута
- `raw_input`: Оригинальный ввод пользователя (координаты/адрес/описание) для аудита
- Миграция данных (2024-12-18): `events.location_text/lat/lng` → `event_locations` (sort_order=1)

**RLS**: 4 policies
- `event_locations_select` (public read, owner read restricted)
- `event_locations_insert` (owner only)
- `event_locations_update` (owner only)
- `event_locations_delete` (owner only, except sort_order=1)

**Связи**:
- → `events` (event_id)

---

### 6. `event_allowed_brands`

**Назначение**: Ограничение по брендам автомобилей для события

```sql
CREATE TABLE public.event_allowed_brands (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.car_brands(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, brand_id)
);
```

**Indexes**:
- `event_allowed_brands_pkey` (PRIMARY KEY on event_id, brand_id)
- `idx_event_allowed_brands_event` (on event_id INCLUDE (brand_id)) -- covering index

**RLS**: Наследуется от events (через FK)

**Связи**:
- → `events` (event_id)
- → `car_brands` (brand_id)

---

### 7. `user_cars`

**Назначение**: Автомобили пользователей

```sql
CREATE TABLE public.user_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  car_brand_id UUID NOT NULL REFERENCES public.car_brands(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('offroad', 'sedan', 'suv', 'sportcar', 'classic', 'other')),
  plate TEXT CHECK (plate IS NULL OR char_length(plate) <= 20),
  color TEXT CHECK (color IS NULL OR char_length(color) <= 50),
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Indexes**:
- `user_cars_pkey` (PRIMARY KEY on id)
- `idx_user_cars_user_id` (on user_id)
- `idx_user_cars_brand_id` (on car_brand_id)
- `idx_user_cars_single_primary` (UNIQUE on user_id WHERE is_primary = true)

**RLS**: 5 policies
- `authenticated_read_all_cars`
- `authenticated_create_own_cars`
- `authenticated_update_own_cars`
- `authenticated_delete_own_cars`
- `anon_read_cars` (для публичных профилей)

**Связи**:
- → `users` (user_id)
- → `car_brands` (car_brand_id)

---

### 8. `idempotency_keys`

**Назначение**: Отслеживание idempotency keys для предотвращения дублирования запросов (например, double-click при создании события)

```sql
CREATE TABLE public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope: user + route + key (unique per attempt)
  user_id UUID NOT NULL,
  route TEXT NOT NULL,  -- e.g., "POST /api/events"
  key TEXT NOT NULL,    -- Client-provided idempotency key (UUID)
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  
  -- Stored response (for replay on duplicate requests)
  response_status INT,       -- HTTP status code (e.g., 201, 400)
  response_body JSONB,       -- Full response body
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Unique constraint: one key per (user, route, key) triplet
  CONSTRAINT unique_idempotency_key UNIQUE (user_id, route, key)
);
```

**Indexes**:
- `idempotency_keys_pkey` (PRIMARY KEY on id)
- `unique_idempotency_key` (UNIQUE on user_id, route, key)
- `idx_idempotency_keys_lookup` (on user_id, route, key) — fast lookup
- `idx_idempotency_keys_created_at` (on created_at) — cleanup of old keys
- `idx_idempotency_keys_status` (on status) — status queries

**Notes**:
- ⚡ **Purpose**: Prevent duplicate requests from double-clicks, network retries, etc.
- ⚡ **TTL**: Keys auto-expire after 24 hours (cleanup via scheduled job)
- ⚡ **Replay**: If duplicate request arrives while status='in_progress', returns 409 Conflict
- ⚡ **Replay**: If duplicate request arrives after status='completed', returns stored response
- ⚡ **SSOT Reference**: docs/ssot/SSOT_ARCHITECTURE.md § Idempotency Standard

**RLS**: TBD (service role only for now)

**Связи**:
- → `users` (user_id) — implicit FK (no formal constraint for flexibility)

---

## 📚 Reference Tables

### 1. `cities`

**Назначение**: Справочник городов (Россия, Казахстан)

```sql
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'RU',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  population INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT cities_name_country_unique UNIQUE (name, country)
);
```

**Indexes**:
- `cities_pkey` (PRIMARY KEY on id)
- `cities_name_country_unique` (UNIQUE on name, country)
- `idx_cities_country` (on country)
- `idx_cities_name` (on name)
- `idx_cities_active` (on is_active WHERE is_active = TRUE)
- `idx_cities_population` (on population DESC NULLS LAST)

**Access**: `GRANT SELECT TO anon, authenticated`

---

### 2. `currencies`

**Назначение**: Справочник валют

```sql
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY, -- ISO 4217 (KZT, RUB, USD)
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `currencies_pkey` (PRIMARY KEY on code)

**Access**: `GRANT SELECT TO anon, authenticated`

**RLS**: 1 policy
- `public_read_currencies`

---

### 3. `event_categories`

**Назначение**: Справочник категорий событий

```sql
CREATE TABLE public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `event_categories_pkey` (PRIMARY KEY on id)
- `event_categories_name_key` (UNIQUE on name)

**Access**: `GRANT SELECT TO anon, authenticated`

**RLS**: 2 policies
- `public_read_categories`
- `service_role_manage_categories`

---

### 4. `car_brands`

**Назначение**: Справочник брендов автомобилей

```sql
CREATE TABLE public.car_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `car_brands_pkey` (PRIMARY KEY on id)
- `car_brands_name_key` (UNIQUE on name)
- `idx_car_brands_popular` (on is_popular WHERE is_popular = TRUE)

**Access**: `GRANT SELECT TO anon, authenticated`

---

### 5. `vehicle_types`

**Назначение**: Справочник типов транспорта

```sql
CREATE TABLE public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `vehicle_types_pkey` (PRIMARY KEY on id)
- `vehicle_types_code_key` (UNIQUE on code)

**Access**: `GRANT SELECT TO anon, authenticated`

**RLS**: 1 policy
- `public_read_vehicle_types`

---

### 6. `club_plans`

**Назначение**: Справочник тарифных планов для клубов

```sql
CREATE TABLE public.club_plans (
  id TEXT PRIMARY KEY, -- 'free', 'club_50', 'club_500', 'club_unlimited'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'KZT',
  
  -- Лимиты
  max_event_participants INTEGER,
  max_club_members INTEGER,
  
  -- Возможности (canonical field names per SSOT)
  allow_paid_events BOOLEAN NOT NULL DEFAULT FALSE,
  allow_csv_export BOOLEAN NOT NULL DEFAULT FALSE,
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `club_plans_pkey` (PRIMARY KEY on id)

**Access**: `GRANT SELECT TO anon, authenticated`

**Semantic Helper (code)**: Use `planAllowsPaidEvents(plan)` to check `allow_paid_events` field (SSOT §A7.1)

**Данные**: Seeded в `20241215_seed_club_plans.sql`

---

## 🏢 Club & Billing Tables

### 1. `clubs`

**Назначение**: Клубы и сообщества организаторов

```sql
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  description TEXT,
  logo_url TEXT CHECK (logo_url IS NULL OR char_length(logo_url) <= 500),
  telegram_url TEXT CHECK (telegram_url IS NULL OR char_length(telegram_url) <= 500),
  website_url TEXT CHECK (website_url IS NULL OR char_length(website_url) <= 500),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `clubs_pkey` (PRIMARY KEY on id)
- `idx_clubs_created_by` (on created_by)
- `idx_clubs_created_at` (on created_at DESC)

**RLS**: 4 policies
- `authenticated_read_all_clubs`
- `authenticated_create_clubs`
- `authenticated_update_own_clubs`
- `authenticated_delete_own_clubs`

**Связи**:
- → `users` (created_by)
- ← `club_members` (club_id)
- ← `club_subscriptions` (club_id)
- ← `events` (club_id)
- ← `club_cities` (club_id) -- many-to-many

---

### 2. `club_members`

**Назначение**: Участники клубов

```sql
CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'pending')),
  -- Note: 'organizer' role was removed in migration 20241230_remove_organizer_role
  -- Canonical roles per SSOT_CLUBS_EVENTS_ACCESS.md §2: owner, admin, member, pending
  -- DB allows role='pending' for invitation state; authorization treats 'pending' as non-member 
  -- (no elevated permissions). Canonical semantics: SSOT_CLUBS_EVENTS_ACCESS.md §2.
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT club_members_unique UNIQUE (club_id, user_id)
);
```

**Indexes**:
- `club_members_pkey` (PRIMARY KEY on id)
- `club_members_unique` (UNIQUE on club_id, user_id)
- `idx_club_members_club_id` (on club_id)
- `idx_club_members_user_id` (on user_id)

**RLS**: 6 policies
- `authenticated_read_all_members`
- `authenticated_join_clubs`
- `club_owner_manage_members`
- `club_admin_manage_members`
- `authenticated_leave_clubs`
- `auto_add_creator_as_owner`

**Связи**:
- → `clubs` (club_id)
- → `users` (user_id)

---

### 3. `club_cities` (many-to-many)

**Назначение**: Связь клубов с городами (клуб может действовать в нескольких городах)

```sql
CREATE TABLE public.club_cities (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (club_id, city_id)
);
```

**Indexes**:
- `club_cities_pkey` (PRIMARY KEY on club_id, city_id)

**RLS**: Наследуется от clubs (через FK)

**Связи**:
- → `clubs` (club_id)
- → `cities` (city_id)

---

### 4. `club_subscriptions`

**Назначение**: Подписки клубов на тарифные планы

```sql
CREATE TABLE public.club_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.club_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'grace', 'expired')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT club_subscriptions_one_active_per_club UNIQUE (club_id) 
    WHERE status IN ('active', 'pending', 'grace')
);
```

**Indexes**:
- `club_subscriptions_pkey` (PRIMARY KEY on id)
- `club_subscriptions_one_active_per_club` (UNIQUE partial)
- `idx_club_subscriptions_club_id` (on club_id)
- `idx_club_subscriptions_status` (on status)

**RLS**: 2 policies
- `authenticated_read_own_club_subscriptions`
- `service_role_full_access`

**Связи**:
- → `clubs` (club_id)
- → `club_plans` (plan_id)

---

### 5. `billing_transactions`

**Назначение**: Аудит биллинговых транзакций (поддерживает клубы + one-off credits)

```sql
CREATE TABLE public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,  -- ⚡ NULL для one-off credits
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- ⚡ Для one-off credits
  product_code TEXT NOT NULL,  -- ⚡ EVENT_UPGRADE_500, CLUB_50, CLUB_500, CLUB_UNLIMITED
  plan_id TEXT REFERENCES public.club_plans(id) ON DELETE RESTRICT,  -- NULL для one-off
  amount NUMERIC(10,2) NOT NULL,                               -- ⚡ Normalized (was amount_kzt)
  currency_code TEXT NOT NULL DEFAULT 'KZT' REFERENCES public.currencies(code) ON DELETE RESTRICT, -- ⚡ FK
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')), -- ⚡ 'completed'
  provider TEXT NOT NULL,                                      -- ⚡ kaspi, yookassa, stripe
  provider_payment_id TEXT,                                    -- ⚡ External payment ID
  period_start TIMESTAMPTZ,                                    -- ⚡ Для клубных подписок
  period_end TIMESTAMPTZ,                                      -- ⚡ Для клубных подписок
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- ⚡ Business constraints (Billing v4)
  CONSTRAINT billing_club_requires_club_id CHECK (
    (product_code LIKE 'CLUB_%' AND club_id IS NOT NULL AND plan_id IS NOT NULL) OR
    (product_code NOT LIKE 'CLUB_%')
  ),
  CONSTRAINT billing_oneoff_requires_user_id CHECK (
    (product_code NOT LIKE 'CLUB_%' AND user_id IS NOT NULL) OR
    (product_code LIKE 'CLUB_%')
  )
);
```

**Indexes**:
- `billing_transactions_pkey` (PRIMARY KEY on id)
- `idx_billing_transactions_club_id` (on club_id)
- `idx_billing_transactions_user_id` (on user_id) ⚡
- `idx_billing_transactions_product_code` (on product_code) ⚡
- `idx_billing_transactions_status` (on status)
- `idx_billing_transactions_created_at` (on created_at DESC)

**Notes**:
- ⚡ **Нормализация (2024-12-26)**:
  - `amount_kzt` → `amount` (generic, currency-independent)
  - `currency` → `currency_code` (with FK to currencies table)
  - `status: 'paid'` → `status: 'completed'` (consistent enum)
- ⚡ Поддерживает два типа транзакций:
  1. **Club subscriptions**: `club_id NOT NULL`, `product_code = 'CLUB_*'`
  2. **One-off credits**: `user_id NOT NULL`, `club_id NULL`, `product_code = 'EVENT_UPGRADE_500'`
- Транзакции НЕ используются для проверок доступа (только аудит!)
- Access state хранится в `club_subscriptions` (клубы) и `billing_credits` (кредиты)

**RLS**: 1 policy
- `club_owner_read_own_transactions`

**Связи**:
- → `clubs` (club_id) [optional]
- → `users` (user_id) [optional]
- → `club_plans` (plan_id) [optional]
- → `currencies` (currency_code) ⚡ NEW
- ← `billing_credits` (source_transaction_id)

---

### 6. `billing_products` ⚡

**Назначение**: SSOT для purchasable products (one-off credits pricing and constraints)

```sql
CREATE TABLE public.billing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (char_length(code) >= 1),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit')),
  price NUMERIC(10,2) NOT NULL,                    -- ⚡ Normalized (generic amount)
  currency_code TEXT NOT NULL DEFAULT 'KZT' REFERENCES public.currencies(code) ON DELETE RESTRICT, -- ⚡ FK
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  constraints JSONB NOT NULL DEFAULT '{}',         -- Product-specific rules (e.g., max_participants)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `billing_products_pkey` (PRIMARY KEY on id)
- `billing_products_code_key` (UNIQUE on code)
- `idx_billing_products_is_active` (on is_active) ⚡
- `idx_billing_products_type` (on type) ⚡
- `idx_billing_products_currency_code` (on currency_code) ⚡

**Notes**:
- ⚡ **SSOT for pricing**: No hardcoded prices in code
- ⚡ **Currency normalization (2024-12-26)**: `price_kzt` → `price` + `currency_code` FK
- Example: `EVENT_UPGRADE_500` → price: 1000, currency_code: 'KZT', constraints: {max_participants: 500}
- `constraints` JSONB allows flexible product rules without schema changes

**RLS**: 2 policies
- `authenticated_read_active_products`
- `service_role_full_access`

**Связи**:
- → `currencies` (currency_code) ⚡ NEW
- ← `billing_credits` (credit_code)

---

### 7. `club_plans` ⚡

**Назначение**: Тарифные планы для клубов (including FREE plan)

```sql
CREATE TABLE public.club_plans (
  id TEXT PRIMARY KEY CHECK (id IN ('free', 'club_50', 'club_500', 'club_unlimited')),
  title TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,            -- ⚡ Normalized (generic amount)
  currency_code TEXT NOT NULL DEFAULT 'KZT' REFERENCES public.currencies(code) ON DELETE RESTRICT, -- ⚡ FK
  max_members INTEGER,                             -- NULL = unlimited
  max_event_participants INTEGER,                  -- NULL = unlimited
  allow_paid_events BOOLEAN NOT NULL DEFAULT FALSE,
  allow_csv_export BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,         -- Show on pricing page
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `club_plans_pkey` (PRIMARY KEY on id)
- `idx_club_plans_price_monthly` (on price_monthly) -- For sorting
- `idx_club_plans_currency_code` (on currency_code) ⚡

**Notes**:
- ⚡ **Currency normalization (2024-12-26)**: `price_monthly_kzt` → `price_monthly` + `currency_code` FK
- ⚡ **Includes FREE plan**: `id='free'`, `price_monthly=0`, visible on pricing page
- Dynamic limits: No hardcoding, all limits from DB
- Cached via `StaticCache` (TTL: 5 minutes)

**RLS**: 2 policies
- `authenticated_read_all_plans`
- `service_role_full_access`

**Связи**:
- → `currencies` (currency_code) ⚡ NEW
- ← `club_subscriptions` (plan_id)
- ← `billing_transactions` (plan_id)

---

### 8. `billing_credits` ⚡

**Назначение**: Purchased one-off credits для event upgrades (perpetual, consumed once)

```sql
CREATE TABLE public.billing_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credit_code TEXT NOT NULL CHECK (credit_code IN ('EVENT_UPGRADE_500')),
  status TEXT NOT NULL CHECK (status IN ('available', 'consumed')),
  consumed_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ,
  source_transaction_id UUID NOT NULL REFERENCES public.billing_transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `billing_credits_pkey` (PRIMARY KEY on id)
- `idx_billing_credits_user_status` (on user_id, status) -- ⚡ Find available credits
- `idx_billing_credits_consumed_event_id` (on consumed_event_id)
- `uix_billing_credits_source_transaction_id` (UNIQUE on source_transaction_id) -- ⚡ Idempotency

**Notes**:
- ⚡ **Perpetual credits**: не привязаны к событию при покупке
- ⚡ **Consumed once**: после `publish?confirm_credit=1` → `status='consumed'`
- ⚡ **Idempotency**: `source_transaction_id` гарантирует одну credit per transaction
- Поддерживаемые коды: `EVENT_UPGRADE_500` (max_participants <= 500)

**RLS**: TBD (предполагается `authenticated_read_own_credits`)

**Связи**:
- → `users` (user_id)
- → `events` (consumed_event_id) [optional — see State Machine below]
- → `billing_transactions` (source_transaction_id)

---

### 8.1 Billing Credits State Machine (Canonical)

**Status:** LOCKED / Production-enforced  
**Constraint Name:** `chk_billing_credits_consumed_state`

This section defines the ONLY valid states and transitions for `billing_credits.status`.

#### Statuses

| Status | Meaning |
|--------|---------|
| `available` | Credit is unused and ready to be consumed at save-time (v5+) |
| `consumed` | Credit has been consumed and is permanently bound to a specific event |

No other statuses exist. Do NOT introduce new statuses without explicit SSOT amendment.

#### Invariants (Production CHECK Constraint)

The following invariants are enforced by `chk_billing_credits_consumed_state`:

| Status | consumed_event_id | consumed_at | Invariant |
|--------|-------------------|-------------|-----------|
| `available` | MUST be NULL | MUST be NULL | Available credits are not bound to any event |
| `consumed` | MUST NOT be NULL | MUST NOT be NULL | Consumed credits are bound to exactly one event with a timestamp |

**SQL Constraint Definition:**
```sql
ALTER TABLE billing_credits ADD CONSTRAINT chk_billing_credits_consumed_state CHECK (
  (status = 'available' AND consumed_event_id IS NULL AND consumed_at IS NULL) OR
  (status = 'consumed' AND consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL)
);
```

#### Allowed Transitions (v5+ — No Separate Publish Step)

| From | To | Trigger | Notes |
|------|-----|---------|-------|
| `available` | `consumed` | Successful event save (POST/PUT) with `confirm_credit=1` | Credit bound to eventId at this moment |

#### Disallowed States (MUST trigger constraint violation)

| State | consumed_event_id | consumed_at | Why Disallowed |
|-------|-------------------|-------------|----------------|
| `consumed` | NULL | any | Consumed credit MUST reference the event it was used for |
| `consumed` | any | NULL | Consumed credit MUST have consumption timestamp |
| `available` | non-NULL | any | Available credit MUST NOT be bound to any event |
| `available` | any | non-NULL | Available credit MUST NOT have consumption timestamp |

#### Rollback Semantics

**Status:** NOT ALLOWED / UNDEFINED

Transition `consumed` → `available` is NOT currently supported. If rollback semantics are required in the future:
- TODO: Define explicit rollback rules (e.g., event deletion, refund scenarios)
- TODO: Update this SSOT and production constraint before implementation

---

### 8.2 Billing – Consumption Timing (DB Perspective)

**Status:** LOCKED / DB-centric rules only

#### DB-Level Constraints

- When status transitions to `'consumed'`, DB requires `consumed_event_id` and `consumed_at` to be non-null (enforced by `chk_billing_credits_consumed_state`).
- Consuming without a persisted eventId is disallowed by the data model — the FK on `consumed_event_id` requires a valid `events.id`.
- The binding (`consumed_event_id`) is immutable after being set — no UPDATE allowed on this field once non-null.

#### Cross-Reference (Canonical Timing/Usage Rules)

For canonical timing/usage rules (save-time consumption (v5+), `confirm_credit` semantics, club-vs-personal rules, free limits), see:
**SSOT_CLUBS_EVENTS_ACCESS.md §10 "Billing Credits – Access/Usage Rules (v5+)"**

That section is authoritative for business logic; this section covers only DB invariants.

---

## 🔔 Notification Tables

### 1. `user_notification_settings`

**Назначение**: Настройки уведомлений пользователей

```sql
CREATE TABLE public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Telegram notifications
  telegram_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  telegram_new_events BOOLEAN NOT NULL DEFAULT TRUE,
  telegram_event_updates BOOLEAN NOT NULL DEFAULT TRUE,
  telegram_registrations BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `user_notification_settings_pkey` (PRIMARY KEY on id)
- `user_notification_settings_user_id_key` (UNIQUE on user_id)

**RLS**: 3 policies
- `authenticated_read_own_settings`
- `authenticated_update_own_settings`
- `auto_create_on_user_register`

**Связи**:
- → `users` (user_id)

---

### 2. `notification_queue`

**Назначение**: Очередь уведомлений для отправки (обрабатывается cron job)

```sql
CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_event', 'event_updated', 'new_registration')),
  telegram_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `notification_queue_pkey` (PRIMARY KEY on id)
- `idx_notification_queue_status` (on status)
- `idx_notification_queue_user_id` (on user_id)
- `idx_notification_queue_event_id` (on event_id)

**RLS**: Service role only (no policies)

**Связи**:
- → `users` (user_id)
- → `events` (event_id)

---

### 3. `notification_logs`

**Назначение**: История отправленных уведомлений (аудит)

```sql
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  telegram_message TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `notification_logs_pkey` (PRIMARY KEY on id)
- `idx_notification_logs_user_id` (on user_id)
- `idx_notification_logs_event_id` (on event_id)
- `idx_notification_logs_sent_at` (on sent_at DESC)

**RLS**: Service role only

**Связи**:
- → `users` (user_id)
- → `events` (event_id)

---

## ⚡ Performance Indexes

**Миграция**: `20241224_performance_indexes.sql`

**Цель**: Ускорение N+1 запросов и aggregations

### Compound Indexes (критичные):

```sql
-- Event participants COUNT optimization
CREATE INDEX idx_event_participants_event_count 
  ON event_participants(event_id) INCLUDE (id);

-- Event locations pre-sorted results
CREATE INDEX idx_event_locations_event_sort 
  ON event_locations(event_id, sort_order);

-- Event allowed brands covering index
CREATE INDEX idx_event_allowed_brands_event 
  ON event_allowed_brands(event_id) INCLUDE (brand_id);

-- Public events listing with date sort
CREATE INDEX idx_events_visibility_datetime 
  ON events(visibility, date_time DESC) WHERE visibility = 'public';

-- Creator events with date sort
CREATE INDEX idx_events_creator_datetime 
  ON events(created_by_user_id, date_time DESC) WHERE created_by_user_id IS NOT NULL;

-- User event access checks
CREATE INDEX idx_event_user_access_user_event 
  ON event_user_access(user_id, event_id);

-- User-specific participant lookups
CREATE INDEX idx_event_participants_user_event 
  ON event_participants(user_id, event_id) WHERE user_id IS NOT NULL;
```

### Performance Impact:

- **hydrateEvent()**: ~350ms → ~45ms (8x faster)
- **listParticipants()**: 300ms → ~50ms (6x faster)
- **Visibility checks**: 200ms → ~30ms (7x faster)
- **Overall page load**: 20+ sec → 2-3 sec (10x faster)

---

## 🔒 RLS Policies Summary

**Все критичные таблицы защищены Row Level Security:**

| Table | RLS Enabled | Policies | Service Role |
|-------|-------------|----------|--------------|
| `users` | ✅ | 4 | Full access |
| `events` | ✅ | 7 | Full access |
| `event_participants` | ✅ | 6 | Full access |
| `event_user_access` | ✅ | 5 | Full access |
| `event_locations` | ✅ | 4 | Full access |
| `clubs` | ✅ | 4 | Full access |
| `club_members` | ✅ | 6 | Full access |
| `club_subscriptions` | ✅ | 2 | Full access |
| `billing_transactions` | ✅ | 1 | Full access |
| `billing_credits` | ✅ | TBD | Full access | ⚡
| `user_cars` | ✅ | 5 | Full access |
| `user_notification_settings` | ✅ | 3 | Full access |
| `notification_queue` | ✅ | 0 | Service only |
| `notification_logs` | ✅ | 0 | Service only |

**Reference Tables** (public read):
- `cities`, `currencies`, `event_categories`, `car_brands`, `vehicle_types`, `club_plans`
- `GRANT SELECT TO anon, authenticated`

**Принципы RLS:**

1. **Service Role** всегда имеет полный доступ (bypass RLS)
2. **Anon** может читать public/unlisted события и справочники
3. **Authenticated** может читать public/unlisted события + restricted с access grant
4. **Owners** могут управлять своими сущностями
5. **Club admins** могут управлять членами и событиями клуба

---

## 🔧 Database Functions & Triggers

### Triggers:

1. **Auto-sync is_club_event with club_id** ⚡
   - Таблица: `events`
   - Функция: `sync_event_club_flag()`
   - Событие: BEFORE INSERT OR UPDATE OF club_id
   - Действие: Автоматически устанавливает `is_club_event = (club_id IS NOT NULL)`
   - Миграция: `20241212_alter_events_club_and_visibility.sql`

2. **Auto-increment event version** ⚡
   - Таблица: `events`
   - Функция: `increment_event_version()`
   - Событие: BEFORE UPDATE
   - Действие: Инкрементирует `version` при каждом обновлении события
   - Миграция: `20241217_create_notification_tables.sql`

3. **Auto-grant access on event creation**
   - Таблица: `event_user_access`
   - Событие: AFTER INSERT on `events`
   - Действие: Автоматически дает создателю доступ к restricted событию

4. **Auto-grant access on participant registration**
   - Таблица: `event_user_access`
   - Событие: AFTER INSERT on `event_participants`
   - Действие: Автоматически дает участнику доступ к restricted событию

5. **Auto-add creator as club owner**
   - Таблица: `club_members`
   - Событие: AFTER INSERT on `clubs`
   - Действие: Автоматически добавляет создателя клуба как owner

6. **Update timestamps**
   - Все таблицы с `updated_at`
   - Событие: BEFORE UPDATE
   - Действие: Автоматически обновляет `updated_at = NOW()`

7. **Prevent club_id changes** ⚡ NEW (2024-12-31)
   - Таблица: `events`
   - Событие: BEFORE UPDATE
   - Действие: Блокирует ANY изменения `club_id` после создания события
   - Enforcement: SSOT_CLUBS_EVENTS_ACCESS.md §5.7 (Club ID Immutability)
   - Миграция: `20241231_enforce_club_id_immutability_v2.sql`
   - Ратionale: Defense in depth (service layer + DB constraint)

### Functions:

- `gen_random_uuid()` - генерация UUID для PRIMARY KEY
- `prevent_club_id_change()` - ⚡ блокирует изменения club_id (SSOT §5.7)
- Геопространственные функции (если используются для cities)
- Custom validation functions (через CHECK constraints)

**Детали**: См. `supabase/migrations/20241212_create_initial_triggers.sql`

---

## 📜 Migration History

### Key Migrations (хронологически):

| Date | Migration | Description |
|------|-----------|-------------|
| 2024-12-04 | `add_telegram_columns` | Добавлены telegram_id, telegram_handle |
| 2024-12-05 | `event_extensions` | Добавлены кастомные поля регистрации |
| 2024-12-09 | `add_guest_session_id` | Гостевые сессии для анонимов |
| 2024-12-12 | `create_clubs` | Система клубов |
| 2024-12-12 | `create_club_members` | Участники клубов |
| 2024-12-13 | `create_cities_table` | Справочник городов |
| 2024-12-13 | `normalize_cities` | Миграция city (TEXT → FK) |
| 2024-12-13 | `create_currencies_table` | Справочник валют |
| 2024-12-13 | `create_event_categories` | Справочник категорий |
| 2024-12-14 | `create_user_cars` | Автомобили пользователей |
| 2024-12-15 | `create_club_plans_v2` | Тарифные планы v2 |
| 2024-12-15 | `create_billing_transactions` | Биллинговый аудит |
| 2024-12-16 | `create_vehicle_types` | Типы транспорта |
| 2024-12-17 | `create_notification_tables` | Система уведомлений |
| 2024-12-18 | `create_event_locations` | Мультилокации для событий |
| 2024-12-20 | `add_registration_controls` | Контроль регистрации |
| 2024-12-22 | `enable_rls_*` | Включение RLS на всех таблицах (9 миграций) |
| 2024-12-22 | `grant_select_reference_tables` | GRANT SELECT для справочников |
| 2024-12-24 | `performance_indexes` | Performance optimization indexes |
| 2024-12-25 | `extend_billing_transactions` | ⚡ Добавлено `product_code` в billing_transactions |
| 2024-12-25 | `add_user_id_to_billing_transactions` | ⚡ Добавлено `user_id` в billing_transactions |
| 2024-12-25 | `create_billing_credits` | ⚡ Создана таблица `billing_credits` (one-off credits) |
| 2024-12-26 | `remove_published_at` | 🔥 Удалено `published_at` (events published immediately) |
| 2024-12-26 | `create_billing_products` | ⚡ Создана таблица `billing_products` (pricing SSOT) |
| 2024-12-26 | `add_billing_credits_fk` | ⚡ FK от `billing_credits.credit_code` к `billing_products.code` |
| 2024-12-26 | `normalize_billing_transactions` | ⚡ **Normalization**: amount_kzt→amount, currency→currency_code (FK), status: paid→completed |
| 2024-12-26 | `cleanup_billing_transactions` | ⚡ Удалены deprecated columns (amount_kzt, currency) после миграции |
| 2024-12-26 | `normalize_billing_products` | ⚡ **Normalization**: price_kzt→price + currency_code FK |
| 2024-12-26 | `normalize_club_plans` | ⚡ **Normalization**: price_monthly_kzt→price_monthly + currency_code FK |
| 2024-12-26 | `cleanup_currency_columns` | ⚡ Удалены deprecated columns (price_kzt, price_monthly_kzt) |
| 2024-12-30 | `remove_organizer_role` | 🔥 Удалена роль `organizer` из club_members (SSOT §2) |
| 2024-12-30 | `fix_rls_owner_only_members` | 🔒 RLS: ТОЛЬКО owner может управлять members (SSOT §6.2) |
| 2024-12-31 | `enforce_club_id_immutability` | 🔒 DB trigger v1: club_id immutability (superseded by v2) |
| 2024-12-31 | `enforce_club_id_immutability_v2` | 🔒 DB trigger v2: club_id immutability (SSOT §5.7) — ACTIVE |
| 2024-12-31 | `test_club_id_immutability` | ✅ SQL test suite: club_id immutability verification |
| 2024-12-31 | `add_idempotency_keys` | ⚡ Таблица `idempotency_keys` (prevent duplicate requests) |

**Всего миграций**: 87 timestamped файлов ⚡

**Расположение**: `/supabase/migrations/`

---

## 🛠️ Maintenance Rules

### 1. Создание новых миграций:

```bash
# Формат имени файла:
supabase/migrations/YYYYMMDD_description.sql

# Пример:
supabase/migrations/20241225_add_event_tags.sql
```

**Правило**: ТОЛЬКО timestamped файлы в `supabase/migrations/`

### 2. После применения миграции:

1. ✅ Проверить что миграция применилась без ошибок
2. ✅ Обновить этот файл (`docs/DATABASE.md`) с новой структурой
3. ✅ Коммитить миграцию И обновленный `DATABASE.md` вместе
4. ✅ Обновить версию и дату в начале файла

### 3. Запрещено:

- ❌ SQL файлы без timestamp в названии
- ❌ SQL файлы в корне проекта
- ❌ Изменение уже примененных миграций
- ❌ Прямые изменения в БД без миграции

### 4. Удаление временных SQL файлов:

```bash
# Удалить:
- *.sql в корне проекта
- .temp_migrations/
- supabase/migrations/UPPERCASE*.sql (APPLY_VIA_DASHBOARD*, etc)
- supabase/migrations/*_without_timestamp.sql
```

### 5. Backup стратегия:

- Supabase автоматически создает ежедневные бэкапы
- Point-in-time recovery доступен для Pro планов
- Миграции в Git = полная история схемы

---

## 📊 Диаграмма связей (ERD)

```
users ─┬─→ cities
       ├─→ events (created_by_user_id)
       ├─→ user_cars
       ├─→ club_members
       └─→ clubs (created_by)

events ─┬─→ cities
        ├─→ event_categories
        ├─→ currencies (currency_code)
        ├─→ clubs (club_id)
        ├─→ users (created_by_user_id)
        └─┬─→ event_participants
          ├─→ event_user_access
          ├─→ event_locations
          └─→ event_allowed_brands ──→ car_brands

clubs ─┬─→ club_members ──→ users
       ├─→ club_subscriptions ──→ club_plans
       ├─→ billing_transactions ──→ club_plans
       └─→ events

billing_transactions ─┬─→ clubs (optional)
                      ├─→ users (optional)
                      ├─→ club_plans (optional)
                      └─→ billing_credits ⚡

billing_credits ─┬─→ users
                 ├─→ events (consumed_event_id, optional)
                 └─→ billing_transactions (source) ⚡

user_cars ──→ car_brands
```

---

## ✅ Verification Checklist

После любых изменений в БД:

- [ ] Все миграции применились без ошибок
- [ ] `DATABASE.md` обновлен с новой структурой
- [ ] RLS policies добавлены для новых таблиц
- [ ] Indexes созданы для новых FK и часто используемых запросов
- [ ] `GRANT SELECT` настроен для справочных таблиц (если добавлены)
- [ ] TypeScript типы обновлены (`src/lib/types/`)
- [ ] Repository functions обновлены (`src/lib/db/`)
- [ ] Tests пройдены (если есть)

---

**Последнее обновление**: 2024-12-27  
**Версия документа**: 1.1 ⚡  
**Статус**: SSOT (Single Source of Truth) для структуры БД Need4Trip

