# CLAUDE.md — SFT Drive

## 1. Projektziel

Entwickle **SFT Drive**, eine moderne, mobile-first Progressive Web App (PWA) zur Organisation und Planung von gemeinsamen Sportwagen-Ausfahrten für Sportfahrer Treff.

Die Anwendung soll dauerhaft mit möglichst **0 € laufenden Kosten** betrieben werden können, solange die Nutzung innerhalb der Free-Tier-Grenzen der eingesetzten Dienste bleibt.

Das Projekt befindet sich im GitHub-Repository `Lightblue87/SFT-Drive` und ist als produktive PWA unter `https://sft-drive.pages.dev` deployed. Der Kern-MVP sowie die später ergänzten Phasen 9–11 (Notifications, Tour Stops und Restaurant Ordering) sind umgesetzt. Diese Datei beschreibt daher sowohl die verbindliche Produktarchitektur als auch den tatsächlich implementierten Stand. Neue Arbeiten müssen vom bestehenden Code ausgehen und dürfen das Projekt nicht wie ein Greenfield-Projekt behandeln.

Die Anwendung benötigt:

- öffentliche Inhalte, die ohne Anmeldung gelesen werden können,
- Benutzerregistrierung und Login,
- geschützte Inhalte für registrierte Benutzer,
- einen Admin-Bereich,
- Erstellung und Verwaltung von Ausfahrten durch Administratoren,
- verbindliche Anmeldung registrierter Benutzer zu Ausfahrten,
- eine vom Admin definierbare maximale Fahrzeugzahl pro Ausfahrt,
- Erfassung der Personenzahl pro angemeldetem Fahrzeug für z. B. Restaurantreservierungen,
- eine integrierte Warteliste,
- automatische oder manuelle Bestätigung von Touranmeldungen je Event,
- technisch sichere Verhinderung von Überbuchungen,
- PWA-Funktionalität für iOS, Android und Desktop.

Die bestehende Anwendung soll weiter so strukturiert werden, dass spätere Erweiterungen möglich sind, ohne funktionierende Bereiche unnötig zu verkomplizieren oder neu zu bauen.

### 1.1 Produktname und Branding

Der Produktname ist verbindlich:

```text
SFT Drive
```

Dachmarke / Community:

```text
Sportfahrer Treff
```

Optionaler Markenhinweis:

```text
SFT Drive
by Sportfahrer Treff
```

Vorgaben:

- App-Name: `SFT Drive`
- PWA Short Name: `SFT Drive`
- Repository-/Projektbezeichnung bevorzugt: `sft-drive`
- sichtbarer Header darf `SFT Drive` verwenden
- `Sportfahrer Treff` kann als Dachmarke oder dezente Subline erscheinen
- das Branding soll Rot / Schwarz / Weiß aufgreifen
- das bestehende Sportfahrer-Treff-Tacho-Logo dient als visuelle Markenreferenz
- für App-Icon und Splashscreen bevorzugt den Tacho-/Drehzahlmesser-Charakter verwenden
- keine fremden Markenlogos als Bestandteil des eigenen Brandings verwenden

### 1.2 Verbindliche Produktentscheidungen

Diese Regeln sind für das MVP verbindlich:

- Die Kapazität einer Tour wird ausschließlich in **Fahrzeugen** gemessen, nicht in Personen.
- Eine Touranmeldung entspricht genau einem Fahrzeug.
- Die Anzahl der Personen im Fahrzeug ist für organisatorische Zwecke relevant, begrenzt aber nicht die Tourkapazität.
- Bei der Touranmeldung werden Hersteller, Modell und Leistung in PS des eingesetzten Fahrzeugs erfasst.
- Das Kennzeichen ist grundsätzlich optional. Der Admin kann es pro Tour auf verpflichtend setzen.
- Fahrzeugdaten werden im MVP tourbezogen an der Anmeldung gespeichert. Es gibt zunächst keine globale Fahrzeuggarage im Benutzerprofil.
- Eine Warteliste ist fester Bestandteil der Anwendung.
- Der Admin entscheidet pro Tour zwischen automatischer Bestätigung und manueller Freigabe.
- Ein Beifahrer bzw. zusätzliche Personen können bereits bei der Anmeldung angegeben und bis zu einer vom Admin festgelegten Deadline geändert werden.
- Bestätigte Fahrer dürfen bei einer Tour sehen, welche bestätigten Fahrzeuge mitfahren.
- Dabei wird der Username angezeigt, nicht der Klarname.
- Kennzeichen werden anderen Teilnehmern niemals angezeigt.
- Eine spätere Freundesfunktion soll gegenseitige Freigabe des Klarnamens ermöglichen.
- Touren werden derzeit extern mit Kurviger geplant. Die App muss einen Kurviger-Link je Tour speichern und bereitstellen können.
- Öffentlich sichtbar sind mindestens Region, Streckenlänge und Datum der Tour.
- Für die Kommunikation während der Fahrt wird Zello verwendet. Ein Zello-Link kann je Tour hinterlegt werden.
- Treffpunkt, Kurviger-Link und Zello-Informationen sind standardmäßig nur für bestätigte Teilnehmer sichtbar.
- Der Admin kann je Tour Fahrzeug- und Fahreranforderungen festlegen:
  - maximale Fahrzeugzahl,
  - Mindestleistung in PS,
  - optionale Maximalleistung in PS,
  - optionales Mindestalter des Fahrers.
- Fahreranforderungen müssen serverseitig bei der Anmeldung geprüft werden.
- Jeder User besitzt ein persönliches Tourenarchiv.
- Dort werden vergangene, bestätigte Teilnahmen dauerhaft nachvollziehbar dargestellt.
- Das Archiv zeigt mindestens Tour, Datum/Zeitraum, Region und das bei dieser Tour angemeldete Fahrzeug.
- Das Tourenarchiv basiert auf historischen Registrierungsdaten und darf nicht davon abhängen, dass der User Fahrzeugdaten später in einem Profil ändert.
- Touren können eintägig oder mehrtägig sein.
- Mehrtagestouren werden im Kalender visuell anders dargestellt als eintägige Touren.
- Eintägige Touren verwenden im Kalender einen Eventpunkt.
- Mehrtagestouren verwenden einen farbigen, zusammenhängenden Zeitraum-Balken.
- Die Unterscheidung darf nicht ausschließlich über Farbe erfolgen.
- Mehrtagestouren müssen korrekt über Monatsgrenzen hinweg dargestellt werden.
- Die Tourübersicht verwendet einen Monatskalender als primären Filter.
- Touren werden darunter chronologisch nach Startdatum angezeigt.
- Die nächste relevante Tour steht oben.
- Laufende Mehrtagestouren stehen oberhalb noch nicht gestarteter Touren.
- Jede Tour erhält eine quadratische 1:1-Kachel mit Tourtitel darüber.
- Die Kachel nutzt auf Mobilgeräten nahezu die gesamte verfügbare Displaybreite.
- Auf jeder Kachel müssen freie Fahrzeugplätze sichtbar sein.
- Als Kachelbild kann ein Tourlogo, Eventdesign, Fahrzeugfoto oder Routen-Screenshot verwendet werden.

---

## 2. Grundprinzipien

Bei allen technischen Entscheidungen gelten folgende Prioritäten in dieser Reihenfolge:

1. Sicherheit
2. Datenintegrität
3. Betrieb innerhalb kostenloser Tarife
4. einfache Wartbarkeit
5. gute mobile Benutzererfahrung
6. saubere Erweiterbarkeit
7. Performance
8. optische Details

Keine kostenpflichtige Plattform, API, Bibliothek oder Infrastruktur darf ohne ausdrückliche Zustimmung eingeführt werden.

Keine sicherheitskritische Logik darf ausschließlich im Frontend implementiert werden.

Wenn eine Anforderung technisch mehrdeutig ist, wähle für das MVP die einfachste robuste Lösung und dokumentiere die Annahme.

---

## 3. Vorgesehener Technologie-Stack

### Frontend

Bevorzugt:

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- vite-plugin-pwa
- Supabase JavaScript Client

Optional, wenn sinnvoll:

- React Hook Form
- Zod
- date-fns
- Lucide Icons
- Vitest
- Playwright

Vermeide unnötig große Frameworks oder Abhängigkeiten.

### Hosting

Bevorzugt:

- GitHub als Source Repository
- Cloudflare Pages für Build und Hosting
- automatisches Deployment aus dem GitHub-Repository

Es soll mindestens folgende Umgebungen geben:

- lokale Entwicklung
- Production

Preview Deployments von Cloudflare Pages können genutzt werden.

### Backend / Datenbank / Auth

Bevorzugt:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- PostgreSQL Functions / Supabase RPC für sicherheitskritische Transaktionen

Die Anwendung soll grundsätzlich ohne eigenen klassischen Application Server auskommen.

---

## 4. Kostenregel

Das Projekt ist auf einen kostenlosen Betrieb ausgelegt.

Claude muss deshalb bei neuen Features immer prüfen:

- Kann das Feature innerhalb der bestehenden Architektur umgesetzt werden?
- Erzeugt es laufende Kosten?
- Erfordert es einen kostenpflichtigen API-Key?
- Erfordert es ein Upgrade bei Cloudflare oder Supabase?
- Gibt es eine kostenlose Alternative?

Wenn eine Funktion voraussichtlich Kosten erzeugt, nicht einfach implementieren.

Stattdessen:

1. Problem erklären.
2. kostenlose Alternative nennen.
3. erst nach ausdrücklicher Entscheidung des Projektinhabers umsetzen.

Free-Tier-Limits können sich ändern. Harte Limits deshalb nicht als dauerhafte technische Annahme behandeln.

---

## 5. Benutzerrollen

Mindestens folgende Rollen bzw. kontextbezogene Zustände sind erforderlich.

### Visitor

Nicht angemeldeter Besucher.

Darf:

- Startseite sehen
- öffentliche Informationen lesen
- veröffentlichte Touren sehen
- öffentliche Tourinformationen sehen
- Datum, Region und Streckenlänge sehen
- Fahrzeuglimit und freie Fahrzeugplätze sehen
- öffentliche Teilnahmebedingungen sehen
- Registrierungs- und Loginseite öffnen

Darf nicht:

- geschützte Mitgliederinhalte sehen
- private Tourinformationen sehen
- Teilnehmerfahrzeuge sehen
- sich zu einer Tour anmelden
- Admin-Funktionen verwenden

### User

Registrierter und angemeldeter Benutzer.

Darf zusätzlich:

- Mitgliederinhalte sehen
- eigenes Profil verwalten
- sich mit einem konkreten Fahrzeug zu verfügbaren Touren anmelden
- eigene Touranmeldungen sehen
- eigenen Anmeldestatus sehen
- eigene Teilnahme stornieren, sofern dies noch zulässig ist
- Anzahl der Personen im Fahrzeug bis zur gesetzten Deadline ändern

### Confirmed Participant

Kein separater globaler Benutzerstatus.

Ein User wird nur im Kontext einer konkreten Tour zum bestätigten Teilnehmer, wenn seine Registrierung den Status `confirmed` besitzt.

Nur bestätigte Teilnehmer dürfen:

- Participant-Inhalte dieser Tour sehen
- genauen Treffpunkt sehen
- Kurviger-Link sehen
- Zello-Link bzw. Zello-Informationen sehen
- bestätigte mitfahrende Fahrzeuge sehen
- die Usernames der bestätigten Fahrer sehen

`pending` oder `waitlisted` allein gewähren keinen Zugriff auf Participant-Inhalte.

### Admin

Darf zusätzlich:

- Touren erstellen
- Touren bearbeiten
- Touren veröffentlichen
- Touren absagen
- Touren archivieren
- maximale Fahrzeugzahl festlegen
- Bestätigungsmodus festlegen
- Mindest- und Maximalleistung festlegen
- Mindestalter des Fahrers festlegen
- Kennzeichenpflicht pro Tour ein- oder ausschalten
- Anmeldezeitraum festlegen
- Deadline für Änderungen der Personenzahl festlegen
- Kurviger-Link hinterlegen
- Zello-Link hinterlegen
- bestätigte Fahrer, offene Anfragen und Warteliste verwalten
- manuelle Anmeldungen bestätigen oder ablehnen
- Teilnehmer administrativ entfernen
- geschützte Inhalte verwalten
- Tourstatus verwalten

Ein Benutzer darf sich niemals selbst im Frontend zum Admin machen können.

---

## 6. Authentifizierung

Für Registrierung und Anmeldung Supabase Auth verwenden.

MVP:

- Registrierung mit E-Mail und Passwort
- E-Mail-Verifikation
- Login
- Logout
- Passwort vergessen
- Passwort zurücksetzen
- persistente Session
- geschützte Routes

Beim Onboarding zusätzlich erfassen:

- eindeutiger Username
- Vorname
- Nachname

Der Klarname ist nicht öffentlich.

Geburtsdatum wird nur benötigt, wenn eine Tour eine Altersanforderung besitzt. Es kann daher zunächst `NULL` sein und erst bei Bedarf ergänzt werden.

Spätere Erweiterungen können sein:

- Google Login
- Apple Login
- Passkeys

Diese Erweiterungen sind nicht Bestandteil des ersten MVP.

### Sicherheitsregeln

- niemals Passwörter selbst speichern
- niemals Passwort-Hashes in eigenen Tabellen verwalten
- niemals Supabase `service_role` Schlüssel im Browser verwenden
- niemals Secrets ins Repository committen
- `.env` muss durch `.gitignore` ausgeschlossen werden
- `.env.example` ohne echte Secrets bereitstellen
- nur den öffentlichen Supabase Anon/Publishable Key im Frontend verwenden

---

## 7. Datenschutz

Die Anwendung wird voraussichtlich in Deutschland bzw. der EU eingesetzt.

Deshalb datensparsam entwickeln.

Für das MVP nur Daten erheben, die tatsächlich benötigt werden.

Mindestens vorbereiten:

- Datenschutzerklärung
- Impressum
- Zustimmung zur Datenschutzerklärung bei Registrierung
- Möglichkeit zum Logout
- Möglichkeit zur Kontolöschung
- Löschung bzw. Anonymisierung abhängiger Daten berücksichtigen

Keine Tracking- oder Marketing-Cookies im MVP.

Keine Analytics-Plattform einbauen, solange sie nicht ausdrücklich gewünscht wird.

### Identitäts- und Fahrzeugdaten

- Username darf bestätigten Teilnehmern angezeigt werden.
- Vorname und Nachname dürfen anderen Teilnehmern standardmäßig nicht angezeigt werden.
- Kennzeichen dürfen niemals in der normalen Teilnehmeransicht erscheinen.
- Kennzeichen sind nur für den jeweiligen User und Admin sichtbar, soweit erforderlich.
- Geburtsdatum nicht unnötig in Adminlisten anzeigen.
- Bei Altersbeschränkungen bevorzugt nur das Prüfergebnis bzw. errechnete Alter anzeigen.
- Anzahl der Personen im Fahrzeug ist organisatorische Information und standardmäßig nur für den User selbst und Admin sichtbar.

---

## 8. Datenmodell

SQL-Migrationen müssen versioniert im Repository liegen.

Empfohlener Ordner:

`supabase/migrations/`

### Wichtige Sicherheitsentscheidung: Sichtbarkeitsstufen physisch trennen

