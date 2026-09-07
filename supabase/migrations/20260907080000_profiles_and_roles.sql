-- Profiles, Rollen und Admin-Helper (siehe CLAUDE.md §8.1, §8.2).
-- Der Klarname (first_name/last_name) ist privat und wird nie öffentlich ausgeliefert.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  privacy_policy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Username-Eindeutigkeit case-insensitive absichern (§8.1).
create unique index profiles_username_unique_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Rollen niemals clientseitig vertrauen (§8.2). Kein Insert/Update/Delete für normale
-- User oder Admins über die REST-API — Rollenänderungen erfolgen ausschließlich über
-- ein dokumentiertes SQL-Setup (siehe unten).
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;
-- Bewusst keine Policies für user_roles: kein Client (auch kein Admin) darf diese
-- Tabelle direkt über die REST-API lesen oder schreiben. Zugriff ausschließlich über
-- die sichere Helper-Funktion is_admin() unten (SECURITY DEFINER, bypassed RLS).

-- Zentrale, sichere Adminprüfung. SECURITY DEFINER + fest gesetzter search_path,
-- damit keine rekursiven oder clientseitig manipulierbaren Rollenprüfungen möglich sind.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- profiles RLS:
-- - eigenes Profil lesen/aktualisieren
-- - Admin darf alle Profile lesen (für Verwaltung), aber nicht direkt beliebig ändern
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Kein direkter INSERT über die REST-API: Profile entstehen ausschließlich über den
-- handle_new_user()-Trigger bei der Registrierung (siehe folgende Migration).

grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon; -- durch RLS faktisch ohne Effekt (keine "true"-Policy)

-- Erster Admin (dokumentiertes, manuelles SQL-Setup — es gibt bewusst keinen
-- öffentlich erreichbaren "Make me admin"-Mechanismus, siehe §8.2):
--
--   insert into public.user_roles (user_id, role)
--   values ('<auth.users.id des gewünschten Admins>', 'admin');
