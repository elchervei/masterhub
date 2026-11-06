create unique index if not exists masters_slug_unique_idx on public.masters(slug) where slug is not null;
update public.masters
set slug = 'master-' || replace(left(id::text, 8), '-', '')
where slug is null or btrim(slug) = '';

drop policy if exists "clients create review after completed booking" on public.reviews;
create policy "clients create review after completed booking"
on public.reviews for insert
to authenticated
with check (
  client_id = (select auth.uid())
  and rating between 1 and 5
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.client_id = (select auth.uid())
      and b.master_id = reviews.master_id
      and b.status = 'completed'
  )
);
