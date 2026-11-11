-- Shared, narrowly allowlisted CRUD with full-row optimistic concurrency.
-- INVOKER keeps the existing RLS policies active. No arbitrary table/column API.
create or replace function public.admin_save_tour_resource(
  p_kind text, p_id uuid, p_parent_id uuid, p_expected jsonb, p_values jsonb
) returns jsonb language plpgsql security invoker set search_path=public
as $$
declare
  tbl text; parent_col text; pk text := 'id'; allowed text[];
  old_row jsonb; next_row jsonb; tour_row public.tours%rowtype;
  columns_sql text; values_sql text; update_sql text; key_name text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  case p_kind
    when 'stops' then tbl:='tour_stops'; parent_col:='tour_id'; allowed:=array['title','type','description','location_name','address','starts_at','sort_order'];
    when 'hotels' then tbl:='tour_hotel_suggestions'; parent_col:='tour_id'; allowed:=array['night_date','name','url','address','note','booking_deadline','sort_order'];
    when 'stages' then tbl:='tour_stages'; parent_col:='tour_id'; allowed:=array['stage_date','stage_number','title','route_url'];
    when 'menu' then tbl:='menu_items'; parent_col:='restaurant_stop_id'; allowed:=array['name','description','price','is_available','is_vegetarian','is_vegan','allergen_info','sort_order'];
    when 'restaurantSettings' then tbl:='restaurant_stop_settings'; parent_col:='tour_stop_id'; pk:='tour_stop_id'; allowed:=array['ordering_enabled','ordering_open_at','ordering_deadline_at','restaurant_note'];
    else raise exception 'INVALID_RESOURCE';
  end case;
  if p_id is null or p_parent_id is null or jsonb_typeof(p_values) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(p_values) k where not(k=any(allowed))) then raise exception 'INVALID_PAYLOAD'; end if;
  if p_kind in ('menu','restaurantSettings') then
    select t.* into tour_row from public.tours t join public.tour_stops s on s.tour_id=t.id
      where s.id=p_parent_id and s.type='restaurant' for update of t;
  else select * into tour_row from public.tours where id=p_parent_id for update;
  end if;
  if not found then raise exception 'PARENT_NOT_FOUND'; end if;
  if pk='tour_stop_id' and p_id<>p_parent_id then raise exception 'INVALID_ID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  execute format('select to_jsonb(r) from public.%I r where %I=$1 for update',tbl,pk) into old_row using p_id;
  if old_row is not null then
    if old_row->>parent_col <> p_parent_id::text then raise exception 'PARENT_MISMATCH'; end if;
    if p_expected is null or old_row is distinct from p_expected then raise exception 'CONFLICT: Eintrag wurde inzwischen verändert. Neu laden und vergleichen.' using errcode='40001'; end if;
  elsif p_expected is not null then raise exception 'CONFLICT: Eintrag wurde gelöscht.' using errcode='40001'; end if;
  next_row:=coalesce(old_row,'{}'::jsonb)||p_values;
  if p_kind='hotels' and ((next_row->>'night_date')::date is null or (next_row->>'night_date')::date < tour_row.start_date or (next_row->>'night_date')::date >= tour_row.end_date) then raise exception 'INVALID_NIGHT_DATE'; end if;
  if p_kind='stages' and (tour_row.start_date= tour_row.end_date or (next_row->>'stage_date')::date is null or (next_row->>'stage_date')::date not between tour_row.start_date and tour_row.end_date
      or (next_row->>'stage_number')::integer <> ((next_row->>'stage_date')::date-tour_row.start_date)+1) then raise exception 'INVALID_STAGE_DATE'; end if;
  if p_kind='stages' and exists(select 1 from public.tour_stages where tour_id=p_parent_id and stage_date=(next_row->>'stage_date')::date and id<>p_id) then raise exception 'STAGE_ALREADY_EXISTS'; end if;
  if p_kind in ('hotels','menu') and coalesce(trim(next_row->>'name'),'')='' then raise exception 'NAME_REQUIRED'; end if;
  if p_kind in ('stops','stages') and coalesce(trim(next_row->>'title'),'')='' then raise exception 'TITLE_REQUIRED'; end if;
  if p_kind='menu' and (next_row->>'price')::numeric < 0 then raise exception 'INVALID_PRICE'; end if;
  if p_kind='restaurantSettings' and (next_row->>'ordering_deadline_at')::timestamptz < (next_row->>'ordering_open_at')::timestamptz then raise exception 'INVALID_ORDER_WINDOW'; end if;
  -- Preserve a restaurant with settings/orders rather than silently disconnecting it.
  if p_kind='stops' and old_row->>'type'='restaurant' and next_row->>'type'<>'restaurant'
    and exists(select 1 from public.restaurant_stop_settings where tour_stop_id=p_id) then raise exception 'RESTAURANT_HAS_SETTINGS'; end if;
  columns_sql:=format('%I',pk); values_sql:=format('(jsonb_populate_record(null::public.%I,$1)).%I',tbl,pk);
  next_row:=next_row||jsonb_build_object(pk,p_id,parent_col,p_parent_id);
  if parent_col<>pk then columns_sql:=columns_sql||format(',%I',parent_col); values_sql:=values_sql||format(',(jsonb_populate_record(null::public.%I,$1)).%I',tbl,parent_col); end if;
  update_sql:='';
  for key_name in select jsonb_object_keys(p_values) loop
    columns_sql:=columns_sql||format(',%I',key_name);
    values_sql:=values_sql||format(',(jsonb_populate_record(null::public.%I,$1)).%I',tbl,key_name);
    update_sql:=update_sql||case when update_sql='' then '' else ',' end||format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',key_name,tbl,key_name);
  end loop;
  if update_sql='' then raise exception 'EMPTY_PAYLOAD'; end if;
  if old_row is null then
    execute format('insert into public.%I(%s) select %s',tbl,columns_sql,values_sql) using next_row;
  else
    execute format('update public.%I set %s, updated_at=now() where %I=$2',tbl,update_sql,pk) using next_row,p_id;
  end if;
  return jsonb_build_object('code','OK');
