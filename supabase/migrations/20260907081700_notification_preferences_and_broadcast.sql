-- Erweiterung von Phase 9 (siehe CLAUDE.md §27.10): regionsbasierte
-- Benachrichtigungspräferenzen für normale User + Admin-Broadcast an alle
-- Nutzer (bisher nur pro Tour möglich, was für allgemeine Ankündigungen
-- unpraktisch war).

-- Selbstverwaltete Präferenzen, analog zu push_subscriptions: niedrige
-- Sensitivität (reine Vorliebe, keine sicherheitskritische Entscheidung),
-- deshalb normale Self-Service-RLS-Policy statt RPC-Zwang.
create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  region text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, region)
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_own"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.notification_preferences to authenticated;

-- Automatisch beim Veröffentlichen einer Tour auslösen (serverseitig statt auf
-- ein Frontend angewiesen, das daran denken muss): sobald eine Tour neu auf
-- 'published' gesetzt wird (Insert direkt als published, oder Statuswechsel
-- von einem anderen Status), werden alle User benachrichtigt, die diese
-- Region abonniert haben. NOT EXISTS verhindert Doppel-Benachrichtigungen bei
-- weiteren Bearbeitungen derselben bereits veröffentlichten Tour.
create or replace function public.notify_region_subscribers_on_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications (user_id, tour_id, type, title, body, target_path)
    select
      np.user_id,
      new.id,
      'NEW_TOUR_IN_REGION',
      'Neue Tour in ' || new.region,
      new.title || ' — ' || to_char(new.start_date, 'DD.MM.YYYY'),
      '/tours/' || new.slug
    from public.notification_preferences np
    where np.region = new.region
      and not exists (
        select 1 from public.notifications n
        where n.user_id = np.user_id and n.tour_id = new.id and n.type = 'NEW_TOUR_IN_REGION'
      );
  end if;
  return new;
end;
$$;

create trigger tours_notify_region_subscribers
  after insert or update on public.tours
  for each row execute function public.notify_region_subscribers_on_publish();

-- Admin-Broadcast an alle registrierten Nutzer (nicht an eine bestimmte Tour
-- gebunden — z. B. allgemeine Ankündigungen).
create or replace function public.admin_send_broadcast_notification(p_title text, p_body text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  insert into public.notifications (user_id, type, title, body, target_path)
  select id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), null
  from public.profiles;

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_broadcast_notification(text, text) from public;
grant execute on function public.admin_send_broadcast_notification(text, text) to authenticated;
