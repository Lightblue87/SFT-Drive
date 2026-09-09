-- Admin-Zugriff auf die Fahrzeuggarage eines Nutzers (siehe CLAUDE.md §34.2,
-- §8.3 "Teilnehmer administrativ nachtragen").
--
-- Trägt ein Admin über admin_add_registration() einen Teilnehmer nach, kennt
-- er dessen Fahrzeugdaten normalerweise nicht — die RLS auf `vehicles`
-- ("vehicles_own") lässt ihn dort aber nichts lesen. Diese RPC gibt gezielt
-- die Garage eines einzelnen Users aus, damit das Admin-Formular das
-- Standardfahrzeug vorbefüllen kann; der Teilnehmer kann sein Fahrzeug in
-- der Tour danach selbst ändern, sofern es den Anforderungen entspricht.
create or replace function public.admin_get_user_vehicles(p_user_id uuid)
returns setof public.vehicles
language sql
stable
security definer
set search_path = public
as $$
  select v.*
  from public.vehicles v
  where public.is_admin()
    and v.user_id = p_user_id
  order by v.is_default desc, v.manufacturer asc;
$$;

revoke all on function public.admin_get_user_vehicles(uuid) from public;
grant execute on function public.admin_get_user_vehicles(uuid) to authenticated;
