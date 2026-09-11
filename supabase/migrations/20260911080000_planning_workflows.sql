-- Zielarchitektur §36/§38: vollständige Hotelvorschläge, optionale
-- Unterkunftsauswahl und gebündelte Teilnehmermatrix. Rein additiv.

alter table public.tour_hotel_suggestions
  add column hotel_url text null,
  add column booking_url text null,
  add column price_unit text null,
  add column room_type text null,
  add column breakfast_details text null,
  add column parking_details text null,
  add column cancellation_terms text null,
  add column allotment_details text null,
  add column contact text null,
  add constraint tour_hotel_price_unit_chk check (price_unit is null or price_per_night is not null);

alter table public.tour_stops
  add column reservation_people integer null check (reservation_people is null or reservation_people > 0),
  add column reservation_contact text null,
  add column reservation_status text null check (reservation_status is null or reservation_status in ('planned','requested','confirmed','cancelled'));

alter table public.tour_accommodation_confirmations
  add column accommodation_choice text null,
  add column hotel_suggestion_id uuid null references public.tour_hotel_suggestions(id) on delete set null,
  add constraint tour_accommodation_choice_chk check (
    accommodation_choice is null or accommodation_choice in ('suggested_hotel', 'other_accommodation')
  ),
  add constraint tour_accommodation_choice_pair_chk check (
    (accommodation_choice = 'suggested_hotel' and hotel_suggestion_id is not null)
    or (accommodation_choice = 'other_accommodation' and hotel_suggestion_id is null)
    or (accommodation_choice is null and hotel_suggestion_id is null)
  );

create or replace function public.set_accommodation_choice(
  p_tour_id uuid,
  p_night_date date,
  p_confirmed boolean,
  p_choice text default null,
  p_hotel_suggestion_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tour public.tours%rowtype;
begin
  if v_user_id is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  select * into v_tour from public.tours where id=p_tour_id;
  if not found then raise exception 'TOUR_NOT_FOUND'; end if;
  if v_tour.end_date <= v_tour.start_date then raise exception 'NOT_MULTIDAY_TOUR'; end if;
  if p_night_date < v_tour.start_date or p_night_date >= v_tour.end_date then raise exception 'INVALID_NIGHT_DATE'; end if;
  if not exists(select 1 from public.tour_registrations where tour_id=p_tour_id and user_id=v_user_id and status='confirmed') then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode='42501';
  end if;
  if not p_confirmed then
    delete from public.tour_accommodation_confirmations where tour_id=p_tour_id and user_id=v_user_id and night_date=p_night_date;
    return jsonb_build_object('code','OK');
  end if;
  if p_choice not in ('suggested_hotel','other_accommodation') then raise exception 'INVALID_ACCOMMODATION_CHOICE'; end if;
  if p_choice='other_accommodation' and p_hotel_suggestion_id is not null then raise exception 'INVALID_ACCOMMODATION_CHOICE'; end if;
  if p_choice='suggested_hotel' and not exists(
    select 1 from public.tour_hotel_suggestions h where h.id=p_hotel_suggestion_id and h.tour_id=p_tour_id
      and h.night_date <= p_night_date and coalesce(h.night_date_end,h.night_date) >= p_night_date
  ) then raise exception 'INVALID_HOTEL_SUGGESTION'; end if;
  insert into public.tour_accommodation_confirmations(tour_id,user_id,night_date,confirmed_at,accommodation_choice,hotel_suggestion_id)
  values(p_tour_id,v_user_id,p_night_date,now(),p_choice,p_hotel_suggestion_id)
  on conflict(tour_id,user_id,night_date) do update set confirmed_at=now(), accommodation_choice=excluded.accommodation_choice,
    hotel_suggestion_id=excluded.hotel_suggestion_id;
  return jsonb_build_object('code','OK');
end;
$$;
revoke all on function public.set_accommodation_choice(uuid,date,boolean,text,uuid) from public,anon;
grant execute on function public.set_accommodation_choice(uuid,date,boolean,text,uuid) to authenticated;

create or replace function public.admin_get_participant_matrix_bulk(p_tour_ids uuid[])
returns jsonb language plpgsql security invoker set search_path=public
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if coalesce(cardinality(p_tour_ids),0)=0 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'tour_id',r.tour_id,'user_id',r.user_id,'username',coalesce(p.username,''),
    'vehicle',trim(r.vehicle_manufacturer||' '||r.vehicle_model),'persons',1+r.passenger_count,
    'status',r.status,'checked_in_at',r.checked_in_at,
    'accommodation',coalesce((select jsonb_agg(jsonb_build_object(
      'night_date',n::date,'confirmed',c.id is not null,'choice',c.accommodation_choice,
      'hotel_suggestion_id',c.hotel_suggestion_id,'hotel_name',h.name) order by n)
      from generate_series(t.start_date::timestamp,(t.end_date-1)::timestamp,interval '1 day') n
      left join public.tour_accommodation_confirmations c on c.tour_id=r.tour_id and c.user_id=r.user_id and c.night_date=n::date
      left join public.tour_hotel_suggestions h on h.id=c.hotel_suggestion_id
      where t.end_date>t.start_date),'[]'::jsonb),
    'restaurants',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'title',s.title,'starts_at',s.starts_at,'ordered',o.id is not null) order by s.starts_at nulls last,s.sort_order)
      from public.tour_stops s left join public.meal_orders o on o.restaurant_stop_id=s.id and o.registration_id=r.id and o.status='submitted'
      where s.tour_id=r.tour_id and s.type='restaurant'),'[]'::jsonb)
  ) order by t.start_date,p.username,r.registered_at),'[]'::jsonb) into result
  from public.tour_registrations r
  join public.tours t on t.id=r.tour_id
  left join public.profiles p on p.id=r.user_id
  where r.tour_id=any(p_tour_ids) and r.status in ('pending','waitlisted','confirmed');
  return result;
