create or replace function public.ensure_master_public_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := 'master-' || replace(left(new.id::text, 8), '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists masters_ensure_public_slug on public.masters;
create trigger masters_ensure_public_slug
before insert or update of slug on public.masters
for each row execute function public.ensure_master_public_slug();
