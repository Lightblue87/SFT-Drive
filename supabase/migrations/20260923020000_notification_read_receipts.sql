-- Lesebestätigung für Admin-Mitteilungen (§27.13/§27.14).
--
-- notifications legt bereits pro Empfänger eine eigene Zeile mit read_at an
-- (§27.14) -- die Rohdaten für eine Lesequote existieren also schon. Es
-- fehlte bisher aber eine Möglichkeit, die Zeilen EINES einzelnen
-- Admin-Versands zuverlässig zu gruppieren: mehrere Mitteilungen an
-- dieselbe Tour (oder mehrere Broadcasts) waren nur über tour_id/title/body/
-- created_at unterscheidbar, was bei zufällig identischem Titel/Text
-- kollidieren könnte. batch_id löst das sauber über eine echte ID statt
-- Heuristik.
--
-- Der Spaltendefault gen_random_uuid() sorgt dafür, dass jede bereits
-- bestehende automatische Einzel-Mitteilung (Tourabsage, Regionsbenach-
-- richtigung, Restaurant-/Übernachtungserinnerung usw.) automatisch ihre
-- eigene, für sie allein gültige batch_id bekommt -- an diesen Stellen
-- muss nichts geändert werden. Nur die beiden Admin-Massenversand-RPCs
-- unten setzen den Wert bewusst explizit gleich für alle Empfänger EINES
-- Aufrufs.

alter table public.notifications add column batch_id uuid not null default gen_random_uuid();

create index notifications_batch_id_idx on public.notifications (batch_id);

-- admin_send_tour_notification() und admin_send_broadcast_notification()
-- werden hier NEU angelegt (nicht per ALTER), weil ihre Signatur (Parameter,
-- Rückgabetyp) unverändert bleibt -- `create or replace function` ist dafür
-- die im Projekt übliche Vorgehensweise für spätere Funktionsänderungen
-- (siehe z. B. 20260909020000_review_fixes.sql).

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

  insert into public.notifications (user_id, tour_id, type, title, body, target_path, batch_id)
  select tr.user_id, p_tour_id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), '/tours/' || v_tour.slug, v_batch_id
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

  insert into public.notifications (user_id, type, title, body, target_path, batch_id)
  select id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), null, v_batch_id
  from public.profiles;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_broadcast_notification(text, text) from public;
grant execute on function public.admin_send_broadcast_notification(text, text) to authenticated;

-- Übersicht bereits versendeter Admin-Mitteilungen samt Lesequote je Versand
-- (§4 "keine N+1-Abfragen" -- eine gebündelte Aggregation statt einer
-- Einzelabfrage pro Batch). p_tour_id = null listet Broadcasts, sonst die
-- Versände an genau diese Tour. Nur type = 'ADMIN_MESSAGE', da automatische
-- Einzel-Benachrichtigungen (Tourabsage, Erinnerungen usw.) hierfür nicht
-- gedacht sind und ohnehin praktisch immer batch-Größe 1 hätten.
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
      (p_tour_id is null and n.tour_id is null)
      or n.tour_id = p_tour_id
    )
  group by n.batch_id
  order by min(n.created_at) desc
  limit 50;
end;
$$;

revoke all on function public.admin_list_notification_batches(uuid) from public;
grant execute on function public.admin_list_notification_batches(uuid) to authenticated;

-- Detailliste je Versand: wer hat gelesen, wer nicht. Username statt
-- Klarname (§7/§8.9 "Fahrzeugliste gibt keine unberechtigt freigegebenen
-- Klarnamen aus" -- dieselbe Datensparsamkeit gilt hier).
create or replace function public.admin_get_notification_batch_recipients(p_batch_id uuid)
returns table (
  username text,
  read_at timestamptz
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
  select p.username, n.read_at
  from public.notifications n
  join public.profiles p on p.id = n.user_id
  where n.batch_id = p_batch_id
  order by (n.read_at is null) desc, p.username asc;
end;
$$;

revoke all on function public.admin_get_notification_batch_recipients(uuid) from public;
grant execute on function public.admin_get_notification_batch_recipients(uuid) to authenticated;