Supabase/PostgreSQL Row Level Security schützt primär **Zeilen**, nicht automatisch einzelne sensible Spalten einer Zeile.

Deshalb dürfen öffentliche und private Tourinformationen nicht einfach gemeinsam in einer öffentlich lesbaren `tours`-Zeile liegen.

Für das MVP werden die Daten nach Sichtbarkeit getrennt:

```text
tours
=> ausschließlich öffentlich lesbare Tourdaten

tour_member_details
=> nur für eingeloggte User

tour_participant_details
=> nur für bestätigte Teilnehmer der jeweiligen Tour und Admins
```

Ebenso dürfen andere bestätigte Teilnehmer niemals direkt fremde `tour_registrations` oder `profiles` lesen.

Die Fahrzeugliste für Teilnehmer wird deshalb über eine kontrollierte, datensparsame RPC ausgegeben.

---

### 8.1 profiles

Erweitert `auth.users`.

Felder mindestens:

```text
id UUID PRIMARY KEY REFERENCES auth.users(id)
username TEXT NOT NULL
first_name TEXT NOT NULL
last_name TEXT NOT NULL
date_of_birth DATE NULL
privacy_policy_accepted_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- `username` muss eindeutig sein.
- Eindeutigkeit des Usernames soll case-insensitive abgesichert werden.
- Klarname ist privat.
- `date_of_birth` darf `NULL` sein, solange keine Altersprüfung erforderlich ist.
- Keine Fahrzeugdaten im MVP in `profiles` speichern.
- Andere normale User dürfen diese Tabelle nicht einfach zur Suche nach Klarnamen auslesen.

Optionale spätere Felder:

```text
avatar_url TEXT
```

E-Mail nicht unnötig duplizieren, wenn sie zuverlässig über Supabase Auth verfügbar ist.

---

### 8.2 user_roles

Rollen nicht vertrauenswürdig im Client speichern.

Beispiel:

```text
user_id UUID
role TEXT
created_at TIMESTAMPTZ
```

Zulässige Rollen zunächst:

```text
user
admin
```

Unique Constraint auf `user_id + role`.

Adminrechte müssen über Datenbank/RLS geprüft werden.

Empfohlen ist eine zentrale Helper-Funktion:

```text
is_admin()
```

Sie muss sicher implementiert werden, damit keine rekursiven oder clientseitig manipulierbaren Rollenprüfungen entstehen.

Der erste Admin darf über ein dokumentiertes SQL-/Supabase-Setup gesetzt werden.

Es darf keinen öffentlich erreichbaren "Make me admin"-Mechanismus geben.

---

### 8.3 tours — PUBLIC

Diese Tabelle enthält nur Daten, die bei einer veröffentlichten Tour grundsätzlich öffentlich lesbar sein dürfen.

Mindestens:

```text
id UUID PRIMARY KEY
slug TEXT UNIQUE
title TEXT
short_description TEXT
public_description TEXT

start_date DATE
end_date DATE

meeting_at TIMESTAMPTZ NULL
planned_end_at TIMESTAMPTZ NULL

region TEXT
route_length_km NUMERIC NULL

meeting_point_public TEXT NULL

max_vehicles INTEGER

confirmation_mode TEXT

license_plate_required BOOLEAN DEFAULT FALSE
min_power_ps INTEGER NULL
max_power_ps INTEGER NULL
min_driver_age INTEGER NULL

registration_open_at TIMESTAMPTZ NULL
registration_close_at TIMESTAMPTZ NULL
passenger_edit_deadline_at TIMESTAMPTZ NULL

status TEXT

cover_image_url TEXT NULL

created_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
published_at TIMESTAMPTZ NULL
```

`confirmation_mode`:

```text
automatic
manual
```

Mögliche Tourstatuswerte:

```text
draft
published
registration_closed
cancelled
completed
archived
```

Regeln:

- `max_vehicles > 0`
- `end_date >= start_date`
- eintägige Tour: `start_date = end_date`
- Mehrtagestour: `end_date > start_date`
- `route_length_km >= 0`, wenn gesetzt
- `min_power_ps > 0`, wenn gesetzt
- `max_power_ps >= min_power_ps`, wenn beide gesetzt sind
- `min_driver_age >= 18`, wenn gesetzt
- Draft-Touren sind öffentlich nicht sichtbar.
- Cancelled-Touren dürfen keine neuen Anmeldungen akzeptieren.
- Archived-Touren sind standardmäßig nicht in der normalen Tourübersicht sichtbar.
- Fahrzeugkapazität niemals aus einer vom Client gelieferten Zahl ableiten.
- `passenger_edit_deadline_at` darf unabhängig vom Ende des normalen Anmeldezeitraums gesetzt werden.
- Keine exakten privaten Treffpunkte, Kurviger-Links, Zello-Links oder internen Participant-Texte in dieser Tabelle speichern.

### Umsetzungsentscheidung: Slug ist kein Admin-Eingabefeld

`slug` ist rein intern (URL-Baustein) und wird serverseitig automatisch aus Titel und
Startdatum abgeleitet (`slugify(Titel) + "-" + start_date`), nicht manuell im
Admin-Formular eingegeben. Grund: Admins mussten das Konzept "Slug" sonst erst
verstehen, obwohl es keine fachliche Entscheidung ist.

- Bei bestehenden Touren bleibt der einmal vergebene Slug beim Bearbeiten unangetastet,
  damit sich eine bereits geteilte URL nicht unter der Hand verschiebt.
- Eine seltene Kollision (identischer Titel + Datum) wird beim Anlegen serverseitig
  automatisch durch einen angehängten numerischen Suffix aufgelöst, ohne den Admin
  damit zu behelligen.

---

### 8.4 tour_member_details — MEMBER

Nur für eingeloggte User.

Mindestens:

```text
tour_id UUID PRIMARY KEY REFERENCES tours(id)
member_description TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

RLS:

- normale eingeloggte User dürfen Member-Daten veröffentlichter Touren lesen
- Admins dürfen alle lesen und ändern
- Visitor darf nichts lesen

---

### 8.5 tour_participant_details — CONFIRMED PARTICIPANT

Nur für bestätigte Teilnehmer der jeweiligen Tour und Admins.

Mindestens:

```text
tour_id UUID PRIMARY KEY REFERENCES tours(id)
participant_description TEXT NULL
meeting_point_private TEXT NULL
kurviger_url TEXT NULL
zello_url TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

RLS:

Ein normaler User darf eine Zeile nur lesen, wenn eine zugehörige Registrierung existiert mit:

```text
tour_registrations.user_id = auth.uid()
AND
tour_registrations.tour_id = tour_participant_details.tour_id
AND
tour_registrations.status = 'confirmed'
```

Admins dürfen alle lesen und ändern.

`pending`, `waitlisted`, `cancelled` und `rejected` erhalten keinen Zugriff.

---

### 8.6 tour_stages — spätere Mehrtagestour-Erweiterung

Nicht zwingend im ersten MVP vollständig nutzen, aber das Datenmodell darf diese Erweiterung nicht verbauen.

Mehrtagestouren können später mehrere Tagesetappen besitzen.

Mögliche Tabelle:

```text
id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
stage_date DATE
stage_number INTEGER
title TEXT
description TEXT NULL
route_length_km NUMERIC NULL
kurviger_url TEXT NULL
meeting_point_private TEXT NULL
start_time TIME NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- mehrere Etappen pro Tour möglich
- Reihenfolge über `stage_number`
- `stage_date` muss innerhalb `start_date` bis `end_date` der Tour liegen
- Etappeninformationen sind standardmäßig Participant-Inhalte
- Kurviger kann dadurch später je Tagesetappe separat hinterlegt werden
- im MVP darf weiterhin ein einzelner Haupt-Kurviger-Link auf Tour-Ebene verwendet werden

---

### 8.7 tour_registrations

Eine Registrierung entspricht genau einem Fahrzeug.

Mindestens:

```text
id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
user_id UUID REFERENCES auth.users(id)

status TEXT

vehicle_manufacturer TEXT
vehicle_model TEXT
vehicle_power_ps INTEGER
license_plate TEXT NULL

passenger_count INTEGER DEFAULT 0

registered_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
confirmed_at TIMESTAMPTZ NULL
confirmed_by UUID NULL
waitlisted_at TIMESTAMPTZ NULL
cancelled_at TIMESTAMPTZ NULL
rejected_at TIMESTAMPTZ NULL
rejected_by UUID NULL
rejection_reason TEXT NULL
```

Status:

```text
pending
confirmed
waitlisted
cancelled
rejected
```

Regeln:

- ein User besitzt pro Tour maximal eine Registrierungszeile
- Wiederanmeldung nach Stornierung erfolgt kontrolliert über RPC und reaktiviert bzw. aktualisiert den Datensatz
- `vehicle_manufacturer` ist Pflicht
- `vehicle_model` ist Pflicht
- `vehicle_power_ps > 0`
- `passenger_count >= 0`
- Kennzeichen ist nur Pflicht, wenn `tours.license_plate_required = TRUE`
- Personenzahl pro Fahrzeug wird berechnet als `1 + passenger_count`
- `passenger_count` beeinflusst niemals die Fahrzeugkapazität
- Wartelistenposition wird nicht als frei editierbare Zahl gespeichert
- Wartelistenreihenfolge wird deterministisch aus Zeitstempeln und ID ermittelt
- Fremdschlüssel und sinnvolle Constraints verwenden
- bei Accountlöschung Datenschutz und notwendige Historie sauber behandeln

RLS:

- User darf ausschließlich die eigene Registrierung direkt lesen
- User darf fremde Registrierungen nicht direkt lesen
- User darf sicherheitskritische Statusfelder nicht direkt setzen
- Admin darf Registrierungen verwalten
- Anlegen, Bestätigen, Stornieren und Nachrücken bevorzugt ausschließlich über kontrollierte RPCs

---

### 8.8 Persönliches Tourenarchiv

Für das persönliche Tourenarchiv ist keine separate Archivkopie zwingend erforderlich, solange die historischen Registrierungsdaten zuverlässig erhalten bleiben.

Bevorzugte Ableitung:

```text
tour_registrations.user_id = auth.uid()
AND
tour_registrations.status = 'confirmed'
AND
tours.end_date < current_date
```

Zusätzlich darf für abgeschlossene Touren bevorzugt gelten:

```text
tours.status IN ('completed', 'archived')
```

Wichtig:

Die bei der Anmeldung gespeicherten Fahrzeugdaten in `tour_registrations` sind ein historischer Snapshot und dürfen nach Abschluss der Tour nicht automatisch aus später geänderten Profildaten überschrieben werden.

Für das Archiv können mindestens folgende Felder ausgegeben werden:

```text
tour_id
tour_slug
tour_title
cover_image_url
start_date
end_date
region
route_length_km
vehicle_manufacturer
vehicle_model
vehicle_power_ps
passenger_count
```

Zugriff:

- User darf ausschließlich das eigene Archiv lesen
- Admin darf historische Teilnahmen im notwendigen Umfang sehen
- andere User erhalten keinen Zugriff
- öffentliche Besucher erhalten keinen Zugriff

Empfohlen ist eine sichere View oder RPC:

```text
get_my_tour_archive()
```

Die Funktion verwendet immer `auth.uid()` und akzeptiert keine fremde `user_id` als Berechtigungsnachweis.

Sortierung:

```text
end_date DESC
```

Für Mehrtagestouren wird der vollständige Zeitraum ausgegeben.

Eine Tour erscheint im persönlichen Archiv erst, wenn sie in der Vergangenheit liegt.

Optional kann später zwischen:

```text
bestätigt
tatsächlich eingecheckt / teilgenommen
```

unterschieden werden, falls ein Check-in-System eingeführt wird.

Bis dahin bedeutet eine historische `confirmed` Registrierung fachlich:

```text
Teilnahme im persönlichen Archiv
```

---

### 8.9 Sichere Teilnehmer-Fahrzeugliste

Bestätigte Fahrer sollen sehen können, welche Fahrzeuge mitfahren, aber keine privaten Registrierungsfelder.

Deshalb keine breite SELECT-Policy auf `tour_registrations` einführen.

Stattdessen kontrollierte RPC, beispielsweise:

```text
get_confirmed_tour_vehicles(tour_id)
```

Die Funktion darf nur Daten zurückgeben wie:

```text
registration_id
username
vehicle_manufacturer
vehicle_model
vehicle_power_ps
is_self
```

Sie darf insbesondere **nicht** zurückgeben:

```text
first_name
last_name
email
license_plate
date_of_birth
passenger_count
```

Vor Ausgabe muss serverseitig geprüft werden:

```text
Caller ist Admin
ODER
Caller besitzt für diese Tour status = confirmed
```

---

### 8.10 Öffentliche Kapazitätsdaten

Visitor sollen freie Plätze sehen können, ohne Zugriff auf `tour_registrations` zu erhalten.

Dafür eine sichere View oder RPC verwenden, z. B.:

```text
get_public_tour_stats(tour_id)
```

Erlaubte Rückgabe:

```text
max_vehicles
confirmed_vehicles
free_vehicle_slots
is_full
```

Keine User-IDs oder sonstigen Teilnehmerdaten ausgeben.

---

### 8.11 Keine globale Fahrzeugtabelle im MVP

Viele Benutzer besitzen mehrere Fahrzeuge.

Trotzdem soll im ersten MVP bewusst noch keine globale Fahrzeuggarage eingeführt werden.

Grund:

Das konkrete Fahrzeug ist für die jeweilige Ausfahrt relevant.

Deshalb werden Hersteller, Modell, Leistung und optional Kennzeichen als Snapshot direkt in `tour_registrations` gespeichert.

Später kann optional eine Tabelle wie `vehicles` ergänzt werden, aus der ein User bei der Anmeldung auswählen kann.

---

### 8.12 Regeln für SECURITY DEFINER Funktionen

Falls RPC-Funktionen mit `SECURITY DEFINER` umgesetzt werden:

- nur einsetzen, wenn fachlich erforderlich
- `search_path` sicher festlegen
- Tabellen möglichst schemaqualifiziert referenzieren
- Berechtigungen explizit vergeben
- Funktionsparameter niemals als Beweis für die User-ID akzeptieren
- User immer über `auth.uid()` bestimmen
- Eingaben serverseitig validieren
- Funktion darf nur exakt benötigte Daten zurückgeben
- keine generischen Admin-Bypass-Funktionen bauen
- Rechte und Ownership in Migrationen dokumentieren

**Praxis-Falle bei `RETURN QUERY` mit `RETURNS TABLE`:** Anders als ein normales
`SELECT` verlangt `RETURN QUERY` in PL/pgSQL eine exakte Typübereinstimmung mit der
deklarierten Rückgabesignatur, ohne automatischen Cast. `auth.users.email` ist in
Supabase intern `character varying(255)`, nicht `text` — eine Spalte wie `u.email` muss
deshalb explizit als `u.email::text` ausgegeben werden, sonst schlägt die Funktion erst
zur Laufzeit mit `structure of query does not match function result type` fehl, obwohl
die Migration selbst fehlerfrei durchläuft (siehe `admin_list_users()`,
20260907082300). Beim Schreiben neuer `SECURITY DEFINER`-Funktionen mit
`RETURNS TABLE` auf Spalten aus `auth.users` oder anderen nicht selbst definierten
Tabellen deshalb vorsorglich explizit casten.

