-- Tour-Lebenszyklus (siehe CLAUDE.md §8.3 "Lebenszyklus der Tourstatus").
--
-- Bisher gab die RLS ausschließlich `status = 'published'` frei. Sobald eine
-- Tour also auf `registration_closed`, `completed` oder `cancelled` wechselte,
-- verschwand sie schlagartig komplett — auch für bereits angemeldete
-- Teilnehmer, aus "Meine Touren" und aus der Tourdetailseite. Das war nicht
-- gewollt: eine geschlossene oder abgeschlossene Ausfahrt bleibt sichtbar,
-- lediglich die Anmeldung ist nicht mehr möglich.
--
-- Diese Migration ergänzt deshalb:
--   1. eine gemeinsame Sichtbarkeitsregel für alle drei betroffenen Stellen,
--   2. automatische Statusübergänge (Anmeldeschluss / Tour vorbei / abgesagte
--      Tour nach ihrem Starttag), zeitgesteuert per pg_cron,
--   3. eine kontrollierte Absage-RPC, die die betroffenen Teilnehmer über die
--      bestehende Notification-Infrastruktur informiert,
--   4. eine Admin-RPC, um auch nach Anmeldeschluss noch jemanden nachzutragen.


-- 1. Gemeinsame Sichtbarkeitsregel ------------------------------------------
--
-- `draft` bleibt unsichtbar (§8.3), `archived` ebenfalls (§8.3 "Archived-Touren
-- sind standardmäßig nicht in der normalen Tourübersicht sichtbar"). Eine
-- abgesagte Tour bleibt bis einschließlich ihres Starttags sichtbar, damit
-- angemeldete Teilnehmer die Absage auch in der App nachvollziehen können,
-- und verschwindet danach (der Lifecycle-Job unten archiviert sie zusätzlich,
-- sodass sie auch aus der Adminliste herauswandert, ohne Daten zu löschen).
create or replace function public.tour_is_visible(p_status text, p_start_date date)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    p_status in ('published', 'registration_closed', 'completed')
    or (p_status = 'cancelled' and p_start_date >= current_date);
$$;

grant execute on function public.tour_is_visible(text, date) to anon, authenticated;

drop policy "tours_select_published_or_admin" on public.tours;

create policy "tours_select_visible_or_admin"
  on public.tours for select
  using (public.tour_is_visible(status, start_date) or public.is_admin());

drop policy "tour_member_details_select_authenticated" on public.tour_member_details;

create policy "tour_member_details_select_authenticated"
  on public.tour_member_details for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tours t
      where t.id = tour_member_details.tour_id
        and public.tour_is_visible(t.status, t.start_date)
    )
  );

