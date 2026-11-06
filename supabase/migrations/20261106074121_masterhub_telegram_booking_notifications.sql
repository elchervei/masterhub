create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Each environment gets its own random secret. It is only stored in Supabase Vault.
select vault.create_secret(encode(extensions.gen_random_bytes(48), 'hex'), 'masterhub_notification_cron_secret');

create table if not exists public.booking_notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in ('booking_new','reminder_24h','reminder_2h')),
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  unique (booking_id, recipient_profile_id, notification_type)
);

create index if not exists booking_notification_log_pending_idx
  on public.booking_notification_log (status, attempted_at);

alter table public.booking_notification_log enable row level security;
revoke all on public.booking_notification_log from anon, authenticated;
grant all on public.booking_notification_log to service_role;

create or replace function public.verify_masterhub_notification_secret(candidate text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select coalesce(
    candidate = (select decrypted_secret from vault.decrypted_secrets where name = 'masterhub_notification_cron_secret' limit 1),
    false
  );
$$;

revoke all on function public.verify_masterhub_notification_secret(text) from public, anon, authenticated;
grant execute on function public.verify_masterhub_notification_secret(text) to service_role;

create or replace function public.dispatch_masterhub_booking_notification()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  cron_secret text;
begin
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'masterhub_notification_cron_secret'
  limit 1;

  perform net.http_post(
    url := 'https://avlvijkjmkhtxeqsezii.supabase.co/functions/v1/masterhub-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-masterhub-cron-secret', cron_secret
    ),
    body := jsonb_build_object('mode', 'booking_created', 'booking_id', new.id::text)
  );
  return new;
end;
$$;

revoke all on function public.dispatch_masterhub_booking_notification() from public, anon, authenticated;

drop trigger if exists bookings_notify_master_on_insert on public.bookings;
create trigger bookings_notify_master_on_insert
after insert on public.bookings
for each row
execute function public.dispatch_masterhub_booking_notification();

select cron.schedule(
  'masterhub-booking-reminders',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := 'https://avlvijkjmkhtxeqsezii.supabase.co/functions/v1/masterhub-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-masterhub-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'masterhub_notification_cron_secret' limit 1)
      ),
      body := '{"mode":"reminders"}'::jsonb
    );
  $job$
);