---

## 9. Tour-Anmeldung, Freigabe, Warteliste und Kapazität

Dies ist eine besonders kritische Funktion.

Die Kapazität wird ausschließlich anhand **bestätigter Fahrzeuge** bestimmt.

Beifahrer oder weitere Personen im Fahrzeug zählen nicht gegen `max_vehicles`.

### 9.1 Unzulässige Client-Logik

Nicht nur:

```text
Frontend lädt bestätigte Fahrzeugzahl
Frontend vergleicht count < max_vehicles
Frontend führt INSERT aus
```

Das erzeugt Race Conditions und kann zu Überbuchungen führen.

### 9.2 Sichere Anmeldung

Die Anmeldung muss atomar auf Datenbankseite erfolgen.

Implementiere eine PostgreSQL Function / Supabase RPC:

```text
register_for_tour(
  tour_id,
  vehicle_manufacturer,
  vehicle_model,
  vehicle_power_ps,
  license_plate,
  passenger_count
)
```

Die Funktion muss innerhalb einer sicheren Transaktion:

1. authentifizierten User bestimmen
2. Tour laden
3. prüfen, ob Tour existiert
4. prüfen, ob Tour veröffentlicht und buchbar ist
5. Anmeldezeitraum prüfen
6. prüfen, ob bereits eine aktive Anmeldung besteht
7. Fahrzeugdaten validieren
8. Kennzeichenpflicht prüfen
9. Mindestleistung prüfen
10. optionale Maximalleistung prüfen
11. bei Altersbeschränkung Geburtsdatum prüfen
12. Alter des Fahrers bezogen auf `start_date` der Tour berechnen
13. relevante Tourzeile sperren bzw. robuste Concurrency-Strategie verwenden
14. bestätigte Fahrzeuge zählen
15. Bestätigungsmodus auswerten
16. korrekten Status setzen
17. Registrierung erstellen bzw. kontrolliert reaktivieren
18. eindeutiges Ergebnis zurückgeben

### 9.3 Automatische Bestätigung

Bei:

```text
confirmation_mode = automatic
```

gilt:

```text
confirmed_count < max_vehicles
=> status = confirmed
```

Wenn keine Fahrzeugplätze mehr verfügbar sind:

```text
confirmed_count >= max_vehicles
=> status = waitlisted
```

Es darf niemals `max_vehicles + 1` bestätigte Fahrzeuge geben.

### 9.4 Manuelle Bestätigung

Bei:

```text
confirmation_mode = manual
```

gilt zunächst:

```text
freie Kapazität vorhanden
=> status = pending
```

Wenn die Tour bereits vollständig mit bestätigten Fahrzeugen belegt ist:

```text
=> status = waitlisted
```

Ein `pending` User besitzt noch keinen bestätigten Startplatz.

Admin-Bestätigung erfolgt ausschließlich über eine kontrollierte RPC, z. B.:

```text
approve_tour_registration(registration_id)
```

Diese Funktion muss erneut atomar:

- Tour sperren
- aktuellen Status prüfen
- aktuelle bestätigte Fahrzeugzahl prüfen
- `max_vehicles` prüfen
- Registrierung auf `confirmed` setzen
- `confirmed_at` und `confirmed_by` setzen

Wenn mit dieser Bestätigung der letzte freie Platz belegt wird, müssen verbleibende `pending` Registrierungen dieser Tour sauber in `waitlisted` überführt werden, wobei die ursprüngliche Reihenfolge erhalten bleibt.

Ablehnung über:

```text
reject_tour_registration(registration_id, reason)
```

Status danach:

```text
rejected
```

### 9.5 Warteliste

Die Warteliste ist Bestandteil jeder Tour.

Reihenfolge:

1. Zeitpunkt der ursprünglichen Anmeldung
2. bei identischem Timestamp stabiler sekundärer Schlüssel, z. B. Registrierungs-ID

Der User soll seine ungefähre bzw. exakte Wartelistenposition sehen können.

Die Position darf serverseitig berechnet werden und nicht durch den Client manipulierbar sein.

#### Platz wird frei — Automatic Mode

Wenn ein bestätigtes Fahrzeug storniert oder administrativ entfernt wird:

- ältesten berechtigten `waitlisted` Eintrag atomar auswählen
- Anforderungen der Tour erneut prüfen
- auf `confirmed` setzen
- nächsten Eintrag nur dann bearbeiten, wenn weitere freie Plätze existieren

#### Platz wird frei — Manual Mode

Wenn ein bestätigtes Fahrzeug storniert oder administrativ entfernt wird:

- ältesten berechtigten `waitlisted` Eintrag auf `pending` setzen
- noch nicht automatisch bestätigen
- Admin muss die Teilnahme freigeben

### 9.6 Änderung der maximalen Fahrzeugzahl

Admin darf `max_vehicles` ändern.

Regeln:

- niemals unter die Anzahl bereits bestätigter Fahrzeuge reduzieren
- bei Erhöhung im Automatikmodus Warteliste in Reihenfolge automatisch bis zur neuen Kapazität nachrücken lassen
- bei Erhöhung im manuellen Modus entsprechend viele älteste Wartelisteneinträge auf `pending` setzen
- alle Änderungen serverseitig konsistent durchführen

### 9.7 Stornierung

Stornierung über kontrollierte Funktion:

```text
cancel_tour_registration(tour_id)
```

Sie muss:

- Eigentümer prüfen
- Tourstatus prüfen
- Registrierung auf `cancelled` setzen
- bei einem zuvor bestätigten Fahrzeug ggf. Wartelisten-Nachrücklogik auslösen

### 9.8 Personenzahl und Beifahrer

Bei jeder Anmeldung wird `passenger_count` erfasst.

Beispiele:

```text
0 = Fahrer allein = 1 Person
1 = Fahrer + 1 Beifahrer = 2 Personen
2 = Fahrer + 2 weitere Personen = 3 Personen
```

Es gibt für `passenger_count` zunächst kein Tourlimit.

Admin benötigt für Restaurantreservierungen insbesondere:

```text
confirmed_vehicle_count
confirmed_person_count
```

Dabei:

```text
confirmed_person_count =
SUM(1 + passenger_count)
für alle confirmed Registrierungen
```

Der User darf `passenger_count` bis einschließlich `passenger_edit_deadline_at` ändern.

Änderung über kontrollierte Funktion:

```text
update_passenger_count(tour_id, passenger_count)
```

Danach ist die Änderung für normale User gesperrt.

Admin darf den Wert weiterhin korrigieren.

### 9.9 Mögliche RPC-Ergebnisse

Mindestens:

```text
CONFIRMED
PENDING_APPROVAL
WAITLISTED
TOUR_NOT_FOUND
TOUR_NOT_OPEN
REGISTRATION_NOT_OPEN
REGISTRATION_CLOSED
ALREADY_REGISTERED
VEHICLE_DATA_INVALID
LICENSE_PLATE_REQUIRED
POWER_TOO_LOW
POWER_TOO_HIGH
DATE_OF_BIRTH_REQUIRED
DRIVER_TOO_YOUNG
PASSENGER_EDIT_DEADLINE_PASSED
UNAUTHENTICATED
```

Fehlercodes zentral typisieren und im UI in verständliche deutsche Meldungen übersetzen.

---

## 10. Sichtbarkeitsstufen von Inhalten

Die Architektur soll mindestens diese Ebenen ermöglichen:

```text
PUBLIC
MEMBER
CONFIRMED_PARTICIPANT
ADMIN
```

### PUBLIC

Mindestens sichtbar:

- Titel
- Titelbild
- Datum
- Region
- Streckenlänge
- Kurzbeschreibung
- öffentliche Beschreibung
- maximale Fahrzeugzahl
- Anzahl freier Fahrzeugplätze
- Ausgebucht-Status
- Mindestleistung, sofern gesetzt
- Maximalleistung, sofern gesetzt
- Mindestalter, sofern gesetzt
- Hinweis, ob Kennzeichen für die Anmeldung benötigt wird
- Bestätigungsart darf verständlich dargestellt werden

Nicht öffentlich:

- genauer Treffpunkt
- Kurviger-Link
- Zello-Link
- Teilnehmerfahrzeuge
- Klarnamen
- Kennzeichen

### MEMBER

Nur eingeloggte Nutzer:

- ausführlichere Informationen
- zusätzliche Hinweise
- allgemeine Mitgliederinformationen
- Anmeldeformular
- eigener Anmeldestatus

### CONFIRMED_PARTICIPANT

Nur User mit `tour_registrations.status = confirmed` für diese Tour:

- genauer Treffpunkt
- interne Ablaufdetails
- Kurviger-Link
- Zello-Link bzw. Zello-Informationen
- kurzfristige Hinweise
- Liste bestätigter mitfahrender Fahrzeuge
- Usernames der bestätigten Fahrer

### ADMIN

- vollständige Tourverwaltung
- offene Anfragen
- bestätigte Fahrzeuge
- Warteliste
- für Organisation notwendige Personenzahlen
- Kennzeichen, soweit erhoben
- private Profildaten, soweit für Administration erforderlich
- interne Notizen

Diese Regeln müssen serverseitig über RLS bzw. kontrollierte Datenbankfunktionen abgesichert sein.

Eine reine Ausblendung im Frontend ist keine Zugriffskontrolle.

---

## 11. Fahrer- und Fahrzeugliste

Bestätigte Fahrer sollen sehen können, welche Fahrzeuge bei der jeweiligen Tour mitfahren.

Nur Registrierungen mit:

```text
status = confirmed
```

dürfen in dieser Ansicht erscheinen.

Pro Fahrzeug sichtbar:

- Username
- Hersteller
- Modell
- Leistung in PS

Nicht sichtbar:

- Vorname
- Nachname
- E-Mail
- Kennzeichen
- Geburtsdatum
- private Kontaktdaten

Die eigene Zeile darf hervorgehoben werden.

### Spätere Freundesfunktion

Das Datenmodell und die UI sollen eine spätere gegenseitige Freundesfreigabe nicht unnötig blockieren.

Geplantes Prinzip:

- User A sendet User B eine Freundesanfrage.
- User B bestätigt.
- Erst bei bestätigter gegenseitiger Verbindung dürfen beide den Klarnamen des jeweils anderen sehen.
- Die Freigabe gilt beidseitig.
- Eine Freundschaft kann wieder beendet werden.

Diese Funktion ist **nicht Bestandteil des ersten MVP**.

Später denkbare Tabelle:

```text
friendships
```

mit einem klaren Request-/Accepted-Modell und eindeutiger Paarbeziehung.

---

## 12. Admin-Bereich

Route beispielsweise:

```text
/admin
```

Nur Admins dürfen den Bereich laden und die zugehörigen Daten abrufen.

### Dashboard

Mindestens:

- Anzahl geplanter Touren
- nächste Tour
- bestätigte Fahrzeuge je Tour
- freie Fahrzeugplätze
- offene manuelle Anfragen
- Wartelistenlänge
- bestätigte Gesamtpersonenzahl für Organisation / Restaurant
- ausgebuchte Touren
- Entwürfe

Das Dashboard muss einen direkten, sichtbaren Link zur Tourenverwaltung
(`/admin/tours`) enthalten — nicht nur Links zu einzelnen bestehenden Touren. Sonst
gibt es bei einer frischen Installation ohne Touren keinen Weg dorthin.

### Tourenverwaltung

Admin kann:

- Tour erstellen
- Tour bearbeiten
- Startdatum setzen
- Enddatum setzen
- eintägige oder mehrtägige Tour konfigurieren
- Tour veröffentlichen
- Tour absagen
- Tour archivieren
- Datum setzen
- Region setzen
- Streckenlänge in km setzen
- öffentlichen Text setzen
- Mitgliedertext setzen
- Teilnehmertext setzen
- öffentlichen und privaten Treffpunkt setzen
- Kurviger-Link hinterlegen
- Zello-Link hinterlegen
- quadratisches Tour-Coverbild hinterlegen
- maximale Fahrzeugzahl setzen
- Bestätigung `automatic` / `manual` setzen
- Kennzeichenpflicht ein-/ausschalten
- Mindestleistung in PS setzen
- optionale Maximalleistung in PS setzen
- optionales Mindestalter setzen
- Anmeldezeitraum festlegen
- Deadline für Änderung der Personenzahl festlegen

### Teilnehmerverwaltung

Pro Tour getrennte Gruppen anzeigen:

```text
Pending
Confirmed
Waitlisted
Rejected
Cancelled
```

Admin kann mindestens:

- Registrierung öffnen
- Username sehen
- Klarname sehen
- Fahrzeug sehen
- Leistung sehen
- Kennzeichen sehen, sofern vorhanden und organisatorisch notwendig
- Personenzahl sehen
- Anmeldedatum sehen
- Pending bestätigen
- Pending ablehnen
- bestätigte Teilnahme administrativ stornieren
- Wartelistenreihenfolge sehen

Wichtig:

Eine manuelle Admin-Bestätigung darf die Kapazitätsprüfung niemals umgehen.

### Restaurant-Information

Für bestätigte Teilnehmer prominent anzeigen:

```text
Bestätigte Fahrzeuge: X
Bestätigte Personen: Y
```

Optional zusätzlich:

```text
Pending Fahrzeuge: X
Pending Personen: Y
Warteliste Fahrzeuge: X
Warteliste Personen: Y
```

Damit kann der Admin Restaurantreservierungen planen, ohne dass die Personenzahl das Fahrzeuglimit beeinflusst.

Noch nicht Bestandteil des MVP:

- komplexes CRM
- Rechnungen
- Zahlungsabwicklung
- Newsletter
- automatische WhatsApp-Nachrichten

---

## 13. Tourübersicht und Kalenderfilter

Die Tourübersicht ist die zentrale öffentliche Discovery-Seite der PWA.

Öffentliche Route:

```text
/tours
```

Die Seite muss mobile-first entwickelt werden.

Primäres UX-Ziel:

```text
App öffnen
→ nächste Ausfahrten sofort erkennen
→ Monat oder Eventtag im Kalender auswählen
→ Tourkachel öffnen
→ Tourdetails ansehen
→ Fahrzeug anmelden
```

### 13.1 Grundaufbau

Reihenfolge von oben nach unten:

1. kompakter Header
2. Monatskalender
3. aktive Filterinformation
4. Liste kommender bzw. gefilterter Touren
5. optional Bereich für vergangene Touren

Die Tourenliste wird chronologisch sortiert.

Priorität:

1. aktuell laufende Mehrtagestouren
2. danach zukünftige Touren nach `start_date`
3. vergangene Touren separat

---

### 13.2 Monatskalender

Ganz oben befindet sich ein Monatskalender.

Beispiel:

```text
‹   September 2027   ›
```

Zusätzlich:

```text
Aktueller Monat
```

Der Benutzer kann mit Pfeilen monatsweise navigieren.

Der Kalender dient nicht nur zur Orientierung, sondern gleichzeitig als Filter.

---

### 13.3 Standardmonat beim Öffnen

Beim ersten Laden:

