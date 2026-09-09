-- Ergänzt send_friend_request() um In-App-Mitteilungen (siehe CLAUDE.md
-- §27.10/§27.13, §34.1): bisher erfuhr der Empfänger einer Freundschafts-
-- anfrage nur davon, wenn er von sich aus /profile/friends öffnete — weder
-- die Glocke im Header noch das Profil zeigten einen Hinweis. Ergänzt daher
-- reine Zusatz-Inserts in die bereits bestehende notifications-Tabelle,
-- keine neue Infrastruktur (§27.10: "bewusst nicht ausschließlich für
-- Restaurants gebaut"). Bei der stillschweigenden Auto-Annahme (Gegenseite
-- hatte bereits angefragt) wird stattdessen der ursprüngliche Anfragende
-- benachrichtigt, dass seine Anfrage angenommen wurde.
create or replace function public.send_friend_request(p_addressee_id uuid)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_existing record;
  v_my_username text;
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

  select username into v_my_username from public.profiles where id = v_me;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_me, p_addressee_id)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_addressee_id)
  for update;

  if not found then
    insert into public.friendships (requester_id, addressee_id, status)
    values (v_me, p_addressee_id, 'pending');

    insert into public.notifications (user_id, type, title, body, target_path)
    values (
      p_addressee_id,
      'FRIEND_REQUEST',
      'Neue Freundschaftsanfrage',
      '@' || v_my_username || ' möchte sich mit dir befreunden.',
      '/profile/friends'
    );

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

    insert into public.notifications (user_id, type, title, body, target_path)
    values (
      v_existing.requester_id,
      'FRIEND_REQUEST',
      'Freundschaftsanfrage angenommen',
      '@' || v_my_username || ' hat deine Freundschaftsanfrage angenommen.',
      '/profile/friends'
    );

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

  insert into public.notifications (user_id, type, title, body, target_path)
  values (
    p_addressee_id,
    'FRIEND_REQUEST',
    'Neue Freundschaftsanfrage',
    '@' || v_my_username || ' möchte sich mit dir befreunden.',
    '/profile/friends'
  );

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;
