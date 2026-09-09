-- Korrekturen aus dem zweiten Review-Durchgang zum Cockpit-Redesign.
--
-- Betrifft ausschließlich Datenintegrität und serverseitige Prüfungen; keine
-- bestehende Migration wird umgeschrieben (§31.4).


-- 1. Bestell-RPCs vollständig validieren, bevor geschrieben wird ------------
--
-- Bisher wurde die Order angelegt/aktualisiert und alle bisherigen Positionen
-- gelöscht, und erst danach Position für Position validiert. Schlug eine
-- spätere Position fehl, gab die Funktion einen Fehlercode zurück, obwohl die
-- vorherige Bestellung bereits gelöscht bzw. teilweise ersetzt war. Da ein
-- `return` die Transaktion nicht zurückrollt, blieb dieser halbe Stand stehen.
-- Beide Funktionen validieren den Payload jetzt vollständig vorab.
create or replace function public.submit_meal_order(p_restaurant_stop_id uuid, p_items jsonb)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.restaurant_stop_settings%rowtype;
  v_registration public.tour_registrations%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if v_user_id is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  select * into v_settings from public.restaurant_stop_settings where tour_stop_id = p_restaurant_stop_id;
  if not found or not v_settings.ordering_enabled then
    return ('ORDERING_NOT_ENABLED', null, null)::public.registration_result;
  end if;

  if v_settings.ordering_open_at is not null and now() < v_settings.ordering_open_at then
    return ('ORDERING_NOT_OPEN', null, null)::public.registration_result;
  end if;
  if v_settings.ordering_deadline_at is not null and now() > v_settings.ordering_deadline_at then
    return ('ORDERING_CLOSED', null, null)::public.registration_result;
  end if;

  select r.* into v_registration
  from public.tour_registrations r
  join public.tour_stops ts on ts.tour_id = r.tour_id
  where ts.id = p_restaurant_stop_id and r.user_id = v_user_id and r.status = 'confirmed';

  if not found then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  -- Validierung VOR jeder Schreiboperation.
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    if (v_item ->> 'quantity') is null or (v_item ->> 'quantity')::integer <= 0 then
      return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
    end if;

    if not exists (
      select 1 from public.menu_items
      where id = (v_item ->> 'menu_item_id')::uuid
        and restaurant_stop_id = p_restaurant_stop_id
        and is_available
    ) then
      return ('MENU_ITEM_INVALID', null, null)::public.registration_result;
    end if;
  end loop;

  insert into public.meal_orders (restaurant_stop_id, registration_id, status, updated_at, submitted_at)
  values (
    p_restaurant_stop_id,
    v_registration.id,
    case when jsonb_array_length(v_items) = 0 then 'cancelled' else 'submitted' end,
    now(),
    case when jsonb_array_length(v_items) = 0 then null else now() end
  )
  on conflict (restaurant_stop_id, registration_id) do update
  set status = excluded.status, updated_at = now(), submitted_at = excluded.submitted_at
  returning id into v_order_id;

  delete from public.meal_order_items where meal_order_id = v_order_id;

  insert into public.meal_order_items (meal_order_id, menu_item_id, quantity, note)
  select
    v_order_id,
    (item ->> 'menu_item_id')::uuid,
    (item ->> 'quantity')::integer,
    nullif(trim(item ->> 'note'), '')
  from jsonb_array_elements(v_items) as item;

  return ('OK', null, v_order_id)::public.registration_result;
end;
$$;

create or replace function public.admin_update_meal_order(p_restaurant_stop_id uuid, p_registration_id uuid, p_items jsonb)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  -- Validierung VOR jeder Schreiboperation (siehe oben). Der Admin darf
  -- bewusst auch nicht mehr verfügbare Gerichte korrigieren, deshalb hier
  -- keine is_available-Prüfung — die Position muss aber zum Stopp gehören.
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    if (v_item ->> 'quantity') is null or (v_item ->> 'quantity')::integer <= 0 then
      return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
    end if;

    if not exists (
      select 1 from public.menu_items
      where id = (v_item ->> 'menu_item_id')::uuid and restaurant_stop_id = p_restaurant_stop_id
    ) then
      return ('MENU_ITEM_INVALID', null, null)::public.registration_result;
    end if;
  end loop;

  insert into public.meal_orders (restaurant_stop_id, registration_id, status, updated_at, submitted_at)
  values (
    p_restaurant_stop_id,
    p_registration_id,
    case when jsonb_array_length(v_items) = 0 then 'cancelled' else 'submitted' end,
    now(),
    case when jsonb_array_length(v_items) = 0 then null else now() end
  )
  on conflict (restaurant_stop_id, registration_id) do update
  set status = excluded.status, updated_at = now(), submitted_at = excluded.submitted_at
  returning id into v_order_id;

  delete from public.meal_order_items where meal_order_id = v_order_id;

  insert into public.meal_order_items (meal_order_id, menu_item_id, quantity, note)
  select
    v_order_id,
    (item ->> 'menu_item_id')::uuid,
    (item ->> 'quantity')::integer,
    nullif(trim(item ->> 'note'), '')
  from jsonb_array_elements(v_items) as item;

  return ('OK', null, v_order_id)::public.registration_result;
