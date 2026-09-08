# CLAUDE.md — SFT Drive

@docs/CLAUDE_SPEC_BASELINE.md

## 0. Verbindlicher aktueller Stand und Priorität

**WICHTIG:** Diese Root-`CLAUDE.md` bleibt die maßgebliche Einstiegsspezifikation für Claude Code. Die importierte Datei `docs/CLAUDE_SPEC_BASELINE.md` enthält die vollständige, historisch gewachsene Detail-Spezifikation. Falls Aussagen der importierten Baseline diesem Abschnitt widersprechen, gilt **immer der aktuellere Stand in dieser Root-Datei**.

Das Projekt ist **kein Greenfield-Projekt**. Vor Änderungen immer den vorhandenen Code, die Migrationen, RPCs, RLS-Policies, Edge Functions und die betroffenen UI-Flows lesen und bestehende Lösungen erweitern statt parallel neu aufzubauen.

Aktueller produktiver Stand:

- Repository: `Lightblue87/SFT-Drive`
- Production: `https://sft-drive.pages.dev`
- Kern-MVP (Phasen 1–8): umgesetzt
- Phase 9 — Notifications: umgesetzt
- Phase 10 — Tour Stops: umgesetzt
- Phase 11 — Restaurant Ordering: umgesetzt
- Supabase/Postgres/RLS/RPC bilden weiterhin die serverseitige Sicherheitsgrenze
- Cloudflare Pages bleibt das Frontend-Deployment
- Web Push läuft über eigenen Service Worker (`injectManifest`) und Supabase Edge Functions

Die detaillierte Definition of Done aus der Baseline bleibt als **Regression-Checkliste** bestehen. Neue Änderungen dürfen bereits funktionierende Kernanforderungen nicht brechen.

---

## 0.1 Aktuelle Ergänzungen zur Detail-Spezifikation

### Migrationen für Phase 9–11

Die Implementierung endet nicht bei `20260907082000`. Zum aktuellen Stand gehören mindestens die Migrationen:

```text
20260907081600_notifications.sql
20260907081700_notification_preferences_and_broadcast.sql
20260907081800_delete_notification.sql
20260907081900_tour_stops.sql
20260907082000_restaurant_ordering.sql
20260907082100_restaurant_order_notification_tracking.sql
20260907082200_admin_user_details_ban_delete.sql
20260907082300_fix_admin_list_users_email_type.sql
```

Bereits produktiv angewendete Migrationen niemals nachträglich umschreiben. Änderungen immer als neue Migration ergänzen.

### Restaurant-Notification-Tracking

`restaurant_stop_settings` besitzt zusätzlich zu `push_sent_at` auch:

```text
reminder_sent_at TIMESTAMPTZ NULL
```

Bedeutung:

- `push_sent_at` verhindert doppelten Versand von `RESTAURANT_ORDER_OPEN`
- `reminder_sent_at` verhindert doppelten Versand von `RESTAURANT_ORDER_REMINDER`
- Restaurant-Benachrichtigungen werden zeitgesteuert über die Edge Function `restaurant-order-notifications` ausgeführt
- der derzeitige Cron-Lauf erfolgt in 15-Minuten-Intervallen
- der Reminder ist für 24 Stunden vor Bestellfrist vorgesehen und richtet sich an bestätigte Teilnehmer ohne bereits eingereichte Bestellung

### Nutzerverwaltung `/admin/users`

Die Admin-Nutzerverwaltung ist inzwischen umfangreicher als die ursprüngliche Rollenübergabe.

Aktuell umgesetzt:

- Suche nach Username, Vorname, Nachname oder E-Mail
- Username und Klarname anzeigen
- E-Mail anzeigen
- Registrierungsdatum anzeigen
- Adminstatus anzeigen
- Sperrstatus anzeigen
- Adminrolle vergeben
- Adminrolle entziehen
- Nutzer sperren
- Nutzer entsperren
- Nutzerkonto administrativ löschen

Sicherheitsregeln:

- normale User dürfen `auth.users` weiterhin nicht direkt lesen
- E-Mail/Sperrstatus werden nur über kontrollierte Admin-Funktionen ausgegeben
- `service_role` darf ausschließlich serverseitig in Edge Functions verwendet werden
- `admin-manage-user` prüft zuerst gültige Authentifizierung und Adminstatus
- Selbstsperrung und administrative Selbstlöschung über diesen Weg sind verboten
- der letzte verbleibende Admin darf nicht entfernt werden
- vor endgültiger Auth-Löschung müssen abhängige Daten entsprechend der bestehenden Lösch-/Anonymisierungslogik behandelt werden

### Archivierte Touren

In `/admin/tours` sind `archived` Touren standardmäßig ausgeblendet. Eine Checkbox blendet sie bei Bedarf wieder ein und wird nur angezeigt, wenn archivierte Touren existieren.

### Tour-Stop-Formular

Der Admin-Flow für Tour-Stopps verwendet wie das Tourformular einen lokalen Formularentwurf, damit Eingaben bei iOS-Safari-Reloads oder beim Verlassen und Zurückkehren nicht unnötig verloren gehen. Nach erfolgreichem Speichern wird der Entwurf bereinigt.

### Admin-Navigation

Die aktuelle Admin-Unternavigation ist auf allen `/admin/*`-Seiten verfügbar und lautet in dieser Reihenfolge:

```text
Dashboard
Tourenverwaltung
Mitteilungen
Nutzer
Impressum & Datenschutz
```

Tour-Stopps werden tourbezogen aus der Tourenverwaltung geöffnet, nicht als globaler Hauptnavigationseintrag.

---

## 0.2 Change Management ab aktuellem Stand

Bei jeder weiteren Aufgabe:

1. vorhandene Implementierung zuerst lesen
2. prüfen, ob die gewünschte Funktion bereits vollständig oder teilweise existiert
3. bestehende Architektur erweitern statt duplizieren
4. produktiv angewendete Migrationen nicht verändern, sondern neue Migrationen ergänzen
5. RLS, RPC-Berechtigungen und serverseitige Validierung bei Datenänderungen explizit prüfen
6. historische Tour- und Registrierungsdaten erhalten
7. bei Service-Worker-Änderungen Push-, Offline- und `injectManifest`-Verhalten gemeinsam prüfen
8. Build, Linter und vorhandene Tests nach relevanten Änderungen ausführen
9. Regressionstests ergänzen, wenn Kernanforderungen betroffen sind
10. README und diese Root-`CLAUDE.md` aktualisieren, wenn sich der dauerhaft relevante Implementierungsstand ändert

Keine zweite konkurrierende Produktarchitektur einführen. Die importierte Baseline ist Detailreferenz; diese Root-Datei definiert den jeweils aktuellen, verbindlichen Stand und überschreibt veraltete Baseline-Aussagen.