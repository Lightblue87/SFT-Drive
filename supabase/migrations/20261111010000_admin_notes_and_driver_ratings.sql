-- Phase 22 — Admin-Notizen und Fahrerbewertung (siehe CLAUDE.md §42).
--
-- Zwei rein interne Orga-Werkzeuge, ausschließlich für Admins sicht- und
-- pflegbar:
--   1. admin_user_notes  — datierte Notizen zu einem User
--   2. driver_ratings    — Bewertung des fahrerischen Könnens je Ausfahrt
--
-- Beide liegen in eigenen Tabellen mit reiner Admin-Policy (§8
-- "Sichtbarkeitsstufen physisch trennen"): der betroffene User selbst, andere
-- Teilnehmer und Freunde erhalten über keine bestehende RPC Zugriff darauf.

-- 1. Notizen ------------------------------------------------------------------

create table public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Optionaler Tourbezug ("nach der Harz-Tour"). Wird die Tour gelöscht,
  -- bleibt die Notiz erhalten.
  tour_id uuid null references public.tours(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_user_notes_user_idx on public.admin_user_notes (user_id, created_at desc);

alter table public.admin_user_notes enable row level security;

create policy "admin_user_notes_admin_all"
  on public.admin_user_notes for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.admin_user_notes to authenticated;

-- Verfasser und Zeitstempel serverseitig setzen — nie einem Clientwert trauen
-- (§8.12).
create or replace function public.admin_user_notes_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger admin_user_notes_stamp
  before insert or update on public.admin_user_notes
  for each row execute function public.admin_user_notes_stamp();

-- 2. Fahrerbewertung ------------------------------------------------------------

create table public.driver_ratings (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Drei Kriterien, jeweils 1 (unsicher) bis 5 (souverän).
  vehicle_control smallint not null check (vehicle_control between 1 and 5),
  convoy_discipline smallint not null check (convoy_discipline between 1 and 5),
  rules_safety smallint not null check (rules_safety between 1 and 5),
  comment text null check (comment is null or length(comment) <= 1000),
  rated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Eine gemeinsame Bewertung je Fahrer und Ausfahrt (nicht je Admin).
  constraint driver_ratings_tour_user_unique unique (tour_id, user_id)
);

create index driver_ratings_user_idx on public.driver_ratings (user_id);

alter table public.driver_ratings enable row level security;

create policy "driver_ratings_admin_all"
  on public.driver_ratings for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.driver_ratings to authenticated;

-- Fachliche Vorbedingungen serverseitig: bewertet wird nur, wer bei dieser
-- Ausfahrt bestätigt mitgefahren ist, und erst ab dem letzten Tourtag.
create or replace function public.driver_ratings_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.tour_id := old.tour_id;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;

  if not exists (
    select 1 from public.tours t
    where t.id = new.tour_id
      and t.end_date <= current_date
      and t.status not in ('draft', 'cancelled')
  ) then
    raise exception 'TOUR_NOT_FINISHED';
  end if;

  if not exists (
    select 1 from public.tour_registrations r
    where r.tour_id = new.tour_id
      and r.user_id = new.user_id
      and r.status = 'confirmed'
  ) then
    raise exception 'NOT_A_CONFIRMED_PARTICIPANT';
  end if;

  new.comment := nullif(trim(new.comment), '');
  new.rated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger driver_ratings_validate
  before insert or update on public.driver_ratings
  for each row execute function public.driver_ratings_validate();

-- 3. Offene Bewertungen fürs Admin-Dashboard -------------------------------------
--
-- Eine gebündelte Abfrage statt einer Abfrage je Tour (§4 "keine N+1").
-- Berücksichtigt abgeschlossene Ausfahrten der letzten 30 Tage, bei denen noch
-- nicht alle bestätigten Fahrer bewertet sind. Das Zeitfenster verhindert, dass
-- alle Alt-Touren aus der Zeit vor dieser Funktion als "offen" erscheinen.
-- SECURITY INVOKER: es gelten die normalen Admin-Policies der Tabellen.
create or replace function public.admin_list_pending_driver_ratings()
returns table (
  tour_id uuid,
  title text,
  start_date date,
  end_date date,
  confirmed_count integer,
  rated_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.id,
    t.title,
    t.start_date,
    t.end_date,
    c.confirmed_count,
    coalesce(d.rated_count, 0)
  from public.tours t
  join (
    select r.tour_id, count(*)::integer as confirmed_count
    from public.tour_registrations r
    where r.status = 'confirmed'
    group by r.tour_id
  ) c on c.tour_id = t.id
  left join (
    select dr.tour_id, count(*)::integer as rated_count
    from public.driver_ratings dr
    join public.tour_registrations r
      on r.tour_id = dr.tour_id and r.user_id = dr.user_id and r.status = 'confirmed'
    group by dr.tour_id
  ) d on d.tour_id = t.id
  where public.is_admin()
    and t.status = 'completed'
    and t.end_date >= current_date - 30
    and coalesce(d.rated_count, 0) < c.confirmed_count
  order by t.end_date desc;
$$;

revoke all on function public.admin_list_pending_driver_ratings() from public;
grant execute on function public.admin_list_pending_driver_ratings() to authenticated;

-- 4. Mitteilung an Admins, sobald eine Ausfahrt abgeschlossen ist ------------------
--
-- apply_tour_lifecycle() (20260909010000, per pg_cron alle 15 Minuten) setzt
-- Touren nach dem letzten Tourtag auf `completed`. Genau dort entsteht jetzt je
-- Admin eine In-App-Mitteilung mit Deep Link zur Bewertungsseite — nur für
-- Touren mit mindestens einem bestätigten Fahrer. Da der Statuswechsel je Tour
-- genau einmal passiert, ist kein eigener Doppelversand-Schutz nötig.
-- Übrige Logik unverändert übernommen.
create or replace function public.apply_tour_lifecycle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed integer := 0;
  v_count integer;
begin
  -- Anmeldezeitraum vorbei -> registration_closed (Tour bleibt sichtbar).
  update public.tours
  set status = 'registration_closed', updated_at = now()
  where status = 'published'
    and registration_close_at is not null
    and registration_close_at < now()
    and end_date >= current_date;
  get diagnostics v_count = row_count;
  v_changed := v_changed + v_count;

  -- Letzter Tourtag vorbei -> completed, plus Bewertungs-Hinweis an die Admins.
  with completed as (
    update public.tours
    set status = 'completed', updated_at = now()
    where status in ('published', 'registration_closed')
      and end_date < current_date
    returning id, title
  ),
  notified as (
    insert into public.notifications (user_id, tour_id, type, title, body, target_path)
    select
      ur.user_id,
      c.id,
      'DRIVER_RATING_DUE',
      'Fahrer bewerten',
      'Die Ausfahrt „' || c.title || '“ ist abgeschlossen. Bitte bewerte die Fahrer.',
      '/admin/tours/' || c.id || '/ratings'
    from completed c
    join public.user_roles ur on ur.role = 'admin'
    where exists (
      select 1 from public.tour_registrations r
      where r.tour_id = c.id and r.status = 'confirmed'
    )
    returning 1
  )
  select count(*) into v_count from completed;
  v_changed := v_changed + v_count;

  -- Abgesagte Tour nach ihrem Starttag -> archived. Damit verschwindet sie aus
  -- allen normalen Ansichten (§8.3), ohne dass historische Daten gelöscht
  -- werden — ein Löschen wäre nicht umkehrbar und würde §23.14 verletzen.
  update public.tours
  set status = 'archived', updated_at = now()
  where status = 'cancelled'
    and start_date < current_date;
  get diagnostics v_count = row_count;
  v_changed := v_changed + v_count;

  return v_changed;
end;
$$;

revoke all on function public.apply_tour_lifecycle() from public;
