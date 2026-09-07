-- Datensparsame, kontrollierte Ausgabe-RPCs (siehe CLAUDE.md §8.9, §8.10, §8.8).
-- Diese Funktionen existieren, damit niemals eine breite SELECT-Policy auf
-- tour_registrations nötig ist, über die fremde Klarnamen/Kennzeichen/Personenzahlen
-- ausgelesen werden könnten.

-- Öffentliche Kapazitätsdaten, ohne Zugriff auf Teilnehmerdaten (§8.10).
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
    and (t.status = 'published' or public.is_admin());
$$;

revoke all on function public.get_public_tour_stats(uuid) from public;
grant execute on function public.get_public_tour_stats(uuid) to anon, authenticated;


-- Sichere Fahrzeugliste für bestätigte Teilnehmer (§8.9). Liefert ausdrücklich
-- keine Klarnamen, Kennzeichen, Geburtsdaten oder Personenzahlen.
create or replace function public.get_confirmed_tour_vehicles(p_tour_id uuid)
returns table (
  registration_id uuid,
  username text,
  vehicle_manufacturer text,
  vehicle_model text,
  vehicle_power_ps integer,
  is_self boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = p_tour_id and r.user_id = auth.uid() and r.status = 'confirmed'
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id as registration_id,
    p.username,
    r.vehicle_manufacturer,
    r.vehicle_model,
    r.vehicle_power_ps,
    r.user_id = auth.uid() as is_self
  from public.tour_registrations r
  join public.profiles p on p.id = r.user_id
  where r.tour_id = p_tour_id and r.status = 'confirmed'
  order by r.registered_at asc;
end;
$$;

revoke all on function public.get_confirmed_tour_vehicles(uuid) from public;
grant execute on function public.get_confirmed_tour_vehicles(uuid) to authenticated;


-- Persönliches Tourenarchiv (§8.8). Verwendet ausschließlich auth.uid() — akzeptiert
-- keine fremde user_id als Berechtigungsnachweis.
create or replace function public.get_my_tour_archive()
returns table (
  tour_id uuid,
  tour_slug text,
  tour_title text,
  cover_image_url text,
  start_date date,
  end_date date,
  region text,
  route_length_km numeric,
  vehicle_manufacturer text,
  vehicle_model text,
  vehicle_power_ps integer,
  passenger_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id as tour_id,
    t.slug as tour_slug,
    t.title as tour_title,
    t.cover_image_url,
    t.start_date,
    t.end_date,
    t.region,
    t.route_length_km,
    r.vehicle_manufacturer,
    r.vehicle_model,
    r.vehicle_power_ps,
    r.passenger_count
  from public.tour_registrations r
  join public.tours t on t.id = r.tour_id
  where r.user_id = auth.uid()
    and r.status = 'confirmed'
    and t.end_date < current_date
  order by t.end_date desc;
$$;

revoke all on function public.get_my_tour_archive() from public;
grant execute on function public.get_my_tour_archive() to authenticated;