end;
$$;
revoke all on function public.admin_save_tour_resource(text,uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_save_tour_resource(text,uuid,uuid,jsonb,jsonb) to authenticated;

create or replace function public.admin_delete_tour_resource(p_kind text,p_id uuid,p_parent_id uuid,p_expected jsonb)
returns jsonb language plpgsql security invoker set search_path=public
as $$
declare tbl text; parent_col text; old_row jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  case p_kind
    when 'stops' then tbl:='tour_stops';parent_col:='tour_id';
    when 'hotels' then tbl:='tour_hotel_suggestions';parent_col:='tour_id';
    when 'stages' then tbl:='tour_stages';parent_col:='tour_id';
    when 'menu' then tbl:='menu_items';parent_col:='restaurant_stop_id';
    else raise exception 'INVALID_RESOURCE';
  end case;
  execute format('select to_jsonb(r) from public.%I r where id=$1 for update',tbl) into old_row using p_id;
  if old_row is null or p_expected is null or old_row is distinct from p_expected then raise exception 'CONFLICT: Eintrag wurde verändert oder gelöscht.' using errcode='40001'; end if;
  if old_row->>parent_col<>p_parent_id::text then raise exception 'PARENT_MISMATCH'; end if;
  -- Do not lose real orders when deleting a restaurant. Existing FK protects menus.
  if p_kind='stops' and exists(select 1 from public.meal_orders where restaurant_stop_id=p_id) then raise exception 'STOP_HAS_ORDERS: Stopp mit Bestellungen kann nicht gelöscht werden.'; end if;
  execute format('delete from public.%I where id=$1',tbl) using p_id;
  return jsonb_build_object('code','OK');
end;
$$;
revoke all on function public.admin_delete_tour_resource(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.admin_delete_tour_resource(text,uuid,uuid,jsonb) to authenticated;