-- Kapazitätsdaten (§8.10) müssen derselben Sichtbarkeit folgen, sonst zeigt
-- eine sichtbare Tour plötzlich keine Fahrzeugzahlen mehr.
create or replace function public.get_public_tour_stats(p_tour_id uuid)
returns table (
  max_vehicles integer,
  confirmed_vehicles integer,
  free_vehicle_slots integer,
  is_full boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.max_vehicles,
    coalesce(r.confirmed_count, 0)::integer as confirmed_vehicles,
    (t.max_vehicles - coalesce(r.confirmed_count, 0))::integer as free_vehicle_slots,
    coalesce(r.confirmed_count, 0) >= t.max_vehicles as is_full
  from public.tours t
  left join (
    select tour_id, count(*) as confirmed_count
    from public.tour_registrations
    where tour_id = p_tour_id and status = 'confirmed'
    group by tour_id
  ) r on r.tour_id = t.id
  where t.id = p_tour_id
    and (public.tour_is_visible(t.status, t.start_date) or public.is_admin());
$$;

revoke all on function public.get_public_tour_stats(uuid) from public;
grant execute on function public.get_public_tour_stats(uuid) to anon, authenticated;


-- 2. Automatische Statusübergänge -------------------------------------------
--
-- Bewusst rein datengetrieben und idempotent: die Funktion kann beliebig oft
-- laufen, ohne etwas doppelt zu tun, und braucht keinen Zustand außerhalb der
-- tours-Tabelle. Manuelle Statuswerte (`draft`, `cancelled`, `archived`)
-- werden nie automatisch überschrieben — eine Absage bleibt eine Absage.
create or replace function public.apply_tour_lifecycle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed integer := 0;
  v_count integer;
begin
  -- Anmeldezeitraum vorbei -> registration_closed (Tour bleibt sichtbar).
  update public.tours
  set status = 'registration_closed', updated_at = now()
  where status = 'published'
    and registration_close_at is not null
    and registration_close_at < now()
    and end_date >= current_date;
  get diagnostics v_count = row_count;
  v_changed := v_changed + v_count;

  -- Letzter Tourtag vorbei -> completed.
  update public.tours
  set status = 'completed', updated_at = now()
  where status in ('published', 'registration_closed')
    and end_date < current_date;
  get diagnostics v_count = row_count;
  v_changed := v_changed + v_count;

  -- Abgesagte Tour nach ihrem Starttag -> archived. Damit verschwindet sie aus
  -- allen normalen Ansichten (§8.3), ohne dass historische Daten gelöscht
  -- werden — ein Löschen wäre nicht umkehrbar und würde §23.14 verletzen.
  update public.tours
  set status = 'archived', updated_at = now()
  where status = 'cancelled'
    and start_date < current_date;
  get diagnostics v_count = row_count;
  v_changed := v_changed + v_count;

  return v_changed;
end;
$$;

revoke all on function public.apply_tour_lifecycle() from public;

-- Zeitsteuerung über pg_cron (im Projekt bereits für die beiden
-- Notification-Jobs im Einsatz, siehe CLAUDE.md "Aktueller Deployment-Stand").
-- Anders als dort wird hier kein Service-Role-Key benötigt, weil reines SQL
-- läuft und keine Edge Function aufgerufen wird — der Job kann deshalb direkt
-- in dieser Migration angelegt werden.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('sft-drive-tour-lifecycle')
    where exists (select 1 from cron.job where jobname = 'sft-drive-tour-lifecycle');

    perform cron.schedule(
      'sft-drive-tour-lifecycle',
      '*/15 * * * *',
      $job$select public.apply_tour_lifecycle()$job$
    );
  else
    raise notice 'pg_cron nicht installiert — apply_tour_lifecycle() muss manuell eingeplant werden.';
  end if;
end;
$$;

-- Einmalig für den bestehenden Datenbestand nachziehen.
select public.apply_tour_lifecycle();


-- 3. Tour absagen ------------------------------------------------------------
--
-- Absage ausschließlich manuell durch den Admin (§8.3). Die betroffenen
-- Teilnehmer werden über die bestehende notifications-Tabelle informiert; der
-- zusätzliche Web-Push wird wie bei allen anderen Admin-Mitteilungen vom
-- Client über die vorhandene Edge Function `send-push` ausgelöst (§27.16),
-- hier wird bewusst keine zweite Zustellinfrastruktur gebaut.
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

  if v_tour.status = 'cancelled' then
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


-- 4. Teilnehmer administrativ nachtragen -------------------------------------
--
-- Nach Anmeldeschluss soll ausschließlich der Admin noch jemanden aufnehmen
-- können. Die Kapazitätsprüfung wird dabei ausdrücklich NICHT umgangen
-- (§12 "Eine manuelle Admin-Bestätigung darf die Kapazitätsprüfung niemals
-- umgehen") — ist die Tour voll, landet der Eintrag auf der Warteliste.
-- Bewusst übergangen werden lediglich Anmeldefenster sowie Leistungs-/
-- Altersanforderungen: das ist genau die Ausnahmeentscheidung, die der Admin
-- hier trifft.
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