end;
$$;


-- 2. Keine Anmeldung nach Tourende ------------------------------------------
--
-- Bisher wurden nur registration_open_at/registration_close_at geprüft. Blieb
-- eine vergangene Tour versehentlich `published` ohne Anmeldeschluss, war
-- serverseitig weiterhin eine Anmeldung möglich.
create or replace function public.register_for_tour(
  p_tour_id uuid,
  p_vehicle_manufacturer text,
  p_vehicle_model text,
  p_vehicle_power_ps integer,
  p_license_plate text,
  p_passenger_count integer
)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tour public.tours%rowtype;
  v_existing public.tour_registrations%rowtype;
  v_confirmed_count integer;
  v_new_status text;
  v_registration_id uuid;
  v_dob date;
  v_age integer;
  v_existing_found boolean;
begin
  if v_user_id is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;

  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.status not in ('published', 'registration_closed') then
    return ('TOUR_NOT_OPEN', null, null)::public.registration_result;
  end if;

  -- Neu: unabhängig vom gespeicherten Status ist eine bereits beendete Tour
  -- nicht mehr buchbar (§8.3 Lebenszyklus).
  if v_tour.end_date < current_date then
    return ('TOUR_ENDED', null, null)::public.registration_result;
  end if;

  if v_tour.registration_open_at is not null and now() < v_tour.registration_open_at then
    return ('REGISTRATION_NOT_OPEN', null, null)::public.registration_result;
  end if;

  if v_tour.registration_close_at is not null and now() > v_tour.registration_close_at then
    return ('REGISTRATION_CLOSED', null, null)::public.registration_result;
  end if;

  if v_tour.status = 'registration_closed' then
    return ('REGISTRATION_CLOSED', null, null)::public.registration_result;
  end if;

  select * into v_existing
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = v_user_id;

  v_existing_found := found;

  if v_existing_found and v_existing.status not in ('cancelled', 'rejected') then
    return ('ALREADY_REGISTERED', v_existing.status, v_existing.id)::public.registration_result;
  end if;

  if coalesce(trim(p_vehicle_manufacturer), '') = ''
     or coalesce(trim(p_vehicle_model), '') = ''
     or p_vehicle_power_ps is null or p_vehicle_power_ps <= 0
     or p_passenger_count is null or p_passenger_count < 0 then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  if v_tour.license_plate_required and coalesce(trim(p_license_plate), '') = '' then
    return ('LICENSE_PLATE_REQUIRED', null, null)::public.registration_result;
  end if;

  if v_tour.min_power_ps is not null and p_vehicle_power_ps < v_tour.min_power_ps then
    return ('POWER_TOO_LOW', null, null)::public.registration_result;
  end if;

  if v_tour.max_power_ps is not null and p_vehicle_power_ps > v_tour.max_power_ps then
    return ('POWER_TOO_HIGH', null, null)::public.registration_result;
  end if;

  if v_tour.min_driver_age is not null then
    select date_of_birth into v_dob from public.profiles where id = v_user_id;

    if v_dob is null then
      return ('DATE_OF_BIRTH_REQUIRED', null, null)::public.registration_result;
    end if;

    v_age := date_part('year', age(v_tour.start_date, v_dob));

    if v_age < v_tour.min_driver_age then
      return ('DRIVER_TOO_YOUNG', null, null)::public.registration_result;
    end if;
  end if;

  select count(*) into v_confirmed_count
  from public.tour_registrations
  where tour_id = p_tour_id and status = 'confirmed';

  if v_tour.confirmation_mode = 'automatic' then
    v_new_status := case when v_confirmed_count < v_tour.max_vehicles then 'confirmed' else 'waitlisted' end;
  else
    v_new_status := case when v_confirmed_count < v_tour.max_vehicles then 'pending' else 'waitlisted' end;
  end if;

  if v_existing_found then
    -- Reaktivierung einer stornierten/abgelehnten Zeile: `checked_in_at` wird
    -- hier ausdrücklich mit zurückgesetzt, sonst gälte eine erneut angelegte
    -- Anmeldung weiterhin als "am Treffpunkt angekommen" (§34.3).
    update public.tour_registrations
    set
      status = v_new_status,
      vehicle_manufacturer = trim(p_vehicle_manufacturer),
      vehicle_model = trim(p_vehicle_model),
      vehicle_power_ps = p_vehicle_power_ps,
      license_plate = nullif(trim(p_license_plate), ''),
      passenger_count = p_passenger_count,
      registered_at = now(),
      updated_at = now(),
      confirmed_at = case when v_new_status = 'confirmed' then now() else null end,
      confirmed_by = case when v_new_status = 'confirmed' then v_user_id else null end,
      waitlisted_at = case when v_new_status = 'waitlisted' then now() else null end,
      cancelled_at = null,
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null,
      checked_in_at = null,
      checked_in_by = null
    where id = v_existing.id
    returning id into v_registration_id;
  else
    insert into public.tour_registrations (
      tour_id, user_id, status,
      vehicle_manufacturer, vehicle_model, vehicle_power_ps, license_plate,
      passenger_count,
      confirmed_at, confirmed_by, waitlisted_at
    ) values (
      p_tour_id, v_user_id, v_new_status,
      trim(p_vehicle_manufacturer), trim(p_vehicle_model), p_vehicle_power_ps, nullif(trim(p_license_plate), ''),
      p_passenger_count,
      case when v_new_status = 'confirmed' then now() else null end,
      case when v_new_status = 'confirmed' then v_user_id else null end,
      case when v_new_status = 'waitlisted' then now() else null end
    )
    returning id into v_registration_id;
  end if;

  return (
    case v_new_status
      when 'confirmed' then 'CONFIRMED'
      when 'pending' then 'PENDING_APPROVAL'
      else 'WAITLISTED'
    end,
    v_new_status,
    v_registration_id
  )::public.registration_result;