1. Wenn im aktuellen Monat noch mindestens eine laufende oder zukünftige Tour liegt, aktuellen Monat anzeigen.
2. Gibt es im aktuellen Monat keine relevante Tour mehr, automatisch den Monat der nächsten geplanten Tour anzeigen.
3. Gibt es überhaupt keine zukünftige Tour, aktuellen Monat anzeigen.

Der Nutzer soll nicht unnötig zunächst einen leeren Monat sehen.

---

### 13.4 Eintägige Touren im Kalender

Eintägige Touren besitzen:

```text
start_date = end_date
```

Sie werden durch einen kleinen Eventpunkt unter oder neben der Tageszahl markiert.

Beispiel:

```text
12
 •
```

Wenn mehrere eintägige Touren am selben Tag stattfinden, darf zusätzlich eine kleine Anzahl angezeigt werden.

---

### 13.5 Mehrtagestouren im Kalender

Mehrtagestouren besitzen:

```text
end_date > start_date
```

Sie werden nicht wie eintägige Events mit einem Punkt dargestellt.

Stattdessen:

- farbiger zusammenhängender Balken über alle betroffenen Kalendertage
- Starttag mit abgerundetem linken Ende
- Endtag mit abgerundetem rechten Ende
- Zwischentage als durchgehender Streifen
- optional kurzer Tourcode oder Tourname im Balken
- auf kleinen Displays bevorzugt kurze Bezeichnung

Beispiel:

```text
17  18  19  20  21
╰━━━━ DOLOMITEN ━━━━╯
```

Die visuelle Unterscheidung darf nicht ausschließlich über Farbe erfolgen.

Zusätzlich muss sich die Form eindeutig unterscheiden:

```text
Eintägige Tour  => Punkt
Mehrtagestour   => Zeitraum-Balken
```

---

### 13.6 Farbcodierung von Mehrtagestouren

Mehrtagestouren sollen farblich anders codiert sein als eintägige Touren.

Regeln:

- Systemfarben statt völlig freier Admin-Farbwahl verwenden.
- Parallel stattfindende Mehrtagestouren müssen unterscheidbar sein.
- ausreichender Kontrast muss erhalten bleiben.
- Farbe ist nur zusätzliche Information.
- die Balkenform bleibt das primäre Strukturmerkmal.
- Statusfarben wie Fehler/Erfolg nicht für Tourfarben missbrauchen.

---

### 13.7 Monatswechsel bei Mehrtagestouren

Eine Tour kann über Monatsgrenzen laufen.

Beispiel:

```text
30.06.2027 – 04.07.2027
```

Dann muss sie:

- am 30. Juni im Juni-Kalender beginnen
- im Juli-Kalender vom 1. bis 4. Juli fortgesetzt werden
- in beiden Monaten als dieselbe Tour erkennbar bleiben

Der Zeitraum darf nicht künstlich in zwei Events zerlegt werden.

---

### 13.8 Tagesfilter

Tippt der User einen Tag an, werden darunter alle Touren angezeigt, für die gilt:

```text
start_date <= selected_date
AND
end_date >= selected_date
```

Damit erscheint eine Mehrtagestour an jedem Tag ihres Zeitraums.

Bei eintägigen Touren entspricht das dem normalen Eventtag.

Ein erneuter Tap oder:

```text
Tag löschen
```

entfernt den Tagesfilter.

Beim Monatswechsel wird der Tagesfilter zurückgesetzt.

---

### 13.9 Kalenderanzeige laufender Touren

Wenn das heutige Datum zwischen Start- und Enddatum einer Tour liegt:

```text
start_date <= today
AND
end_date >= today
```

gilt die Tour als aktuell laufend.

Laufende Mehrtagestouren werden:

- im Kalender weiterhin als Zeitraum dargestellt
- in der Tourliste oberhalb noch nicht gestarteter Touren angezeigt
- mit einem Status wie `Läuft aktuell` gekennzeichnet

Optional:

```text
Läuft aktuell · Tag 3 von 5
```

Die Tagesnummer darf aus Datum und Zeitraum berechnet werden.

---

### 13.10 Tour-Kachel

Jede Tour besitzt eine große visuelle Kachel.

Aufbau:

```text
Tourtitel

[ quadratisches 1:1 Tourbild ]
```

Der Titel steht immer oberhalb der Grafik.

Die Grafik nutzt:

```css
width: 100%;
aspect-ratio: 1 / 1;
```

Auf Smartphones soll sie nahezu die gesamte verfügbare Displaybreite einnehmen.

Auf größeren Displays darf die zentrale Content-Spalte begrenzt werden, beispielsweise auf ca. 700–800 px.

Die mobile Darstellung besitzt Priorität.

---

### 13.11 Tourbild

Der Admin kann je Tour ein Coverbild hinterlegen.

Geeignet:

- Tourlogo
- Eventlogo
- Routen-Screenshot
- Kurviger-Screenshot
- eigenes Eventdesign
- Fahrzeugfoto
- Gruppenfoto

Die Darstellung muss unterschiedliche Ausgangsformate robust verarbeiten.

Bevorzugt:

```css
object-fit: cover;
```

Das gespeicherte Originalbild soll nicht unnötig zerstört werden.

Optional kann später eine Fokus-/Crop-Position gespeichert werden.

#### Umsetzung: Upload statt nur URL

Der Admin kann das Coverbild direkt von Smartphone oder PC hochladen, nicht nur eine
externe URL verlinken.

- Supabase Storage Bucket `tour-covers`: öffentlich lesbar (Coverbilder erscheinen auf
  öffentlichen Tourkacheln), Schreibzugriff (Insert/Update/Delete) nur für Admins über
  `storage.objects`-RLS-Policies mit `is_admin()`.
- Upload validiert Dateityp (`image/*`) und Maximalgröße (5 MB) im Client, bevor
  hochgeladen wird.
- Zusätzlich kann aus bereits hochgeladenen Bildern gewählt werden (kleine Galerie
  vorhandener Dateien im Bucket), um Speicherplatz im Free Tier zu sparen, statt
  wiederholt ähnliche Bilder neu hochzuladen.
- Eine manuell eingetragene externe Bild-URL bleibt als eingeklappte Alternative
  weiterhin möglich (z. B. für bereits andernorts gehostete Bilder).
- Supabase Storage ist im kostenlosen Tarif enthalten (siehe §4 Kostenregel).

---

### 13.12 Informationen direkt auf der Tour-Kachel

Die wichtigsten Informationen müssen sichtbar sein, ohne die Detailseite zu öffnen.

Mindestens:

```text
Datum bzw. Zeitraum
Region
Streckenlänge
bestätigte / maximale Fahrzeuge
freie Fahrzeugplätze
eigener Anmeldestatus, falls vorhanden
```

Eintägig:

```text
12.09.2027
Harz · 285 km
14 / 20 Fahrzeuge
6 Plätze frei
```

Mehrtagestour:

```text
17.–21.06.2027 · 5 Tage
Dolomiten · 1.250 km
16 / 20 Fahrzeuge
4 Plätze frei
```

Wenn Start- und Enddatum in unterschiedlichen Monaten oder Jahren liegen, vollständige verständliche Datumsdarstellung verwenden.

---

### 13.13 Freie Plätze

Auf jeder Kachel deutlich sichtbar.

Bevorzugt als Badge im oberen Bereich des Bildes:

```text
6 Plätze frei
```

Bei einem Platz:

```text
1 Platz frei
```

Bei voller Tour:

```text
Ausgebucht
```

Berechnung ausschließlich serverseitig:

```text
free_vehicle_slots =
max_vehicles - confirmed_vehicle_count
```

`pending` und `waitlisted` zählen nicht als belegte Fahrzeugplätze.

---

### 13.14 Eigener Anmeldestatus auf der Kachel

Ist der User eingeloggt und besitzt eine Registrierung, zusätzlich anzeigen:

Confirmed:

```text
Du bist dabei
```

Pending:

```text
Freigabe ausstehend
```

Waitlisted:

```text
Warteliste · Platz X
```

Rejected:

```text
Anfrage abgelehnt
```

Der allgemeine Kapazitätsstatus bleibt trotzdem sichtbar.

---

### 13.15 Interaktion

Die gesamte quadratische Tourkachel ist antippbar.

Tap führt zu:

```text
/tours/:slug
```

Keine kleinen `Mehr erfahren` Buttons als alleinige Interaktionsfläche.

Die komplette Kachel muss als großes Touch-Ziel funktionieren.

---

### 13.16 Sortierung

Standardansicht:

1. aktuell laufende Mehrtagestouren
2. zukünftige Touren nach `start_date ASC`
3. bei gleichem Startdatum nach `meeting_at ASC`, sofern gesetzt
4. ansonsten stabil nach `created_at` bzw. ID

Vergangene Touren werden nicht zwischen zukünftigen Touren dargestellt.

---

### 13.17 Vergangene Touren

Vergangene Touren separat:

```text
Vergangene Ausfahrten
```

Standardmäßig unterhalb kommender Touren oder einklappbar.

Wenn der User gezielt einen vergangenen Monat auswählt, dürfen die vergangenen Touren dieses Monats normal unter dem Kalender dargestellt werden.

---

### 13.18 Empty States

Keine Tour im ausgewählten Monat:

```text
Für diesen Monat sind aktuell keine Ausfahrten geplant.
```

Keine Tour am gewählten Tag:

```text
An diesem Tag findet keine Ausfahrt statt.
```

Keine zukünftigen Touren:

```text
Aktuell ist noch keine neue Ausfahrt geplant.
```

---

## 14. Tourdetailseite

Route:

```text
/tours/:slug
```

Die Seite passt sich an Benutzer- und Anmeldestatus an.

### 14.1 Kopfbereich

Reihenfolge:

```text
Tourtitel
Tourbild

Datum oder Zeitraum
Region
Streckenlänge
freie Fahrzeugplätze
Teilnahmebedingungen
Beschreibung
```

Eintägig:

```text
12.09.2027
```

Mehrtagestour:

```text
17.–21.06.2027
5 Tage
```

Laufende Mehrtagestour:

```text
17.–21.06.2027
Läuft aktuell · Tag 3 von 5
```

---

### 14.2 Visitor

- Public Content
- Region
- Datum bzw. Zeitraum
- Streckenlänge
- Fahrzeugkapazität
- Teilnahmebedingungen
- Login/Registrierung CTA

CTA:

```text
Für diese Tour anmelden
```

Nach Login oder Registrierung muss der Nutzer automatisch zur vorher geöffneten Tour zurückkehren.

---

### 14.3 User ohne Anmeldung

- Public + Member Content
- Anmeldeformular

Anmeldeformular mindestens:

```text
Hersteller *
Modell *
Leistung in PS *
Kennzeichen [optional oder Pflicht gemäß Tour]
Anzahl Beifahrer / zusätzliche Personen
```

Wenn eine Altersanforderung existiert und kein Geburtsdatum im Profil gespeichert ist:

- Geburtsdatum ergänzen lassen
- serverseitig validieren

Bei automatischer Bestätigung:

```text
Verbindlich anmelden
```

Bei manueller Freigabe:

```text
Teilnahme anfragen
```

---

### 14.4 Pending

- eigener Status
- eigenes angemeldetes Fahrzeug
- Personenzahl
- Möglichkeit zur Änderung der Personenzahl bis Deadline
- keine Participant-Inhalte

Anzeige:

```text
Deine Anfrage wird geprüft.
```

---

### 14.5 Waitlisted

- eigener Wartelistenstatus
- Wartelistenposition
- eigenes angemeldetes Fahrzeug
- Personenzahl
- Möglichkeit zur Änderung der Personenzahl bis Deadline
- keine Participant-Inhalte

Anzeige:

```text
Warteliste · Position X
```

---

### 14.6 Confirmed Participant

- Public + Member + Confirmed Participant Content
- bestätigter Status
- eigenes Fahrzeug
- Personenzahl
- Änderung der Personenzahl bis Deadline
- genauer Treffpunkt
- Haupt-Kurviger-Link
- Zello-Link / Hinweise
- Liste der bestätigten mitfahrenden Fahrzeuge
- ggf. Stornierungsbutton

Für Mehrtagestouren muss die Seite später mehrere Tagesetappen unterstützen können.

Mögliche Darstellung:

```text
Tag 1
Anreise / Alpen
Kurviger öffnen

Tag 2
Dolomitenrunde
Kurviger öffnen

Tag 3
Sellaronda
Kurviger öffnen
```

Im ersten MVP darf weiterhin nur ein Haupt-Kurviger-Link verwendet werden.

---

### 14.7 Kurviger

Prominenter Button:

```text
Route in Kurviger öffnen
```

Der Link darf standardmäßig nur bestätigten Teilnehmern ausgeliefert werden.

Bei späteren Mehrtagestour-Etappen kann pro Tag ein eigener Kurviger-Link hinterlegt werden.

---

### 14.8 Zello

Wenn ein direkter Zello-Link hinterlegt wurde:

```text
Zello-Kanal öffnen
```

Wenn der Zugang erst am Treffpunkt per QR-Code verteilt wird:

```text
Zello-Zugang

Der QR-Code für den Tourkanal wird am Treffpunkt bereitgestellt.
```

---

### 14.9 Admin

- alle Inhalte
- direkter Link zur Bearbeitung
- Verwaltungsstatus
- Kapazitätsübersicht
- Mehrtagestour-Zeitraum
- später optional Verwaltung der Tagesetappen

---

## 15. Benutzerprofil

Route:

```text
/profile
```

MVP:

- Username
- Vorname
- Nachname
- persönliches Tourenarchiv
- E-Mail nur lesend aus Auth, soweit sinnvoll
- Geburtsdatum optional bzw. bei Bedarf
- Passwortänderung über Auth-Flow
- eigene Touranmeldungen
- Status je Tour
- pro Tour angemeldetes Fahrzeug
- Personenzahl pro Tour
- zukünftige Touren
- vergangene Touren
- Konto löschen

Fahrzeugdaten werden im MVP nicht dauerhaft als globale Fahrzeugliste im Profil verwaltet.

Optional später:

- Profilbild
- persönliche Fahrzeuggarage mit mehreren Fahrzeugen
- Social Handles
- Freunde
- Freigabe des Klarnamens an bestätigte Freunde

---

## 16. PWA-Anforderungen

Die App muss als PWA installierbar sein.

Mindestens:

- Web App Manifest
- App Name = `SFT Drive`
- Short Name = `SFT Drive`
- Icons
- Theme Color
- Background Color
- Standalone Display Mode
- Service Worker
- Offline-Fallback
- responsive Layout
- iOS-kompatible Metatags
- Android-kompatible Installation
- gebrandeter Splash-/Loading-Screen für SFT Drive

### Splash-/Loading-Animation

Für kurze Ladezustände darf ein eigener SFT-Drive-Startscreen verwendet werden.

Designidee:

- schwarzer Hintergrund
- abstrahierter Tacho / Drehzahlmesser aus dem Sportfahrer-Treff-Branding
- rote Segmente
- rote Tachonadel
- `SFT Drive` Branding
- die Nadel dreht beim Laden dynamisch nach oben
- Animation soll kurz, hochwertig und nicht verspielt wirken
- keine unnötig lange künstliche Ladezeit erzeugen
- Animation nur anzeigen, solange tatsächlich initiale App-/Auth-/Dateninitialisierung läuft
- `prefers-reduced-motion` respektieren
- bei reduzierter Bewegung statische Variante anzeigen
- keine kritischen Daten oder App-Navigation hinter einer künstlich verlängerten Splash-Animation blockieren

