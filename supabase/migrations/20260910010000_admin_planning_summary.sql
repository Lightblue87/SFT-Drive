-- Shared read-only administration summary for the PWA and native client.
create or replace function public.admin_get_tour_planning_summary(p_tour_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists(select 1 from public.tours where id = p_tour_id) then
    raise exception 'TOUR_NOT_FOUND' using errcode = 'P0002';
  end if;
  with t as (select * from public.tours where id = p_tour_id),
  confirmed as (select * from public.tour_registrations where tour_id = p_tour_id and status = 'confirmed'),
  nights as (
    select t.start_date + n as night_date from t,
    lateral generate_series(0, (t.end_date - t.start_date) - 1) n
  ),
  night_counts as (
    select n.night_date, count(c.user_id) as confirmed
    from nights n left join (
      select a.night_date, a.user_id from public.tour_accommodation_confirmations a
      join confirmed c on c.user_id = a.user_id where a.tour_id = p_tour_id
    ) c on c.night_date = n.night_date group by n.night_date
  ),
  restaurants as (
    select s.id, s.title from public.tour_stops s
    join public.restaurant_stop_settings rs on rs.tour_stop_id = s.id and rs.ordering_enabled
    where s.tour_id = p_tour_id and s.type = 'restaurant'
  ),
  orders as (
    select o.* from public.meal_orders o join confirmed c on c.id = o.registration_id
    join restaurants r on r.id = o.restaurant_stop_id where o.status = 'submitted'
  ),
  restaurant_counts as (
    select r.id, r.title,
      (select count(*) from orders o where o.restaurant_stop_id = r.id) as orders,
      (select coalesce(sum(i.quantity),0) from public.meal_order_items i join orders o on o.id = i.meal_order_id where o.restaurant_stop_id = r.id) as dishes
    from restaurants r
  )
  select jsonb_build_object(
    'confirmed_vehicles', (select count(*) from confirmed),
    'people', (select coalesce(sum(1 + passenger_count),0) from confirmed),
    'checked_in', (select count(*) from confirmed where checked_in_at is not null),
    'waitlisted', (select count(*) from public.tour_registrations where tour_id = p_tour_id and status = 'waitlisted'),
    'pending', (select count(*) from public.tour_registrations where tour_id = p_tour_id and status = 'pending'),
    'interests', (select count(*) from public.tour_interests where tour_id = p_tour_id),
    'all_nights_confirmed', case when exists(select 1 from nights) then
      (select count(*) from confirmed c where not exists(
        select 1 from nights n where not exists(
          select 1 from public.tour_accommodation_confirmations a
          where a.tour_id = p_tour_id and a.user_id = c.user_id and a.night_date = n.night_date
        )
      )) else null end,
    'nights', coalesce((select jsonb_agg(to_jsonb(n) order by night_date) from night_counts n), '[]'::jsonb),
    'restaurants', coalesce((select jsonb_agg(to_jsonb(r) order by title, id) from restaurant_counts r), '[]'::jsonb),
    'calculated_at', statement_timestamp()
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_get_tour_planning_summary(uuid) from public, anon;
grant execute on function public.admin_get_tour_planning_summary(uuid) to authenticated;
