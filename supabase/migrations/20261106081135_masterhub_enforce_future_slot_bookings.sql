drop policy if exists "clients create own bookings" on public.bookings;
create policy "clients create own bookings"
on public.bookings
for insert
to authenticated
with check (
  client_id = (select auth.uid())
  and starts_at > now()
  and slot_id is not null
  and exists (
    select 1
    from public.masters m
    where m.id = bookings.master_id
      and m.status = 'approved'::public.master_status
  )
  and exists (
    select 1
    from public.master_time_slots s
    where s.id = bookings.slot_id
      and s.master_id = bookings.master_id
      and s.is_active = true
      and s.starts_at = bookings.starts_at
      and s.ends_at = bookings.ends_at
      and s.starts_at > now()
  )
  and (
    service_id is null
    or exists (
      select 1
      from public.services s
      where s.id = bookings.service_id
        and s.master_id = bookings.master_id
        and s.is_active = true
    )
  )
);

create or replace function public.sync_master_time_slot_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  target_slot public.master_time_slots%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.slot_id is null then
      raise exception 'A valid time slot is required';
    end if;

    select * into target_slot
    from public.master_time_slots
    where id = new.slot_id
    for update;

    if not found
       or target_slot.master_id <> new.master_id
       or not target_slot.is_active
       or target_slot.starts_at <> new.starts_at
       or target_slot.ends_at <> new.ends_at
       or target_slot.starts_at <= now() then
      raise exception 'Selected time slot is no longer available';
    end if;

    update public.master_time_slots
    set is_active = false
    where id = new.slot_id;

    return new;
  elsif tg_op = 'UPDATE' then
    if old.slot_id is not null
       and new.status in ('cancelled','declined')
       and old.status not in ('cancelled','declined') then
      update public.master_time_slots
      set is_active = true
      where id = old.slot_id;
    elsif old.slot_id is not null
       and new.status not in ('cancelled','declined')
       and old.status in ('cancelled','declined') then
      update public.master_time_slots
      set is_active = false
      where id = old.slot_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.slot_id is not null and old.status in ('pending','confirmed') then
      update public.master_time_slots
      set is_active = true
      where id = old.slot_id;
    end if;
    return old;
  end if;

  return new;
end;
$function$;