#### Umsetzung

Der Splash verwendet das bereitgestellte Tacho-Video (`public/splash/startup.mp4`,
Originalquelle vor dem Ausliefern remuxt/faststart, ohne Metadaten) mit dem
Ruhestand-Frame als Poster (`public/splash/startup-poster.jpg`), das gleichzeitig als
statischer Fallback bei `prefers-reduced-motion` dient.

Da Supabase die Session oft in wenigen Millisekunden aus dem lokalen Speicher lädt, war
der Splash sonst kaum wahrnehmbar. Es gilt deshalb eine kurze Mindestanzeigedauer von
700 ms (die tatsächliche Initialisierung bestimmt weiterhin die tatsächliche
Anzeigedauer, falls sie länger dauert) — bewusst kurz gehalten, um obige Regel nicht zu
verletzen. Bei `prefers-reduced-motion` entfällt diese Mindestdauer, da dort ohnehin nur
ein statisches Bild gezeigt wird.

### iOS-Safari-Eigenheiten (aus der Praxis)

Diese Punkte sind beim Testen der installierten PWA auf iPhone aufgefallen und gelten
als verbindliche Anforderung, nicht nur als Bugfix:

- **Safe Areas**: `apple-mobile-web-app-status-bar-style: black-translucent` legt die
  Statusleiste transparent über den Seiteninhalt, statt ihn nach unten zu schieben.
  Header und Bottom-Navigation müssen deshalb `env(safe-area-inset-top)` bzw.
  `env(safe-area-inset-bottom)` als zusätzliches Padding berücksichtigen (zusammen mit
  `viewport-fit=cover` im Viewport-Meta-Tag), sonst verschwinden sie ganz oder teilweise
  hinter Statusleiste/Home-Indicator.
- **Kein Auto-Zoom bei Formularfeldern**: iOS Safari zoomt beim Fokussieren eines
  Eingabefelds automatisch hinein, sobald dessen effektive Schriftgröße unter 16px
  liegt. Alle `input`/`textarea`/`select`-Elemente müssen deshalb mindestens 16px
  Schriftgröße haben.
- **Formular-Resilienz bei Tab-Reloads**: iOS Safari kann eine Seite beim App-Wechsel
  (z. B. um Text aus einer anderen App zu kopieren) jederzeit aus dem Speicher werfen
  und beim Zurückkehren komplett neu laden — der gesamte React-State geht dabei verloren.
  Längere Formulare (insbesondere die Tourverwaltung im Admin-Bereich) sollen ihren
  Eingabestand deshalb laufend in `localStorage` zwischenspeichern und nach einem
  Neustart wiederherstellen (Wiederherstellung hat Vorrang vor bereits aus der DB
  geladenen Werten), und den Entwurf nach erfolgreichem Speichern löschen.

Wichtig:

Private oder sicherheitskritische API-Antworten nicht unkontrolliert im Service-Worker-Cache speichern.

Für das MVP bevorzugt:

- App Shell cachen
- statische Assets cachen
- dynamische Auth-/Supabase-Daten network-first oder gar nicht persistent über den Service Worker cachen
- sinnvolle Offline-Seite anbieten

---

## 17. UI / UX

Zielgruppe sind Sportwagen- und Automotive-Enthusiasten.

Designrichtung:

- hochwertig
- modern
- technisch
- automotive
- nicht verspielt
- klar
- mobil optimiert

Mobile First.

Priorisierte Bildschirmbreiten:

- iPhone
- Android Smartphone
- Tablet
- Desktop

Die App muss auf dem Smartphone mit einer Hand sinnvoll bedienbar sein.

Buttons und Touch-Ziele ausreichend groß gestalten.

Nicht zu viele Informationen gleichzeitig anzeigen.

Für das MVP das definierte **SFT Drive** Branding verwenden.

Bevorzugte Grundrichtung:

- SFT Drive Branding
- dunkles UI
- Schwarz als primäre Fläche
- Rot als gezielte Marken-/Aktionsfarbe
- Weiß bzw. helle Grautöne für Typografie
- klare Typografie
- dezente Kontraste
- große Fahrzeug-/Tourbilder
- reduzierte Karten
- Status-Badges

Kein übertriebener "Gaming"- oder Neon-Look.

### Kalender- und Kachel-UX

- Monatskalender muss ohne horizontales Scrollen auf typischen Smartphonebreiten funktionieren.
- Wochentage und Tageszahlen müssen auch auf kleinen Displays lesbar bleiben.
- Mehrtagestour-Balken dürfen die Tageszahlen nicht unlesbar machen.
- parallele Tourzeiträume müssen visuell stapelbar sein.
- Tourkacheln verwenden mobil `aspect-ratio: 1 / 1`.
- Tourtitel steht oberhalb der Kachel.
- freie Plätze müssen ohne Öffnen der Detailseite sichtbar sein.
- gesamte Kachel ist ein Touch-Ziel.
- Informationen über dem Bild nicht unnötig duplizieren.
- Kalender bleibt kompakt genug, damit auf einem Smartphone möglichst früh die erste Tourkachel sichtbar wird.

---

## 18. Fehler- und Statuszustände

Jede relevante Seite muss mindestens berücksichtigen:

- Loading
- Empty
- Error
- Unauthorized
- Offline

Tour-Anmeldung muss verständliche Rückmeldungen liefern.

Beispiele:

```text
Du bist für diese Tour angemeldet.
```

```text
Diese Tour ist leider bereits ausgebucht.
```

```text
Die Anmeldung für diese Tour ist geschlossen.
```

```text
Du bist bereits angemeldet.
```

Fehler nicht nur in der Browser-Konsole ausgeben.

---

## 19. Zeit, Datum und Zeitzonen

Tourzeiträume werden als Kalenderdaten gespeichert:

```text
start_date DATE
end_date DATE
```

Damit darf ein Tourtag nicht durch Zeitzonenkonvertierung auf den Vor- oder Folgetag verschoben werden.

Konkrete Uhrzeiten werden separat als Zeitzonenwerte gespeichert, z. B.:

```text
meeting_at TIMESTAMPTZ
planned_end_at TIMESTAMPTZ
```

Regeln:

- `end_date >= start_date`
- Dauer in Kalendertagen inklusive Start- und Endtag berechnen
- Tagesfilter arbeitet mit `DATE`
- Kalenderdarstellung darf `DATE` nicht über UTC-Midnight parsen und dadurch verschieben
- Uhrzeiten lokalisiert darstellen
- Standarddarstellung für deutsche Nutzer:

```text
DD.MM.YYYY
HH:mm
```

Mehrtagestour:

```text
17.–21.06.2027
```

Bei Monatswechsel:

```text
30.06.–04.07.2027
```

Bei Jahreswechsel:

```text
30.12.2027–02.01.2028
```

---

## 20. Row Level Security

RLS muss auf allen Tabellen mit Benutzer- oder geschützten Tourdaten aktiviert sein.

Die Policies sind Teil der Anwendungssicherheit und müssen getestet werden.

### profiles

Normaler User darf:

- eigenes Profil lesen
- eigenes Profil aktualisieren

Normaler User darf nicht:

- andere Profile direkt auslesen
- Klarnamen anderer User über die REST-API abfragen

Admin darf:

- Profile lesen, soweit für Verwaltung erforderlich

Spätere Freundesfreigaben müssen über eine gezielte sichere RPC/View umgesetzt werden und dürfen nicht durch eine breite Profil-SELECT-Policy entstehen.

### user_roles

Normaler User darf Rollen nicht manipulieren.

Adminprüfung erfolgt über eine sichere serverseitige Helper-Funktion.

### tours

Visitor darf:

- ausschließlich veröffentlichte Public-Tourzeilen lesen

Authenticated User darf ebenfalls veröffentlichte Touren lesen.

Admin darf:

- alle Touren lesen
- erstellen
- ändern

### tour_member_details

Visitor:

- kein Zugriff

Authenticated User:

- Member-Daten veröffentlichter Touren lesen

Admin:

- voller erforderlicher Zugriff

### tour_participant_details

Normaler User darf nur lesen, wenn er für exakt diese Tour:

```text
status = confirmed
```

besitzt.

Admin darf lesen und ändern.

### tour_registrations

Normaler User:

- eigene Registrierung lesen
- keine fremden Registrierungen direkt lesen
- keine direkte Manipulation von Status, `confirmed_by`, Wartelistenstatus usw.

Admin:

- erforderlicher Verwaltungszugriff

Sicherheitskritische Aktionen:

```text
register_for_tour
approve_tour_registration
reject_tour_registration
cancel_tour_registration
update_passenger_count
```

über kontrollierte RPCs abwickeln.

### Fahrzeugliste für bestätigte Teilnehmer

Keine fremden Registrierungszeilen freigeben.

Stattdessen:

```text
get_confirmed_tour_vehicles(tour_id)
```

mit minimalem Rückgabedatensatz.

### Öffentliche Kapazität

Keine Registrierungen öffentlich lesbar machen.

Stattdessen:

```text
get_public_tour_stats(tour_id)
```

oder äquivalente sichere View/RPC.

RLS-Policies, Grants, Views und SQL-Funktionen müssen vollständig als Migration versioniert werden.

---

## 21. Sitemap, Navigation und Routing

Die App benötigt eine klare, stabile Seitenstruktur.

Die Routing-Struktur soll von Anfang an so aufgebaut werden, dass öffentliche, eingeloggte und administrative Bereiche eindeutig getrennt sind.

### 21.1 Öffentliche Seiten

```text
/
```

Startseite / Tourübersicht.

Inhalt:

- Monatskalender
- nächste und laufende Touren
- Tourkacheln
- freie Fahrzeugplätze
- öffentliche Tourinformationen
- Login-/Registrierungs-CTA für nicht angemeldete User

Die Startseite darf technisch dieselbe Hauptansicht wie `/tours` verwenden.

---

```text
/tours
```

Öffentliche Tourübersicht.

Funktional identisch oder nahezu identisch zur Startseite.

Falls `/` und `/tours` dieselben Inhalte zeigen, nur eine gemeinsame Page-Komponente pflegen.

---

```text
/tours/:slug
```

Öffentliche Tourdetailseite mit zustandsabhängiger Erweiterung.

Visitor sieht:

- öffentliche Informationen
- Datum bzw. Zeitraum
- Region
- Streckenlänge
- freie Plätze
- Teilnahmebedingungen
- Beschreibung

Authenticated User sieht zusätzlich:

- Member-Inhalte
- Anmeldestatus
- Touranmeldung

Confirmed Participant sieht zusätzlich:

- Participant-Inhalte
- privaten Treffpunkt
- Kurviger
- Zello
- bestätigte mitfahrende Fahrzeuge

Admin sieht zusätzlich Verwaltungslinks.

---

```text
/login
```

Loginseite.

Nach erfolgreichem Login:

- wenn ein `returnTo` bzw. eine vorherige geschützte Zielseite vorhanden ist, dorthin zurückkehren
- sonst auf `/`

---

```text
/register
```

Registrierung.

Nach Registrierung und notwendiger E-Mail-Verifikation:

- möglichst zur ursprünglich gewählten Tour zurückkehren
- ansonsten auf `/`

---

```text
/forgot-password
```

Passwort-Reset anfordern.

---

```text
/reset-password
```

Neues Passwort setzen.

Nur über gültigen Auth-Recovery-Flow erreichbar.

---

```text
/impressum
```

Öffentlich.

---

```text
/datenschutz
```

Öffentlich.

---

### 21.2 Geschützte User-Seiten

Diese Seiten benötigen eine gültige Session.

Wenn der User nicht eingeloggt ist:

```text
→ /login?returnTo=<ursprüngliche-route>
```

Nach erfolgreichem Login muss zur ursprünglich angeforderten Seite zurückgekehrt werden.

---

```text
/profile
```

Eigenes Benutzerprofil.

Enthält:

- Username
- Vorname
- Nachname
- optionale Geburtsdaten
- E-Mail soweit sinnvoll
- Passwort-/Account-Aktionen
- Account löschen

---

```text
/profile/tours
```

Eigene aktuelle und zukünftige Touren / Anmeldungen.

Gruppieren nach:

```text
Aktuell / laufend
Kommend
Warteliste
Freigabe ausstehend
Storniert / abgelehnt
```

Vergangene bestätigte Teilnahmen werden nicht nur hier lose angezeigt, sondern zusätzlich in einem eigenen persönlichen Tourenarchiv geführt.

---

```text
/profile/archive
```

Persönliches Tourenarchiv.

Nur für den eingeloggten User selbst sichtbar.

Das Archiv zeigt alle vergangenen Touren, bei denen der User eine bestätigte Teilnahme hatte.

Mindestens anzeigen:

- Tourtitel
- Tour-Cover
- Datum bzw. Zeitraum
- Region
- Streckenlänge, sofern vorhanden
- damals angemeldeter Fahrzeughersteller
- damals angemeldetes Fahrzeugmodell
- damalige Leistung in PS
- optional damalige Personenzahl im Fahrzeug
- Status der Tour, z. B. `completed`

Sortierung:

```text
neueste absolvierte Tour zuerst
```

Filter später optional:

```text
Jahr
Region
Fahrzeughersteller
```

Pro Eintrag anzeigen:

- Tourname
- Datum / Zeitraum
- Fahrzeug
- eigener Status
- Personenzahl
- relevante Aktion

---

```text
/profile/tours/:registrationId
```

Optional.

Eigene konkrete Touranmeldung.

Nur anlegen, wenn dies UX-seitig einen echten Mehrwert bietet.

Alternativ können alle Funktionen direkt über `/tours/:slug` erfolgen.

Keine unnötige zusätzliche Seite bauen.

---

```text
/notifications
```

Persönliches In-App Notification Center.

Nur der eingeloggte User darf seine eigenen Mitteilungen lesen, als gelesen markieren oder löschen.

---

### 21.3 Admin-Seiten

Alle Admin-Routen müssen sowohl im Frontend als auch serverseitig geschützt sein.

Nur ein clientseitiges Route-Guard reicht nicht aus.

Basisroute:

```text
/admin
```

Admin Dashboard.

Mindestens:

- nächste Touren
- bestätigte Fahrzeuge
- freie Plätze
- Pending
- Warteliste
- bestätigte Personen
- Entwürfe
- laufende Touren

---

```text
/admin/tours
```

Tourverwaltung.

Listenansicht mit:

- Draft
- Published
- Running
- Completed
- Cancelled
- Archived

Mögliche Filter:

- Status
- Monat
- kommende / vergangene Touren

---

```text
/admin/tours/new
```

Neue Tour erstellen.

---

```text
/admin/tours/:id/edit
```

Bestehende Tour bearbeiten.

Bereiche:

- Basisdaten
- Datum / Zeitraum
- Region
- Länge
- Coverbild
- öffentliche Beschreibung
- Member-Inhalte
- Participant-Inhalte
- Treffpunkt
- Kurviger
- Zello
- Fahrzeuglimit
- Bestätigungsmodus
- Fahrzeuganforderungen
- Mindestalter
- Kennzeichenpflicht
- Anmeldezeitraum
- Passenger-Deadline

---

```text
/admin/tours/:id/registrations
```

