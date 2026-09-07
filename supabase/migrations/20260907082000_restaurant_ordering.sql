-- Phase 11 — Restaurant-Stopps, Essensvorbestellung (siehe CLAUDE.md §27.3-§27.9).
-- Baut auf tour_stops (Phase 10) auf: ein Stopp vom Typ 'restaurant' kann eine
-- Bestellkonfiguration + Speisekarte bekommen. Verwendet die bestehende
-- bestätigte tour_registration als Teilnehmerbasis, dupliziert die
-- Touranmeldung nicht (§27.1).

create table public.restaurant_stop_settings (
  tour_stop_id uuid primary key references public.tour_stops (id) on delete cascade,
  ordering_enabled boolean not null default false,
  ordering_open_at timestamptz,
  ordering_deadline_at timestamptz,
  restaurant_note text,
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurant_stop_settings enable row level security;

create policy "restaurant_stop_settings_select_confirmed_or_admin"
  on public.restaurant_stop_settings for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.tour_stops ts
      join public.tour_registrations r on r.tour_id = ts.tour_id
      where ts.id = restaurant_stop_settings.tour_stop_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "restaurant_stop_settings_admin_all"
  on public.restaurant_stop_settings for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.restaurant_stop_settings to authenticated;
grant insert, update, delete on public.restaurant_stop_settings to authenticated;

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_stop_id uuid not null references public.tour_stops (id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  is_available boolean not null default true,
  is_vegetarian boolean not null default false,
  is_vegan boolean not null default false,
  allergen_info text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_restaurant_stop_id_idx on public.menu_items (restaurant_stop_id, sort_order);

alter table public.menu_items enable row level security;

create policy "menu_items_select_confirmed_or_admin"
  on public.menu_items for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.tour_stops ts
      join public.tour_registrations r on r.tour_id = ts.tour_id
      where ts.id = menu_items.restaurant_stop_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "menu_items_admin_all"
  on public.menu_items for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.menu_items to authenticated;
grant insert, update, delete on public.menu_items to authenticated;

-- Eine Bestellung pro Restaurant-Stopp + Touranmeldung (§27.5) — dieselbe
-- Zeile wird bei Änderungen wiederverwendet/aktualisiert statt dupliziert.
create table public.meal_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_stop_id uuid not null references public.tour_stops (id) on delete cascade,
  registration_id uuid not null references public.tour_registrations (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,

  unique (restaurant_stop_id, registration_id)
);

alter table public.meal_orders enable row level security;

-- Nur lesen — Schreiben ausschließlich über submit_meal_order()/
-- admin_update_meal_order() unten (kontrollierte RPCs, konsistent mit
-- tour_registrations, siehe §27.17).
create policy "meal_orders_select_own_or_admin"
  on public.meal_orders for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.id = meal_orders.registration_id and r.user_id = auth.uid()
    )
  );

grant select on public.meal_orders to authenticated;

create table public.meal_order_items (
  id uuid primary key default gen_random_uuid(),
  meal_order_id uuid not null references public.meal_orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_order_items_meal_order_id_idx on public.meal_order_items (meal_order_id);

alter table public.meal_order_items enable row level security;

create policy "meal_order_items_select_own_or_admin"
  on public.meal_order_items for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.meal_orders mo
      join public.tour_registrations r on r.id = mo.registration_id
      where mo.id = meal_order_items.meal_order_id and r.user_id = auth.uid()
    )
  );

grant select on public.meal_order_items to authenticated;

-- Selbstbedienungs-Bestellung (siehe §27.5-§27.7). Ersetzt die komplette
-- Positionsliste der eigenen Bestellung für diesen Stopp bei jedem Aufruf —
-- einfacher und robuster als granulares Hinzufügen/Entfernen einzelner
-- Positionen. Ein leeres p_items storniert die Bestellung.
create or replace function public.submit_meal_order(p_restaurant_stop_id uuid, p_items jsonb)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.restaurant_stop_settings%rowtype;
  v_registration public.tour_registrations%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
begin
  if v_user_id is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  select * into v_settings from public.restaurant_stop_settings where tour_stop_id = p_restaurant_stop_id;
  if not found or not v_settings.ordering_enabled then
    return ('ORDERING_NOT_ENABLED', null, null)::public.registration_result;
  end if;

  if v_settings.ordering_open_at is not null and now() < v_settings.ordering_open_at then
    return ('ORDERING_NOT_OPEN', null, null)::public.registration_result;
  end if;
  if v_settings.ordering_deadline_at is not null and now() > v_settings.ordering_deadline_at then
    return ('ORDERING_CLOSED', null, null)::public.registration_result;
  end if;

  select r.* into v_registration
  from public.tour_registrations r
  join public.tour_stops ts on ts.tour_id = r.tour_id
  where ts.id = p_restaurant_stop_id and r.user_id = v_user_id and r.status = 'confirmed';

  if not found then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  insert into public.meal_orders (restaurant_stop_id, registration_id, status, updated_at, submitted_at)
  values (
    p_restaurant_stop_id,
    v_registration.id,
    case when jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then 'cancelled' else 'submitted' end,
    now(),
    case when jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then null else now() end
  )
  on conflict (restaurant_stop_id, registration_id) do update
  set status = excluded.status, updated_at = now(), submitted_at = excluded.submitted_at
  returning id into v_order_id;

  delete from public.meal_order_items where meal_order_id = v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
    end if;

    if not exists (
      select 1 from public.menu_items
      where id = v_menu_item_id and restaurant_stop_id = p_restaurant_stop_id and is_available
    ) then
      return ('MENU_ITEM_INVALID', null, null)::public.registration_result;
    end if;

    insert into public.meal_order_items (meal_order_id, menu_item_id, quantity, note)
    values (v_order_id, v_menu_item_id, v_quantity, nullif(trim(v_item ->> 'note'), ''));
  end loop;

  return ('OK', null, v_order_id)::public.registration_result;
end;
$$;

revoke all on function public.submit_meal_order(uuid, jsonb) from public;
grant execute on function public.submit_meal_order(uuid, jsonb) to authenticated;

-- Admin darf jederzeit korrigieren, auch nach Fristablauf (§27.3 letzter Satz).
create or replace function public.admin_update_meal_order(p_restaurant_stop_id uuid, p_registration_id uuid, p_items jsonb)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  insert into public.meal_orders (restaurant_stop_id, registration_id, status, updated_at, submitted_at)
  values (
    p_restaurant_stop_id,
    p_registration_id,
    case when jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then 'cancelled' else 'submitted' end,
    now(),
    case when jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then null else now() end
  )
  on conflict (restaurant_stop_id, registration_id) do update
  set status = excluded.status, updated_at = now(), submitted_at = excluded.submitted_at
  returning id into v_order_id;

  delete from public.meal_order_items where meal_order_id = v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
    end if;

    if not exists (select 1 from public.menu_items where id = v_menu_item_id and restaurant_stop_id = p_restaurant_stop_id) then
      return ('MENU_ITEM_INVALID', null, null)::public.registration_result;
    end if;

    insert into public.meal_order_items (meal_order_id, menu_item_id, quantity, note)
    values (v_order_id, v_menu_item_id, v_quantity, nullif(trim(v_item ->> 'note'), ''));
  end loop;

  return ('OK', null, v_order_id)::public.registration_result;
end;
$$;

revoke all on function public.admin_update_meal_order(uuid, uuid, jsonb) from public;
grant execute on function public.admin_update_meal_order(uuid, uuid, jsonb) to authenticated;
