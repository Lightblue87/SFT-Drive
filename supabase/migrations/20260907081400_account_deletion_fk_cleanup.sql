-- Kontolöschung ruft am Ende auth.admin.deleteUser() auf (Edge Function
-- supabase/functions/delete-account). profiles, user_roles und die eigenen
-- tour_registrations sind bereits `on delete cascade` auf auth.users(id) und
-- werden dadurch beim Löschen des Auth-Accounts vollständig entfernt — nicht
-- nur anonymisiert (die Anonymisierung in delete_own_account() ist nur ein
-- Sicherheitsnetz für den Fall, dass der Auth-Löschschritt danach fehlschlägt).
--
-- tours.created_by, tour_registrations.confirmed_by und .rejected_by hatten
-- dagegen KEINE on-delete-Aktion (Standard "no action"/restrict). Für einen
-- User, der selbst niemals Admin war, macht das keinen Unterschied. Für einen
-- Admin, der bereits Touren erstellt oder fremde Anmeldungen bestätigt/
-- abgelehnt hat, hätte die Kontolöschung dagegen mit einem Fremdschlüssel-
-- Fehler fehlgeschlagen — nachdem delete_own_account() das eigene Profil
-- bereits anonymisiert hat, also in einem inkonsistenten Zwischenzustand
-- (Profil anonymisiert, Auth-Login aber weiterhin gültig). Diese drei Spalten
-- werden deshalb auf "on delete set null" umgestellt (sie sind bereits
-- nullable) — die betroffenen historischen Zeilen bleiben bestehen, verlieren
-- nur den Verweis auf den gelöschten Admin-Account.
alter table public.tours
  drop constraint tours_created_by_fkey,
  add constraint tours_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.tour_registrations
  drop constraint tour_registrations_confirmed_by_fkey,
  add constraint tour_registrations_confirmed_by_fkey
    foreign key (confirmed_by) references auth.users (id) on delete set null;

alter table public.tour_registrations
  drop constraint tour_registrations_rejected_by_fkey,
  add constraint tour_registrations_rejected_by_fkey
    foreign key (rejected_by) references auth.users (id) on delete set null;
