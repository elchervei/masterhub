create or replace function public.guard_booking_changes()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  is_master boolean;
begin
  if new.client_id is distinct from old.client_id
     or new.master_id is distinct from old.master_id
     or new.service_id is distinct from old.service_id
     or new.reference_image_url is distinct from old.reference_image_url
     or new.client_telegram is distinct from old.client_telegram
     or new.client_note is distinct from old.client_note then
    raise exception 'Booking details cannot be edited';
  end if;

  select exists (
    select 1 from public.masters m
    where m.id = old.master_id and m.user_id = auth.uid()
  ) into is_master;

  if is_master then
    if new.master_archived_at is distinct from old.master_archived_at then
      if old.status <> 'completed'::public.booking_status
         or (old.master_archived_at is null and new.master_archived_at is null)
         or (old.master_archived_at is not null and new.master_archived_at is not null)
         or (to_jsonb(new) - 'master_archived_at') is distinct from (to_jsonb(old) - 'master_archived_at') then
        raise exception 'Only completed bookings can be archived or restored';
      end if;
      return new;
    end if;

    if old.status = 'pending'::public.booking_status
       and new.status = 'price_proposed'::public.booking_status then
      if new.proposed_price is null or new.proposed_price <= 0 then raise exception 'A positive price is required'; end if;
      if char_length(coalesce(new.master_message, '')) > 300 then raise exception 'Master message is too long'; end if;
    elsif old.status = 'pending'::public.booking_status
       and new.status in ('confirmed'::public.booking_status,'declined'::public.booking_status) then
      if new.proposed_price is distinct from old.proposed_price or new.master_message is distinct from old.master_message then raise exception 'Invalid booking update'; end if;
    elsif old.status = 'confirmed'::public.booking_status and new.status = 'completed'::public.booking_status then
      if new.proposed_price is distinct from old.proposed_price or new.master_message is distinct from old.master_message then raise exception 'Invalid booking update'; end if;
    elsif old.status = 'confirmed'::public.booking_status and new.status = old.status then
      if new.reschedule_status = 'proposed' and new.reschedule_proposed_slot_id is not null then
        if not exists (select 1 from public.master_time_slots s where s.id = new.reschedule_proposed_slot_id and s.master_id = old.master_id and s.is_active = true and s.starts_at = new.reschedule_proposed_start and s.ends_at = new.reschedule_proposed_end) then raise exception 'Proposed time slot is no longer available'; end if;
      elsif new.deposit_required is distinct from old.deposit_required or new.deposit_amount is distinct from old.deposit_amount or new.deposit_status is distinct from old.deposit_status then
        if new.deposit_required and (new.deposit_amount is null or new.deposit_amount <= 0) then raise exception 'A positive deposit amount is required'; end if;
      else raise exception 'Invalid booking update';
      end if;
    else raise exception 'Invalid booking status transition';
    end if;
  elsif auth.uid() = old.client_id then
    if old.status = 'price_proposed'::public.booking_status
       and new.status in ('confirmed'::public.booking_status, 'declined'::public.booking_status)
       and new.proposed_price is not distinct from old.proposed_price
       and new.master_message is not distinct from old.master_message then
      null;
    elsif old.status = 'confirmed'::public.booking_status and new.status = old.status and old.reschedule_status = 'proposed' and new.reschedule_status in ('accepted','declined') then
      if new.reschedule_status = 'accepted' then
        if new.slot_id is distinct from old.reschedule_proposed_slot_id or new.starts_at is distinct from old.reschedule_proposed_start or new.ends_at is distinct from old.reschedule_proposed_end then raise exception 'Invalid reschedule acceptance'; end if;
        if not exists (select 1 from public.master_time_slots s where s.id = new.slot_id and s.master_id = old.master_id and s.is_active = true and s.starts_at = new.starts_at and s.ends_at = new.ends_at) then raise exception 'Proposed time slot is no longer available'; end if;
      else
        if new.slot_id is distinct from old.slot_id or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then raise exception 'Invalid reschedule decline'; end if;
      end if;
    else raise exception 'Client can only accept or decline a proposed price or reschedule';
    end if;
  else raise exception 'Not allowed to update this booking';
  end if;
  return new;
end;
$function$;