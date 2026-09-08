-- Phase 13 — Persönliche Fahrzeuggarage (siehe CLAUDE.md §34.2).
--
-- Reine Komfortfunktion: Hersteller/Modell/Leistung/Kennzeichen werden bei
-- der Touranmeldung weiterhin als Snapshot in tour_registrations kopiert
-- (§8.11, §8.7) — vehicles.id wird dort nicht referenziert, damit spätere
-- Änderungen oder das Löschen eines Garage-Fahrzeugs vergangene
-- Touranmeldungen und das Tourenarchiv nicht verändern.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manufacturer text not null,
  model text not null,
  power_ps integer not null check (power_ps > 0),
  license_plate text null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_user_id_idx on public.vehicles (user_id);

alter table public.vehicles enable row level security;

-- Reines Self-Service-CRUD auf eigene Fahrzeuge, analog push_subscriptions
-- (20260907081600): kein Grund für eine RPC, da hier keine sicherheits-
-- kritische Kapazitäts- oder Freigabelogik involviert ist.
create policy "vehicles_own"
  on public.vehicles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.vehicles to authenticated;

-- Höchstens ein Standardfahrzeug pro User: setzt beim Markieren eines
-- Fahrzeugs als Standard automatisch alle anderen eigenen Fahrzeuge auf
-- is_default = false, statt das dem Client zu überlassen (der sonst zwei
-- getrennte, nicht-atomare Updates bräuchte).
create or replace function public.enforce_single_default_vehicle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.vehicles
    set is_default = false, updated_at = now()
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

create trigger vehicles_enforce_single_default
  before insert or update of is_default on public.vehicles
  for each row
  when (new.is_default)
  execute function public.enforce_single_default_vehicle();
