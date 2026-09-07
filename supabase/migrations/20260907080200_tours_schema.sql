-- Touren, nach Sichtbarkeitsstufe physisch getrennt (siehe CLAUDE.md §8, "Wichtige
-- Sicherheitsentscheidung: Sichtbarkeitsstufen physisch trennen"). RLS schützt Zeilen,
-- nicht Spalten — deshalb liegen öffentliche, Member- und Participant-Daten in
-- getrennten Tabellen statt in einer gemeinsamen, öffentlich lesbaren Tour-Zeile.

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_description text,
  public_description text,

  start_date date not null,
  end_date date not null,

  meeting_at timestamptz,
  planned_end_at timestamptz,

  region text not null,
  route_length_km numeric,

  meeting_point_public text,

  max_vehicles integer not null,

  confirmation_mode text not null default 'manual' check (confirmation_mode in ('automatic', 'manual')),

  license_plate_required boolean not null default false,
  min_power_ps integer,
  max_power_ps integer,
  min_driver_age integer,

  registration_open_at timestamptz,
  registration_close_at timestamptz,
  passenger_edit_deadline_at timestamptz,

  status text not null default 'draft'
    check (status in ('draft', 'published', 'registration_closed', 'cancelled', 'completed', 'archived')),

  cover_image_url text,

  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  constraint tours_max_vehicles_positive check (max_vehicles > 0),
  constraint tours_end_after_start check (end_date >= start_date),
  constraint tours_route_length_non_negative check (route_length_km is null or route_length_km >= 0),
  constraint tours_min_power_positive check (min_power_ps is null or min_power_ps > 0),
  constraint tours_max_power_gte_min check (max_power_ps is null or min_power_ps is null or max_power_ps >= min_power_ps),
  constraint tours_min_driver_age_valid check (min_driver_age is null or min_driver_age >= 18)
);

alter table public.tours enable row level security;

create policy "tours_select_published_or_admin"
  on public.tours for select
  using (status = 'published' or public.is_admin());

create policy "tours_admin_all"
  on public.tours for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tours to anon, authenticated;
grant insert, update, delete on public.tours to authenticated; -- durch RLS auf Admins beschränkt

-- Nur für eingeloggte User lesbar (§8.4).
create table public.tour_member_details (
  tour_id uuid primary key references public.tours (id) on delete cascade,
  member_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tour_member_details enable row level security;

create policy "tour_member_details_select_authenticated"
  on public.tour_member_details for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tours t
      where t.id = tour_member_details.tour_id
        and t.status = 'published'
    )
  );

create policy "tour_member_details_admin_all"
  on public.tour_member_details for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.tour_member_details to authenticated;
grant insert, update, delete on public.tour_member_details to authenticated;

-- tour_participant_details und tour_stages folgen in einer späteren Migration,
-- nachdem tour_registrations existiert (ihre Policies verweisen darauf).
