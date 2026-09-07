-- Macht handle_new_user() defensiv gegen fehlende Metadaten, damit auch über das
-- Supabase-Dashboard ("Authentication → Users → Add user", z. B. zum Bootstrap des
-- ersten Admins) angelegte Nutzer nicht am NOT-NULL-Constraint von profiles scheitern.
-- Die reguläre App-Registrierung liefert weiterhin immer echte Werte (siehe §6).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name, privacy_policy_accepted_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || replace(new.id::text, '-', '')
    ),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'Unbekannt'),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'Unbekannt'),
    nullif(new.raw_user_meta_data ->> 'privacy_policy_accepted_at', '')::timestamptz
  );
  return new;
end;
$$;
