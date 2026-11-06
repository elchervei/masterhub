insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'masterhub-references',
  'masterhub-references',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read Master Hub media" on storage.objects;
create policy "Public read Master Hub media"
on storage.objects for select
to public
using (
  bucket_id = 'masterhub-media'
  and name !~ '(^|/)reference-'
);

drop policy if exists "Users read own legacy Master Hub references" on storage.objects;
create policy "Users read own legacy Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-media'
  and name like '%/reference-%'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Masters read booked legacy Master Hub references" on storage.objects;
create policy "Masters read booked legacy Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-media'
  and name like '%/reference-%'
  and exists (
    select 1
    from public.bookings b
    join public.masters m on m.id = b.master_id
    where (b.reference_image_url = storage.objects.name
       or b.reference_image_url like '%' || storage.objects.name)
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins read legacy Master Hub references" on storage.objects;
create policy "Admins read legacy Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-media'
  and name like '%/reference-%'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists "Clients upload own Master Hub references" on storage.objects;
create policy "Clients upload own Master Hub references"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'masterhub-references'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Clients read own Master Hub references" on storage.objects;
create policy "Clients read own Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-references'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Masters read booked Master Hub references" on storage.objects;
create policy "Masters read booked Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-references'
  and exists (
    select 1
    from public.bookings b
    join public.masters m on m.id = b.master_id
    where b.reference_image_url = storage.objects.name
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins read Master Hub references" on storage.objects;
create policy "Admins read Master Hub references"
on storage.objects for select
to authenticated
using (
  bucket_id = 'masterhub-references'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists "Clients delete own Master Hub references" on storage.objects;
create policy "Clients delete own Master Hub references"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'masterhub-references'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
