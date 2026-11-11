-- Ergänzt die Teilnehmer-Fahrzeugliste um die Möglichkeit, aus der
-- Tourteilnehmerliste heraus eine Freundschaftsanfrage zu senden (§34.1,
-- §11). Bisher war das nur über die separate Username-Suche unter
-- /profile/friends möglich, obwohl bestätigte Teilnehmer sich in der
-- gemeinsamen Tour bereits über get_confirmed_tour_vehicles sehen.
--
-- get_confirmed_tour_vehicles() bekommt zwei zusätzliche Spalten:
--   user_id            -- nötig als Ziel für send_friend_request(p_addressee_id)
--   friendship_status  -- 'self' | 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted'
-- Beides sind keine zusätzlichen privaten Daten im Sinne von §8.9 (dort
-- ausdrücklich verboten sind first_name/last_name/email/license_plate/
-- date_of_birth/passenger_count) -- user_id ist eine bloße Kennung ohne
-- Aussagekraft, friendship_status ist bereits heute aus der eigenen Sicht
-- über list_my_friendships() einsehbar. Rückgabetyp hat sich geändert ->
-- drop vor create or replace nötig (§8.12 Praxis-Falle).
drop function if exists public.get_confirmed_tour_vehicles(uuid);

create or replace function public.get_confirmed_tour_vehicles(p_tour_id uuid)
returns table (
  registration_id uuid,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  vehicle_manufacturer text,
  vehicle_model text,
  vehicle_power_ps integer,
  is_self boolean,
  friendship_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = p_tour_id and r.user_id = v_me and r.status = 'confirmed'
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id as registration_id,
    r.user_id,
    p.username,
    case when public.are_friends(v_me, r.user_id) then p.first_name else null end,
    case when public.are_friends(v_me, r.user_id) then p.last_name else null end,
    r.vehicle_manufacturer,
    r.vehicle_model,
    r.vehicle_power_ps,
    r.user_id = v_me as is_self,
    case
      when r.user_id = v_me then 'self'
      when f.status = 'accepted' then 'accepted'
      when f.status = 'pending' and f.requester_id = v_me then 'pending_outgoing'
      when f.status = 'pending' and f.requester_id = r.user_id then 'pending_incoming'
      else 'none'
    end as friendship_status
  from public.tour_registrations r
  join public.profiles p on p.id = r.user_id
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(v_me, r.user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_me, r.user_id)
  where r.tour_id = p_tour_id and r.status = 'confirmed'
  order by r.registered_at asc;
end;
$$;

revoke all on function public.get_confirmed_tour_vehicles(uuid) from public;
grant execute on function public.get_confirmed_tour_vehicles(uuid) to authenticated;
