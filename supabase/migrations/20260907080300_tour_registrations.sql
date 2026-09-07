-- Eine Registrierung entspricht genau einem Fahrzeug (siehe CLAUDE.md §8.7).
-- Alle sicherheitskritischen Statusänderungen laufen ausschließlich über die
-- RPCs in den folgenden Migrationen — diese Tabelle hat bewusst keine
-- INSERT/UPDATE/DELETE-Policies für normale User oder Admins.

create table public.tour_registrations (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  status text not null check (status in ('pending', 'confirmed', 'waitlisted', 'cancelled', 'rejected')),

  vehicle_manufacturer text not null,
  vehicle_model text not null,
  vehicle_power_ps integer not null,
  license_plate text,

  passenger_count integer not null default 0,

  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id),
  waitlisted_at timestamptz,
  cancelled_at timestamptz,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id),
  rejection_reason text,

  constraint tour_registrations_power_positive check (vehicle_power_ps > 0),
  constraint tour_registrations_passenger_count_non_negative check (passenger_count >= 0),

  -- Ein User besitzt pro Tour maximal eine Registrierungszeile. Wiederanmeldung nach
  -- Stornierung reaktiviert dieselbe Zeile über eine kontrollierte RPC (kein neuer Insert).
  unique (tour_id, user_id)
);

create index tour_registrations_tour_status_idx on public.tour_registrations (tour_id, status);
create index tour_registrations_waitlist_order_idx on public.tour_registrations (tour_id, registered_at, id)
  where status = 'waitlisted';

alter table public.tour_registrations enable row level security;

create policy "tour_registrations_select_own_or_admin"
  on public.tour_registrations for select
  using (user_id = auth.uid() or public.is_admin());

-- Bewusst keine INSERT/UPDATE/DELETE-Policies: alle Statusänderungen laufen über
-- SECURITY DEFINER RPCs (register_for_tour, approve_/reject_/cancel_tour_registration,
-- update_passenger_count), die auth.uid() serverseitig bestimmen und RLS umgehen.

grant select on public.tour_registrations to authenticated;