end;
$$;
revoke all on function public.admin_get_participant_matrix_bulk(uuid[]) from public,anon;
grant execute on function public.admin_get_participant_matrix_bulk(uuid[]) to authenticated;

create or replace function public.admin_get_planning_deadlines_bulk(p_tour_ids uuid[])
returns table(tour_id uuid, kind text, title text, due_at timestamptz)
language plpgsql stable security invoker set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query
  select x.tour_id,x.kind,x.title,x.due_at from (
    select t.id tour_id,'registration_open'::text kind,'Anmeldung öffnet'::text title,t.registration_open_at due_at from public.tours t where t.id=any(p_tour_ids)
    union all select t.id,'registration_close','Anmeldeschluss',t.registration_close_at from public.tours t where t.id=any(p_tour_ids)
    union all select t.id,'passenger_edit','Mitfahrer-Änderungsfrist',t.passenger_edit_deadline_at from public.tours t where t.id=any(p_tour_ids)
    union all select h.tour_id,'hotel_booking','Hotel: '||h.name,h.booking_deadline::timestamp at time zone 'Europe/Berlin' from public.tour_hotel_suggestions h where h.tour_id=any(p_tour_ids)
    union all select s.tour_id,'meal_order','Essen: '||s.title,r.ordering_deadline_at from public.tour_stops s join public.restaurant_stop_settings r on r.tour_stop_id=s.id where s.tour_id=any(p_tour_ids) and r.ordering_enabled
  ) x where x.due_at is not null order by x.due_at,x.tour_id,x.kind;
end;
$$;
revoke all on function public.admin_get_planning_deadlines_bulk(uuid[]) from public,anon;
grant execute on function public.admin_get_planning_deadlines_bulk(uuid[]) to authenticated;

