-- Exakte Wartelistenposition für den eigenen Account (siehe CLAUDE.md §9.5, §14.5).
-- Verwendet ausschließlich auth.uid() und zählt ausschließlich die eigene,
-- bereits über RLS lesbare Registrierung sowie eine reine Zählung anderer
-- Wartelisteneinträge — keine fremden Registrierungsdetails werden ausgegeben.
create or replace function public.get_my_waitlist_position(p_tour_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_reg public.tour_registrations%rowtype;
  v_position integer;
begin
  if v_user_id is null then
    return null;
  end if;

  select * into v_my_reg
  from public.tour_registrations
  where tour_id = p_tour_id and user_id = v_user_id and status = 'waitlisted';

  if not found then
    return null;
  end if;

  select count(*) + 1 into v_position
  from public.tour_registrations
  where tour_id = p_tour_id
    and status = 'waitlisted'
    and (
      registered_at < v_my_reg.registered_at
      or (registered_at = v_my_reg.registered_at and id < v_my_reg.id)
    );

  return v_position;
end;
$$;

revoke all on function public.get_my_waitlist_position(uuid) from public;
grant execute on function public.get_my_waitlist_position(uuid) to authenticated;


-- Selbstbedienungs-Kontolöschung (siehe CLAUDE.md §7 Datenschutz).
--
-- WICHTIG — bekannte Einschränkung: Diese Funktion löscht NICHT den
-- zugrundeliegenden Supabase-Auth-Account (auth.users) — ein Login mit
-- denselben Zugangsdaten bleibt technisch möglich. Vollständige Löschung des
-- Auth-Accounts erfordert die Supabase Auth Admin API mit dem service_role
-- Key, der niemals im Client verwendet werden darf (§6 Sicherheitsregeln).
-- Bis eine serverseitige Lösung (z. B. Supabase Edge Function) existiert,
-- anonymisiert diese Funktion stattdessen alle personenbezogenen Daten des
-- Profils und storniert aktive Anmeldungen (inkl. Wartelisten-Nachrücken) —
-- fachlich entspricht das einer Kontolöschung aus Nutzersicht.
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
