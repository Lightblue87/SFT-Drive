-- Phase 17 — Tour-Kommunikation über WhatsApp-Gruppenlink (siehe CLAUDE.md §35.2).
--
-- Participant-Inhalt wie kurviger_url/zello_url auf derselben Tabelle — RLS
-- ist dort bereits korrekt (nur bestätigte Teilnehmer und Admins, siehe
-- 20260907080350), keine Änderung an Policies nötig.
alter table public.tour_participant_details
  add column whatsapp_group_url text null;
