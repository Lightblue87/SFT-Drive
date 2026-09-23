-- Korrekturen aus einem automatisierten PR-Review zu PR #29 (23.09.2026),
-- betrifft 20260923020000_notification_read_receipts.sql. Zwei reale
-- Datenkorrektheitsfehler, beide bevor die Lesebestätigung produktiv genutzt
-- wird behoben:
--
-- 1. delete_notification() löschte die eigene Empfängerzeile bisher
--    physisch aus notifications. admin_list_notification_batches() /
--    admin_get_notification_batch_recipients() zählen aber genau diese
--    Zeilen für recipient_count/read_count -- ein Empfänger, der eine
--    ungelesene Mitteilung per Swipe-to-delete entfernt, verschwand dadurch
--    rückwirkend sowohl aus dem Nenner als auch aus der Detailliste, was die
--    angezeigte Lesequote fälschlich erhöhte. Fix: Soft-Delete über ein
--    neues deleted_at -- die Empfängerzeile bleibt für die Statistik
--    erhalten, verschwindet aber weiterhin aus der eigenen Mitteilungsliste
--    des Users (src/features/notifications/useNotifications.ts filtert
--    zusätzlich auf deleted_at is null).
--
-- 2. tour_id auf notifications verwendet seit 20260907081600 `on delete set
--    null`; admin_delete_tour() (§37.3) löscht eine Tour, behält aber
--    bewusst deren Mitteilungen. Eine Admin-Mitteilung an eine später
--    gelöschte Tour hatte danach tour_id = null -- exakt wie eine echte
--    Broadcast-Mitteilung -- und wurde von admin_list_notification_batches()
--    deshalb fälschlich unter "An alle Nutzer" gelistet. Fix: eigenes,
--    unveränderliches is_broadcast-Flag, das beim Versand explizit gesetzt
--    wird und von einer späteren Tour-Löschung unberührt bleibt.
--    Für bereits bestehende Zeilen mit tour_id is null gibt es keine
--    zuverlässige Möglichkeit, nachträglich zwischen "war schon immer
--    Broadcast" und "Tour wurde seither gelöscht" zu unterscheiden; sie
--    werden hier als Broadcast rückwirkend übernommen (deckt sich mit dem
--    bisherigen, vor diesem Fix tatsächlich gezeigten Verhalten).

alter table public.notifications add column deleted_at timestamptz;
alter table public.notifications add column is_broadcast boolean not null default false;

update public.notifications
set is_broadcast = true
where type = 'ADMIN_MESSAGE' and tour_id is null;

create or replace function public.delete_notification(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set deleted_at = now()
  where id = p_id and user_id = auth.uid() and deleted_at is null;
end;
$$;

revoke all on function public.delete_notification(uuid) from public;
grant execute on function public.delete_notification(uuid) to authenticated;

create or replace function public.admin_send_tour_notification(p_tour_id uuid, p_title text, p_body text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
  v_batch_id uuid := gen_random_uuid();
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  insert into public.notifications (user_id, tour_id, type, title, body, target_path, batch_id, is_broadcast)
  select tr.user_id, p_tour_id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), '/tours/' || v_tour.slug, v_batch_id, false
  from public.tour_registrations tr
  where tr.tour_id = p_tour_id and tr.status = 'confirmed';

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_tour_notification(uuid, text, text) from public;
grant execute on function public.admin_send_tour_notification(uuid, text, text) to authenticated;

create or replace function public.admin_send_broadcast_notification(p_title text, p_body text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid := gen_random_uuid();
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  insert into public.notifications (user_id, type, title, body, target_path, batch_id, is_broadcast)
  select id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), null, v_batch_id, true
  from public.profiles;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_broadcast_notification(text, text) from public;
grant execute on function public.admin_send_broadcast_notification(text, text) to authenticated;

create or replace function public.admin_list_notification_batches(p_tour_id uuid default null)
returns table (
  batch_id uuid,
  title text,
  body text,
  created_at timestamptz,
  recipient_count bigint,
  read_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;

  return query
  select
    n.batch_id,
    min(n.title) as title,
    min(n.body) as body,
    min(n.created_at) as created_at,
    count(*) as recipient_count,
    count(*) filter (where n.read_at is not null) as read_count
  from public.notifications n
  where n.type = 'ADMIN_MESSAGE'
    and (
      (p_tour_id is null and n.is_broadcast)
      or (p_tour_id is not null and n.tour_id = p_tour_id and not n.is_broadcast)
    )
  group by n.batch_id
  order by min(n.created_at) desc
  limit 50;
end;
$$;

revoke all on function public.admin_list_notification_batches(uuid) from public;
grant execute on function public.admin_list_notification_batches(uuid) to authenticated;
