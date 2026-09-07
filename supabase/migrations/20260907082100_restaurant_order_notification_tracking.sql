-- Nachrüstung der in CLAUDE.md §27.20 als offen dokumentierten Punkte:
-- automatische Pushes bei Bestellungsöffnung (RESTAURANT_ORDER_OPEN) und
-- Erinnerung kurz vor Fristablauf (RESTAURANT_ORDER_REMINDER, §27.10).
--
-- push_sent_at existiert bereits (verhindert Doppel-Versand bei "geöffnet").
-- reminder_sent_at fehlt noch für den zweiten, unabhängigen Zeitpunkt.
alter table public.restaurant_stop_settings
  add column reminder_sent_at timestamptz;
