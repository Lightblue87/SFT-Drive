-- Admin-Verwaltung anderer Nutzer als Admin (siehe §21.3 "/admin/users" — bisher
-- bewusst zurückgestellt, jetzt explizit gewünscht: einfache Admin-Übergabe, falls
-- der verantwortliche Admin sich einmal ändern sollte, ohne dass jemand mit
-- Datenbankzugriff manuell SQL ausführen muss).
--
-- Bleibt streng serverseitig abgesichert: kein Client-Insert/-Delete auf
-- user_roles ist möglich (siehe 20260907080000, dort bewusst keine Policies),
-- ausschließlich diese beiden SECURITY DEFINER Funktionen können Rollen lesen
-- bzw. ändern, und beide prüfen is_admin() serverseitig — es entsteht kein
-- öffentlich erreichbarer "Make me admin"-Mechanismus (§8.2).

-- Nutzerliste mit Adminstatus für die Admin-Oberfläche. Gibt für Nicht-Admins
-- bewusst keine Zeilen zurück, statt einen Fehler zu werfen.
create or replace function public.admin_list_users()
returns table (id uuid, username text, first_name text, last_name text, is_admin boolean)
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
      exists (
        select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'admin'
      ) as is_admin
    from public.profiles p
    order by p.username;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- Admin-Rolle für einen bestehenden User setzen oder entziehen.
-- Verhindert, dass der letzte verbleibende Admin sich selbst (oder ein anderer
-- Admin den letzten) die Rolle entzieht — sonst könnte niemand mehr die
-- Admin-Oberfläche erreichen.
create or replace function public.admin_set_admin_role(p_user_id uuid, p_grant boolean)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if p_grant then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  else
    select count(*) into v_admin_count from public.user_roles where role = 'admin';

    if v_admin_count <= 1 then
      return ('LAST_ADMIN', null, null)::public.registration_result;
    end if;

    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_set_admin_role(uuid, boolean) from public;
grant execute on function public.admin_set_admin_role(uuid, boolean) to authenticated;
