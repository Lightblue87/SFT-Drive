-- Nur für bestätigte Teilnehmer der jeweiligen Tour und Admins lesbar (§8.5).
-- Muss nach tour_registrations angelegt werden, da die Policy darauf verweist.
create table public.tour_participant_details (
  tour_id uuid primary key references public.tours (id) on delete cascade,
  participant_description text,
  meeting_point_private text,
  kurviger_url text,
  zello_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tour_participant_details enable row level security;

create policy "tour_participant_details_select_confirmed_or_admin"
  on public.tour_participant_details for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = tour_participant_details.tour_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "tour_participant_details_admin_all"
  on public.tour_participant_details for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tour_participant_details to authenticated;
grant insert, update, delete on public.tour_participant_details to authenticated;

-- Spätere Mehrtagestour-Erweiterung (§8.6). Datenmodell vorbereitet, im MVP UI
-- noch ungenutzt — im MVP bleibt ein einzelner Haupt-Kurviger-Link auf Tour-Ebene gültig.
create table public.tour_stages (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  stage_date date not null,
  stage_number integer not null,
  title text not null,
  description text,
  route_length_km numeric,
  kurviger_url text,
  meeting_point_private text,
  start_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tour_id, stage_number)
);

alter table public.tour_stages enable row level security;

-- Etappeninformationen sind standardmäßig Participant-Inhalte (§8.6).
create policy "tour_stages_select_confirmed_or_admin"
  on public.tour_stages for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = tour_stages.tour_id
        and r.user_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

create policy "tour_stages_admin_all"
  on public.tour_stages for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tour_stages to authenticated;
grant insert, update, delete on public.tour_stages to authenticated;
