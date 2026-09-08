-- Phase 19 — Hotelvorschläge und Übernachtungsbestätigung (siehe CLAUDE.md §36).
--
-- SFT Drive schlägt Unterkünfte vor und erfasst ausschließlich den
-- organisatorischen Status "Übernachtung gebucht/organisiert" — keine
-- Buchungsnummern, Preise oder sonstigen Reisedaten (§36.3, §36.12). Die
-- eigentliche Buchung passiert immer außerhalb der App.

-- Hotelvorschläge: Participant-Inhalt wie tour_stops/tour_stages, gleiches
-- RLS-Muster (bestätigter Teilnehmer oder Admin lesen, nur Admin schreiben).
create table public.tour_hotel_suggestions (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  night_date date not null,
  name text not null,
  url text null,
  address text null,
  note text null,
  booking_deadline date null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tour_hotel_suggestions_tour_night_idx
  on public.tour_hotel_suggestions (tour_id, night_date);

alter table public.tour_hotel_suggestions enable row level security;

create policy "tour_hotel_suggestions_select_confirmed_or_admin"
  on public.tour_hotel_suggestions for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = tour_hotel_suggestions.tour_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "tour_hotel_suggestions_admin_all"
  on public.tour_hotel_suggestions for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tour_hotel_suggestions to authenticated;
grant insert, update, delete on public.tour_hotel_suggestions to authenticated;

-- Übernachtungsbestätigungen: bewusst KEINE Insert/Update/Delete-Policies —
-- alle Statusänderungen laufen ausschließlich über set_accommodation_confirmation
-- unten, da dort die Voraussetzungen aus §36.6 geprüft werden müssen
-- (Mehrtagestour, gültige night_date, aktuell confirmed).
create table public.tour_accommodation_confirmations (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  night_date date not null,
  confirmed_at timestamptz not null default now(),

  unique (tour_id, user_id, night_date)
);

create index tour_accommodation_confirmations_tour_idx
  on public.tour_accommodation_confirmations (tour_id);

alter table public.tour_accommodation_confirmations enable row level security;

create policy "tour_accommodation_confirmations_select_own_or_admin"
  on public.tour_accommodation_confirmations for select
  using (user_id = auth.uid() or public.is_admin());

grant select on public.tour_accommodation_confirmations to authenticated;

-- Übernachtung für eine Nacht bestätigen oder die Bestätigung zurücknehmen
-- (§36.4, §36.6). p_confirmed = false löscht die Zeile, wodurch der Status
-- sofort wieder "nicht bestätigt" ist.
create or replace function public.set_accommodation_confirmation(
  p_tour_id uuid,
  p_night_date date,
  p_confirmed boolean
)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tour record;
begin
  if v_me is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  select id, start_date, end_date into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.end_date <= v_tour.start_date then
    return ('NOT_MULTIDAY_TOUR', null, null)::public.registration_result;
  end if;

  if p_night_date < v_tour.start_date or p_night_date >= v_tour.end_date then
    return ('INVALID_NIGHT_DATE', null, null)::public.registration_result;
  end if;

  if not exists (
    select 1 from public.tour_registrations
    where tour_id = p_tour_id and user_id = v_me and status = 'confirmed'
  ) then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if p_confirmed then
    insert into public.tour_accommodation_confirmations (tour_id, user_id, night_date, confirmed_at)
    values (p_tour_id, v_me, p_night_date, now())
    on conflict (tour_id, user_id, night_date) do update set confirmed_at = now();
  else
    delete from public.tour_accommodation_confirmations
    where tour_id = p_tour_id and user_id = v_me and night_date = p_night_date;
  end if;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.set_accommodation_confirmation(uuid, date, boolean) from public;
grant execute on function public.set_accommodation_confirmation(uuid, date, boolean) to authenticated;

-- Gezielte Erinnerung an ausgewählte Teilnehmer mit fehlender Bestätigung
-- (§36.10). Nutzt die bestehende notifications-Tabelle — kein neues
-- Nachrichtensystem. Push (falls aktiviert) löst das Frontend danach separat
-- über die bestehende send-push Function aus, wie bei
-- admin_send_tour_notification/admin_send_broadcast_notification.
create or replace function public.admin_send_accommodation_reminder(
  p_tour_id uuid,
  p_user_ids uuid[],
  p_night_date date
)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour record;
  v_title text;
  v_body text;
  v_recipient_ids uuid[];
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select id, slug, title into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  -- Nur an User senden, die tatsächlich aktuell bestätigte Teilnehmer dieser
  -- Tour sind — verhindert, dass der Client beliebige user_ids einschleust.
  select array_agg(distinct r.user_id) into v_recipient_ids
  from public.tour_registrations r
  where r.tour_id = p_tour_id
    and r.status = 'confirmed'
    and r.user_id = any(p_user_ids);

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) is null then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
  end if;

  v_title := 'Übernachtung noch nicht bestätigt';
  v_body := format(
    'Für die %s Tour fehlt uns noch deine Bestätigung für die Übernachtung vom %s.',
    v_tour.title,
    to_char(p_night_date, 'DD.MM.YYYY')
  );

  insert into public.notifications (user_id, tour_id, type, title, body, target_path)
  select uid, p_tour_id, 'ACCOMMODATION_REMINDER', v_title, v_body, '/tours/' || v_tour.slug
  from unnest(v_recipient_ids) as uid;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_accommodation_reminder(uuid, uuid[], date) from public;
grant execute on function public.admin_send_accommodation_reminder(uuid, uuid[], date) to authenticated;
