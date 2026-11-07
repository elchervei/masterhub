-- Master Hub: studio workspaces and team invitations
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  category text not null default 'tattoo' check (category in ('tattoo','piercing','nails','brows','makeup')),
  description text not null default '',
  city text not null default 'Калининград',
  address text,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists studios_owner_user_id_uidx on public.studios(owner_user_id);
create table if not exists public.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  master_id uuid not null unique references public.masters(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique(studio_id, master_id)
);
create index if not exists studio_members_studio_id_idx on public.studio_members(studio_id);
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_studio_member(p_studio_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select exists(select 1 from public.studio_members sm join public.masters m on m.id=sm.master_id where sm.studio_id=p_studio_id and m.user_id=auth.uid()) $$;
revoke all on function private.is_studio_member(uuid) from public;
grant execute on function private.is_studio_member(uuid) to authenticated;
grant select,insert,update,delete on public.studios to authenticated;
grant select,insert,update,delete on public.studio_members to authenticated;
drop policy if exists "Studio members can read studio" on public.studios;
create policy "Studio members can read studio" on public.studios for select to authenticated using (private.is_studio_member(id));
drop policy if exists "Users create own studio" on public.studios;
create policy "Users create own studio" on public.studios for insert to authenticated with check (owner_user_id=auth.uid());
drop policy if exists "Owners update studio" on public.studios;
create policy "Owners update studio" on public.studios for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());
drop policy if exists "Studio members read team" on public.studio_members;
create policy "Studio members read team" on public.studio_members for select to authenticated using (private.is_studio_member(studio_id));
drop policy if exists "Owners add own master as owner" on public.studio_members;
create policy "Owners add own master as owner" on public.studio_members for insert to authenticated with check (role='owner' and exists(select 1 from public.studios s where s.id=studio_id and s.owner_user_id=auth.uid()) and exists(select 1 from public.masters m where m.id=master_id and m.user_id=auth.uid()));
drop policy if exists "Members leave or owners remove members" on public.studio_members;
create policy "Members leave or owners remove members" on public.studio_members for delete to authenticated using (exists(select 1 from public.masters m where m.id=master_id and m.user_id=auth.uid()) or exists(select 1 from public.studios s where s.id=studio_id and s.owner_user_id=auth.uid()));
create or replace function public.join_studio_by_code(p_code text)
returns void language plpgsql security definer set search_path=public
as $$
declare v_studio_id uuid; v_master_id uuid;
begin
  if auth.uid() is null then raise exception 'Нужна авторизация.'; end if;
  select id into v_master_id from public.masters where user_id=auth.uid() and status='approved' limit 1;
  if v_master_id is null then raise exception 'Сначала нужна одобренная анкета мастера.'; end if;
  select id into v_studio_id from public.studios where invite_code=upper(trim(p_code));
  if v_studio_id is null then raise exception 'Код приглашения не найден.'; end if;
  if exists(select 1 from public.studio_members where master_id=v_master_id) then raise exception 'Ты уже состоишь в студии. Сначала выйди из текущей команды.'; end if;
  insert into public.studio_members(studio_id,master_id,role) values(v_studio_id,v_master_id,'member');
end;
$$;
revoke all on function public.join_studio_by_code(text) from public;
revoke all on function public.join_studio_by_code(text) from anon;
grant execute on function public.join_studio_by_code(text) to authenticated;
