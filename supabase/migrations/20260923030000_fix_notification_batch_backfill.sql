-- Korrektur zu 20260923020000_notification_read_receipts.sql.
--
-- notifications.batch_id wurde dort mit `default gen_random_uuid()` ergänzt.
-- gen_random_uuid() ist VOLATILE -- Postgres nutzt für ADD COLUMN ... DEFAULT
-- den schnellen "fast default"-Pfad nur bei konstanten Defaults; bei einem
-- volatilen Default findet stattdessen ein vollständiger Table-Rewrite statt,
-- bei dem der Default für JEDE bestehende Zeile einzeln neu ausgewertet wird.
-- Jede vor dieser Migration bereits versendete Admin-Mitteilung
-- (admin_send_tour_notification/admin_send_broadcast_notification) bekam
-- dadurch pro Empfängerzeile eine eigene, unterschiedliche batch_id --
-- eine ursprünglich an mehrere Teilnehmer gesendete Mitteilung erschien im
-- "Verlauf" seither als mehrere einzelne "1/1 gelesen"-Einträge statt als
-- ein gemeinsamer Versand.
--
-- Alle Empfängerzeilen eines einzelnen admin_send_*-Aufrufs stammen aus
-- derselben INSERT...SELECT-Anweisung und teilen sich deshalb denselben
-- Anweisungszeitpunkt (created_at default now(), innerhalb einer Anweisung
-- konstant) -- (type, tour_id, title, body, created_at) identifiziert damit
-- zuverlässig, welche Zeilen ursprünglich zusammengehörten. Dient hier
-- ausschließlich der einmaligen Rückwirkungskorrektur, nicht als dauerhafter
-- Ersatz für batch_id.

with groups as (
  select
    type,
    tour_id,
    title,
    body,
    created_at,
    -- uuid besitzt keinen eingebauten min()-Aggregatstyp -- über text sortieren.
    min(batch_id::text)::uuid as canonical_batch_id
  from public.notifications
  where type = 'ADMIN_MESSAGE'
  group by type, tour_id, title, body, created_at
  having count(*) > 1
)
update public.notifications n
set batch_id = g.canonical_batch_id
from groups g
where n.type = g.type
  and n.tour_id is not distinct from g.tour_id
  and n.title = g.title
  and n.body = g.body
  and n.created_at = g.created_at
  and n.batch_id <> g.canonical_batch_id;
