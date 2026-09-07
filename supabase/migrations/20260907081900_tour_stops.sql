-- Phase 10 — Tour Stops (siehe CLAUDE.md §27.2). Generische Zwischenstopps
-- einer Tour (Restaurant, Treffpunkt, Tanken, Pause, Hotel, Aussichtspunkt,
-- Sonstiges) — Grundlage für die spätere Restaurant-Bestellfunktion
-- (Phase 11), hier aber bereits eigenständig nutzbar (z. B. um Tankstopps
-- oder Zwischenhalte für bestätigte Teilnehmer sichtbar zu machen).
--
-- Wie tour_participant_details/tour_stages: private Inhalte, nur bestätigte
-- Teilnehmer der jeweiligen Tour und Admins dürfen sie sehen (§27.2 "private
-- Stopps sind nur bestätigten Teilnehmern bzw. Admins sichtbar").
create table public.tour_stops (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  stage_id uuid references public.tour_stages (id) on delete set null,
  type text not null check (type in ('restaurant', 'meeting', 'fuel', 'break', 'hotel', 'viewpoint', 'other')),
  title text not null,
  description text,
  location_name text,
  address text,
  starts_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tour_stops_tour_id_sort_order_idx on public.tour_stops (tour_id, sort_order);

alter table public.tour_stops enable row level security;

create policy "tour_stops_select_confirmed_or_admin"
  on public.tour_stops for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = tour_stops.tour_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "tour_stops_admin_all"
  on public.tour_stops for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tour_stops to authenticated;
grant insert, update, delete on public.tour_stops to authenticated;
