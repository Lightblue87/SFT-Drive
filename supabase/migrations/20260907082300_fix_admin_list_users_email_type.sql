-- Fix für "structure of query does not match function result type" in
-- admin_list_users() (siehe 20260907082200): auth.users.email ist in
-- Supabase intern character varying(255), nicht text. Ein normales SELECT
-- akzeptiert das anstandslos, aber RETURN QUERY in PL/pgSQL verlangt eine
-- exakte Typübereinstimmung mit der deklarierten Rückgabesignatur — ohne
-- automatischen varchar->text-Cast. Deshalb hier explizit auf text casten.
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
      u.email::text,
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
