-- Zentrale, admin-editierbare Angaben für Impressum/Datenschutzerklärung
-- (siehe CLAUDE.md §7). Als Singleton-Zeile modelliert (Trick: boolean
-- Primary Key mit check(id), erzwingt genau eine Zeile mit id = true), damit
-- z. B. bei einem Umzug oder Zuständigkeitswechsel nur ein Formular im
-- Admin-Bereich angepasst werden muss, statt Code zu ändern.

create table public.site_settings (
  id boolean primary key default true check (id),
  organization_name text,
  responsible_name text,
  street text,
  postal_code text,
  city text,
  contact_email text,
  phone text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true);

alter table public.site_settings enable row level security;

-- Öffentlich lesbar: Impressum/Datenschutzerklärung sind ohne Anmeldung sichtbar.
create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

create policy "site_settings_admin_update"
  on public.site_settings for update
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
