-- Deduplicate users by telegram_id and enforce uniqueness.
-- Keeps the earliest created user per telegram_id, rewires references, deletes duplicates, then (re)adds unique constraint.

with dupes as (
  select telegram_id,
         array_agg(id order by created_at asc, id asc) as ids
  from public.users
  where telegram_id is not null
  group by telegram_id
  having count(*) > 1
),
canon as (
  select telegram_id,
         ids[1] as keep_id,
         ids[2:array_length(ids, 1)] as drop_ids
  from dupes
)
-- rewire event owners
, upd_events as (
  update public.events e
  set created_by_user_id = c.keep_id
  from canon c
  where e.created_by_user_id = any (c.drop_ids)
  returning 1
)
-- rewire participants
, upd_participants as (
  update public.event_participants p
  set user_id = c.keep_id
  from canon c
  where p.user_id = any (c.drop_ids)
  returning 1
)
delete from public.users u
using canon c
where u.id = any (c.drop_ids);

-- Enforce uniqueness (idempotent).
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
