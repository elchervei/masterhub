drop policy if exists "clients create own bookings" on public.bookings;
create policy "clients create own bookings"
on public.bookings
for insert
to authenticated
with check (
  client_id = (select auth.uid())
  and exists (
    select 1
    from public.masters m
    where m.id = bookings.master_id
      and m.status = 'approved'::public.master_status
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

drop policy if exists "Public can read master time slots" on public.master_time_slots;
create policy "Public can read master time slots"
on public.master_time_slots
for select
to public
using (
  exists (
    select 1
    from public.masters m
    where m.id = master_time_slots.master_id
      and m.status = 'approved'::public.master_status
  )
);
