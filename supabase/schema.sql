-- Need4Trip base schema for Supabase/Postgres
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  telegram_handle text,
  telegram_id text unique,
  avatar_url text,
  car_model text,
  experience_level text check (experience_level in ('beginner', 'intermediate', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text check (
    category in (
      'weekend_trip',
      'technical_ride',
      'meeting',
      'training',
      'service_day',
      'other'
    )
  ),
  date_time timestamptz not null,
  location_text text not null,
  location_lat double precision,
  location_lng double precision,
  max_participants integer,
  custom_fields_schema jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references public.users (id) on delete set null,
  visibility text not null default 'public',
  vehicle_type_requirement text not null default 'any',
  rules text,
  is_club_event boolean not null default false,
  is_paid boolean not null default false,
  price numeric(10,2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_created_by_user_idx on public.events (created_by_user_id);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  display_name text not null,
  role text not null check (role in ('leader', 'tail', 'participant')),
  custom_field_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists event_participants_event_idx on public.event_participants (event_id);

create table if not exists public.car_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.event_allowed_brands (
  event_id uuid not null references public.events(id) on delete cascade,
  brand_id uuid not null references public.car_brands(id) on delete restrict,
  primary key (event_id, brand_id)
);

create table if not exists public.event_user_access (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);
