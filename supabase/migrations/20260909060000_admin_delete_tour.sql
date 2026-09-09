-- Admin darf eine Tour vollständig löschen — bewusst nur im Status `draft`
-- oder `cancelled` (Produktentscheidung auf ausdrücklichen Wunsch des
-- Projektinhabers). Ein Entwurf war nie öffentlich sichtbar und eine
-- abgesagte Tour kann der Admin damit aufräumen, statt sie bis zum Starttag
-- liegen zu lassen und dann automatisch archivieren zu lassen (§8.3).
-- `published`/`registration_closed`/`completed`/`archived` bleiben
-- ausdrücklich nicht löschbar — dort gilt weiterhin §23.14
-- ("bereits gespeicherte historische Daten dürfen nicht unbeabsichtigt
-- überschrieben oder gelöscht werden").
--
-- Abhängige Zeilen werden explizit in Abhängigkeitsreihenfolge gelöscht statt
-- sich allein auf FK-Kaskaden zu verlassen: `meal_order_items.menu_item_id`
-- verwendet seit 20260909020000 bewusst `ON DELETE RESTRICT`
-- (§27.21 "Menügerichte nicht mehr löschbar, sobald sie bestellt wurden"),
-- ein einfaches `DELETE FROM tours` würde dort also fehlschlagen können,
-- solange noch Bestellpositionen auf ein Menügericht dieser Tour verweisen.
create or replace function public.admin_delete_tour(p_tour_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_tour.status not in ('draft', 'cancelled') then
    return ('TOUR_NOT_DELETABLE', v_tour.status, null)::public.registration_result;
  end if;

  delete from public.meal_order_items
  where meal_order_id in (
    select mo.id from public.meal_orders mo
    join public.tour_stops ts on ts.id = mo.restaurant_stop_id
    where ts.tour_id = p_tour_id
  );
  delete from public.meal_orders mo
  using public.tour_stops ts
  where ts.id = mo.restaurant_stop_id and ts.tour_id = p_tour_id;
  delete from public.menu_items mi
  using public.tour_stops ts
  where ts.id = mi.restaurant_stop_id and ts.tour_id = p_tour_id;
  delete from public.restaurant_stop_settings rss
  using public.tour_stops ts
  where ts.id = rss.tour_stop_id and ts.tour_id = p_tour_id;
  delete from public.tour_stops where tour_id = p_tour_id;

  delete from public.tour_accommodation_confirmations where tour_id = p_tour_id;
  delete from public.tour_hotel_suggestions where tour_id = p_tour_id;
  delete from public.tour_stages where tour_id = p_tour_id;
  delete from public.tour_interests where tour_id = p_tour_id;
  delete from public.tour_registrations where tour_id = p_tour_id;
  delete from public.tour_member_details where tour_id = p_tour_id;
  delete from public.tour_participant_details where tour_id = p_tour_id;

  -- Mitteilungen (z. B. eine frühere Absagebenachrichtigung) bleiben erhalten
  -- und verlieren nur den Tourbezug — bereits durch die bestehende
  -- `on delete set null`-Regel auf `notifications.tour_id` abgedeckt. Der
  -- gespeicherte `target_path` verweist aber weiterhin auf die Tour-URL
  -- (z. B. `/tours/<slug>`) und würde nach dem Löschen ins Leere führen —
  -- deshalb wird er hier zusätzlich geleert, bevor die Tour verschwindet.
  update public.notifications set target_path = null where tour_id = p_tour_id;

  delete from public.tours where id = p_tour_id;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_delete_tour(uuid) from public;
grant execute on function public.admin_delete_tour(uuid) to authenticated;
