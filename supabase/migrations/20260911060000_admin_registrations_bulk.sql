-- Bündelt tour_registrations mehrerer Touren in einem einzigen Request
-- (§4 N+1-Regel für Dashboard-/Planungsansichten). Ersetzt in der Mac-App
-- ausschließlich die zuvor per-Tour-Loop laufenden Drilldowns
-- "Teilnehmer" und "Bestätigte Fahrzeuge" im Dashboard
-- (DashboardModel.loadAllRegistrations) durch einen gebündelten Abruf --
-- keine neuen Berechtigungen, dieselbe RLS-Grenze wie das bisherige
-- Direkt-select auf tour_registrations (nur Admins).
create or replace function public.admin_get_registrations_bulk(p_tour_ids uuid[])
returns setof public.tour_registrations
language plpgsql stable security invoker set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select * from public.tour_registrations
    where tour_id = any(coalesce(p_tour_ids, '{}'::uuid[]))
    order by tour_id, registered_at;
end;
$$;

revoke all on function public.admin_get_registrations_bulk(uuid[]) from public, anon;
grant execute on function public.admin_get_registrations_bulk(uuid[]) to authenticated;
