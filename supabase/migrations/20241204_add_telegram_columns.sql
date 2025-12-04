-- Align users table with app expectations (Telegram auth)
alter table if exists public.users
  add column if not exists telegram_id text,
  add column if not exists telegram_handle text,
  add column if not exists avatar_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_telegram_id_key'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add constraint users_telegram_id_key unique (telegram_id);
  end if;
end
$$;
