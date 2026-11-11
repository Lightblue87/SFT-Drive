-- A reviewed restaurant draft must either create stop, ordering settings and
-- menu together, or create nothing. IDs are supplied by the app for safe retries.
create or replace function public.admin_create_restaurant(
 p_id uuid,p_tour_id uuid,p_stop jsonb,p_settings jsonb,p_menu jsonb
) returns jsonb language plpgsql security invoker set search_path=public
as $$
declare item jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if jsonb_typeof(p_menu) is distinct from 'array' or jsonb_array_length(p_menu)>100 then raise exception 'INVALID_MENU'; end if;
 perform public.admin_save_tour_resource('stops',p_id,p_tour_id,null,p_stop||jsonb_build_object('type','restaurant'));
 perform public.admin_save_tour_resource('restaurantSettings',p_id,p_id,null,p_settings);
 for item in select * from jsonb_array_elements(p_menu) loop
   if jsonb_typeof(item) is distinct from 'object' or item->>'id' is null then raise exception 'INVALID_MENU_ITEM'; end if;
   perform public.admin_save_tour_resource('menu',(item->>'id')::uuid,p_id,null,item-'id');
 end loop;
 return jsonb_build_object('code','OK');
end;
$$;
revoke all on function public.admin_create_restaurant(uuid,uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.admin_create_restaurant(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