-- Geführtes Duplizieren: übernimmt nur wiederverwendbare Strukturen. Alle
-- tourabhängigen Daten (Datum, Uhrzeit, Frist, Preis) werden bewusst geleert
-- oder relativ auf den neuen Tourzeitraum gelegt.
create or replace function public.admin_copy_tour_planning(
  p_source_id uuid,
  p_target_id uuid,
  p_copy_stages boolean default true,
  p_copy_hotels boolean default true,
  p_copy_restaurants boolean default true
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_source public.tours%rowtype;
  v_target public.tours%rowtype;
  v_stop public.tour_stops%rowtype;
  v_new_stop_id uuid;
  v_stage_count integer := 0;
  v_hotel_count integer := 0;
  v_restaurant_count integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_source_id=p_target_id then raise exception 'SOURCE_EQUALS_TARGET'; end if;
  select * into v_source from public.tours where id=p_source_id;
  if not found then raise exception 'SOURCE_TOUR_NOT_FOUND'; end if;
  select * into v_target from public.tours where id=p_target_id for update;
  if not found then raise exception 'TARGET_TOUR_NOT_FOUND'; end if;
  if exists(select 1 from public.tour_stages where tour_id=p_target_id)
    or exists(select 1 from public.tour_stops where tour_id=p_target_id)
    or exists(select 1 from public.tour_hotel_suggestions where tour_id=p_target_id)
  then raise exception 'TARGET_PLANNING_NOT_EMPTY'; end if;

  if p_copy_stages then
    insert into public.tour_stages(id,tour_id,stage_date,stage_number,title,description,route_length_km,kurviger_url,route_url,meeting_point_private,start_time)
    select gen_random_uuid(),p_target_id,v_target.start_date+(s.stage_date-v_source.start_date),s.stage_number,s.title,s.description,
      s.route_length_km,s.kurviger_url,s.route_url,s.meeting_point_private,null
    from public.tour_stages s
    where s.tour_id=p_source_id
      and v_target.start_date+(s.stage_date-v_source.start_date) between v_target.start_date and v_target.end_date;
    get diagnostics v_stage_count = row_count;

    insert into public.tour_stops(id,tour_id,stage_id,type,title,description,location_name,address,starts_at,sort_order,reservation_people,reservation_contact,reservation_status)
    select gen_random_uuid(),p_target_id,ts.id,s.type,s.title,s.description,s.location_name,s.address,null,s.sort_order,
      case when s.type='restaurant' then null else s.reservation_people end,
      case when s.type='restaurant' then null else s.reservation_contact end,
      case when s.type='restaurant' then null else s.reservation_status end
    from public.tour_stops s
    left join public.tour_stages old_stage on old_stage.id=s.stage_id
    left join public.tour_stages ts on ts.tour_id=p_target_id and ts.stage_number=old_stage.stage_number
    where s.tour_id=p_source_id and s.type<>'restaurant';
  end if;

  if p_copy_hotels then
    insert into public.tour_hotel_suggestions(id,tour_id,night_date,night_date_end,name,url,address,note,booking_deadline,sort_order,
      price_per_night,hotel_url,booking_url,price_unit,room_type,breakfast_details,parking_details,cancellation_terms,allotment_details,contact)
    select gen_random_uuid(),p_target_id,v_target.start_date+(h.night_date-v_source.start_date),
      least(v_target.end_date-1,v_target.start_date+(coalesce(h.night_date_end,h.night_date)-v_source.start_date)),
      h.name,h.url,h.address,h.note,null,h.sort_order,null,h.hotel_url,h.booking_url,null,h.room_type,
      h.breakfast_details,h.parking_details,h.cancellation_terms,h.allotment_details,h.contact
    from public.tour_hotel_suggestions h
    where h.tour_id=p_source_id and v_target.end_date>v_target.start_date
      and v_target.start_date+(h.night_date-v_source.start_date) < v_target.end_date;
    get diagnostics v_hotel_count = row_count;
  end if;

  if p_copy_restaurants then
    for v_stop in select * from public.tour_stops where tour_id=p_source_id and type='restaurant' order by sort_order,id loop
      v_new_stop_id := gen_random_uuid();
      insert into public.tour_stops(id,tour_id,type,title,description,location_name,address,starts_at,sort_order,reservation_people,reservation_contact,reservation_status)
      values(v_new_stop_id,p_target_id,'restaurant',v_stop.title,v_stop.description,v_stop.location_name,v_stop.address,null,v_stop.sort_order,null,v_stop.reservation_contact,'planned');
      insert into public.restaurant_stop_settings(tour_stop_id,ordering_enabled,ordering_open_at,ordering_deadline_at,restaurant_note)
      select v_new_stop_id,false,null,null,s.restaurant_note from public.restaurant_stop_settings s where s.tour_stop_id=v_stop.id;
      insert into public.menu_items(id,restaurant_stop_id,name,description,price,is_available,is_vegetarian,is_vegan,allergen_info,sort_order)
      select gen_random_uuid(),v_new_stop_id,m.name,m.description,null,m.is_available,m.is_vegetarian,m.is_vegan,m.allergen_info,m.sort_order
      from public.menu_items m where m.restaurant_stop_id=v_stop.id;
      v_restaurant_count := v_restaurant_count+1;
    end loop;
  end if;
  return jsonb_build_object('code','OK','stages',v_stage_count,'hotels',v_hotel_count,'restaurants',v_restaurant_count);
end;
$$;
revoke all on function public.admin_copy_tour_planning(uuid,uuid,boolean,boolean,boolean) from public,anon;
grant execute on function public.admin_copy_tour_planning(uuid,uuid,boolean,boolean,boolean) to authenticated;
