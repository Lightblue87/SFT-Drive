-- Erweiterte Nutzerverwaltung (siehe CLAUDE.md §21.3, §27.20 "/admin/users").
-- Bisher konnte ein Admin dort nur die Admin-Rolle vergeben/entziehen —
-- jetzt zusätzlich: E-Mail/Registrierungsdatum/Sperrstatus einsehen, Konto
-- sperren/entsperren, Konto vollständig löschen (z. B. bei Missbrauch oder
-- auf Löschwunsch eines Nutzers per anderem Kanal).

-- admin_list_users() liefert jetzt zusätzlich E-Mail, Registrierungsdatum und
-- Sperrstatus. E-Mail/Sperrstatus liegen in auth.users, nicht in profiles
-- (§8.1 "E-Mail nicht unnötig duplizieren") — als SECURITY DEFINER-Funktion
-- darf sie das lesen, ein normaler Client-Query auf auth.users bleibt
-- weiterhin unmöglich.
--
-- Rückgabetyp hat sich geändert (neue Spalten) — Postgres erlaubt kein
-- CREATE OR REPLACE über eine andere OUT-Parameter-Signatur hinweg.
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz,
  is_admin boolean,
  is_banned boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;

  return query
    select
      p.id,
      p.username,
      p.first_name,
      p.last_name,
      u.email,
      p.created_at,
      exists (
        select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'admin'
      ) as is_admin,
      (u.banned_until is not null and u.banned_until > now()) as is_banned
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.username;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- Admin-seitige Kontolöschung für einen ANDEREN User (Selbstlöschung bleibt
-- über delete_own_account()/die Edge Function "delete-account" auf /profile).
-- Identische Anonymisierungslogik wie delete_own_account, nur admin-gated und
-- mit explizitem p_user_id statt auth.uid(). Verhindert wie
-- admin_set_admin_role das Entfernen des letzten verbleibenden Admins sowie
-- die Selbstlöschung über diesen Weg (dafür existiert bereits /profile).
create or replace function public.admin_delete_user_account(p_user_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
  v_reg record;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if p_user_id = auth.uid() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin') then
    select count(*) into v_admin_count from public.user_roles where role = 'admin';
    if v_admin_count <= 1 then
      return ('LAST_ADMIN', null, null)::public.registration_result;
    end if;
  end if;

  for v_reg in
    select id, tour_id, status
    from public.tour_registrations
    where user_id = p_user_id
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

  update public.tour_registrations
  set license_plate = null, updated_at = now()
  where user_id = p_user_id and license_plate is not null;

  update public.profiles
  set
    username = 'geloescht-' || left(replace(p_user_id::text, '-', ''), 8),
    first_name = 'Gelöscht',
    last_name = 'Nutzer',
    date_of_birth = null,
    privacy_policy_accepted_at = null,
    updated_at = now()
  where id = p_user_id;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_delete_user_account(uuid) from public;
grant execute on function public.admin_delete_user_account(uuid) to authenticated;
