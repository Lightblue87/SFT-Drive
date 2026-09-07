-- Übernimmt die beim Onboarding erfassten Felder (Username, Vorname, Nachname,
-- Datenschutz-Zustimmung) aus auth.users.raw_user_meta_data in profiles
-- (siehe CLAUDE.md §6). Läuft in derselben Transaktion wie der Auth-Signup —
-- eine verletzte Username-Eindeutigkeit lässt den gesamten Signup fehlschlagen.

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
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    nullif(new.raw_user_meta_data ->> 'privacy_policy_accepted_at', '')::timestamptz
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