end;
$$;


-- 3. Abhängige Daten beim Verlust des Confirmed-Status bereinigen ------------
--
-- Check-in, Essensbestellungen und Übernachtungsbestätigungen setzen fachlich
-- eine aktuell bestätigte Teilnahme voraus. Verliert eine Registrierung diesen
-- Status (Storno durch den User, administrative Entfernung, Ablehnung), blieben
-- diese Daten bisher aktiv stehen: der Fahrer galt weiter als eingecheckt, und
-- seine Essensbestellung zählte weiter in der Restaurant-Gesamtmenge mit.
--
-- Ein Trigger deckt alle Wege gleichzeitig ab, statt jede einzelne RPC
-- anzufassen. Bestellungen werden storniert statt gelöscht (nachvollziehbar,
-- und der Admin sieht bei einer erneuten Bestätigung, was vorher bestellt war);
-- Übernachtungsbestätigungen werden entfernt, da sie ausschließlich eine
-- Aussage aktuell bestätigter Teilnehmer sind (§36.9).
create or replace function public.clear_dependent_registration_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'confirmed' and new.status is distinct from 'confirmed' then
    new.checked_in_at := null;
    new.checked_in_by := null;

    update public.meal_orders
    set status = 'cancelled', updated_at = now(), submitted_at = null
    where registration_id = new.id and status = 'submitted';

    delete from public.tour_accommodation_confirmations
    where tour_id = new.tour_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tour_registrations_clear_dependent_state on public.tour_registrations;
create trigger tour_registrations_clear_dependent_state
  before update on public.tour_registrations
  for each row
  execute function public.clear_dependent_registration_state();


-- 4. Menügerichte nicht mehr löschbar, sobald sie bestellt wurden ------------
--
-- `meal_order_items.menu_item_id` löschte bisher per ON DELETE CASCADE stumm
-- die zugehörigen Bestellpositionen mit. Ein versehentliches Löschen eines
-- bereits bestellten Gerichts hätte damit fremde Bestellungen verändert
-- (§27.4 "bereits bestellte Menüpositionen nicht unkontrolliert löschen").
alter table public.meal_order_items
  drop constraint if exists meal_order_items_menu_item_id_fkey;

alter table public.meal_order_items
  add constraint meal_order_items_menu_item_id_fkey
  foreign key (menu_item_id) references public.menu_items (id) on delete restrict;


-- 5. are_friends() gibt den Social Graph nicht mehr preis -------------------
--
-- Die Funktion war für `authenticated` ausführbar, ohne zu prüfen, ob der
-- Caller überhaupt Teil der abgefragten Beziehung ist — wer zwei User-IDs
-- kannte, konnte deren Freundschaftsstatus abfragen. Der interne Aufruf aus
-- get_confirmed_tour_vehicles() übergibt weiterhin auth.uid() und ist damit
-- unverändert gültig.
create or replace function public.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() in (p_user_a, p_user_b)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = p_user_a and f.addressee_id = p_user_b)
          or (f.requester_id = p_user_b and f.addressee_id = p_user_a)
        )
    );
$$;


