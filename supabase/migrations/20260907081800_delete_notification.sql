-- User darf eigene Mitteilungen löschen (Swipe-to-delete in der App). Analog
-- zu mark_notification_read(): kontrollierte RPC statt einer breiten DELETE-
-- Policy, konsistent mit dem Rest der notifications-Tabelle (§27.14 "User
-- markiert nur eigene Notifications" — Löschen folgt demselben Prinzip).
create or replace function public.delete_notification(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where id = p_id and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_notification(uuid) from public;
grant execute on function public.delete_notification(uuid) to authenticated;