Teilnehmerverwaltung.

Tabs oder Segmente:

```text
Confirmed
Pending
Waitlist
Rejected
Cancelled
```

Zusätzlich:

- bestätigte Fahrzeuganzahl
- freie Plätze
- bestätigte Personenzahl
- Pending-Personenzahl
- Wartelistenanzahl

---

```text
/admin/tours/:id/registrations/:registrationId
```

Optionaler Detailbereich für einzelne Anmeldung.

Nur verwenden, wenn erforderlich.

Kann alternativ als Drawer / Modal innerhalb der Teilnehmerverwaltung umgesetzt werden.

---

```text
/admin/users
```

Umgesetzt (§27.20): einfache Nutzerverwaltung, primär für die Admin-Rollen-
Vergabe/-Übergabe (`admin_list_users`/`admin_set_admin_role`-RPCs) — bewusst
kein umfassendes CRM, nur so viel wie für diesen Zweck nötig.

---

```text
/admin/notifications
```

Umgesetzt (§27.20): zentrale Mitteilungsverwaltung, Ziel wählbar zwischen
einer bestimmten Tour (bestätigte Teilnehmer) oder allen Nutzern (Broadcast).

---

### 21.4 Empfohlene Sitemap

```text
/
├── /tours
│   └── /tours/:slug
│
├── /login
├── /register
├── /forgot-password
├── /reset-password
│
├── /profile
│   ├── /profile/tours
│   └── /profile/archive
│
├── /notifications
│
├── /impressum
├── /datenschutz
│
└── /admin
    ├── /admin/tours
    │   ├── /admin/tours/new
    │   ├── /admin/tours/:id/edit
    │   ├── /admin/tours/:id/registrations
    │   └── /admin/tours/:id/stops
    │       └── /admin/tours/:id/stops/:stopId    (Restaurant-Stopps, §27.20)
    │
    ├── /admin/settings
    ├── /admin/users
    └── /admin/notifications
```

---

### 21.5 Zugriffsmatrix

