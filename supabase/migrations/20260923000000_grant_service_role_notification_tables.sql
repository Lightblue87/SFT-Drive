-- Fix: service_role fehlten Tabellenrechte für direkte Abfragen aus den
-- Edge Functions send-push, restaurant-order-notifications und
-- tour-interest-notifications (§27.10-§27.22, §35.3, §36.10).
--
-- Diese Functions authentifizieren sich intern mit dem Service-Role-Key und
-- greifen per `adminClient.from(...)` direkt über PostgREST auf Tabellen zu
-- (nicht über SECURITY DEFINER RPCs, deren Owner-Rechte davon unberührt
-- bleiben). `service_role` besitzt zwar BYPASSRLS, das umgeht aber nur
-- RLS-Policies -- ohne ein explizites GRANT auf die Tabelle selbst schlägt
-- der Zugriff trotzdem mit "permission denied" fehl. Alle bisherigen
-- Migrationen haben ausschließlich `authenticated`/`anon` berechtigt, nie
-- `service_role` -- dadurch lieferten Push/E-Mail-Empfängerabfragen in
-- send-push seit jeher leere Ergebnisse (siehe Debugging-Log
-- "permission denied for table tour_registrations", 23.09.2026), und
-- vermutlich ebenso die zeitgesteuerten Pushes in
-- restaurant-order-notifications/tour-interest-notifications, ohne dass
-- dies bisher auffiel (§27.16: Push-Fehlschlag blockiert die App nicht,
-- wurde deshalb nie sichtbar gemeldet).
--
-- Nur die tatsächlich per Code genutzten Operationen je Tabelle, keine
-- generischen Vollzugriffe (§8.12 "keine generischen Admin-Bypass-
-- Funktionen"). RLS bleibt für alle anderen Rollen unverändert bestehen --
-- service_role umgeht sie ohnehin bereits kraft BYPASSRLS, dieses GRANT
-- ändert daran nichts an der Sicherheitsgrenze für `authenticated`/`anon`.

grant select, delete on public.push_subscriptions to service_role;
grant select on public.tour_registrations to service_role;
grant select, update on public.restaurant_stop_settings to service_role;
grant insert on public.notifications to service_role;
grant select on public.meal_orders to service_role;
grant select, update on public.tour_interests to service_role;
grant select on public.tours to service_role;
grant select on public.tour_stops to service_role;
