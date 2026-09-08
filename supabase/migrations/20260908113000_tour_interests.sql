-- Phase 18 — Vormerkung vor Öffnung der Touranmeldung (siehe CLAUDE.md §35.3).
--
-- Eine Vormerkung reserviert keinen Fahrzeugplatz, zählt nicht gegen
-- max_vehicles und erzeugt keinen pending/confirmed/waitlisted-Status —
-- deshalb reines Self-Service-CRUD über RLS, keine RPC nötig.

create table public.tour_interests (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  registration_open_notified_at timestamptz null,

  unique (tour_id, user_id)
);

create index tour_interests_tour_id_idx on public.tour_interests (tour_id);

alter table public.tour_interests enable row level security;

create policy "tour_interests_select_own_or_admin"
  on public.tour_interests for select
  using (user_id = auth.uid() or public.is_admin());

create policy "tour_interests_insert_own"
  on public.tour_interests for insert
  with check (user_id = auth.uid());

create policy "tour_interests_delete_own"
  on public.tour_interests for delete
  using (user_id = auth.uid());

grant select, insert, delete on public.tour_interests to authenticated;

-- Serverseitige Absicherung der in §35.3 genannten Voraussetzungen, statt sie
-- ausschließlich dem Client zu überlassen: Tour veröffentlicht,
-- registration_open_at gesetzt und noch in der Zukunft. Verhindert
-- insbesondere, dass jemand sich nach Anmeldeöffnung noch "vormerkt" und
-- dadurch fälschlich eine TOUR_REGISTRATION_OPEN-Benachrichtigung erhielte.
create or replace function public.enforce_tour_interest_preconditions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour record;
begin
  select status, registration_open_at into v_tour from public.tours where id = new.tour_id;

  if not found or v_tour.status <> 'published' then
    raise exception 'tour not available for interest';
  end if;

  if v_tour.registration_open_at is null or v_tour.registration_open_at <= now() then
    raise exception 'registration already open or not scheduled';
  end if;

  return new;
end;
$$;

create trigger tour_interests_enforce_preconditions
  before insert on public.tour_interests
  for each row
  execute function public.enforce_tour_interest_preconditions();
