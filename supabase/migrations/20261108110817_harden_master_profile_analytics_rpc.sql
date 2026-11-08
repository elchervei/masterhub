create or replace function private.track_master_profile_event(
  p_master_id uuid, p_event_type text, p_visitor_id uuid
) returns boolean
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare owner_id uuid; master_is_public boolean;
begin
  if p_event_type not in ('profile_view','booking_click') or p_visitor_id is null then return false; end if;
  select m.user_id,(m.status='approved') into owner_id,master_is_public from public.masters m where m.id=p_master_id;
  if owner_id is null or not coalesce(master_is_public,false) then return false; end if;
  if auth.uid() is not null and auth.uid()=owner_id then return false; end if;
  if p_event_type='profile_view' and exists (
    select 1 from public.master_profile_events e where e.master_id=p_master_id
      and e.event_type='profile_view' and e.visitor_id=p_visitor_id
      and e.created_at>now()-interval '30 minutes'
  ) then return false; end if;
  insert into public.master_profile_events(master_id,event_type,visitor_id)
  values(p_master_id,p_event_type,p_visitor_id);
  return true;
end;
$$;
revoke all on function private.track_master_profile_event(uuid,text,uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.track_master_profile_event(uuid,text,uuid) to anon, authenticated;

create or replace function public.track_master_profile_event(
  p_master_id uuid, p_event_type text, p_visitor_id uuid
) returns boolean
language sql security invoker
set search_path = public, private, pg_temp
as $$
  select private.track_master_profile_event(p_master_id,p_event_type,p_visitor_id);
$$;
revoke all on function public.track_master_profile_event(uuid,text,uuid) from public;
grant execute on function public.track_master_profile_event(uuid,text,uuid) to anon, authenticated;
