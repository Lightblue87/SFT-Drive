-- Das Kennzeichen ist personenbezogen und identifizierend (§7 Datenschutz:
-- "Kennzeichen sind nur für den jeweiligen User und Admin sichtbar"). Bei
-- Kontolöschung reicht die reine Profil-Anonymisierung dafür nicht aus — das
-- Kennzeichen stand bislang unverändert in jeder Touranmeldung (auch
-- vergangenen, archivierten) weiter. delete_own_account() entfernt es jetzt
-- zusätzlich aus ALLEN eigenen Registrierungen, unabhängig von Status oder
-- Tourzeitpunkt.
--
-- Hersteller/Modell/Leistung bleiben bewusst erhalten (nicht identifizierend,
-- Teil des historischen Fahrzeug-Snapshots im Tourenarchiv anderer bzw. für
-- Admin-Zwecke, siehe §8.8) — nur das Kennzeichen wird gelöscht.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reg record;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  for v_reg in
    select id, tour_id, status
    from public.tour_registrations
    where user_id = v_user_id
      and status in ('pending', 'confirmed', 'waitlisted')
  loop
    perform 1 from public.tours where id = v_reg.tour_id for update;

    update public.tour_registrations
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = v_reg.id;

    if v_reg.status = 'confirmed' then
      perform public.promote_next_waitlisted(v_reg.tour_id);
    end if;
  end loop;

  -- Kennzeichen aus jeder eigenen Registrierung entfernen, auch aus
  -- vergangenen/archivierten Touren, die oben nicht storniert werden.
  update public.tour_registrations
  set license_plate = null, updated_at = now()
  where user_id = v_user_id and license_plate is not null;

  update public.profiles
  set
    username = 'geloescht-' || left(replace(v_user_id::text, '-', ''), 8),
    first_name = 'Gelöscht',
    last_name = 'Nutzer',
    date_of_birth = null,
    privacy_policy_accepted_at = null,
    updated_at = now()
  where id = v_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
