-- Korrekturen aus dem automatisierten PR-Review (Codex) zum bereits eingespielten
-- Stand von `20260909010000_tour_lifecycle.sql` und `20260909020000_review_fixes.sql`.
-- Beide Migrationen sind bereits produktiv angewendet und werden deshalb nicht
-- nachträglich verändert (§23.14) — die Korrekturen erfolgen hier additiv als
-- erneutes `create or replace function`.

-- 1. register_for_tour: die Reaktivierungs-Ausnahme für zuvor abgelehnte
--    Registrierungen (siehe `20260907081100_rejected_requires_manual_reapproval.sql`)
--    war beim Umschreiben in `20260909020000_review_fixes.sql` versehentlich
--    verloren gegangen — ein zuvor vom Admin abgelehnter User konnte sich in
--    einer automatisch bestätigenden Tour mit freier Kapazität direkt wieder
--    selbst bestätigen und damit die Admin-Entscheidung umgehen. Fix: der
--    `rejected`-Zweig ist wiederhergestellt, alle übrigen Korrekturen aus
--    `20260909020000` (TOUR_ENDED, checked_in_at-Reset bei Reaktivierung)
--    bleiben erhalten.
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

  if v_existing_found and v_existing.status = 'rejected' then
    -- Admin-Ablehnung wiegt schwerer als der Bestätigungsmodus der Tour:
    -- immer erneut pending, nie automatisch confirmed/waitlisted (wiederhergestellt).
    v_new_status := 'pending';
  elsif v_tour.confirmation_mode = 'automatic' then
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

revoke all on function public.register_for_tour(uuid, text, text, integer, text, integer) from public;
grant execute on function public.register_for_tour(uuid, text, text, integer, text, integer) to authenticated;


-- 2. admin_add_registration: die Admin-Ausnahme (§8.3) übergeht ausdrücklich nur
--    Anmeldefenster sowie Leistungs-/Altersanforderungen — die Kennzeichenpflicht
--    einer Tour gehört nicht dazu und muss deshalb weiterhin geprüft werden,
--    auch wenn der Admin ein gespeichertes Garage-Fahrzeug ohne Kennzeichen
--    auswählt.
create or replace function public.admin_add_registration(
  p_tour_id uuid,
  p_user_id uuid,
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
  v_tour public.tours%rowtype;
  v_existing public.tour_registrations%rowtype;
  v_existing_found boolean;
  v_confirmed_count integer;
  v_new_status text;
  v_registration_id uuid;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.status not in ('published', 'registration_closed') then
    return ('TOUR_NOT_OPEN', null, null)::public.registration_result;
  end if;

  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
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

  select * into v_existing
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = p_user_id;
  v_existing_found := found;

  if v_existing_found and v_existing.status not in ('cancelled', 'rejected') then
    return ('ALREADY_REGISTERED', v_existing.status, v_existing.id)::public.registration_result;
  end if;

  select count(*) into v_confirmed_count
  from public.tour_registrations
  where tour_id = p_tour_id and status = 'confirmed';

  v_new_status := case when v_confirmed_count < v_tour.max_vehicles then 'confirmed' else 'waitlisted' end;

  if v_existing_found then
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
      confirmed_by = case when v_new_status = 'confirmed' then auth.uid() else null end,
      waitlisted_at = case when v_new_status = 'waitlisted' then now() else null end,
      cancelled_at = null,
      rejected_at = null,
      rejected_by = null,
      rejection_reason = null
    where id = v_existing.id
    returning id into v_registration_id;
  else
    insert into public.tour_registrations (
      tour_id, user_id, status,
      vehicle_manufacturer, vehicle_model, vehicle_power_ps, license_plate,
      passenger_count,
      confirmed_at, confirmed_by, waitlisted_at
    ) values (
      p_tour_id, p_user_id, v_new_status,
      trim(p_vehicle_manufacturer), trim(p_vehicle_model), p_vehicle_power_ps,
      nullif(trim(p_license_plate), ''),
      p_passenger_count,
      case when v_new_status = 'confirmed' then now() else null end,
      case when v_new_status = 'confirmed' then auth.uid() else null end,
      case when v_new_status = 'waitlisted' then now() else null end
    )
    returning id into v_registration_id;
  end if;

  return (
    case v_new_status when 'confirmed' then 'CONFIRMED' else 'WAITLISTED' end,
    v_new_status,
    v_registration_id
  )::public.registration_result;
end;
$$;

revoke all on function public.admin_add_registration(uuid, uuid, text, text, integer, text, integer) from public;
grant execute on function public.admin_add_registration(uuid, uuid, text, text, integer, text, integer) to authenticated;


-- 3. admin_cancel_tour: bisher wurde nur der bereits abgesagte Zustand
--    ausgeschlossen. Dadurch ließ sich auch eine `completed`/`archived` Tour
--    nachträglich in `cancelled` überführen (verfälscht die Historie und
--    benachrichtigt ehemalige Teilnehmer erneut) und eine `draft`-Tour direkt
--    in einen öffentlich sichtbaren Zustand (`tour_is_visible` gibt `cancelled`
--    bis `start_date` frei) versetzen, ohne je veröffentlicht gewesen zu sein.
--    Eine Absage ist fachlich nur für eine tatsächlich laufende Anmeldephase
--    sinnvoll — auf `published`/`registration_closed` beschränkt.
create or replace function public.admin_cancel_tour(p_tour_id uuid, p_reason text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
  v_body text;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.status not in ('published', 'registration_closed') then
    return ('TOUR_NOT_OPEN', v_tour.status, null)::public.registration_result;
  end if;

  update public.tours
  set status = 'cancelled', updated_at = now()
  where id = p_tour_id;

  v_body := 'Die Ausfahrt "' || v_tour.title || '" wurde abgesagt.'
    || case
         when coalesce(trim(p_reason), '') = '' then ''
         else ' ' || trim(p_reason)
       end;

  -- Alle, die noch eine offene Beziehung zur Tour haben — auch pending und
  -- waitlisted, denn auch deren Planung hängt an dieser Ausfahrt.
  insert into public.notifications (user_id, tour_id, type, title, body, target_path)
  select tr.user_id, p_tour_id, 'TOUR_CANCELLED', 'Ausfahrt abgesagt', v_body, '/tours/' || v_tour.slug
  from public.tour_registrations tr
  where tr.tour_id = p_tour_id
    and tr.status in ('confirmed', 'pending', 'waitlisted');

  return ('OK', 'cancelled', null)::public.registration_result;
end;
$$;

revoke all on function public.admin_cancel_tour(uuid, text) from public;
grant execute on function public.admin_cancel_tour(uuid, text) to authenticated;
