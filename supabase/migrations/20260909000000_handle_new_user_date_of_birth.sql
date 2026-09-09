-- Erweitert handle_new_user() additiv: das neue 3-Schritt-Registrierungs-
-- Onboarding (RegisterPage) erfasst optional bereits das Geburtsdatum und
-- übergibt es als Auth-Metadatum ("date_of_birth"), der Trigger übernahm es
-- bisher aber nicht nach public.profiles — Nutzer mussten es bei der ersten
-- Tour mit Mindestalter dadurch erneut eingeben (siehe CLAUDE.md §6, §14.3).
-- Bleibt weiterhin optional (NULL), wenn kein Wert mitgegeben wurde.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name, date_of_birth, privacy_policy_accepted_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || replace(new.id::text, '-', '')
    ),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'Unbekannt'),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'Unbekannt'),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    nullif(new.raw_user_meta_data ->> 'privacy_policy_accepted_at', '')::timestamptz
  );
  return new;
end;
$$;
