-- Phase 12 — Freunde und Klarnamenfreigabe (siehe CLAUDE.md §34.1, §11, §8.9).
--
-- Die Freundschaftsfunktion hat aktuell genau einen Zweck: gegenseitige
-- Klarnamenfreigabe. Eine akzeptierte Freundschaft IST die Freigabe — es
-- gibt keinen separaten Schalter und keine gerichtete/einseitige Freigabe,
-- deshalb existiert absichtlich keine zweite Tabelle wie
-- `friend_name_shares`.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  updated_at timestamptz not null default now(),

  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- Verhindert sowohl doppelte Anfragen A->B als auch eine gleichzeitige
-- inverse Beziehung B->A: pro ungeordnetem Paar existiert immer nur eine
-- Zeile (unabhängig vom Status), die bei erneuter Anfrage nach Ablehnung
-- kontrolliert per RPC reaktiviert wird, statt eine zweite anzulegen.
create unique index friendships_unordered_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_requester_idx on public.friendships (requester_id, status);
create index friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

-- Nur die eigene Zeile lesen (als Requester oder Addressee). Keine Insert-/
-- Update-/Delete-Policies: alle Statusänderungen laufen ausschließlich über
-- die unten definierten SECURITY DEFINER RPCs, die auth.uid() serverseitig
-- bestimmen (§8.12).
create policy "friendships_select_own"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select on public.friendships to authenticated;

