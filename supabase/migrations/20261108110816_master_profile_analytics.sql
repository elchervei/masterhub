create table if not exists public.master_profile_events (
  id bigint generated always as identity primary key,
  master_id uuid not null references public.masters(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view','booking_click')),
  visitor_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists master_profile_events_master_created_idx
  on public.master_profile_events (master_id, created_at desc);
create index if not exists master_profile_events_master_visitor_idx
  on public.master_profile_events (master_id, visitor_id);

alter table public.master_profile_events enable row level security;
create policy "Masters read own profile analytics"
  on public.master_profile_events for select to authenticated
  using (exists (
    select 1 from public.masters m
    where m.id = master_profile_events.master_id
      and m.user_id = (select auth.uid())
  ));
revoke all on public.master_profile_events from anon, authenticated;
grant select on public.master_profile_events to authenticated;

create or replace function public.track_master_profile_event(
  p_master_id uuid, p_event_type text, p_visitor_id uuid
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid; master_is_public boolean;
begin
  if p_event_type not in ('profile_view','booking_click') or p_visitor_id is null then return false; end if;
  select m.user_id,(m.status='approved') into owner_id,master_is_public
  from public.masters m where m.id=p_master_id;
  if owner_id is null or not coalesce(master_is_public,false) then return false; end if;
  if auth.uid() is not null and auth.uid()=owner_id then return false; end if;
  if p_event_type='profile_view' and exists (
    select 1 from public.master_profile_events e
    where e.master_id=p_master_id and e.event_type='profile_view'
      and e.visitor_id=p_visitor_id and e.created_at>now()-interval '30 minutes'
  ) then return false; end if;
  insert into public.master_profile_events(master_id,event_type,visitor_id)
  values(p_master_id,p_event_type,p_visitor_id);
  return true;
end;
$$;
revoke all on function public.track_master_profile_event(uuid,text,uuid) from public;
grant execute on function public.track_master_profile_event(uuid,text,uuid) to anon, authenticated;
