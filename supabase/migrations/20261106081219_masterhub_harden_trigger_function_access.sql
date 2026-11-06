alter function public.prevent_user_admin_role() set search_path = '';
alter function public.prevent_master_status_change() set search_path = '';
revoke execute on function public.prevent_master_status_change() from public, anon, authenticated;
