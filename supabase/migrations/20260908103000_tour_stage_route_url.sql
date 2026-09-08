-- Phase 15 — Tagesrouten für Mehrtagestouren (siehe CLAUDE.md §34.4).
--
-- Ergänzt das bereits bestehende tour_stages (20260907080350) um ein
-- anbieterneutrales Routen-Linkfeld, statt die alte Migration nachträglich
-- umzuschreiben. `kurviger_url` bleibt unangetastet und wird clientseitig
-- weiterhin als Fallback berücksichtigt, falls für eine ältere Etappe schon
-- ein Wert existiert, aber noch kein `route_url` gesetzt wurde.
alter table public.tour_stages
  add column route_url text null;
