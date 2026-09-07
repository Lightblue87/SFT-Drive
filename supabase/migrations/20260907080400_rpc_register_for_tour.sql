-- Sichere, atomare Touranmeldung (siehe CLAUDE.md §9.2). Die gesamte Kapazitäts-
-- prüfung läuft innerhalb einer Transaktion, während die betroffene tours-Zeile per
-- `SELECT ... FOR UPDATE` gesperrt ist — parallele Anmeldungen werden dadurch
-- serialisiert und können max_vehicles niemals überschreiten (§9.1/§9.3).

create type public.registration_result as (
  code text,
  status text,
  registration_id uuid
);

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

  -- Tour sperren, um die Kapazitätsprüfung dieser Anmeldung zu serialisieren.
  select * into v_tour from public.tours where id = p_tour_id for update;

  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.status not in ('published', 'registration_closed') then
    return ('TOUR_NOT_OPEN', null, null)::public.registration_result;
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
