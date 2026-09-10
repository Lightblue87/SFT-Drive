-- Reuses existing validation/transactional write; adds a snapshot check for the
-- second admin client without weakening participant ordering permissions.
create or replace function public.admin_replace_meal_order(
 p_restaurant_stop_id uuid,p_registration_id uuid,p_expected jsonb,p_items jsonb
) returns public.registration_result language plpgsql security definer set search_path=public
as $$
-- DEFINER is required only for the row lock: meal_orders deliberately grants
-- no UPDATE to authenticated. The explicit current admin check remains mandatory.
declare old_order jsonb; current_items jsonb; expected_items jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select to_jsonb(o) into old_order from public.meal_orders o
 where restaurant_stop_id=p_restaurant_stop_id and registration_id=p_registration_id for update;
 if old_order is null or p_expected is null or old_order is distinct from (p_expected-'meal_order_items'-'tour_registrations')
 then raise exception 'CONFLICT: Bestellung wurde verändert. Neu laden und vergleichen.' using errcode='40001'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('menu_item_id',menu_item_id,'quantity',quantity,'note',note) order by menu_item_id),'[]'::jsonb)
 into current_items from public.meal_order_items where meal_order_id=(old_order->>'id')::uuid;
 select coalesce(jsonb_agg(jsonb_build_object('menu_item_id',i->'menu_item_id','quantity',i->'quantity','note',i->'note') order by i->>'menu_item_id'),'[]'::jsonb)
 into expected_items from jsonb_array_elements(p_expected->'meal_order_items') i;
 if current_items is distinct from expected_items then raise exception 'CONFLICT: Bestellpositionen wurden verändert.' using errcode='40001'; end if;
 return public.admin_update_meal_order(p_restaurant_stop_id,p_registration_id,p_items);
end;
$$;
revoke all on function public.admin_replace_meal_order(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_replace_meal_order(uuid,uuid,jsonb,jsonb) to authenticated;
