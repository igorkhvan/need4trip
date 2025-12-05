-- Visibility
alter table if exists public.events
  add column if not exists visibility text not null default 'public';

-- Vehicle requirements
alter table if exists public.events
  add column if not exists vehicle_type_requirement text not null default 'any';

-- Rules / behavior
alter table if exists public.events
  add column if not exists rules text;

-- Club / paid flags and pricing
alter table if exists public.events
  add column if not exists is_club_event boolean not null default false,
  add column if not exists is_paid boolean not null default false,
  add column if not exists price numeric(10,2),
  add column if not exists currency text;

-- Car brands catalog
create table if not exists public.car_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  created_at timestamptz not null default now()
);

-- Event allowed brands (many-to-many)
create table if not exists public.event_allowed_brands (
  event_id uuid not null references public.events(id) on delete cascade,
  brand_id uuid not null references public.car_brands(id) on delete restrict,
  primary key (event_id, brand_id)
);

-- Access for private events
create table if not exists public.event_user_access (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);
