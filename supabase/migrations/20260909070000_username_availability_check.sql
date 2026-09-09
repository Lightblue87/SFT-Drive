-- Ermöglicht eine frühe, aussagekräftige Rückmeldung bei der Registrierung,
-- wenn der gewählte Username bereits vergeben ist (case-insensitiv, siehe
-- §8.1 profiles_username_unique_idx). Ohne diese Prüfung schlägt erst
-- signUp() ganz am Ende von Schritt 3 fehl, weil handle_new_user() den
-- Insert in profiles innerhalb derselben Transaktion versucht — GoTrue gibt
-- den konkreten Postgres-Fehler dabei nicht an den Client weiter, sondern nur
-- eine generische "Database error saving new user"-Antwort. Der Nutzer sah
-- dadurch erst nach dem Ausfüllen des Fahrzeug-Schritts (3) eine
-- unspezifische Fehlermeldung, ohne zu erfahren, dass der in Schritt 2
-- gewählte Username das eigentliche Problem war.
--
-- Gibt bewusst nur ein Boolean zurück, keine weiteren Profildaten — sicher
-- auch für nicht angemeldete Besucher während der Registrierung.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