-- 6. Hotel-Erinnerung serverseitig vollständig prüfen ------------------------
--
-- Bisher wurde nur geprüft, ob die Empfänger bestätigte Teilnehmer sind. Ein
-- veralteter oder manipulierter Client konnte damit eine "noch nicht
-- bestätigt"-Erinnerung für eine beliebige Nacht und auch an Teilnehmer
-- schicken, die längst bestätigt haben.
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

  select id, slug, title, start_date, end_date into v_tour
  from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.end_date <= v_tour.start_date then
    return ('NOT_MULTIDAY_TOUR', null, null)::public.registration_result;
  end if;

  -- Gültige Übernachtungsnacht: start_date <= night_date < end_date (§36.6).
  if p_night_date is null or p_night_date < v_tour.start_date or p_night_date >= v_tour.end_date then
    return ('INVALID_NIGHT_DATE', null, null)::public.registration_result;
  end if;

  -- Empfängerkreis serverseitig ableiten: aktuell bestätigte Teilnehmer dieser
  -- Tour, die für genau diese Nacht noch nicht bestätigt haben.
  select array_agg(distinct r.user_id) into v_recipient_ids
  from public.tour_registrations r
  where r.tour_id = p_tour_id
    and r.status = 'confirmed'
    and r.user_id = any(p_user_ids)
    and not exists (
      select 1 from public.tour_accommodation_confirmations c
      where c.tour_id = p_tour_id
        and c.user_id = r.user_id
        and c.night_date = p_night_date
    );

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) is null then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
  end if;

  v_title := 'Übernachtung noch nicht bestätigt';
  v_body := format(
    'Für die %s Tour fehlt uns noch deine Bestätigung für die Übernachtung vom %s auf den %s.',
    v_tour.title,
    to_char(p_night_date, 'DD.MM.'),
    to_char(p_night_date + 1, 'DD.MM.YYYY')
  );

  insert into public.notifications (user_id, tour_id, type, title, body, target_path)
  select uid, p_tour_id, 'ACCOMMODATION_REMINDER', v_title, v_body, '/tours/' || v_tour.slug
  from unnest(v_recipient_ids) as uid;

  return ('OK', null, null)::public.registration_result;
end;
$$;


-- 7. Logisch ungültige Zeitfenster ausschließen ------------------------------
--
-- Bewusst NOT VALID: bereits gespeicherte Altdaten werden nicht nachträglich
-- abgewiesen, jede neue oder geänderte Zeile aber geprüft.
alter table public.tours drop constraint if exists tours_registration_window_ordered;
alter table public.tours
  add constraint tours_registration_window_ordered
  check (
    registration_open_at is null
    or registration_close_at is null
    or registration_close_at >= registration_open_at
  ) not valid;

alter table public.tours drop constraint if exists tours_check_in_requires_meeting_at;
alter table public.tours
  add constraint tours_check_in_requires_meeting_at
  check (not check_in_enabled or meeting_at is not null) not valid;

alter table public.restaurant_stop_settings drop constraint if exists restaurant_ordering_window_ordered;
alter table public.restaurant_stop_settings
  add constraint restaurant_ordering_window_ordered
  check (
    ordering_open_at is null
    or ordering_deadline_at is null
    or ordering_deadline_at >= ordering_open_at
  ) not valid;


-- 8. Klarnamen von Freunden konsistent ausgeben ------------------------------
--
-- §34.1 sagt: eine akzeptierte Freundschaft gibt Vor- UND Nachnamen gegenseitig
-- frei. `list_my_friendships()` lieferte bisher nur den Username, die
-- Freundesseite konnte den Klarnamen also gar nicht anzeigen. Wichtig bleibt:
-- ausschließlich bei `accepted` — eine offene Anfrage gibt weiterhin nichts
-- frei (§34.1 Punkt 3).
-- Rückgabesignatur ändert sich (zwei neue Spalten) — CREATE OR REPLACE kann das
-- nicht, die Funktion muss deshalb zuerst entfernt werden.
drop function if exists public.list_my_friendships();

create function public.list_my_friendships()
returns table (
  friendship_id uuid,
  other_user_id uuid,
  other_username text,
  other_first_name text,
  other_last_name text,
  status text,
  direction text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return;
  end if;

  return query
    select
      f.id,
      case when f.requester_id = v_me then f.addressee_id else f.requester_id end,
      p.username,
      case when f.status = 'accepted' then p.first_name else null end,
      case when f.status = 'accepted' then p.last_name else null end,
      f.status,
      case when f.requester_id = v_me then 'outgoing' else 'incoming' end,
      f.created_at
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = v_me then f.addressee_id else f.requester_id end
    where f.requester_id = v_me or f.addressee_id = v_me
    order by f.created_at desc;
end;
$$;

revoke all on function public.list_my_friendships() from public;
grant execute on function public.list_my_friendships() to authenticated;
