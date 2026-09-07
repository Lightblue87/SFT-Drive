-- Phase 9 — Notifications (siehe CLAUDE.md §27.10-§27.19).
--
-- In-App Notification Center zuerst als eigenständig nutzbares Feature: Admin
-- kann bestätigten Teilnehmern einer Tour eine Mitteilung schicken (Admin
-- Notification Trigger), jeder User sieht ausschließlich seine eigenen
-- Mitteilungen. Push-Zustellung folgt als nächster Schritt (Subscription-
-- Speicherung ist hier bereits vorbereitet, siehe push_subscriptions).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tour_id uuid references public.tours (id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  target_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Nur eigene Mitteilungen lesbar. Kein INSERT/UPDATE/DELETE für Clients —
-- Erstellung ausschließlich über admin_send_tour_notification() (bzw. später
-- weitere Trigger-RPCs), "gelesen"-Markierung ausschließlich über
-- mark_notification_read() (§27.14 "User sieht nur eigene Notifications").
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

grant select on public.notifications to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_at = now()
  where id = p_id and user_id = auth.uid() and read_at is null;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- Admin Notification Trigger: Mitteilung an alle bestätigten Teilnehmer einer
-- Tour (§27.11 "Push-Empfänger standardmäßig nur an bestätigte Teilnehmer").
create or replace function public.admin_send_tour_notification(p_tour_id uuid, p_title text, p_body text)
returns public.registration_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour public.tours%rowtype;
begin
  if not public.is_admin() then
    return ('FORBIDDEN', null, null)::public.registration_result;
  end if;

  select * into v_tour from public.tours where id = p_tour_id;
  if not found then
    return ('TOUR_NOT_FOUND', null, null)::public.registration_result;
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    return ('VEHICLE_DATA_INVALID', null, null)::public.registration_result;
  end if;

  insert into public.notifications (user_id, tour_id, type, title, body, target_path)
  select tr.user_id, p_tour_id, 'ADMIN_MESSAGE', trim(p_title), trim(p_body), '/tours/' || v_tour.slug
  from public.tour_registrations tr
  where tr.tour_id = p_tour_id and tr.status = 'confirmed';

  return ('OK', null, null)::public.registration_result;
end;
$$;

revoke all on function public.admin_send_tour_notification(uuid, text, text) from public;
grant execute on function public.admin_send_tour_notification(uuid, text, text) to authenticated;

-- Push Subscriptions (§27.15). Niedrige Sensitivität, rein gerätebezogen —
-- im Gegensatz zu notifications hier eine normale Self-Service-Policy statt
-- RPC-Zwang, der User verwaltet ausschließlich seine eigenen Einträge.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
