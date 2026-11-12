-- Korrektur zu 20261111010000 (Phase 22, CLAUDE.md §42), aus dem PR-Review.
--
-- `admin_user_notes.created_by` und `driver_ratings.rated_by` verweisen mit
-- ON DELETE SET NULL auf auth.users. Wird ein Admin-Konto gelöscht, setzt
-- Postgres die Spalte per UPDATE auf NULL — und dieses UPDATE läuft durch die
-- BEFORE-UPDATE-Trigger beider Tabellen:
--
--   * Der Notiz-Trigger stellte `created_by` wieder auf den alten Wert zurück,
--     wodurch das Löschen des Kontos an der Fremdschlüsselprüfung scheiterte.
--   * Der Bewertungs-Trigger prüfte erneut die bestätigte Teilnahme und brach
--     mit NOT_A_CONFIRMED_PARTICIPANT ab, sobald der bewertete Fahrer
--     inzwischen nicht mehr `confirmed` war.
--
-- In beiden Fällen blieb nach `delete-account`/`admin-manage-user` ein bereits
-- anonymisiertes Profil mit weiterhin bestehendem Auth-Konto zurück. Das reine
-- Entfernen des Verfasser-/Bearbeiterbezugs wird deshalb jetzt durchgelassen,
-- ohne es als inhaltliche Änderung zu behandeln.

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
    new.created_at := old.created_at;
    -- Der Verfasser darf nicht umgeschrieben, aber entfernt werden
    -- (ON DELETE SET NULL beim Löschen des Verfasserkontos).
    if new.created_by is not null then
      new.created_by := old.created_by;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

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

    -- Reines Entfernen des Bearbeiterbezugs (ON DELETE SET NULL beim Löschen
    -- des Bearbeiterkontos): keine Bewertungsänderung, also weder erneut
    -- prüfen noch Bearbeiter/Zeitstempel neu setzen.
    if new.rated_by is null
      and old.rated_by is not null
      and new.vehicle_control = old.vehicle_control
      and new.convoy_discipline = old.convoy_discipline
      and new.rules_safety = old.rules_safety
      and new.comment is not distinct from old.comment
    then
      return new;
    end if;
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
