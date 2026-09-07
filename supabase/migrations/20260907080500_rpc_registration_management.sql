-- Admin-Bestätigung/-Ablehnung, Stornierung und Wartelisten-Nachrücklogik
-- (siehe CLAUDE.md §9.4, §9.5, §9.7). Alle Funktionen sperren die betroffene
-- tours-Zeile, damit die Kapazitätsprüfung niemals durch parallele Aktionen
-- umgangen werden kann.

create or replace function public.approve_tour_registration(p_registration_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reg public.tour_registrations%rowtype;
  v_tour public.tours%rowtype;
  v_confirmed_count integer;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = v_reg.tour_id for update;

  if v_reg.status <> 'pending' then
    return ('REGISTRATION_NOT_PENDING', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  select count(*) into v_confirmed_count
  from public.tour_registrations
  where tour_id = v_tour.id and status = 'confirmed';

  if v_confirmed_count >= v_tour.max_vehicles then
    return ('TOUR_FULL', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  update public.tour_registrations
  set status = 'confirmed', confirmed_at = now(), confirmed_by = v_admin_id, updated_at = now()
  where id = v_reg.id;

  -- Wird mit dieser Bestätigung der letzte freie Platz belegt, verbleibende
  -- pending-Registrierungen dieser Tour sauber in waitlisted überführen (§9.4).
  if v_confirmed_count + 1 >= v_tour.max_vehicles then
    update public.tour_registrations
    set status = 'waitlisted', waitlisted_at = now(), updated_at = now()
    where tour_id = v_tour.id and status = 'pending';
  end if;

  return ('CONFIRMED', 'confirmed', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.approve_tour_registration(uuid) from public;
grant execute on function public.approve_tour_registration(uuid) to authenticated;


create or replace function public.reject_tour_registration(p_registration_id uuid, p_reason text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reg public.tour_registrations%rowtype;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id for update;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_reg.status not in ('pending', 'waitlisted') then
    return ('REGISTRATION_NOT_PENDING', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  update public.tour_registrations
  set status = 'rejected', rejected_at = now(), rejected_by = v_admin_id, rejection_reason = p_reason, updated_at = now()
  where id = v_reg.id;

  return ('REJECTED', 'rejected', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.reject_tour_registration(uuid, text) from public;
grant execute on function public.reject_tour_registration(uuid, text) to authenticated;


-- Rückt bei einem frei werdenden Platz genau einen berechtigten Wartelisteneintrag
-- nach (§9.5). Wird von cancel_tour_registration und der Admin-Teilnehmerverwaltung
-- (administrative Entfernung eines bestätigten Teilnehmers) genutzt.
create or replace function public.promote_next_waitlisted(p_tour_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
  v_next public.tour_registrations%rowtype;
begin
  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    return;
  end if;

  select * into v_next
  from public.tour_registrations
  where tour_id = p_tour_id and status = 'waitlisted'
  order by registered_at asc, id asc
  limit 1;

  if not found then
    return;
  end if;

  if v_tour.confirmation_mode = 'automatic' then
    update public.tour_registrations
    set status = 'confirmed', confirmed_at = now(), confirmed_by = null, waitlisted_at = null, updated_at = now()
    where id = v_next.id;
  else
    update public.tour_registrations
    set status = 'pending', waitlisted_at = null, updated_at = now()
    where id = v_next.id;
  end if;
end;
$$;

revoke all on function public.promote_next_waitlisted(uuid) from public;
grant execute on function public.promote_next_waitlisted(uuid) to authenticated;


create or replace function public.cancel_tour_registration(p_tour_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reg public.tour_registrations%rowtype;
  v_was_confirmed boolean;
begin
  if v_user_id is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  -- Tour sperren, bevor der Status geändert wird, damit die anschließende
  -- Nachrücklogik konsistent mit gleichzeitigen Anmeldungen bleibt.
  perform 1 from public.tours where id = p_tour_id for update;

  select * into v_reg
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = v_user_id;

  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_reg.status in ('cancelled', 'rejected') then
    return ('ALREADY_CANCELLED', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  v_was_confirmed := v_reg.status = 'confirmed';

  update public.tour_registrations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = v_reg.id;

  if v_was_confirmed then
    perform public.promote_next_waitlisted(p_tour_id);
  end if;

  return ('CANCELLED', 'cancelled', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.cancel_tour_registration(uuid) from public;
grant execute on function public.cancel_tour_registration(uuid) to authenticated;


-- Personenzahl bis zur Admin-Deadline änderbar (§9.8).
create or replace function public.update_passenger_count(p_tour_id uuid, p_passenger_count integer)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reg public.tour_registrations%rowtype;
  v_tour public.tours%rowtype;
begin
  if v_user_id is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  if p_passenger_count is null or p_passenger_count < 0 then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  select * into v_reg
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = v_user_id;

  if not found or v_reg.status in ('cancelled', 'rejected') then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.passenger_edit_deadline_at is not null and now() > v_tour.passenger_edit_deadline_at then
    return ('PASSENGER_EDIT_DEADLINE_PASSED', v_reg.status, v_reg.id)::public.registration_result;
  end if;

  update public.tour_registrations
  set passenger_count = p_passenger_count, updated_at = now()
  where id = v_reg.id;

  return ('OK', v_reg.status, v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.update_passenger_count(uuid, integer) from public;
grant execute on function public.update_passenger_count(uuid, integer) to authenticated;


-- Admin darf die Personenzahl unabhängig von der Deadline korrigieren (§9.8, letzter Satz).
create or replace function public.admin_update_passenger_count(p_registration_id uuid, p_passenger_count integer)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.tour_registrations%rowtype;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if p_passenger_count is null or p_passenger_count < 0 then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  update public.tour_registrations
  set passenger_count = p_passenger_count, updated_at = now()
  where id = v_reg.id;

  return ('OK', v_reg.status, v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.admin_update_passenger_count(uuid, integer) from public;
grant execute on function public.admin_update_passenger_count(uuid, integer) to authenticated;


-- Admin entfernt einen bestätigten Teilnehmer administrativ (§5 Admin-Rechte).
-- Löst dieselbe Nachrücklogik aus wie eine reguläre Stornierung.
create or replace function public.admin_remove_registration(p_registration_id uuid, p_reason text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.tour_registrations%rowtype;
  v_was_confirmed boolean;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  perform 1 from public.tours where id = v_reg.tour_id for update;

  v_was_confirmed := v_reg.status = 'confirmed';

  update public.tour_registrations
  set status = 'cancelled', cancelled_at = now(), rejection_reason = p_reason, updated_at = now()
  where id = v_reg.id;

  if v_was_confirmed then
    perform public.promote_next_waitlisted(v_reg.tour_id);
  end if;

  return ('CANCELLED', 'cancelled', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.admin_remove_registration(uuid, text) from public;
grant execute on function public.admin_remove_registration(uuid, text) to authenticated;


-- Änderung der maximalen Fahrzeugzahl inkl. Nachrücken bei Kapazitätserhöhung (§9.6).
create or replace function public.admin_update_max_vehicles(p_tour_id uuid, p_max_vehicles integer)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
  v_confirmed_count integer;
  v_free_slots integer;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if p_max_vehicles is null or p_max_vehicles <= 0 then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  select count(*) into v_confirmed_count
  from public.tour_registrations
  where tour_id = p_tour_id and status = 'confirmed';

  -- Niemals unter die Anzahl bereits bestätigter Fahrzeuge reduzieren.
  if p_max_vehicles < v_confirmed_count then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  update public.tours set max_vehicles = p_max_vehicles, updated_at = now() where id = p_tour_id;

  v_free_slots := p_max_vehicles - v_confirmed_count;

  while v_free_slots > 0 loop
    exit when not exists (
      select 1 from public.tour_registrations where tour_id = p_tour_id and status = 'waitlisted'
    );
    perform public.promote_next_waitlisted(p_tour_id);
    v_free_slots := v_free_slots - 1;
  end loop;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_update_max_vehicles(uuid, integer) from public;
grant execute on function public.admin_update_max_vehicles(uuid, integer) to authenticated;
