-- Phase 14 — Zeitgesteuerter Check-in am Treffpunkt (siehe CLAUDE.md §34.3).

alter table public.tours
  add column check_in_enabled boolean not null default false,
  add column check_in_open_minutes_before integer not null default 30
    check (check_in_open_minutes_before >= 0),
  add column check_in_close_minutes_after integer not null default 15
    check (check_in_close_minutes_after >= 0);

alter table public.tour_registrations
  add column checked_in_at timestamptz null,
  add column checked_in_by uuid null references auth.users(id) on delete set null;

-- Self-Check-in für bestätigte Teilnehmer. Prüft serverseitig Zeitfenster
-- und Berechtigung; checked_in_at wird ausschließlich mit now() gesetzt,
-- nie mit einem clientseitigen Zeitstempel (§34.3 Punkt 8).
create or replace function public.check_in_to_tour(p_tour_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tour record;
  v_reg record;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
begin
  if v_me is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if not v_tour.check_in_enabled then
    return ('CHECK_IN_NOT_ENABLED', null, null)::public.registration_result;
  end if;

  if v_tour.meeting_at is null then
    return ('MEETING_TIME_NOT_SET', null, null)::public.registration_result;
  end if;

  select * into v_reg
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = v_me and status = 'confirmed'
  for update;

  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_reg.checked_in_at is not null then
    return ('ALREADY_CHECKED_IN', null, null)::public.registration_result;
  end if;

  v_opens_at := v_tour.meeting_at - make_interval(mins => v_tour.check_in_open_minutes_before);
  v_closes_at := v_tour.meeting_at + make_interval(mins => v_tour.check_in_close_minutes_after);

  if now() < v_opens_at then
    return ('CHECK_IN_NOT_OPEN', null, null)::public.registration_result;
  end if;

  if now() > v_closes_at then
    return ('CHECK_IN_CLOSED', null, null)::public.registration_result;
  end if;

  update public.tour_registrations
  set checked_in_at = now(), checked_in_by = v_me, updated_at = now()
  where id = v_reg.id;

  return ('OK', 'confirmed', v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.check_in_to_tour(uuid) from public;
grant execute on function public.check_in_to_tour(uuid) to authenticated;

-- Admin darf einen bestätigten Teilnehmer auch außerhalb des
-- Self-Check-in-Fensters manuell als angekommen markieren bzw. den
-- Check-in organisatorisch korrigieren (§34.3 Admin-UX).
create or replace function public.admin_set_checked_in(p_registration_id uuid, p_checked_in boolean)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_reg from public.tour_registrations where id = p_registration_id for update;
  if not found then
    return ('REGISTRATION_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if p_checked_in then
    update public.tour_registrations
    set checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
    where id = p_registration_id;
  else
    update public.tour_registrations
    set checked_in_at = null, checked_in_by = null, updated_at = now()
    where id = p_registration_id;
  end if;

  return ('OK', v_reg.status, v_reg.id)::public.registration_result;
end;
$$;

revoke all on function public.admin_set_checked_in(uuid, boolean) from public;
grant execute on function public.admin_set_checked_in(uuid, boolean) to authenticated;
