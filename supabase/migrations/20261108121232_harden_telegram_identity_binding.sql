create unique index if not exists profiles_telegram_id_uidx
  on public.profiles (telegram_id)
  where telegram_id is not null;

create or replace function public.protect_profile_telegram_id()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if tg_op = 'INSERT' and new.telegram_id is not null then
      raise exception 'Telegram ID can only be assigned by trusted server authentication';
    elsif tg_op = 'UPDATE' and new.telegram_id is distinct from old.telegram_id then
      raise exception 'Telegram ID can only be changed by trusted server authentication';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_protect_telegram_id on public.profiles;
create trigger profiles_protect_telegram_id
before insert or update of telegram_id on public.profiles
for each row execute function public.protect_profile_telegram_id();

revoke all on function public.protect_profile_telegram_id() from public, anon, authenticated;

revoke insert, update on public.profiles from anon, authenticated;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