| Route | Visitor | User | Confirmed Participant | Admin |
|---|---:|---:|---:|---:|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/tours` | ✅ | ✅ | ✅ | ✅ |
| `/tours/:slug` Public | ✅ | ✅ | ✅ | ✅ |
| Member-Inhalte auf `/tours/:slug` | ❌ | ✅ | ✅ | ✅ |
| Participant-Inhalte auf `/tours/:slug` | ❌ | ❌ | ✅ eigene Tour | ✅ |
| `/login` | ✅ | ✅* | ✅* | ✅* |
| `/register` | ✅ | ✅* | ✅* | ✅* |
| `/profile` | ❌ | ✅ | ✅ | ✅ |
| `/profile/tours` | ❌ | ✅ | ✅ | ✅ |
| `/profile/archive` | ❌ | ✅ eigener Inhalt | ✅ eigener Inhalt | ✅ |
| `/notifications` | ❌ | ✅ eigener Inhalt | ✅ eigener Inhalt | ✅ eigener Inhalt |
| `/admin` | ❌ | ❌ | ❌ | ✅ |
| `/admin/tours/*` | ❌ | ❌ | ❌ | ✅ |
| `/admin/users` | ❌ | ❌ | ❌ | ✅ |
| `/admin/notifications` | ❌ | ❌ | ❌ | ✅ |
| `/impressum` | ✅ | ✅ | ✅ | ✅ |
| `/datenschutz` | ✅ | ✅ | ✅ | ✅ |

`*` Bereits eingeloggte Nutzer können sinnvoll auf `/` oder `/profile` umgeleitet werden.

---

### 21.6 Navigation auf Mobilgeräten

Mobile First.

Die Hauptnavigation soll einfach bleiben.

Empfohlen für normale User:

```text
Touren
Meine Touren
Archiv
Profil
```

Für nicht angemeldete Visitor:

```text
Touren
Login
```

Admin zusätzlich:

```text
Admin
```

Keine überladene Bottom-Navigation.

Maximal 4 primäre Ziele. Wenn der Platz knapp wird, darf `Archiv` innerhalb von `Profil` erreichbar sein statt als eigener Bottom-Navigation-Punkt.

---

### 21.7 Header

Auf der öffentlichen Tourübersicht:

- SFT Drive Logo / Appname
- Login oder Profilzugriff
- ggf. kompakter Menübutton

Der Monatskalender bleibt unterhalb des Headers.

Der Header darf nicht so hoch sein, dass der Kalender und die erste Tour unnötig weit nach unten geschoben werden.

---

### 21.8 Route Guards

Mindestens:

```text
RequireAuth
RequireAdmin
```

Optional:

```text
RequireConfirmedParticipant
```

Für Participant-Inhalte ist aber bevorzugt, die Detailseite selbst zustandsabhängig zu rendern und die Daten serverseitig geschützt abzurufen.

Route Guards sind UX-Hilfen, keine Sicherheitsgrenze.

---

### 21.9 Deep Links und Redirects

Die PWA muss direkte Links unterstützen.

Beispiel:

```text
https://app.example.de/tours/dolomiten-2027
```

Wenn ein Visitor dort auf Anmeldung klickt:

```text
/tours/dolomiten-2027
→ /login?returnTo=/tours/dolomiten-2027
→ erfolgreicher Login
→ zurück zu /tours/dolomiten-2027
```

Dasselbe gilt nach Registrierung, soweit Auth-Flow und E-Mail-Verifikation dies erlauben.

---

### 21.10 404 und Fehlerseiten

Benötigt:

```text
/404 bzw. Catch-All Route
```

Meldung:

```text
Diese Seite wurde nicht gefunden.
```

CTA:

```text
Zur Tourübersicht
```

Für nicht erlaubten Zugriff keine sensiblen Informationen preisgeben.

Wenn eine Tour nicht existiert oder nicht veröffentlicht ist:

- Visitor erhält generisches `Nicht gefunden`
- Admin darf den Entwurf über Admin-Routen erreichen

---

### 21.11 Routing-Regeln für Claude

- Keine doppelte Seitenlogik für `/` und `/tours`
- gemeinsame Komponenten wiederverwenden
- Route-Konfiguration zentral pflegen
- Rollen nicht über URL ableiten
- Adminstatus immer aus vertrauenswürdiger Quelle prüfen
- Auth-Redirects erhalten die ursprüngliche Zielroute
- Slugs nur für öffentliche Tour-URLs verwenden
- interne Admin-Routen verwenden UUID/ID, nicht zwingend Slug
- keine vertraulichen Daten in Query-Parametern speichern
- keine User-IDs als Berechtigungsnachweis aus dem Client akzeptieren

---

## 22. Repository-Struktur

Projekt-/Repository-Name bevorzugt:

```text
sft-drive
```

Vorschlag:

```text
/
├── CLAUDE.md
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── offline.html
│
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── tours/
│   │   ├── registrations/
│   │   ├── profile/
│   │   └── admin/
│   ├── hooks/
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   └── main.tsx
│
├── supabase/
│   └── migrations/
│
└── tests/
```

Die Struktur darf angepasst werden, wenn es dafür einen klaren technischen Grund gibt.

---

## 23. Change Management und laufende Entwicklung

Diese `CLAUDE.md` ist die zentrale und verbindliche Produktspezifikation für **SFT Drive**.

Neue Anforderungen sollen bevorzugt **additiv** ergänzt werden. Bereits implementierte oder aktuell in Arbeit befindliche Bereiche dürfen nicht grundlos neu gebaut oder großflächig refaktoriert werden.

Regeln:

1. Vor jeder größeren Änderung bestehende Implementierung lesen.
2. Prüfen, ob die neue Anforderung bestehende Datenmodelle, RLS, RPCs, Routes oder UI-Flows beeinflusst.
3. Wenn keine zwingende Änderung nötig ist, bestehende Architektur unverändert lassen.
4. Neue Features bevorzugt modular ergänzen.
5. Wenn bestehende Datenmodelle erweitert werden müssen, nur die minimal notwendige Migration erstellen.
6. Keine bereits funktionierende Phase erneut implementieren.
7. Keine parallele zweite Architektur für dieselbe Funktion einführen.
8. Keine zweite Auth-, Notification-, Tour- oder User-Lösung neben der bestehenden bauen.
9. Neue Anforderungen klar einer bestehenden oder neuen Entwicklungsphase zuordnen.
10. Bestehende Tests beibehalten und um neue Tests ergänzen.
11. Breaking Changes vermeiden.
12. Wenn ein Breaking Change unvermeidbar ist, Auswirkungen vor der Umsetzung dokumentieren.
13. Datenmigrationen müssen versioniert und nachvollziehbar sein.
14. Bereits gespeicherte historische Daten dürfen nicht unbeabsichtigt überschrieben oder gelöscht werden.
15. Diese Datei bleibt die Single Source of Truth. Keine konkurrierende zweite Haupt-Spezifikationsdatei anlegen.

Wenn eine neue Anforderung bereits teilweise durch bestehende Funktionen abgedeckt wird, vorhandene Funktionen erweitern statt Duplikate zu erzeugen.

---

## 24. Coding-Regeln für Claude

Bei jeder Implementierung:

1. bestehenden Code zuerst lesen
2. vorhandene Architektur respektieren
3. keine Dateien unnötig komplett neu schreiben
4. kleine nachvollziehbare Änderungen bevorzugen
5. TypeScript strikt typisieren
6. kein `any`, wenn vermeidbar
7. keine Secrets hardcoden
8. keine sicherheitskritische Prüfung ausschließlich im Browser
9. Fehlerbehandlung implementieren
10. Build nach relevanten Änderungen prüfen
11. Linter/Test ausführen, wenn vorhanden
12. keine Abhängigkeit ohne echten Nutzen hinzufügen
13. keine kostenpflichtigen Dienste ohne Zustimmung hinzufügen
14. Migrationen niemals nur manuell im Dashboard dokumentieren — SQL im Repository ablegen
15. README bei Setup-Änderungen aktualisieren
16. Projektname in UI, Manifest, README und Metadaten konsistent als `SFT Drive` führen
17. keine alten generischen oder abweichenden Produktnamen neu einführen

Wenn du einen Fehler findest, behebe nicht ungefragt große, nicht zusammenhängende Bereiche des Projekts.

---

## 25. Security Checklist

Vor jedem Release prüfen:

- [ ] RLS auf allen relevanten Tabellen aktiv
- [ ] kein Service-Role-Key im Client
- [ ] keine Secrets im Git-Repository
- [ ] Adminrechte serverseitig geprüft
- [ ] User kann keine fremden Profile direkt lesen
- [ ] User kann keine fremden Profile ändern
- [ ] User kann keine fremden Registrierungen direkt lesen
- [ ] User kann keine fremden Registrierungen ändern
- [ ] öffentliche `tours`-Tabelle enthält keine Participant-Secrets
- [ ] Kurviger-Link liegt nicht in einer öffentlich lesbaren Tabelle
- [ ] Zello-Link liegt nicht in einer öffentlich lesbaren Tabelle
- [ ] privater Treffpunkt liegt nicht in einer öffentlich lesbaren Tabelle
- [ ] Participant-Inhalte sind nur für `confirmed` erreichbar
- [ ] `pending` erhält keine Participant-Inhalte
- [ ] `waitlisted` erhält keine Participant-Inhalte
- [ ] Fahrzeugliste gibt keine Klarnamen aus
- [ ] Fahrzeugliste gibt keine Kennzeichen aus
- [ ] Fahrzeugliste gibt keine fremde Personenzahl aus
- [ ] öffentliche Kapazitätsabfrage gibt keine Userdaten aus
- [ ] Tourkapazität atomar geschützt
- [ ] parallele Anmeldungen können `max_vehicles` nicht überschreiten
- [ ] Admin-Bestätigung kann `max_vehicles` nicht umgehen
- [ ] Wartelisten-Nachrücken ist atomar
- [ ] Draft-Touren nicht öffentlich erreichbar
- [ ] Eingaben serverseitig validiert
- [ ] Altersprüfung serverseitig
- [ ] Leistungsprüfung serverseitig
- [ ] Kennzeichenpflicht serverseitig
- [ ] Passenger-Deadline serverseitig
- [ ] `SECURITY DEFINER` Funktionen haben sicheren `search_path`
- [ ] RPCs verwenden `auth.uid()` statt clientgelieferter User-ID
- [ ] Formulare gegen offensichtlichen Missbrauch abgesichert
- [ ] kein unsicheres HTML-Rendering
- [ ] externe Links sicher geöffnet (`noopener`/`noreferrer`, wenn neues Fenster)
- [ ] Auth Redirect URLs korrekt
- [ ] Account-Deletion getestet

---

## 26. MVP Umfang

Die Phasen 1–8 sind umgesetzt. Die folgende Auflistung bleibt als Architektur- und Regression-Referenz bestehen.

### Phase 1 — Projektbasis

- GitHub Repository vorbereiten
- React + TypeScript + Vite
- zentrale Routing-Konfiguration
- Public Routes
- Auth Routes
- User Routes
- Admin Routes
- Route Guards
- Return-to-Login-Flow
- Styling
- PWA-Grundkonfiguration
- SFT Drive App-Name und Metadaten
- Branding-Grundlagen
- Splash-/Loading-Screen
- Cloudflare-Pages-kompatibler Build
- `.env.example`
- README

### Phase 2 — Supabase

- Supabase Projekt
- Auth konfigurieren
- Datenbankmigrationen
- Profiles
- Roles
- Public Tours
- Member Details
- Confirmed Participant Details
- Registrations
- RLS
- Admin-Helper-Funktion
- Public Stats RPC/View
- Sanitized Participant Vehicle RPC

### Phase 3 — Auth

- Registrierung
- E-Mail-Bestätigung
- Login
- Logout
- Passwort vergessen
- Session Handling
- Protected Routes

### Phase 4 — Public Tour UI

- Startseite
- Monatskalender
- Monatsnavigation
- Eventtage markieren
- Mehrtagestour-Balken
- Monatswechsel bei Mehrtagestouren
- Tagesfilter
- laufende Touren priorisieren
- 1:1 Tourkacheln
- Tour-Coverbilder
- freie Plätze direkt auf Kacheln
- Tourdetail
- Public Content

### Phase 5 — Tourregistrierung

- fahrzeugbezogene Anmeldung
- Hersteller / Modell / Leistung
- optionale bzw. verpflichtende Kennzeichenerfassung je Tour
- sichere RPC-Anmeldung
- automatische oder manuelle Bestätigung
- atomare Fahrzeug-Kapazitätsprüfung
- Warteliste
- Nachrücklogik
- Statusanzeige
- Beifahrer-/Personenzahl
- Änderungsdeadline für Personenzahl
- Stornierung
- eigene Anmeldungen
- persönliches Tourenarchiv

### Phase 6 — Admin

- Admin Route
- Tour erstellen
- Tour bearbeiten
- veröffentlichen
- absagen
- maximale Fahrzeugzahl
- Mindest-/Maximalleistung
- Mindestalter
- automatische/manuelle Bestätigung
- Kennzeichenpflicht
- Kurviger-Link
- Zello-Link
- Pending/Confirmed/Waitlist Verwaltung
- Restaurant-Personenzahl

### Phase 7 — PWA & Qualität

- Manifest
- Service Worker
- Icons
- Offline-Fallback
- mobile QA
- Build Test
- RLS-Tests
- paralleler Registration-/Capacity-Test
- Wartelisten-Nachrücktest
- Security Review

### Phase 8 — Deployment

- GitHub Push
- Cloudflare Pages verbinden
- Environment Variables konfigurieren
- Supabase Redirect URLs konfigurieren
- Production Test

### Aktueller Deployment-Stand

Dokumentiert den tatsächlich eingerichteten Stand, damit er nicht aus Chat-Verläufen
rekonstruiert werden muss.

- **Supabase-Projekt:** `spbbypvgjqjkpuskigau`, Region Irland (`eu-west-1`, EU-Datenhaltung).
- **Cloudflare Pages:** Projekt `sft-drive`, Production Branch `main`, Build-Kommando
  `npm run build`, Output-Verzeichnis `dist`, live unter `https://sft-drive.pages.dev`.
- Umgebungsvariablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sind in Cloudflare
  Pages für Production **und** Preview gesetzt.
- Supabase Auth → URL Configuration: Site URL und Redirect URLs
  (`https://sft-drive.pages.dev/**`) sind auf die Cloudflare-Pages-Domain gesetzt, damit
  Bestätigungs-/Passwort-Reset-Links korrekt zurückführen.
- Migrationen werden mangels direktem DB-Zugriff aus der Entwicklungsumgebung heraus
  manuell im Supabase SQL Editor in Dateiname-Reihenfolge eingespielt (siehe
  `supabase/migrations/`), nicht automatisiert per CLI.
- Erster Admin wurde über Dashboard → Authentication → Users → Add user (ohne
  Metadaten, siehe defensiver `handle_new_user()`-Trigger) angelegt und per
  `insert into public.user_roles ...` zum Admin gemacht.
- Vier Supabase Edge Functions sind im Einsatz (Dashboard → Edge Functions,
  ebenfalls manuell deployed, kein CI/CD dafür): `delete-account` (vollständige
  Auth-Kontolöschung, §7), `send-push` (Web-Push-Zustellung, §27),
  `admin-manage-user` (Sperren/Entsperren/Löschen fremder Konten aus
  `/admin/users`, §21.3/§27.20) und `restaurant-order-notifications`
  (zeitgesteuerte Restaurant-Bestell-Pushes über `pg_cron`, §27.10/§27.20). Für
  `send-push` und `restaurant-order-notifications` sind zusätzlich drei
  projektweite Edge-Function-Secrets gesetzt: `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Der öffentliche VAPID-Schlüssel liegt
  zusätzlich als `VITE_VAPID_PUBLIC_KEY` in den Cloudflare-Pages-
  Umgebungsvariablen (Production und Preview). Für `restaurant-order-
  notifications` ist zusätzlich per `pg_cron`/`pg_net`/Supabase Vault ein
  15-Minuten-Job eingerichtet (Setup-Anleitung als Kommentar am Anfang der
  Function selbst dokumentiert, nicht als Migration, da er den echten
  Service-Role-Key enthält).
- Edge Functions in diesem Projekt werden ausschließlich über "Deploy a new
  function" mit korrektem Namen von Anfang an angelegt. Ein nachträgliches
  Umbenennen über Dashboard → Settings → Name ändert nur die Anzeige, nicht
  den tatsächlichen Slug/die aufgerufene URL — bei falschem Namen die Function
  löschen und mit dem korrekten Namen neu anlegen, nicht umbenennen.
- Bei `SECURITY DEFINER`-Funktionen mit `RETURNS TABLE`, die Spalten aus
  `auth.users` ausgeben (z. B. `email`), diese explizit auf `text` casten
  (`u.email::text`) — siehe §8.12 "Praxis-Falle bei `RETURN QUERY`".
- Der PWA-Build läuft seit Phase 9 über vite-plugin-pwas `injectManifest`-
  Strategie mit eigenem Service Worker (`src/sw.ts`), nicht mehr über
  `generateSW` — nötig für die `push`/`notificationclick`-Handler von Web
  Push. Precaching- und Navigate-Fallback-Verhalten sind dort nachgebaut,
  siehe die Kommentare in `vite.config.ts` und `src/sw.ts`.

---

## 27. Restaurant-Stopps, Essensvorbestellung und Notifications

Restaurant-Stopps sind eine wichtige organisatorische Erweiterung für SFT Drive und müssen für eintägige sowie mehrtägige Touren funktionieren.

Die Funktion verwendet die bestehende bestätigte `tour_registration` als Teilnehmerbasis und darf die Touranmeldung nicht duplizieren.

### 27.1 Grundprinzip

Ein Admin kann innerhalb einer Tour einen Restaurant-Stopp anlegen.

Bestätigte Teilnehmer können innerhalb einer definierten Frist Essen für die Personen ihres eigenen Fahrzeugs vorbestellen.

Der Admin erhält eine aggregierte Gesamtbestellung und eine fahrzeugbezogene Detailansicht.

Die Anzahl bestellter Gerichte beeinflusst niemals das Fahrzeuglimit der Tour.

### 27.2 Allgemeine Tour-Stopps

Empfohlene Tabelle:

```text
tour_stops
```

Mindestens:

```text
id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
stage_id UUID NULL
type TEXT
title TEXT
description TEXT NULL
location_name TEXT NULL
address TEXT NULL
starts_at TIMESTAMPTZ NULL
sort_order INTEGER
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Mögliche `type` Werte:

```text
restaurant
meeting
fuel
break
hotel
viewpoint
other
```

Regeln:

- ein Tour-Stopp gehört genau zu einer Tour
- bei Mehrtagestouren kann er optional einer Tagesetappe zugeordnet werden
- private Stopps sind nur bestätigten Teilnehmern bzw. Admins sichtbar
- Restaurant-Stopps können zusätzliche Bestellfunktionen erhalten

### 27.3 Restaurant-Konfiguration

```text
restaurant_stop_settings
```

Mindestens:

```text
tour_stop_id UUID PRIMARY KEY REFERENCES tour_stops(id)
ordering_enabled BOOLEAN DEFAULT FALSE
ordering_open_at TIMESTAMPTZ NULL
ordering_deadline_at TIMESTAMPTZ NULL
restaurant_note TEXT NULL
push_sent_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- Essensbestellung pro Restaurant-Stopp aktivierbar
- Bestellfrist durch Admin
- nach Fristende keine Änderung mehr durch normale User
- Admin darf weiterhin organisatorische Korrekturen vornehmen

### 27.4 Speisekarte

```text
menu_items
```

Mindestens:

```text
id UUID PRIMARY KEY
restaurant_stop_id UUID REFERENCES tour_stops(id)
name TEXT
description TEXT NULL
price NUMERIC NULL
is_available BOOLEAN DEFAULT TRUE
is_vegetarian BOOLEAN DEFAULT FALSE
is_vegan BOOLEAN DEFAULT FALSE
allergen_info TEXT NULL
sort_order INTEGER
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- nur verfügbare Gerichte anzeigen
- Preis optional
- Beschreibung optional
- Allergene optional
- Menüpositionen sortierbar
- bereits bestellte Menüpositionen nicht unkontrolliert löschen

### 27.5 Bestellung pro Touranmeldung

```text
meal_orders
```

Mindestens:

```text
id UUID PRIMARY KEY
restaurant_stop_id UUID REFERENCES tour_stops(id)
registration_id UUID REFERENCES tour_registrations(id)
status TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
submitted_at TIMESTAMPTZ NULL
```

Status:

```text
draft
submitted
cancelled
```

Pro `restaurant_stop_id + registration_id` darf nur eine aktive Bestellung existieren.

### 27.6 Bestellpositionen

```text
meal_order_items
```

Mindestens:

```text
id UUID PRIMARY KEY
meal_order_id UUID REFERENCES meal_orders(id)
menu_item_id UUID REFERENCES menu_items(id)
quantity INTEGER
note TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- `quantity > 0`
- Notiz optional, z. B. `ohne Zwiebeln`
- nur Positionen der eigenen Bestellung bearbeitbar
- nach Deadline für normale User schreibgeschützt

### 27.7 Personenanzahl und Gerichte

Gesamtpersonen im Fahrzeug:

```text
1 + passenger_count
```

Die App darf die Gerichtsanzahl mit der Personenzahl vergleichen, aber nicht hart begrenzen.

Beispielhinweis:

```text
Du hast 3 Personen für diese Tour angegeben, aber aktuell 2 Gerichte ausgewählt.
```

Der User darf trotzdem absenden.

### 27.8 Teilnehmer-UX

Nur bestätigte Teilnehmer dürfen bestellen:

```text
tour_registrations.status = 'confirmed'
```

Beispiel:

```text
Mittagessen – Berggasthof
12:30 Uhr

Bestellung möglich bis:
Donnerstag, 18:00 Uhr
```

CTA:

```text
Essen auswählen
```

Bis zur Deadline:

```text
Bestellung ändern
```

Danach:

```text
Bestellung geschlossen
```

### 27.9 Admin-Auswertung

Beispiel:

```text
Restaurant: Berggasthof

12 × Schnitzel
7 × Burger
4 × Veggie Bowl

Gesamt: 23 Gerichte
Bestätigte Personen der Tour: 27
```

Zusätzlich fahrzeugbezogene Detailansicht:

```text
S4shadow
Audi S4
3 Personen

2 × Schnitzel
1 × Burger
```

Später optional:

- CSV Export
- PDF Export
- druckbare Bestellübersicht

### 27.10 Notification-Infrastruktur

SFT Drive besitzt eine allgemeine Notification-Infrastruktur.

Mögliche Typen:

```text
RESTAURANT_ORDER_OPEN
RESTAURANT_ORDER_REMINDER
MEETING_POINT_CHANGED
TOUR_UPDATE
DEPARTURE_REMINDER
WEATHER_WARNING
ADMIN_MESSAGE
NEW_TOUR_IN_REGION
```

Die Infrastruktur ist bewusst nicht ausschließlich für Restaurants gebaut.

### 27.11 Push-Empfänger

Restaurant-Push standardmäßig nur an bestätigte Teilnehmer der jeweiligen Tour.

Nicht senden an:

```text
Visitor
pending
waitlisted
rejected
cancelled
```

### 27.12 Push-Inhalt und Deep Link

Beispiel:

```text
Mittagessen für die Harz Tour

Bitte wähle dein Essen bis Donnerstag, 18:00 Uhr.
```

Tap öffnet:

```text
/tours/:slug
```

oder gezielt:

```text
/tours/:slug/stops/:stopId/order
```

### 27.13 In-App Notification Center

Push darf nie der einzige Informationskanal sein.

Jede wichtige Push-Mitteilung wird zusätzlich in der App gespeichert.

Route:

```text
/notifications
```

Beispiel:

```text
Mitteilungen

● Essensbestellung geöffnet
  Dolomiten Tour · Tag 2

● Treffpunkt geändert
  Harz Tour
```

Im Header darf eine Glocke mit Badge erscheinen.

### 27.14 Notifications-Datenmodell

```text
notifications
```

Mindestens:

```text
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
tour_id UUID NULL REFERENCES tours(id)
type TEXT
title TEXT
body TEXT
target_path TEXT NULL
created_at TIMESTAMPTZ
read_at TIMESTAMPTZ NULL
```

Regeln:

- User sieht nur eigene Notifications
- User markiert nur eigene Notifications als gelesen
- keine unnötig privaten Daten in Notification-Inhalten

### 27.15 Push Subscriptions

```text
push_subscriptions
```

Mindestens:

```text
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
endpoint TEXT
p256dh TEXT
auth TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
last_used_at TIMESTAMPTZ NULL
```

Regeln:

- mehrere Geräte pro User möglich
- User verwaltet nur eigene Subscription
- ungültige Subscriptions entfernbar
- Push ist nie Voraussetzung für die App-Nutzung

### 27.16 PWA-Verhalten

- Permission erst nach klarer User-Aktion anfragen
- keine Push-Abfrage beim ersten Appstart
- Nutzen vorab erklären
- Ablehnung muss möglich sein
- App bleibt vollständig nutzbar
- Notification Center bleibt verfügbar

### 27.17 Security und RLS

Mindestens:

- nur bestätigte Teilnehmer dürfen für die eigene Registrierung bestellen
- fremde Bestellungen nicht les- oder änderbar
- Admin darf Bestellungen seiner Touren sehen
- Bestellfrist serverseitig prüfen
- Menüverfügbarkeit serverseitig prüfen
- User-ID nie als unsicheren Berechtigungsnachweis aus Clientparametern akzeptieren
- Push-Empfänger serverseitig aus Tourregistrierungen ableiten
- Notification-Zugriff über `auth.uid()` absichern

### 27.18 Entwicklungsphasen

Die ursprünglich nach dem Kern-MVP geplanten Phasen 9–11 sind inzwischen umgesetzt. Die folgende Reihenfolge bleibt als Architektur- und Historienreferenz bestehen.

```text
Phase 9 — Notifications
Phase 10 — Tour Stops
Phase 11 — Restaurant Ordering
```

#### Phase 9 — Notifications

- In-App Notification Center
- Read/Unread
- Deep Links
- Push Subscription
- Web Push
- Admin Notification Trigger
- Security / RLS

#### Phase 10 — Tour Stops

- generische Stopps
- Restaurant
- Meeting
- Fuel
- Break
- Hotel
- Zuordnung zu Tagesetappen
- Sichtbarkeitsregeln

#### Phase 11 — Restaurant Ordering

- Restaurant-Konfiguration
- Speisekarte
- Bestellfrist
- Bestellung pro Tourregistrierung
- Mengen und Notizen
- Admin-Gesamtauswertung
- fahrzeugbezogene Detailansicht
- Push bei Öffnung
- Reminder Push

### 27.19 Definition of Done Restaurant / Notifications

Die Erweiterung gilt erst als fertig, wenn:

1. Admin Restaurant-Stopp anlegen kann
2. Speisekarte anlegbar und sortierbar ist
3. Bestellfrist gesetzt werden kann
4. nur bestätigte Teilnehmer bestellen können
5. Teilnehmer nur für eigene Tourregistrierung bestellen
6. Änderungen bis zur Deadline möglich sind
7. nach Deadline normale User nicht mehr ändern
8. Admin weiterhin korrigieren kann
9. Gerichtsanzahl nicht hart an Personenzahl gebunden ist
10. bei Abweichung ein Hinweis erscheint
11. Admin eine aggregierte Gesamtbestellung sieht
12. Admin fahrzeugbezogene Bestellungen sieht
13. Push nur an relevante bestätigte Teilnehmer geht
14. Push-Tap einen Deep Link öffnet
15. wichtige Pushes zusätzlich im Notification Center vorhanden sind
16. User nur eigene Notifications sieht
17. Push ablehnbar ist
18. mehrere Geräte pro User möglich sind
19. RLS und Deadline serverseitig getestet sind
20. bestehende Tour-, Auth- und Registrierungsfunktionen unverändert weiter funktionieren

### 27.20 Umsetzungsstand

Phase 9, 10 und 11 sind umgesetzt (Migrationen `20260907081600` bis
`20260907082000`, jeweils lokal gegen eine echte, nicht-privilegierte
Postgres-Rolle auf RLS getestet, nicht nur als Superuser).

**Phase 9 — Notifications:** vollständig, inklusive echter Web-Push-Zustellung
(eigener Service Worker per `injectManifest`-Strategie statt `generateSW`,
VAPID-Schlüsselpaar, Supabase Edge Function `send-push`). Zusätzlich zur
ursprünglichen Spezifikation umgesetzt:

- Regionsbasierte Benachrichtigungspräferenzen (`notification_preferences`,
  Chip-Auswahl in `/profile`): User werden automatisch per DB-Trigger
  benachrichtigt, sobald eine Tour in einer abonnierten Region veröffentlicht
  wird (Typ `NEW_TOUR_IN_REGION`).
- Admin-Broadcast an alle Nutzer (`admin_send_broadcast_notification`),
  zusätzlich zur tourbezogenen Mitteilung — beides zentral über
  `/admin/notifications` auslösbar, nicht mehr in die Teilnehmerverwaltung
  einer einzelnen Tour verschachtelt.
- Swipe-to-delete für einzelne Mitteilungen (`delete_notification`-RPC).

**Phase 10 — Tour Stops:** vollständig (`tour_stops`, Admin-Verwaltung unter
`/admin/tours/:id/stops`, Anzeige für bestätigte Teilnehmer auf der
Tourdetailseite). Zuordnung zu Tagesetappen (`stage_id`) ist im Datenmodell
vorbereitet, im MVP-UI aber noch ungenutzt (§8.6 gilt unverändert).

**Phase 11 — Restaurant Ordering:** vollständig, inklusive der automatischen
Pushes (`restaurant_stop_settings`, `menu_items`, `meal_orders`,
`meal_order_items`, `submit_meal_order`/`admin_update_meal_order`-RPCs,
Admin-Auswertung unter `/admin/tours/:id/stops/:stopId`, Bestellformular auf
der Tourdetailseite). `RESTAURANT_ORDER_OPEN` (sobald das Bestellfenster
öffnet) und `RESTAURANT_ORDER_REMINDER` (24 Stunden vor Fristablauf, nur an
Teilnehmer ohne bereits eingereichte Bestellung) laufen über eine eigene
Edge Function `restaurant-order-notifications`, zeitgesteuert per
`pg_cron` (alle 15 Minuten) statt von der App selbst ausgelöst — der
Service-Role-Key dient dabei als gemeinsames Geheimnis zwischen `pg_cron`
(über Supabase Vault) und der Function, keine User-JWT-Prüfung nötig, da
kein Client diese Function je aufruft. `push_sent_at`/`reminder_sent_at`
auf `restaurant_stop_settings` verhindern Doppelversand.

Ebenfalls neu, additiv zu §12/§21.3 ergänzt: **`/admin/users`**
(Nutzerverwaltung) — ein Admin kann andere User direkt in der App zum Admin
machen bzw. die Rolle wieder entziehen (`admin_list_users`,
`admin_set_admin_role`-RPCs), für eine einfache Admin-Übergabe ohne
direkten Datenbankzugriff. Der letzte verbleibende Admin kann sich die
Rolle nicht selbst entziehen.

---

## 28. Nicht im ersten MVP

Der Kern-MVP ist abgeschlossen. Diese Liste markiert Funktionen, die weiterhin bewusst außerhalb des aktuell umgesetzten Scopes liegen:

- Bezahlung
- Ticketverkauf
- automatische Rechnungen
- WhatsApp API
- komplexe Chatfunktion
- Live-GPS-Tracking
- Fahrzeug-Telemetrie
- öffentlich sichtbare Nutzerprofile
- Ranking/Gamification
- native iOS-/Android-App
- kostenpflichtige Karten-APIs
- globale Fahrzeuggarage
- Freundesnetzwerk
- gegenseitige Klarnamenfreigabe
- direkte Kurviger-API-Integration
- vollständige Mehrtagestour-Tagesetappenverwaltung, sofern nicht bereits für das MVP benötigt
- direkte Zello-API-Integration

Kurviger und Zello werden über hinterlegte Links integriert.

Die Architektur darf spätere Erweiterungen ermöglichen.

---

## 29. Denkbare spätere Erweiterungen

Nicht jetzt implementieren, aber beim Datenmodell nicht unnötig verbauen:

- persönliche Fahrzeuggarage mit mehreren Fahrzeugen
- Fahrzeug bei Touranmeldung aus gespeicherter Garage auswählen
- Freunde / Freundesanfragen
- gegenseitige Klarnamenfreigabe für bestätigte Freunde
- Tour-Kategorien
- wiederkehrende Events
- Tagesetappen für Mehrtagestouren
- mehrere Kurviger-Links pro Tourtag
- GPX Upload
- GPX Download
- Kartenansicht
- tiefere Kurviger-Integration
- Zello-Integration
- QR-Code für Zello direkt in der Touransicht
- Check-in am Treffpunkt
- E-Mail-Erinnerungen
- Tourbilder / Galerie
- Kommentare
- Gruppen
- Einladungscodes
- private Touren
- Moderatoren
- mehrere Admin-Rollen
- Export Teilnehmer-/Fahrzeugliste
- CSV Export
- QR-Code Check-in
- Pannen-/Notfallinformationen
- dynamische Roadbook-Funktion
- Fahrzeugwechsel nach Anmeldung mit erneuter Regelprüfung
- mehrere Fahrer pro Fahrzeug, falls später benötigt
- Restaurantstatus / Reservierungsstatus

---

## 30. Definition of Done für das erste MVP

Der Kern-MVP wurde gegen diese Liste umgesetzt. Die Punkte dienen ab jetzt zusätzlich als Regression-Checkliste: neue Änderungen dürfen bereits erfüllte Anforderungen nicht wieder brechen.

Das MVP gilt erst als fertig, wenn:

1. ein Visitor veröffentlichte Touren sehen kann
2. Datum, Region und Streckenlänge öffentlich sichtbar sind
3. ein Visitor geschützte Inhalte nicht abrufen kann
4. ein neuer User sich registrieren kann
5. der User seine E-Mail verifizieren kann
6. Login und Logout funktionieren
7. Username und Klarname getrennt behandelt werden
8. ein User geschützte Mitgliederinhalte sehen kann
9. ein Admin eine Tour anlegen kann
10. ein Admin die maximale Fahrzeugzahl setzen kann
11. ein Admin automatische oder manuelle Bestätigung einstellen kann
12. ein Admin Kennzeichen optional oder verpflichtend einstellen kann
13. ein Admin Mindestleistung setzen kann
14. ein Admin optional Maximalleistung setzen kann
15. ein Admin optional Mindestalter setzen kann
16. ein Admin eine Personenzahl-Änderungsdeadline setzen kann
17. ein Admin Kurviger- und Zello-Link hinterlegen kann
18. ein Admin eine Tour veröffentlichen kann
19. ein User sich mit Hersteller, Modell und Leistung zu einer Tour anmelden kann
20. Kennzeichen nur dann Pflicht ist, wenn die Tour dies verlangt
21. die maximale Fahrzeugzahl auch bei parallelen Requests niemals überschritten werden kann
22. im Automatikmodus freie Anmeldungen direkt bestätigt werden
23. im manuellen Modus freie Anmeldungen zunächst `pending` werden
24. ein Admin Pending-Anmeldungen sicher bestätigen oder ablehnen kann
25. bei voller Tour neue Anmeldungen automatisch auf die Warteliste gelangen
26. die Wartelistenreihenfolge deterministisch und manipulationssicher ist
27. bei frei werdendem Platz im Automatikmodus korrekt nachgerückt wird
28. bei frei werdendem Platz im manuellen Modus der nächste Wartelisteneintrag auf `pending` gesetzt wird
29. ein User nicht mehrfach gleichzeitig für dieselbe Tour registriert sein kann
30. ein User seine Teilnahme stornieren kann
31. ein User Beifahrer / zusätzliche Personen bei Anmeldung angeben kann
32. Personenzahl nicht gegen das Fahrzeuglimit zählt
33. ein User seine Personenzahl bis zur Admin-Deadline ändern kann
34. der Admin die bestätigte Gesamtpersonenzahl für Restaurantplanung sieht
35. nur bestätigte Fahrer Participant-Inhalte sehen
36. nur bestätigte Fahrer die Liste der bestätigten mitfahrenden Fahrzeuge sehen
37. in dieser Liste Username, Hersteller, Modell und PS sichtbar sind
38. dort keine Klarnamen oder Kennzeichen anderer User sichtbar sind
39. normale User keinen Adminzugriff erhalten
40. RLS getestet wurde
41. andere User fremde Profile nicht direkt auslesen können
42. andere User fremde Registrierungszeilen nicht direkt auslesen können
43. die Teilnehmer-Fahrzeugliste nur Username, Hersteller, Modell und PS ausliefert
44. öffentliche Kapazitätsdaten ohne Zugriff auf Teilnehmerdaten funktionieren
45. Kurviger-Link nur gemäß Sichtbarkeitsregel ausgeliefert wird
46. Zello-Link nur gemäß Sichtbarkeitsregel ausgeliefert wird
47. die PWA installierbar ist
48. die Anwendung auf iPhone und Android sinnvoll nutzbar ist
49. Production Deployment über das GitHub-Repository funktioniert

---

50. eintägige Touren mit `start_date = end_date` korrekt funktionieren
51. Mehrtagestouren mit `end_date > start_date` korrekt funktionieren
52. Mehrtagestouren über Monatsgrenzen hinweg korrekt dargestellt werden
53. der Kalender eintägige Touren mit Eventpunkt darstellt
54. der Kalender Mehrtagestouren mit einem farbigen Zeitraum-Balken darstellt
55. die Unterscheidung von Ein- und Mehrtagestouren nicht nur über Farbe erfolgt
56. der Tagesfilter Mehrtagestouren an jedem Tag ihres Zeitraums findet
57. beim Öffnen sinnvoll der aktuelle Monat oder der Monat der nächsten Tour angezeigt wird
58. laufende Mehrtagestouren oberhalb zukünftiger Touren stehen
59. jede Tour eine mobile 1:1-Kachel besitzt
60. Tourtitel oberhalb der Kachel dargestellt wird
61. freie Fahrzeugplätze direkt auf jeder Kachel sichtbar sind
62. Touren standardmäßig nach Startdatum sortiert werden
63. Mehrtagestouren eine verständliche Zeitraumdarstellung erhalten
64. die Sitemap entsprechend dieser Spezifikation umgesetzt ist
65. `/` und `/tours` keine doppelte Businesslogik besitzen
66. nicht eingeloggte User bei geschützten Routen zum Login geleitet werden
67. nach Login zur ursprünglich angeforderten Route zurückgeleitet wird
68. normale User keine Admin-Routen laden können
69. Admin-Routen serverseitig geschützt sind
70. direkte Deep Links auf Tourdetailseiten funktionieren
71. eine Catch-All-/404-Route vorhanden ist
72. jeder User ein persönliches Tourenarchiv besitzt
73. nur vergangene bestätigte Teilnahmen im Archiv erscheinen
74. das Archiv nach neuester vergangener Tour sortiert wird
75. das damals angemeldete Fahrzeug als historischer Snapshot erhalten bleibt
76. ein User ausschließlich sein eigenes Archiv lesen kann
77. Mehrtagestouren im Archiv mit vollständigem Zeitraum dargestellt werden
78. der Produktname in der gesamten App konsistent `SFT Drive` lautet
79. PWA `name` und `short_name` auf `SFT Drive` gesetzt sind
80. Header, README und relevante Metadaten konsistent auf SFT Drive verweisen
81. ein SFT-Drive-Splash-/Loading-Screen vorhanden ist
82. die Splash-Animation `prefers-reduced-motion` respektiert

---

## 31. Arbeitsweise bei weiterer Entwicklung

Das Repository ist produktiv aufgebaut und nicht mehr leer. Die ursprünglichen Initialisierungsschritte sind abgeschlossen und dürfen nicht erneut ausgeführt werden.

Bei jeder neuen Aufgabe:

1. `CLAUDE.md`, relevante bestehende Komponenten, Migrationen, RPCs und Edge Functions zuerst lesen.
2. Prüfen, ob die gewünschte Funktion bereits vollständig oder teilweise existiert.
3. Bestehende Architektur erweitern statt parallele Lösungen aufzubauen.
4. Datenbankänderungen als neue versionierte Migration hinzufügen; bereits produktiv angewendete Migrationen nicht nachträglich umschreiben.
5. RLS, Berechtigungen und serverseitige Validierung bei jeder Datenmodelländerung explizit prüfen.
6. Bestehende Produktionsdaten und historische Tour-/Registrierungsdaten erhalten.
7. Bei PWA-/Service-Worker-Änderungen besonders auf bestehendes `injectManifest`-, Push- und Offline-Verhalten achten.
8. Build, Linter und vorhandene Tests nach relevanten Änderungen ausführen.
9. Neue Regressionstests ergänzen, wenn eine bestehende Kernanforderung betroffen ist.
10. Deployment-relevante Änderungen in README bzw. im Abschnitt `Aktueller Deployment-Stand` dokumentieren.

Vor größeren Features zuerst kurz festhalten:

- welche bestehenden Module betroffen sind,
- welche Migrationen/RPCs/Edge Functions erweitert werden,
- ob laufende Kosten entstehen können,
- welche Security- und RLS-Risiken bestehen,
- wie Rückwärtskompatibilität sichergestellt wird.

Nach jeder größeren Änderung:

- Build prüfen,
- Fehler beheben,
- relevante Tests ausführen,
- `CLAUDE.md` nur dann erweitern, wenn eine neue verbindliche Produktentscheidung oder dauerhafte technische Erkenntnis hinzugekommen ist,
- nächsten sinnvollen Schritt nennen.

---

## 32. Entscheidungsregel

Wenn du zwischen einer einfachen und einer komplexen Lösung wählen kannst, bevorzuge die einfache Lösung, sofern sie:

- sicher ist,
- die Anforderungen erfüllt,
- keine technische Sackgasse erzeugt,
- kostenlos betrieben werden kann.

Keine unnötige Enterprise-Architektur für ein kleines Community-Projekt aufbauen.

---

## 33. Aktuelle Kernanforderung in einem Satz

Baue und entwickle **SFT Drive** als sichere, mobile und installierbare Web-App für Sportwagen-Ausfahrten weiter, in der öffentliche Tourinformationen frei sichtbar sind, eintägige und mehrtägige Touren über einen Monatskalender entdeckt und gefiltert werden können, jede Tour als große quadratische 1:1-Kachel mit freien Fahrzeugplätzen erscheint, registrierte Nutzer sich mit einem konkreten Fahrzeug anmelden, Tourkapazitäten ausschließlich in Fahrzeugen verwaltet werden, Beifahrer für organisatorische Personenzahlen erfasst werden, automatische oder manuelle Bestätigung sowie eine sichere Warteliste möglich sind, bestätigte Fahrer die mitfahrenden Fahrzeuge samt Username, aber keine Klarnamen oder Kennzeichen anderer Teilnehmer sehen können, jeder User ein privates Archiv seiner vergangenen bestätigten Tourteilnahmen mit historischem Fahrzeug-Snapshot besitzt und SFT Drive zusätzlich Tour-Stopps, In-App-/Push-Mitteilungen sowie Restaurant-Essensvorbestellungen für bestätigte Teilnehmer bereitstellt.