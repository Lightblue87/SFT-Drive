-- Phase 21 — Optionale Telefonnummer für Freunde (siehe CLAUDE.md §41, §34.1).
--
-- User können freiwillig eine Telefonnummer hinterlegen, um z. B. nach einer
-- Ausfahrt mit Freunden in Kontakt zu bleiben. Sichtbar ist sie ausschließlich
-- für akzeptierte Freunde — nicht für andere Teilnehmer und bewusst auch nicht
-- für Admins.
--
-- Deshalb liegt die Nummer NICHT in `profiles`: dort greift die Policy
-- `profiles_select_own_or_admin`, Admins könnten eine zusätzliche Spalte also
-- direkt lesen. RLS schützt Zeilen, keine Spalten (§8 "Sichtbarkeitsstufen
-- physisch trennen") — die Nummer bekommt eine eigene Tabelle mit reiner
-- Owner-Policy.

create table public.user_phone_numbers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Ausschließlich E.164 (z. B. +491711234567). Das Frontend normalisiert die
  -- Eingabe; die Prüfung hier ist die verbindliche serverseitige Validierung.
  phone_number text not null check (phone_number ~ '^\+[1-9][0-9]{6,14}$'),
  -- Freigabe pausieren, ohne die Nummer zu löschen.
  share_with_friends boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_phone_numbers enable row level security;

-- Reines Self-Service-CRUD auf die eigene Zeile, analog `vehicles`
-- (20260908093000). Absichtlich KEINE Admin-Ausnahme und keine Policy für
-- Freunde: Freunde erhalten die Nummer ausschließlich über die kontrollierte
-- RPC `list_my_friendships()` unten.
create policy "user_phone_numbers_own"
  on public.user_phone_numbers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_phone_numbers to authenticated;

-- `list_my_friendships()` liefert zusätzlich die Telefonnummer des Freundes —
-- ausschließlich bei `accepted` UND aktiver Freigabe. Eine offene oder
-- abgelehnte Anfrage gibt weiterhin nichts frei (§34.1 Punkt 3); mit dem
-- Beenden der Freundschaft entfällt die Zeile und damit auch die Nummer.
-- Rückgabesignatur ändert sich (neue Spalte) — CREATE OR REPLACE kann das
-- nicht, die Funktion muss deshalb zuerst entfernt werden (§8.12).
drop function if exists public.list_my_friendships();

create function public.list_my_friendships()
returns table (
  friendship_id uuid,
  other_user_id uuid,
  other_username text,
  other_first_name text,
  other_last_name text,
  other_phone_number text,
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
      p.id,
      p.username,
      case when f.status = 'accepted' then p.first_name else null end,
      case when f.status = 'accepted' then p.last_name else null end,
      case when f.status = 'accepted' and ph.share_with_friends then ph.phone_number else null end,
      f.status,
      case when f.requester_id = v_me then 'outgoing' else 'incoming' end,
      f.created_at
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = v_me then f.addressee_id else f.requester_id end
    left join public.user_phone_numbers ph on ph.user_id = p.id
    where f.requester_id = v_me or f.addressee_id = v_me
    order by f.created_at desc;
end;
$$;

revoke all on function public.list_my_friendships() from public;
grant execute on function public.list_my_friendships() to authenticated;
