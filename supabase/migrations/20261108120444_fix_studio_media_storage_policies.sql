drop policy if exists "Studio owners delete studio media" on storage.objects;
create policy "Studio owners delete studio media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'masterhub-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'studios'
  and exists (
    select 1 from public.studios s
    where s.id::text = (storage.foldername(name))[3]
      and s.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Studio owners update studio media" on storage.objects;
create policy "Studio owners update studio media"
on storage.objects for update to authenticated
using (
  bucket_id = 'masterhub-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'studios'
  and exists (
    select 1 from public.studios s
    where s.id::text = (storage.foldername(name))[3]
      and s.owner_user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'masterhub-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'studios'
  and exists (
    select 1 from public.studios s
    where s.id::text = (storage.foldername(name))[3]
      and s.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Studio owners upload studio media" on storage.objects;
create policy "Studio owners upload studio media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'masterhub-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'studios'
  and exists (
    select 1 from public.studios s
    where s.id::text = (storage.foldername(name))[3]
      and s.owner_user_id = (select auth.uid())
  )
);