-- Hilfsfunktion: besteht zwischen zwei Usern eine akzeptierte Freundschaft?
-- Wird von get_confirmed_tour_vehicles (Phase-12-Ausnahme, §8.9) verwendet.
create or replace function public.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = p_user_a and f.addressee_id = p_user_b)
        or (f.requester_id = p_user_b and f.addressee_id = p_user_a)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Nutzersuche über den Username (§34.1: "User sollen andere Mitglieder
-- primär über den Username finden können"). Gibt bewusst nur id/username
-- zurück — keine E-Mail, keine Geburtsdaten, keine sonstigen Profildaten,
-- unabhängig vom Freundschaftsstatus.
create or replace function public.search_users_by_username(p_query text)
returns table (id uuid, username text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_query is null or length(trim(p_query)) < 2 then
    return;
  end if;

  return query
    select p.id, p.username
    from public.profiles p
    where p.id <> auth.uid()
      and p.username ilike '%' || trim(p_query) || '%'
    order by p.username
    limit 20;
end;
$$;

revoke all on function public.search_users_by_username(text) from public;
grant execute on function public.search_users_by_username(text) to authenticated;

-- Freundschaftsanfrage senden. Reaktiviert eine zuvor abgelehnte Beziehung
-- statt eine zweite Zeile für dasselbe Paar anzulegen (verhindert durch den
-- Unique-Index oben ohnehin). Existiert bereits eine eingehende Anfrage der
-- Gegenseite, wird sie direkt angenommen statt eine zweite offene Anfrage
-- zu erzeugen.
create or replace function public.send_friend_request(p_addressee_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_existing record;
begin
  if v_me is null then
    return ('UNAUTHENTICATED', null, null)::public.registration_result;
  end if;

  if p_addressee_id = v_me then
    return ('CANNOT_FRIEND_SELF', null, null)::public.registration_result;
  end if;

  if not exists (select 1 from public.profiles where id = p_addressee_id) then
    return ('USER_NOT_FOUND', null, null)::public.registration_result;
  end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_me, p_addressee_id)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_addressee_id)
  for update;

  if not found then
    insert into public.friendships (requester_id, addressee_id, status)
    values (v_me, p_addressee_id, 'pending');
    return ('OK', null, null)::public.registration_result;
  end if;

  if v_existing.status = 'accepted' then
    return ('ALREADY_FRIENDS', null, null)::public.registration_result;
  end if;

  if v_existing.status = 'pending' then
    if v_existing.requester_id = v_me then
      return ('REQUEST_ALREADY_SENT', null, null)::public.registration_result;
    end if;

    -- Die Gegenseite hatte bereits angefragt -> unsere Anfrage ist die
    -- Annahme dieser bestehenden Anfrage.
    update public.friendships
    set status = 'accepted', accepted_at = now(), updated_at = now()
    where id = v_existing.id;
    return ('OK', null, null)::public.registration_result;
  end if;

  -- status = 'rejected' -> kontrollierte Reaktivierung als neue Anfrage von uns.
  update public.friendships
  set requester_id = v_me,
      addressee_id = p_addressee_id,
      status = 'pending',
      accepted_at = null,
      updated_at = now()
  where id = v_existing.id;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

-- Eingehende Anfrage annehmen oder ablehnen. Nur der Addressee darf antworten.
create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row record;
begin
  select * into v_row from public.friendships where id = p_friendship_id for update;

  if not found then
    return ('FRIENDSHIP_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if v_row.addressee_id <> v_me then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if v_row.status <> 'pending' then
    return ('FRIENDSHIP_NOT_FOUND', null, null)::public.registration_result;
  end if;

  update public.friendships
  set status = case when p_accept then 'accepted' else 'rejected' end,
      accepted_at = case when p_accept then now() else null end,
      updated_at = now()
  where id = p_friendship_id;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- Eigene noch offene ausgehende Anfrage zurückziehen. Löscht die Zeile, damit
-- das Paar sofort wieder für eine neue Anfrage frei ist.
create or replace function public.cancel_friend_request(p_friendship_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  delete from public.friendships
  where id = p_friendship_id
    and requester_id = v_me
    and status = 'pending';

  if not found then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.cancel_friend_request(uuid) from public;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

-- Bestehende (akzeptierte) Freundschaft beenden. Löscht die Zeile, wodurch
-- die Klarnamenfreigabe sofort für beide Seiten entfällt (§34.1 Punkt 7).
create or replace function public.end_friendship(p_friendship_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  delete from public.friendships
  where id = p_friendship_id
    and (requester_id = v_me or addressee_id = v_me)
    and status = 'accepted';

  if not found then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.end_friendship(uuid) from public;
grant execute on function public.end_friendship(uuid) to authenticated;

-- Eigene Freundschaften/Anfragen gebündelt lesen (Freunde, eingehend,
-- ausgehend), mit minimalem Rückgabedatensatz (kein Klarname, keine E-Mail).
create or replace function public.list_my_friendships()
returns table (
  friendship_id uuid,
  other_user_id uuid,
  other_username text,
  status text,
  direction text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return;
  end if;

  return query
    select
      f.id,
      case when f.requester_id = v_me then f.addressee_id else f.requester_id end,
      p.username,
      f.status,
      case when f.requester_id = v_me then 'outgoing' else 'incoming' end,
      f.created_at
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = v_me then f.addressee_id else f.requester_id end
    where f.requester_id = v_me or f.addressee_id = v_me
    order by f.created_at desc;
end;
$$;

revoke all on function public.list_my_friendships() from public;
grant execute on function public.list_my_friendships() to authenticated;

-- Phase-12-Ausnahme für die Teilnehmer-Fahrzeugliste (§8.9): bei akzeptierter
-- Freundschaft zwischen Caller und dem jeweiligen Teilnehmer zusätzlich
-- first_name/last_name ausgeben. Rückgabetyp hat sich geändert (neue
-- Spalten) -> drop vor create or replace nötig (siehe §8.12 Praxis-Falle).
drop function if exists public.get_confirmed_tour_vehicles(uuid);

create or replace function public.get_confirmed_tour_vehicles(p_tour_id uuid)
returns table (
  registration_id uuid,
  username text,
  first_name text,
  last_name text,
  vehicle_manufacturer text,
  vehicle_model text,
  vehicle_power_ps integer,
  is_self boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.tour_registrations r
      where r.tour_id = p_tour_id and r.user_id = auth.uid() and r.status = 'confirmed'
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id as registration_id,
    p.username,
    case when public.are_friends(auth.uid(), r.user_id) then p.first_name else null end,
    case when public.are_friends(auth.uid(), r.user_id) then p.last_name else null end,
    r.vehicle_manufacturer,
    r.vehicle_model,
    r.vehicle_power_ps,
    r.user_id = auth.uid() as is_self
  from public.tour_registrations r
  join public.profiles p on p.id = r.user_id
  where r.tour_id = p_tour_id and r.status = 'confirmed'
  order by r.registered_at asc;
end;
$$;

revoke all on function public.get_confirmed_tour_vehicles(uuid) from public;
grant execute on function public.get_confirmed_tour_vehicles(uuid) to authenticated;
