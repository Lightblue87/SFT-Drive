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
- Die nächste Ausfahrt erscheint als hervorgehobene Hero-Kachel, alle weiteren als kompakte Tourzeilen mit quadratischem Vorschaubild (siehe §13.10).
- Die Liste nutzt auf Mobilgeräten nahezu die gesamte verfügbare Displaybreite.
- Auf jeder Tourzeile müssen freie Fahrzeugplätze sichtbar sein.
- Als Tourbild kann ein Tourlogo, Eventdesign, Fahrzeugfoto oder Routen-Screenshot verwendet werden.

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
- Touren absagen (über `admin_cancel_tour`, benachrichtigt die Teilnehmer)
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

#### Umsetzung

`handle_new_user()` übernimmt ein optionales `date_of_birth`-Auth-Metadatum nach
`profiles` (Migration `20260909000000_handle_new_user_date_of_birth.sql`). Der aktuelle
Registrierungsassistent (`RegisterPage`) sendet dieses Feld bewusst **nicht** mehr mit —
es wurde aus der allgemeinen Registrierung entfernt, weil es dort eine unnötige Erhebung
gemäß §7 (Datensparsamkeit) gewesen wäre. Gefüllt wird `date_of_birth` stattdessen erst
gezielt bei Bedarf über das Anmeldeformular einer altersbeschränkten Tour
(`RegistrationForm`, direktes `update` auf `profiles`, siehe §14.3). Der Trigger bleibt
trotzdem bestehen: er ist rein defensiv (verwirft `NULL`, wenn nichts mitgegeben wird)
und stellt sicher, dass ein extern/zukünftig gesetztes Metadatum nicht verworfen würde.

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

### Lebenszyklus der Tourstatus

Verbindliche Ausarbeitung, wie die einzelnen Status entstehen und was sie für
Sichtbarkeit und Anmeldung bedeuten (Migration
`20260909010000_tour_lifecycle.sql`).

Ursprünglich gab die RLS ausschließlich `status = 'published'` frei. Eine Tour
verschwand dadurch beim Statuswechsel schlagartig komplett — auch für bereits
angemeldete Teilnehmer und aus `/profile/tours`. Das war nicht gewollt.

Sichtbar für Visitor und normale User sind:

```text
published            sichtbar, Anmeldung im Anmeldefenster möglich
registration_closed  sichtbar, keine Anmeldung mehr möglich
completed            sichtbar, keine Anmeldung mehr möglich
cancelled            sichtbar bis einschließlich start_date
draft                nicht sichtbar
archived             nicht sichtbar
```

Die Regel liegt zentral in `tour_is_visible(status, start_date)` und wird von
der `tours`-Policy, der `tour_member_details`-Policy und
`get_public_tour_stats()` gemeinsam verwendet — keine dieser Stellen darf
eine eigene abweichende Statusliste führen.

Automatische Übergänge (`apply_tour_lifecycle()`, per `pg_cron` alle 15
Minuten; die Funktion ist idempotent und braucht keinen eigenen Zustand):

```text
published           -> registration_closed   sobald registration_close_at vorbei ist
published/closed    -> completed             sobald end_date vorbei ist
cancelled           -> archived              sobald start_date vorbei ist
```

`draft`, `cancelled` und `archived` werden nie automatisch überschrieben — eine
Absage bleibt eine Absage.

Weitere Regeln:

- Nach Anmeldeschluss (`registration_closed`) kann ausschließlich der Admin noch
  jemanden aufnehmen, über `admin_add_registration()`. Anmeldefenster sowie
  Leistungs- und Altersanforderungen werden dabei bewusst übergangen, die
  Fahrzeugkapazität dagegen **nicht** (§12) — ist die Tour voll, entsteht ein
  Wartelisteneintrag. Der Admin kennt die Fahrzeugdaten des Teilnehmers
  normalerweise nicht — das Admin-Formular lädt deshalb über
  `admin_get_user_vehicles()` (Migration `20260909030000_admin_user_vehicles.sql`,
  gezielte Ausnahme von der `vehicles_own`-RLS analog zu anderen
  Admin-Zugriffs-RPCs) automatisch das Standardfahrzeug des ausgewählten
  Nutzers aus dessen Garage (§34.2) vor; ohne gespeichertes Fahrzeug bleiben
  die Felder leer und müssen manuell ausgefüllt werden. Der Teilnehmer kann
  sein Fahrzeug für die Tour anschließend selbst ändern, sofern es weiterhin
  den Anforderungen entspricht.
- Eine Absage erfolgt ausschließlich manuell über `admin_cancel_tour()` und ist
  im Statusfeld des Tourformulars deshalb nicht direkt wählbar. Die RPC
  benachrichtigt alle Registrierungen mit `confirmed`, `pending` oder
  `waitlisted` über die bestehende Notification-Infrastruktur (Typ
  `TOUR_CANCELLED`); der zusätzliche Web-Push wird wie überall vom Client über
  `send-push` ausgelöst (§27.16). `send-push` akzeptiert dafür ein optionales
  `statuses`-Feld (Standard weiterhin nur `confirmed`, §27.11) — eine Absage
  ist die begründete Ausnahme, weil auch `pending` und `waitlisted` betroffen
  sind.
- Eine abgesagte Tour wird nach ihrem Starttag archiviert und damit aus allen
  normalen Ansichten entfernt. Sie wird bewusst **nicht** gelöscht: das wäre
  nicht umkehrbar und würde §23.14 verletzen.
- Das UI leitet den tatsächlichen Anmeldezustand zusätzlich aus den Zeitstempeln
  ab (`registrationPhase()` in `src/utils/tourStatus.ts`), damit zwischen
  Anmeldeschluss und dem nächsten Joblauf kein Anmeldeformular angeboten wird,
  das die RPC anschließend ablehnt. Die verbindliche Prüfung bleibt
  serverseitig in `register_for_tour` (§9.2).

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

**Phase-12-Ausnahme (§34.1):** Besteht zwischen dem Caller und dem
betreffenden Teilnehmer eine akzeptierte Freundschaft (`friendships.status
= 'accepted'`), darf die Funktion für genau diesen Teilnehmer zusätzlich
`first_name`/`last_name` ausgeben. Ohne akzeptierte Freundschaft bleibt die
Ausgabe wie oben beschrieben — `first_name`/`last_name` werden weiterhin
nicht ausgegeben. Bis Phase 12 implementiert ist, gibt die Funktion keine
Klarnamen aus.

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

Geplantes Prinzip (siehe §34.1 für die verbindliche Ausarbeitung):

- User A sendet User B eine Freundesanfrage.
- Solange die Anfrage `pending` ist, wird kein Klarname freigegeben.
- User B nimmt die Anfrage an.
- Die Annahme der Freundschaftsanfrage **ist** die gegenseitige Zustimmung zur Klarnamenfreigabe — es gibt keinen separaten Freigabe-Schalter und keine einseitige/gerichtete Freigabe.
- Bei `friendships.status = accepted` dürfen beide Nutzer gegenseitig Vor- und Nachnamen sehen.
- Wird die Freundschaft beendet, entfällt die Klarnamenfreigabe sofort für beide Seiten.

Diese Funktion war nicht Bestandteil des ersten MVP, ist inzwischen aber als
Phase 12 umgesetzt (Migration `20260908090000_friendships.sql`, siehe §34.1):
Tabelle `friendships` mit Request-/Accepted-Modell und eindeutiger
Paarbeziehung, RPCs `search_users_by_username`, `send_friend_request`,
`respond_friend_request`, `cancel_friend_request`, `end_friendship`,
`list_my_friendships`, sowie die Phase-12-Ausnahme in
`get_confirmed_tour_vehicles` (§8.9) und die UI unter `/profile/friends`.

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

#### Umsetzung: Archivierte Touren standardmäßig ausgeblendet

In der Listenansicht `/admin/tours` sind Touren mit Status `archived` standardmäßig
ausgeblendet (analog zur öffentlichen Übersicht, §8.3), nicht nur gefiltert nach Status
wie in §21.3 grundsätzlich vorgesehen. Grund: sonst sammeln sich dort auf Dauer beliebig
viele alte Touren an und die Verwaltung wird unübersichtlich. Eine Checkbox
("Archivierte Touren einblenden (X)") oberhalb der Liste blendet sie bei Bedarf manuell
wieder ein; sie erscheint nur, wenn tatsächlich archivierte Touren vorhanden sind.

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
- Teilnehmer administrativ nachtragen (`admin_add_registration`, siehe §8.3
  "Lebenszyklus der Tourstatus") — nach Anmeldeschluss der einzige verbleibende
  Weg, jemanden aufzunehmen

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

### 13.10 Tourliste und Hero-Kachel

**Diese Vorgabe wurde mit dem Cockpit-Board-Redesign überarbeitet.** Ursprünglich
war für jede Tour eine große quadratische 1:1-Kachel mit Titel darüber
vorgesehen. In der Praxis passte damit auf ein Smartphone nur eine einzige
Tour auf den Bildschirm — Kalender, aktive Filterinformation und die zweite
Ausfahrt lagen dauerhaft unterhalb der Falz. Das widersprach dem primären
UX-Ziel aus §13 ("App öffnen → nächste Ausfahrten sofort erkennen").

Verbindlich ist deshalb eine zweistufige Darstellung:

**1. Hero-Kachel der nächsten Ausfahrt**

Ganz oben steht genau eine hervorgehobene Karte für die nächste relevante
Ausfahrt (laufend oder als nächstes startend). Sie zeigt:

```text
NÄCHSTE AUSFAHRT                    [Statusbadge]

Tourtitel
Region · Datum bzw. Zeitraum

STRECKE      FAHRZEUGE      TREFFEN
285 km       14/20          09:00

[ Tour öffnen ]
```

Welche Tour dort steht, richtet sich danach, was für den Betrachter noch
relevant ist — nicht allein nach dem Datum:

- Eine abgesagte Ausfahrt wird nie als Hero-Kachel verwendet.
- Eine Ausfahrt mit geschlossener Anmeldung nur dann, wenn der Betrachter
  selbst angemeldet ist (`confirmed`, `pending` oder `waitlisted`) — dann ist
  sie tatsächlich seine nächste Ausfahrt. Ist er nicht dabei, gibt es dort
  nichts mehr zu tun, und es rückt die nächste Tour nach, bei der er entweder
  angemeldet ist oder sich noch anmelden kann (je nachdem, welche früher
  stattfindet).
- In der Tourliste darunter bleiben geschlossene Touren unabhängig davon
  sichtbar.

**2. Kompakte Tourzeilen**

Alle übrigen Touren erscheinen als kompakte Zeilen mit quadratischem
Vorschaubild links (das Coverbild aus §13.11, weiterhin `object-fit: cover`)
und den Informationen aus §13.12 rechts daneben. Mehrere Ausfahrten sind damit
gleichzeitig sichtbar.

Auf größeren Displays darf die zentrale Content-Spalte begrenzt werden,
beispielsweise auf ca. 700–800 px.

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

Die gesamte Tourzeile bzw. Hero-Kachel ist antippbar.

Tap führt zu:

```text
/tours/:slug
```

Keine kleinen `Mehr erfahren` Buttons als alleinige Interaktionsfläche.

Die komplette Zeile muss als großes Touch-Ziel funktionieren.

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
- **Native `date`/`datetime-local`-Felder überlaufen ihren Container**: iOS Safari
  ignoriert bei diesen Feldtypen `width: 100%` und rendert stattdessen eine
  intrinsische Breite, die den umgebenden Container seitlich sprengt — in Chromium
  (auch bei aktiviertem Mobile-Emulation-DevTools) nicht reproduzierbar, deshalb nur
  auf echtem iPhone/installierter PWA aufgefallen. Fix: `-webkit-appearance: none`
  auf dem Feld selbst. Nebenwirkung dieses Fixes: ein leeres Feld kollabiert dann in
  der Höhe (kein sichtbarer Platzhaltertext mehr, der die Zeilenhöhe vorgibt) und
  springt beim Befüllen sichtbar auf — deshalb zusätzlich `min-height` und
  `line-height` explizit setzen. `min-w-0` muss außerdem auf **jeder** verschachtelten
  Flex-/Grid-Ebene (Formular → Section → Label → Input) gesetzt sein, nicht nur auf
  dem Input selbst, sonst genügt bereits eine einzige fehlende Ebene, damit die
  intrinsische Breite wieder durchschlägt.

Wichtig:

Private oder sicherheitskritische API-Antworten nicht unkontrolliert im Service-Worker-Cache speichern.

Für das MVP bevorzugt:

- App Shell cachen
- statische Assets cachen
- dynamische Auth-/Supabase-Daten network-first oder gar nicht persistent über den Service Worker cachen
- sinnvolle Offline-Seite anbieten

**Service Worker aktivierte neue Deployments nie (behoben):** Ohne explizites
`skipWaiting()`/`clients.claim()` im Service Worker bleibt ein neu deployter Worker im
Zustand "waiting", bis buchstäblich jeder offene Tab/jede App-Instanz geschlossen wird —
bei einer installierten PWA praktisch nie, da sie oft dauerhaft im Hintergrund bleibt.
Bugfixes und neue Features kamen dadurch bei bestehenden Installationen faktisch nie an,
auch nach erfolgreichem Cloudflare-Deploy. Fix in `src/sw.ts` (`self.skipWaiting()` beim
Install, `self.clients.claim()` beim Activate) zusammen mit
`registerSW({ immediate: true })` (`virtual:pwa-register`) in `src/main.tsx`, das
zusätzlich periodisch auf ein neues Deployment prüft. Bei jeder künftigen
Service-Worker-Änderung sicherstellen, dass dieses Verhalten erhalten bleibt.

### Android-Chrome-Eigenheiten (aus der Praxis)

Ohne eigenes Android-Testgerät wurde die App gegen Chrome-für-Android-Emulation
(Device-Metrics eines Pixel 7, Chromium) sowie per Code-Audit geprüft, mit demselben
Maßstab wie bei den iOS-Punkten oben. Ergebnis: kein horizontaler Overflow auf
412px-Viewport, App-Shell rendert korrekt. Zusätzlich wurden dabei drei
Android-spezifische Fehlerquellen gefunden und behoben, die die obigen iOS-Fixes ohne
Gegenprüfung eingeführt hätten:

- **Maskable Icon ohne Sicherheitsabstand:** `icon-512.png` war in der Manifest-Konfiguration
  zusätzlich mit `purpose: 'maskable'` eingetragen. Android beschneidet ein als maskable
  deklariertes Icon auf eine zentrierte ca. 80%-Sicherheitszone (Kreis/Squircle/Teardrop je
  nach Launcher/Hersteller) — das vorhandene Artwork reicht aber bis auf < 1% an drei
  Bildrändern heran und wäre auf dem Android-Homescreen sichtbar beschnitten worden. iOS kennt
  dieses adaptive Zuschnittsystem nicht, weshalb der Fehler dort nie aufgefallen wäre. Fix in
  `vite.config.ts`: der `maskable`-Eintrag wurde entfernt, bis ein eigens mit ausreichendem
  Sicherheitsabstand erstelltes Icon-Artwork vorliegt. Android verwendet für die verbleibende
  `any`-Variante seine eigene, deutlich mildere Standardmaskierung.
- **`-webkit-appearance: none` auf date-/datetime-local-Feldern unscoped:** Der iOS-Fix gegen
  die Breitenüberlauf-Eigenheit (siehe oben) war ursprünglich ohne Browser-Weiche auf alle
  `input[type=date]`/`datetime-local` angewendet. Chrome für Android hat den Breiten-Bug nicht,
  entfernt bei `appearance:none` aber das native Kalender-Icon und die Tippfläche zum Öffnen des
  Pickers — das Feld wäre dort zu einem reinen Textfeld ohne Picker-Zugriff degradiert worden.
  Fix in `src/index.css`: die Regel liegt jetzt hinter `@supports (-webkit-touch-callout: none)`
  — eine etablierte Feature-Detection, die ausschließlich in iOS Safari zutrifft (Chrome, auch
  Chrome unter iOS, unterstützt `-webkit-touch-callout` nicht). Die `min-height` gegen das
  Höhenspringen bei leerem Feld bleibt für beide Plattformen unscoped bestehen.
- **Fehlendes `overscroll-behavior-y: contain`:** Das eigene Pull-to-Refresh
  (`src/components/PullToRefresh.tsx`) kann, solange die App noch nicht installiert im normalen
  Chrome-Tab läuft, mit Chromes eigener nativer Overscroll-Pull-to-Refresh-Geste am oberen
  Seitenrand kollidieren. iOS Safari kennt diese native Tab-Geste in gleicher Form nicht. Fix:
  `overscroll-behavior-y: contain` auf `html` in `src/index.css`.

**Bottom-Sheets und Android-Zurück-Geste (behoben):** Ursprünglich legten Bottom-Sheets
(`src/components/BottomSheet.tsx`, u. a. Anmeldeformular, Admin-Teilnehmer-hinzufügen) beim
Öffnen keinen eigenen History-Eintrag an. Auf Android schloss der Zurück-Button/die
Zurück-Geste ein offenes Sheet deshalb nicht, sondern verließ die zugrunde liegende Seite bzw.
bei fehlender History die App — auf iOS ohne Hardware-/Geste-Zurück-Erwartung kein Thema. Fix:
`BottomSheet` pusht beim Mount einen eigenen `history.pushState`-Eintrag und schließt sich über
`onClose()` bei einem `popstate`-Event (Zurück-Taste/-Geste). Wird das Sheet stattdessen über
Button/Backdrop geschlossen, entfernt das Cleanup den zuvor gepushten Eintrag wieder
(`history.back()`), damit der nächste Zurück-Tap nicht ins Leere geht, statt zur eigentlich
erwarteten vorherigen Seite zu führen. Da alle Sheets diese eine gemeinsame Komponente nutzen,
war keine Änderung an den einzelnen Sheet-Inhalten nötig.

Zusätzlich als PR-Review-Feedback vom Repository-Inhaber eingegangen (Android-/PWA-
Kompatibilitätsreview) und geprüft:

- **Landscape-Display-Cutout links/rechts:** `viewport-fit=cover` deckte bisher nur oben/unten
  über `env(safe-area-inset-top/bottom)` ab. Header und Bottom-Navigation berücksichtigen jetzt
  zusätzlich `env(safe-area-inset-left/right)`, damit sie auf Android-Geräten mit
  Kamera-Cutout im Querformat nicht seitlich dahinter verschwinden.
- **Virtuelle Tastatur über fixed UI:** `interactive-widget=resizes-content` im
  Viewport-Meta-Tag ergänzt, damit aktuelles Chrome für Android den Layout-Viewport bei
  geöffneter Tastatur tatsächlich verkleinert, statt fixed positionierte Bottom-Sheets/
  Bottom-Nav darunter zu verdecken. Für Browser ohne Unterstützung (u. a. iOS Safari) ohne
  Wirkung.

Zweite Review-Runde desselben PR-Kompatibilitätsreviews (Stand `dc457d9`), ebenfalls
umgesetzt:

- **Pull-to-Refresh in kurzen Bottom-Sheets:** `PullToRefresh` erkannte einen Sheet-Inhalt
  bisher nur dann als eigenen Scroll-Container, wenn `scrollHeight > clientHeight` galt —
  ein kurzes, noch nicht selbst scrollbares Sheet zählte also nicht, und ein Herunterwischen
  darin bei `window.scrollY === 0` konnte den globalen Reload auslösen und eine
  unabgeschickte Eingabe verwerfen. Fix: `BottomSheet`s Scroll-Container trägt jetzt
  `data-pull-to-refresh-ignore`, und `startedInsideScrollContainer()` in `PullToRefresh.tsx`
  erkennt dieses Attribut unabhängig von der tatsächlichen Scrollbarkeit.
- **Fehlende Safe-Area am unteren Sheet-Rand:** Der Content-Bereich von `BottomSheet` endete
  bisher mit festem `pb-6`. Auf Android Edge-to-Edge/Gesture-Navigation konnte der letzte
  Button dadurch zu nah an der System-Gestenfläche liegen. Fix: Bottom-Padding auf
  `calc(1.5rem + env(safe-area-inset-bottom))` erweitert, analog zu `BottomNav`.
- **History-State beim Sheet-Öffnen überschrieben:** `BottomSheet` pushte bisher
  `{ sftSheet: true }` ohne den zuvor vorhandenen `history.state` (u. a. von React Router)
  zu erhalten. Fix: der vorhandene State wird jetzt in den gepushten State übernommen
  (`{ ...previousState, sftSheet: true }`).

Bewusst **nicht** umgesetzt, weil dafür entweder echtes Android-Gerät oder neues
Design-Artwork nötig ist, das nicht ungefragt erzeugt werden soll:

- **Eigenes maskable Icon mit Sicherheitsabstand:** siehe oben — der fehlerhafte
  `maskable`-Eintrag wurde entfernt, ein neues, mit ausreichendem Sicherheitsabstand
  gestaltetes 512×512-Artwork für `purpose: maskable` steht noch aus.
- **Eigenes Notification-Badge-Asset:** der Service Worker verwendet für Web-Push aktuell
  `icon-192.png` sowohl als `icon` als auch als `badge`. Android erwartet für `badge`
  bevorzugt ein einfaches monochromes/transparentes Statusleisten-Symbol; ein komplexes
  Icon kann dort je nach Hersteller schlecht aussehen. Braucht ein eigenes kleines
  Asset, keine Code-Änderung.
- **Verifikation auf echten Android-Geräten** (Gesture- vs. 3-Button-Navigation, virtuelle
  Tastatur, Push-Zustellung/-Tap, Add-to-Home-Screen-Icon-Darstellung je Launcher, Portrait/
  Landscape): in dieser Session mangels physischem Gerät nicht möglich, siehe oben
  "Ohne eigenes Android-Testgerät".

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
- Das Tourbild in der Tourzeile bleibt quadratisch (`aspect-ratio: 1 / 1`).
- Tourtitel steht in der Zeile neben dem Bild, in der Hero-Kachel darüber.
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
/profile/friends
```

Umgesetzt (Phase 12, §34.1): Freunde, eingehende/ausgehende Anfragen, Nutzersuche
per Username. Eine akzeptierte Freundschaft ist die gegenseitige
Klarnamenfreigabe — kein separater Freigabe-Schalter.

---

```text
/profile/vehicles
```

Umgesetzt (Phase 13, §34.2): persönliche Fahrzeuggarage. Reine Komfortfunktion
zum Vorbefüllen des Anmeldeformulars — die Touranmeldung speichert weiterhin
einen unabhängigen Fahrzeug-Snapshot.

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
│   ├── /profile/archive
│   ├── /profile/friends
│   └── /profile/vehicles
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
    │   ├── /admin/tours/:id/stops
    │   │   └── /admin/tours/:id/stops/:stopId    (Restaurant-Stopps, §27.20)
    │   └── /admin/tours/:id/stages                (Tagesrouten, nur Mehrtagestouren, §34.4)
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
| `/profile/friends` | ❌ | ✅ eigener Inhalt | ✅ eigener Inhalt | ✅ |
| `/profile/vehicles` | ❌ | ✅ eigener Inhalt | ✅ eigener Inhalt | ✅ |
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
- [ ] Fahrzeugliste gibt keine unberechtigt freigegebenen Klarnamen aus (vor Umsetzung von Phase 12, §34.1: weiterhin keine Klarnamen)
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
- Hero-Kachel und kompakte Tourzeilen
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
- Alle fünf Functions sind seit dem 09.09.2026 deployed. Zuvor fehlten
  `send-push`, `delete-account` und `restaurant-order-notifications` über
  längere Zeit unbemerkt im Dashboard, obwohl sie im Repository lagen — mit der
  Folge, dass Web-Push nirgends zugestellt wurde und die Kontolöschung im
  Profil fehlschlug. Diese Liste ist deshalb bei Zweifeln gegen das Dashboard
  abzugleichen, nicht blind zu glauben: das Repository allein sagt nichts
  darüber aus, was tatsächlich läuft.
- Fünf Supabase Edge Functions sind im Einsatz (Dashboard → Edge Functions,
  manuell deployed, kein CI/CD dafür): `delete-account` (vollständige
  Auth-Kontolöschung, §7), `send-push` (Web-Push-Zustellung, §27),
  `admin-manage-user` (Sperren/Entsperren/Löschen fremder Konten aus
  `/admin/users`, §21.3/§27.20), `restaurant-order-notifications`
  (zeitgesteuerte Restaurant-Bestell-Pushes über `pg_cron`, §27.10/§27.20) und
  `tour-interest-notifications` (zeitgesteuerte Anmeldeöffnungs-Pushes für
  Vormerkungen über `pg_cron`, §35.3). Für `send-push`,
  `restaurant-order-notifications` und `tour-interest-notifications` sind
  zusätzlich drei projektweite Edge-Function-Secrets gesetzt:
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Der öffentliche
  VAPID-Schlüssel liegt zusätzlich als `VITE_VAPID_PUBLIC_KEY` in den
  Cloudflare-Pages-Umgebungsvariablen (Production und Preview). Für
  `restaurant-order-notifications` und `tour-interest-notifications` ist
  zusätzlich je ein per `pg_cron`/`pg_net`/Supabase Vault eingerichteter
  15-Minuten-Job nötig (Setup-Anleitung als Kommentar am Anfang der jeweiligen
  Function selbst dokumentiert, nicht als Migration, da er den echten
  Service-Role-Key enthält) — beide Jobs nutzen dasselbe bereits in Vault
  abgelegte `service_role_key`-Secret, es muss nicht doppelt angelegt werden.
- Edge Functions in diesem Projekt werden ausschließlich über "Deploy a new
  function" mit korrektem Namen von Anfang an angelegt. Ein nachträgliches
  Umbenennen über Dashboard → Settings → Name ändert nur die Anzeige, nicht
  den tatsächlichen Slug/die aufgerufene URL — bei falschem Namen die Function
  löschen und mit dem korrekten Namen neu anlegen, nicht umbenennen.
- Bei `SECURITY DEFINER`-Funktionen mit `RETURNS TABLE`, die Spalten aus
  `auth.users` ausgeben (z. B. `email`), diese explizit auf `text` casten
  (`u.email::text`) — siehe §8.12 "Praxis-Falle bei `RETURN QUERY`".
- Der `pg_cron`-Job für den Tour-Lebenszyklus (§8.3) wird abweichend davon
  direkt in der Migration `20260909010000_tour_lifecycle.sql` angelegt: er ruft
  reines SQL auf, keine Edge Function, und braucht deshalb keinen
  Service-Role-Key. Nach dem Einspielen dieser Migration muss zusätzlich die
  Edge Function `send-push` neu deployed werden — sie hat ein neues optionales
  `statuses`-Feld für die Tourabsage bekommen.
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
TOUR_CANCELLED
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
(Nutzerverwaltung) — inzwischen umfangreicher als die ursprüngliche reine
Rollenübergabe. Aktuell umgesetzt: Suche nach Username/Vorname/Nachname/
E-Mail, Anzeige von Username, Klarname, E-Mail, Registrierungsdatum,
Adminstatus und Sperrstatus, Adminrolle vergeben/entziehen
(`admin_list_users`/`admin_set_admin_role`-RPCs), Nutzer sperren/entsperren
und Nutzerkonto administrativ löschen (Edge Function `admin-manage-user` +
`admin_delete_user_account`-RPC). Selbstsperrung und administrative
Selbstlöschung über diesen Weg sind verboten; der letzte verbleibende Admin
kann sich die Rolle nicht selbst entziehen und nicht administrativ gelöscht
werden.

Jede Zeile in `/admin/users` ist zusätzlich per Pfeil zu einer Detailansicht
`/admin/users/:id` (`AdminUserDetailPage`) verlinkt, die neben den bereits
in der Liste sichtbaren Stammdaten die persönliche Fahrzeuggarage (§34.2)
des Nutzers anzeigt — dieselbe bereits bestehende `admin_get_user_vehicles`-
RPC, die auch `AddRegistrationSheet` beim administrativen Nachtragen einer
Registrierung verwendet (§8.3), hier aber für die vollständige Garage statt
nur das Standardfahrzeug. Keine neue Migration nötig, da die RPC (inklusive
`is_admin()`-Prüfung) bereits seit Phase-13-Umsetzung existiert.

### 27.21 Weitere Ergänzungen (nachträglich dokumentiert)

Migrationen, die zum produktiven Stand von Phase 9–11 gehören, über die in
§27.20 genannten hinaus:

```text
20260907082100_restaurant_order_notification_tracking.sql
20260907082200_admin_user_details_ban_delete.sql
20260907082300_fix_admin_list_users_email_type.sql
```

Nachgezogene Korrekturen aus dem Review zum Cockpit-Redesign
(`20260909020000_review_fixes.sql`), verbindlich für künftige Änderungen an
diesen Stellen:

- `submit_meal_order()` und `admin_update_meal_order()` validieren den
  gesamten Payload, **bevor** Order oder Positionen geschrieben werden. Ein
  `return` rollt in PL/pgSQL nichts zurück — validiert man erst währenddessen,
  bleibt bei einem Fehler ein halb ersetzter Bestellstand stehen.
- `register_for_tour()` lehnt eine Anmeldung nach `end_date` mit `TOUR_ENDED`
  ab, unabhängig vom gespeicherten Status.
- Ein Trigger auf `tour_registrations` räumt abhängige Daten auf, sobald eine
  Registrierung den Status `confirmed` verliert (Storno, administrative
  Entfernung, Ablehnung, Reaktivierung): `checked_in_at` wird geleert,
  Essensbestellungen werden storniert, Übernachtungsbestätigungen entfernt.
  Ohne das galt ein stornierter Fahrer weiterhin als eingecheckt und sein
  Essen zählte in der Restaurant-Gesamtmenge mit.
- `meal_order_items.menu_item_id` verwendet `ON DELETE RESTRICT`: ein bereits
  bestelltes Gericht lässt sich nicht mehr löschen, nur noch deaktivieren
  (§27.4). Deaktivierte Gerichte bleiben in bestehenden Bestellungen sichtbar
  und können dort gezielt entfernt werden.
- `are_friends()` gibt nur noch Auskunft, wenn `auth.uid()` selbst Teil der
  abgefragten Beziehung ist.
- `admin_send_accommodation_reminder()` prüft serverseitig, ob `p_night_date`
  eine gültige Tournacht ist, und schließt Teilnehmer aus, die für diese Nacht
  bereits bestätigt haben.
- `list_my_friendships()` gibt bei `accepted` zusätzlich Vor- und Nachnamen aus
  (§34.1) — bei `pending` weiterhin nicht.
- Check-Constraints (als `NOT VALID` ergänzt, Altdaten bleiben unangetastet):
  Anmeldeschluss nicht vor Anmeldestart, Check-in nur mit `meeting_at`,
  Bestellschluss nicht vor Bestellstart.

Bereits produktiv angewendete Migrationen niemals nachträglich umschreiben —
Änderungen immer als neue Migration ergänzen.

Weitere Korrekturen aus einem automatisierten PR-Review (`20260909040000_second_review_fixes.sql`),
lokal gegen eine echte `authenticated`-Rolle bestätigt:

- `register_for_tour()`: Die in `20260907081100_rejected_requires_manual_reapproval.sql`
  eingeführte Ausnahme für zuvor abgelehnte Registrierungen (immer `pending`, nie
  automatisch `confirmed`/`waitlisted`) war beim Umschreiben in
  `20260909020000_review_fixes.sql` versehentlich verloren gegangen — ein vom Admin
  abgelehnter User konnte sich in einer automatisch bestätigenden Tour mit freier
  Kapazität direkt wieder selbst bestätigen. Wiederhergestellt.
- `admin_add_registration()`: Die Admin-Ausnahme (§8.3) übergeht ausdrücklich nur
  Anmeldefenster sowie Leistungs-/Altersanforderungen — die Kennzeichenpflicht gehörte
  nie dazu, wurde bei einem administrativen Nachtrag aber nicht geprüft. Ein vom Admin
  ausgewähltes Garage-Fahrzeug ohne Kennzeichen konnte dadurch eine bestätigte
  Registrierung erzeugen, obwohl die Tour ein Kennzeichen verlangt. Fix: dieselbe
  `LICENSE_PLATE_REQUIRED`-Prüfung wie in `register_for_tour()`.
- `admin_cancel_tour()`: prüfte bisher nur, ob die Tour bereits `cancelled` war. Dadurch
  ließ sich auch eine `completed`/`archived` Tour nachträglich absagen (verfälscht die
  Historie, benachrichtigt ehemalige Teilnehmer erneut) oder eine `draft`-Tour direkt in
  den öffentlich sichtbaren `cancelled`-Zustand versetzen, ohne je veröffentlicht gewesen
  zu sein. Auf `published`/`registration_closed` beschränkt — die einzigen Zustände, in
  denen eine Absage fachlich sinnvoll ist. Der „Tour absagen"-Bereich im Admin-Tourformular
  (`AdminTourFormPage`) wird passend dazu nur noch für diese beiden Status angezeigt statt
  für jeden Status außer `cancelled`.

`restaurant_stop_settings` besitzt neben `push_sent_at` zusätzlich
`reminder_sent_at TIMESTAMPTZ NULL`, um `RESTAURANT_ORDER_OPEN` und
`RESTAURANT_ORDER_REMINDER` unabhängig voneinander vor Doppelversand zu
schützen (siehe oben, Edge Function `restaurant-order-notifications`).

In `/admin/tours` sind `archived` Touren standardmäßig ausgeblendet (§12
"Umsetzung: Archivierte Touren standardmäßig ausgeblendet"). Eine Checkbox
blendet sie bei Bedarf wieder ein und erscheint nur, wenn archivierte Touren
existieren.

Der Admin-Flow für Tour-Stopps (`/admin/tours/:id/stops`) verwendet wie das
Tourformular einen lokal in `localStorage` zwischengespeicherten
Formularentwurf, damit Eingaben bei iOS-Safari-Reloads oder beim Verlassen
und Zurückkehren zur Seite nicht verloren gehen (§16 "Formular-Resilienz bei
Tab-Reloads"). Nach erfolgreichem Speichern wird der Entwurf bereinigt. Der
Link zu "Tour-Stopps verwalten" sitzt in der Tourenverwaltung (`/admin/tours`)
neben "Teilnehmer verwalten" der jeweiligen Tour, nicht in der
Teilnehmerverwaltung selbst.

Die Admin-Unternavigation (auf allen `/admin/*`-Seiten sichtbar) ist in
dieser Reihenfolge:

```text
Dashboard
Tourenverwaltung
Mitteilungen
Nutzer
Impressum & Datenschutz
```

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
38. dort keine unberechtigt freigegebenen Klarnamen und keine Kennzeichen anderer User sichtbar sind (vor Umsetzung von Phase 12, §34.1: weiterhin keine Klarnamen)
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
59. die nächste Ausfahrt als Hero-Kachel und alle weiteren als kompakte Tourzeilen dargestellt werden (§13.10)
60. das Tourbild in der Tourzeile quadratisch bleibt
61. freie Fahrzeugplätze direkt in jeder Tourzeile sichtbar sind
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

Baue und entwickle **SFT Drive** als sichere, mobile und installierbare Web-App für Sportwagen-Ausfahrten weiter, in der öffentliche Tourinformationen frei sichtbar sind, eintägige und mehrtägige Touren über einen Monatskalender entdeckt und gefiltert werden können, die nächste Ausfahrt als Hero-Kachel und alle weiteren als kompakte Tourzeilen mit freien Fahrzeugplätzen erscheinen, registrierte Nutzer sich mit einem konkreten Fahrzeug anmelden, Tourkapazitäten ausschließlich in Fahrzeugen verwaltet werden, Beifahrer für organisatorische Personenzahlen erfasst werden, automatische oder manuelle Bestätigung sowie eine sichere Warteliste möglich sind, bestätigte Fahrer die mitfahrenden Fahrzeuge samt Username sehen — Klarnamen ausschließlich bei akzeptierter Freundschaft (§34.1), Kennzeichen anderer Teilnehmer niemals —, jeder User ein privates Archiv seiner vergangenen bestätigten Tourteilnahmen mit historischem Fahrzeug-Snapshot besitzt und SFT Drive zusätzlich Tour-Stopps, In-App-/Push-Mitteilungen sowie Restaurant-Essensvorbestellungen für bestätigte Teilnehmer bereitstellt.

---

## 34. Entwicklungsphasen 12–15

Diese Phasen bauen additiv auf dem produktiven Stand der Phasen 1–11 auf. Aussagen in
§28/§29, die diese vier Themen noch nur als allgemeine spätere Erweiterung aufführen,
bleiben als Historienreferenz bestehen; für die konkrete Planung gilt dieser Abschnitt.
Alle vier Phasen sind inzwischen umgesetzt (siehe §34.1–§34.4).

Reihenfolge:

```text
Phase 12 — Freunde und Klarnamenfreigabe (umgesetzt)
Phase 13 — Persönliche Fahrzeuggarage (umgesetzt)
Phase 14 — Zeitgesteuerter Check-in am Treffpunkt (umgesetzt, ohne automatische Benachrichtigung)
Phase 15 — Tagesrouten für Mehrtagestouren (umgesetzt)
```

### 34.1 Phase 12 — Freunde und Klarnamenfreigabe

Die Freundschaftsfunktion hat aktuell genau einen Zweck: gegenseitige
Klarnamenfreigabe. Sie besitzt aktuell keine weiteren Social-Funktionen —
keine Posts, Activity Feeds, Direktnachrichten oder ähnliche Funktionen.

Ablauf:

1. User A sucht User B über den Username.
2. User A sendet eine Freundschaftsanfrage.
3. Solange die Anfrage `pending` ist, werden keine Klarnamen freigegeben.
4. User B nimmt die Anfrage an.
5. Mit der Annahme stimmen beide Seiten der gegenseitigen Klarnamenfreigabe zu.
6. Bei `friendships.status = accepted` dürfen beide Nutzer gegenseitig Vor- und Nachnamen sehen.
7. Wird die Freundschaft beendet, entfällt die Klarnamenfreigabe sofort für beide Seiten.

Grundregeln:

- User sollen andere Mitglieder primär über den **Username** finden können.
- Die Suche darf keine E-Mail-Adressen, Geburtsdaten oder andere privaten Profildaten offenlegen.
- Der Empfänger kann die Anfrage annehmen oder ablehnen.
- Eine bestehende Freundschaft kann von beiden Seiten beendet werden.
- Es gibt **keinen** separaten Schalter „Meinen Klarnamen freigeben“ — die akzeptierte Freundschaft selbst ist die gegenseitige Klarnamenfreigabe.
- Es gibt **keine** gerichtete/einseitige Klarnamenfreigabe.
- Bis Phase 12 implementiert ist, bleibt das aktuelle Produktionsverhalten: Teilnehmer sehen keine Klarnamen.

Datenmodell — nur eine `friendships`-Beziehung, keine zusätzliche Tabelle für gerichtete Freigaben (insbesondere **keine** `friend_name_shares`):

```text
friendships
id UUID PRIMARY KEY
requester_id UUID REFERENCES auth.users(id)
addressee_id UUID REFERENCES auth.users(id)
status TEXT                 -- pending | accepted | rejected
created_at TIMESTAMPTZ
accepted_at TIMESTAMPTZ NULL
updated_at TIMESTAMPTZ
```

Regeln zum Datenmodell:

- Selbst-Freundschaften (`requester_id = addressee_id`) verhindern.
- Eine akzeptierte Freundschaft muss eindeutig zwischen genau zwei Usern bestehen; inverse Doppelbeziehungen (A→B und B→A gleichzeitig) verhindern.

Sicherheitsregeln:

- Ein User darf ausschließlich über seinen eigenen Account (`auth.uid()`, serverseitig bestimmt) Freundesanfragen senden und eigene Anfragen/Freundschaften bearbeiten.
- Keine breite SELECT-Policy auf `profiles` einführen.
- Die Ausgabe der Klarnamen erfolgt ausschließlich über kontrollierte RPCs/Views oder durch eine gezielte, sichere Erweiterung bestehender Teilnehmer-RPCs (siehe §8.9 Phase-12-Ausnahme).
- `first_name`/`last_name` dürfen nur an einen Caller ausgegeben werden, der mit dem betreffenden User eine akzeptierte Freundschaft besitzt, oder an Admins im bereits erlaubten administrativen Kontext.
- E-Mail, Kennzeichen, Geburtsdatum und sonstige private Daten werden durch die Freundschaft **niemals** freigegeben.

Teilnehmerliste einer Tour:

Standard ohne akzeptierte Freundschaft:

```text
S4shadow
Audi S4 · 440 PS
```

Bei akzeptierter Freundschaft zwischen Caller und Fahrer:

```text
Mirko · S4shadow
Audi S4 · 440 PS
```

Die bestehende Teilnehmer-Fahrzeugliste darf also optional den durch eine akzeptierte Freundschaft freigegebenen Klarnamen ergänzen, aber niemals die bisherigen Datenschutzgrenzen für andere Teilnehmer lockern.

UI mindestens:

- Freunde
- Eingehende Anfragen
- Ausgehende Anfragen
- Freund hinzufügen / Anfrage senden
- Anfrage annehmen / ablehnen
- Freundschaft beenden

### 34.2 Phase 13 — Persönliche Fahrzeuggarage

Ziel ist, wiederkehrende Touranmeldungen zu vereinfachen, ohne die bereits bewährten historischen Fahrzeug-Snapshots in `tour_registrations` aufzugeben.

Mögliches Datenmodell:

```text
vehicles
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
manufacturer TEXT NOT NULL
model TEXT NOT NULL
power_ps INTEGER NOT NULL
license_plate TEXT NULL
is_default BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Regeln:

- Ein User kann mehrere eigene Fahrzeuge speichern.
- Ein Fahrzeug kann als Standardfahrzeug markiert werden.
- User dürfen ausschließlich eigene Fahrzeuge lesen, anlegen, ändern und löschen.
- Kennzeichen bleiben privat und unterliegen denselben Sichtbarkeitsregeln wie bisher.
- Die Garage ist eine Komfortfunktion und darf die bestehende sichere Touranmeldung nicht schwächen.
- Bei einer Touranmeldung kann ein gespeichertes Fahrzeug ausgewählt werden.
- Hersteller, Modell, Leistung und ggf. Kennzeichen werden beim Anmelden weiterhin als **Snapshot** in `tour_registrations` kopiert.
- `tour_registrations` darf nicht nur auf `vehicles.id` verweisen und die historischen Daten dynamisch aus der Garage lesen.
- Eine spätere Änderung oder Löschung eines Garage-Fahrzeugs darf vergangene Touranmeldungen und das Tourenarchiv nicht verändern.
- Mindest-/Maximalleistung und Kennzeichenpflicht werden weiterhin serverseitig anhand der in die Registrierung übernommenen Werte geprüft.
- Bestehende Nutzer und bestehende Registrierungsflows müssen rückwärtskompatibel bleiben; die Garage darf nicht erzwingen, dass historische oder bereits aktive Registrierungen migriert werden.

**Umsetzungsstand:** implementiert (Migration `20260908093000_vehicle_garage.sql`,
lokal gegen eine echte `authenticated`-Rolle getestet: RLS isoliert fremde
Fahrzeuge vollständig, ein DB-Trigger sorgt dafür, dass beim Markieren eines
Fahrzeugs als Standard automatisch genau ein Standardfahrzeug pro User
bestehen bleibt). Reines Self-Service-CRUD über RLS (kein RPC nötig, analog
`push_subscriptions`) unter `/profile/vehicles`. Das Anmeldeformular
(`RegistrationForm`) lädt die gespeicherten Fahrzeuge, wählt das
Standardfahrzeug vor und befüllt die Formularfelder daraus — die Auswahl
kopiert die Werte lediglich als Ausgangspunkt in die Formularfelder, die
RPC `register_for_tour` erhält weiterhin nur die Snapshot-Werte, nie eine
`vehicles.id`.

### 34.3 Phase 14 — Zeitgesteuerter Check-in am Treffpunkt

Ziel ist ein sehr leicht erreichbarer Self-Check-in für bestätigte Teilnehmer rund um die in der Tour vorhandene Treffpunktzeit `meeting_at`.

Pro Tour konfigurierbar:

```text
check_in_enabled BOOLEAN DEFAULT FALSE
check_in_open_minutes_before INTEGER DEFAULT 30
check_in_close_minutes_after INTEGER DEFAULT 15
```

Verbindliche Standardwerte:

```text
Öffnung: 30 Minuten vor meeting_at
Schließung: 15 Minuten nach meeting_at
```

Diese Werte werden bei Aktivierung als Standard verwendet und müssen vom Admin nicht bei jeder Tour neu eingegeben werden. Der Admin kann sie pro Tour individuell ändern.

Regeln für die Konfiguration:

- `meeting_at` ist Voraussetzung für den zeitgesteuerten Check-in.
- Vor- und Nachlauf müssen `>= 0` sein.
- `0` ist erlaubt, z. B. um den Check-in exakt zur Treffpunktzeit zu schließen.
- Check-in-Fenster wird aus `meeting_at` und den beiden konfigurierten Minutenwerten berechnet.
- Das Ende des Check-in-Fensters bedeutet **nicht**, dass die Gruppe bis zu diesem Zeitpunkt warten muss.
- Ein verpasster Check-in storniert eine bestätigte Teilnahme nicht automatisch.

Registrierung mindestens ergänzen um:

```text
checked_in_at TIMESTAMPTZ NULL
checked_in_by UUID NULL
```

Self-Check-in bevorzugt über eine kontrollierte RPC, beispielsweise:

```text
check_in_to_tour(tour_id)
```

Die Funktion prüft serverseitig mindestens:

1. Caller ist authentifiziert.
2. Caller besitzt für die Tour eine eigene Registrierung mit `status = confirmed`.
3. Check-in ist für die Tour aktiviert.
4. `meeting_at` ist gesetzt.
5. aktuelle **Serverzeit** liegt innerhalb des gültigen Check-in-Fensters.
6. Registrierung ist noch nicht eingecheckt.
7. Tour ist nicht abgesagt/archiviert bzw. fachlich nicht für Check-in gesperrt.
8. `checked_in_at` wird ausschließlich serverseitig mit `now()` gesetzt.

Teilnehmer-UX:

Während des Check-in-Fensters muss auf der Touransicht ein sehr leicht erreichbarer, prominenter Button erscheinen:

```text
✓ Am Treffpunkt angekommen
```

Nach erfolgreichem Check-in:

```text
✓ Angekommen · 09:18
```

Außerhalb des Fensters darf der Self-Check-in nicht mehr möglich sein.

Admin-UX:

- Anzahl bestätigter Fahrzeuge
- Anzahl eingecheckter Fahrzeuge
- Anzahl noch nicht eingecheckter Fahrzeuge
- Check-in-Zeit je Teilnehmer
- Admin darf einen bestätigten Teilnehmer auch außerhalb des Self-Check-in-Fensters manuell als angekommen markieren bzw. organisatorisch korrigieren.

Benachrichtigung:

- Beim Öffnen des Check-in-Fensters kann die bestehende Notification-Infrastruktur für eine In-App-Mitteilung und optional Push genutzt werden.
- Keine zweite Push-Infrastruktur bauen.
- Ein eigener Typ wie `CHECK_IN_OPEN` ist zulässig.
- Deep Link führt direkt zur Tourdetailseite, auf der der Check-in-Button sichtbar ist.

Tourarchiv:

- `checked_in_at` kann künftig genutzt werden, um tatsächliche Anwesenheit von einer lediglich bestätigten Registrierung zu unterscheiden.
- Bestehende historische Touren ohne Check-in-Daten dürfen dadurch nicht aus dem Archiv verschwinden oder rückwirkend als "nicht teilgenommen" bewertet werden.

**Umsetzungsstand:** implementiert (Migration `20260908100000_check_in.sql`,
lokal gegen eine echte `authenticated`-Rolle getestet: Fenstergrenzen zu
früh/zu spät, Doppel-Check-in, fehlende eigene Registrierung und der
Admin-Override außerhalb des Fensters wurden alle korrekt abgewiesen bzw.
akzeptiert). Self-Check-in über `check_in_to_tour`, Admin-Override über
`admin_set_checked_in` (auch außerhalb des Fensters möglich). Frontend:
`CheckInButton` auf der Tourdetailseite (nur sichtbar innerhalb des
clientseitig berechneten Fensters — die eigentliche Prüfung bleibt
serverseitig), Treffpunktzeit sowie Check-in-Konfiguration im
Admin-Tourformular editierbar (bisher gab es dort noch kein Feld für
`meeting_at`), Status/manueller Toggle in der Teilnehmerverwaltung inklusive
"Eingecheckt: X / Y"-Zähler. Die in §34.3 als optional formulierte
automatische `CHECK_IN_OPEN`-Benachrichtigung (Push/In-App beim Öffnen des
Fensters) ist **nicht** Teil dieser Umsetzung.

### 34.4 Phase 15 — Tagesrouten für Mehrtagestouren

SFT Drive soll **kein eigenes Roadbook und keine doppelte Routen-/Stoppplanung** aufbauen. Die eigentliche Tourenplanung bleibt in Kurviger, Google Maps oder Apple Karten.

Für Mehrtagestouren (`end_date > start_date`) wird pro Kalendertag genau **ein optionales Routen-Linkfeld** bereitgestellt.

Beispiel im Admin-Formular:

```text
Tag 1 · 18.06.2027
Routen-Link: [________________]

Tag 2 · 19.06.2027
Routen-Link: [________________]

Tag 3 · 20.06.2027
Routen-Link: [________________]
```

Regeln:

- Die Tage werden automatisch aus `start_date` bis einschließlich `end_date` abgeleitet.
- Der Admin muss die einzelnen Daten nicht manuell anlegen.
- Pro Tag gibt es genau ein Feld `route_url`.
- Das Feld ist optional.
- Der Link darf auf Kurviger, Google Maps, Apple Karten oder eine andere sinnvolle Routen-URL zeigen.
- Es gibt **keine separate Anbieter-Auswahl** im Admin-Formular.
- Ist kein Link hinterlegt, wird für diesen Tag kein Routen-Button angezeigt.
- Die App speichert keine duplizierten Zwischenstopps, Tankstellen, Restaurantdaten oder Roadbook-Informationen aus der externen Routenplanung.
- Eintägige Touren verwenden weiterhin den bestehenden Routen-Link auf Tour-Ebene und benötigen keine Tagesetappe nur für diesen Zweck.
- Tagesrouten sind Participant-Inhalte: nur bestätigte Teilnehmer der jeweiligen Tour und Admins dürfen sie abrufen.

Vorhandenes Datenmodell `tour_stages` weiterverwenden. Zielzustand mindestens:

```text
tour_stages
id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
stage_date DATE
stage_number INTEGER
route_url TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Die bestehende produktive Historie enthält bereits ein früher vorgesehenes Feld `kurviger_url`. Dieses nicht durch rückwirkendes Umschreiben einer alten Migration entfernen oder umbenennen. Bei Umsetzung von Phase 15:

- `route_url` über eine **neue Migration** ergänzen,
- vorhandene `kurviger_url`-Werte, falls welche existieren, sicher übernehmen oder als Fallback berücksichtigen,
- anschließend für neue UI-Flows `route_url` als anbieterneutrales Feld verwenden.

Optionale Anbieter-Erkennung:

Die App darf anhand bekannter URL-/Host-Muster automatisch die Button-Beschriftung anpassen, ohne dass der Admin den Anbieter auswählen muss.

Beispiele:

```text
Kurviger-URL       → Route in Kurviger öffnen
Google-Maps-URL    → Route in Google Maps öffnen
Apple-Maps-URL     → Route in Apple Karten öffnen
sonstige URL       → Route öffnen
```

Die Erkennung ist reine UX-Verbesserung. Die Berechtigung und Speicherung hängen nicht vom erkannten Anbieter ab.

**Umsetzungsstand:** implementiert (Migration `20260908103000_tour_stage_route_url.sql`
ergänzt lediglich `route_url` auf dem bereits bestehenden `tour_stages` —
die alte Migration `20260907080350` mit `kurviger_url` und den übrigen
Spalten bleibt unverändert; lokal gegen eine echte `authenticated`-Rolle
bestätigt, dass Nicht-Teilnehmer weiterhin keine Etappenzeilen lesen
können). Admin-Verwaltung unter `/admin/tours/:id/stages`
(verlinkt aus der Tourenverwaltung als "Tagesrouten verwalten", nur bei
`end_date > start_date`) leitet die Tage automatisch aus `start_date`/
`end_date` ab und bietet pro Tag genau ein Routen-Linkfeld — bereits
vorhandene `kurviger_url`-Werte werden dort als Vorbefüllung berücksichtigt.
Auf der Tourdetailseite sehen bestätigte Teilnehmer einer Mehrtagestour
einen "Tagesrouten"-Abschnitt mit einem Button pro Tag (Beschriftung anhand
der URL erkannt: Kurviger/Google Maps/Apple Karten/generisch), der auf
`route_url` zurückgreift und ansonsten auf das vorhandene `kurviger_url`
zurückfällt. Eintägige Touren sind unverändert und nutzen weiterhin den
bestehenden Haupt-Kurviger-Link auf Tour-Ebene.

### 34.5 Gemeinsame Regeln für Phasen 12–15

- Noch nicht implementierte Punkte niemals als produktiv vorhanden darstellen.
- Bestehende Migrationen nicht rückwirkend ändern.
- Neue Tabellen/Felder/RPCs ausschließlich über neue versionierte Migrationen ergänzen.
- RLS und serverseitige Berechtigungsprüfung sind Bestandteil jeder Phase.
- Bestehende Auth-, Tour-, Registrierungs-, Notification- und Archivlogik weiterverwenden statt parallele Systeme aufzubauen.
- Kein `service_role` im Client.
- Keine zusätzlichen laufenden Kosten ohne ausdrückliche Entscheidung.
- Historische Registrierungs- und Archivdaten müssen erhalten bleiben.
- Nach jeder Phase Build, Linter und relevante RLS-/RPC-/Regressionstests ausführen.

---

## 35. Entwicklungsphasen 16–18

Diese Phasen ergänzen die in §34 festgelegte Roadmap additiv und verwenden die
bestehenden Tour-, Registrierungs-, Restaurant- und Notification-Strukturen weiter.
Alle drei sind inzwischen umgesetzt (siehe §35.1–§35.3).

Reihenfolge:

```text
Phase 16 — Teilnehmer- und Restaurant-Export / digitales Teilen (umgesetzt)
Phase 17 — Tour-Kommunikation über WhatsApp-Gruppenlink (umgesetzt)
Phase 18 — Vormerkung vor Öffnung der Touranmeldung (umgesetzt)
```

### 35.1 Phase 16 — Teilnehmer- und Restaurant-Export / digitales Teilen

Die organisatorische Kommunikation erfolgt überwiegend digital, insbesondere per E-Mail, WhatsApp, iMessage und vergleichbaren Diensten. Deshalb liegt der Schwerpunkt nicht auf Druck- oder PDF-Workflows, sondern auf einfach digital weiterverwendbaren Daten.

Ziele:

- Admin kann Teilnehmerdaten einer Tour als **CSV** exportieren.
- Admin kann Restaurantbestellungen als **CSV** exportieren.
- Zusätzlich soll eine kompakte Textzusammenfassung über die native Teilen-Funktion des Geräts weitergegeben werden können.
- Wenn die Web Share API auf dem Gerät nicht verfügbar ist, dient `In Zwischenablage kopieren` als Fallback.
- SFT Drive integriert dafür keine E-Mail-, WhatsApp- oder iMessage-API; das Betriebssystem bzw. der Browser übergibt den Inhalt an die vom Nutzer gewählte App.

Teilnehmerexport:

- ausschließlich für Admins,
- standardmäßig nur organisatorisch notwendige Daten,
- mindestens Username, Fahrzeughersteller, Modell, Leistung, Status und Personenzahl,
- Klarname und Kennzeichen nur dann in einen Export aufnehmen, wenn der Admin diese Daten für den konkreten organisatorischen Zweck ausdrücklich auswählt,
- keine Geburtsdaten, Auth-Daten oder sonstigen unnötigen Profildaten exportieren.

Restaurant-Export:

- aggregierte Gesamtmengen je Menüposition,
- bestätigte Gesamtpersonenzahl,
- optional fahrzeug-/registrierungsbezogene Detailansicht mit den bereits für Admins sichtbaren Bestelldaten,
- keine zusätzliche Export-Datenhaltung aufbauen; Export immer aus dem aktuellen autorisierten Datenbestand erzeugen.

Beispiel für teilbaren Text:

```text
Harz Tour — Teilnehmer
18 bestätigte Fahrzeuge · 31 Personen

S4shadow · Audi S4 · 440 PS · 2 Personen
RS3Tom · Audi RS3 · 400 PS · 1 Person
```

Beispiel Restaurant:

```text
Restaurant Berggasthof
31 Personen

12 × Schnitzel
8 × Burger
6 × Currywurst
5 × Veggie Bowl
```

Die Export-/Share-Funktionen dürfen bestehende RLS- und Admin-Grenzen niemals umgehen.

**Umsetzungsstand:** implementiert, ohne Datenbankänderung — reine Frontend-
Funktionalität auf den bereits vorhandenen, RLS-geschützten Daten. `src/utils/csv.ts`
(minimaler CSV-Export als Blob-Download) und `src/utils/share.ts`
(`navigator.share`, Fallback `navigator.clipboard.writeText`). In
`/admin/tours/:id/registrations`: CSV-Export und Textzusammenfassung teilen,
mit einer Checkbox "Klarname & Kennzeichen einschließen" (Standard: aus). In
`/admin/tours/:id/stops/:stopId` (Restaurant-Auswertung): CSV-Export der
fahrzeugbezogenen Bestellungen und Textzusammenfassung der aggregierten
Mengen teilen.

### 35.2 Phase 17 — Tour-Kommunikation über WhatsApp-Gruppenlink

Für Ausfahrten wird bereits außerhalb von SFT Drive pro Tour eine WhatsApp-Gruppe für Austausch und Detailfragen genutzt. SFT Drive soll diese Kommunikation **nicht nachbauen**, sondern lediglich den passenden Gruppenlink sicher an die bestätigten Teilnehmer ausliefern.

`tour_participant_details` kann dafür über eine neue Migration ergänzt werden um:

```text
whatsapp_group_url TEXT NULL
```

Regeln:

- Feld ist pro Tour optional.
- Admin kann den WhatsApp-Einladungslink in der Tourverwaltung hinterlegen und ändern.
- Der Link ist Participant-Inhalt und darf nur an Admins und bestätigte Teilnehmer der jeweiligen Tour ausgeliefert werden.
- `pending`, `waitlisted`, `rejected`, `cancelled`, normale Mitglieder ohne bestätigte Teilnahme und Visitor erhalten den Link nicht.
- Der Link darf nicht in einer öffentlich lesbaren `tours`-Zeile gespeichert werden.
- Externe URL sicher öffnen; bei neuen Fenstern `noopener`/`noreferrer` beachten.
- Keine WhatsApp API, keine Chat-Synchronisation und kein automatisches Hinzufügen/Entfernen von Gruppenmitgliedern implementieren.
- Die tatsächliche Gruppenmitgliedschaft wird weiterhin vollständig in WhatsApp verwaltet.

Teilnehmer-UX:

```text
WhatsApp-Gruppe
[ WhatsApp-Gruppe öffnen ]
```

Ist kein Link hinterlegt, wird kein WhatsApp-Button angezeigt.

**Umsetzungsstand:** implementiert (Migration `20260908110000_whatsapp_group_url.sql`
ergänzt lediglich `whatsapp_group_url` auf dem bereits bestehenden
`tour_participant_details` — RLS dort war bereits korrekt, keine
Policy-Änderung nötig). Admin-Feld im Tourformular neben Kurviger/Zello,
Button auf der Tourdetailseite für bestätigte Teilnehmer, nur sichtbar wenn
ein Link hinterlegt ist.

### 35.3 Phase 18 — Vormerkung vor Öffnung der Touranmeldung

Touren können deutlich vor dem eigentlichen Anmeldestart veröffentlicht werden. Damit frühe Sichtbarkeit nicht dazu führt, dass lange im Voraus unverbindlich belegte Plätze die echte Kapazität blockieren, wird eine **Vormerkung** strikt von der verbindlichen Touranmeldung getrennt.

Grundprinzip:

```text
Vormerken = Informiere mich, sobald die reguläre Anmeldung geöffnet ist.
```

Eine Vormerkung:

- reserviert **keinen** Fahrzeugplatz,
- zählt nicht gegen `max_vehicles`,
- erzeugt keinen `pending`-, `confirmed`- oder `waitlisted`-Status,
- verschafft keinen Vorrang und kein Vorbuchungsrecht,
- wird nicht automatisch in eine Touranmeldung umgewandelt.

Vorgeschlagenes Datenmodell:

```text
tour_interests
id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
user_id UUID REFERENCES auth.users(id)
created_at TIMESTAMPTZ
registration_open_notified_at TIMESTAMPTZ NULL
UNIQUE(tour_id, user_id)
```

RLS / Aktionen:

- nur eingeloggte User können sich vormerken,
- User kann ausschließlich die eigene Vormerkung anlegen, lesen und entfernen,
- Self-Service bevorzugt über kontrollierte RPCs bzw. eng gefasste RLS,
- Admin darf pro Tour die Anzahl der Vormerkungen sehen,
- Admin benötigt für die normale Übersicht keine privaten Profildaten der vorgemerkten User,
- Account-Löschung muss die zugehörigen Vormerkungen sauber entfernen.

Voraussetzung für eine Vormerkung:

- Tour ist für den User sichtbar bzw. veröffentlicht,
- `registration_open_at` liegt in der Zukunft,
- die reguläre Anmeldung ist noch nicht geöffnet.

Sobald die Anmeldung geöffnet ist, wird `Vormerken` durch die normale Touranmeldung ersetzt.

Teilnehmer-UX vor dem Anmeldestart:

```text
Anmeldung öffnet am 01.03.2027 · 18:00 Uhr

[ Für diese Tour vormerken ]
```

Nach Vormerkung:

```text
★ Für diese Tour vorgemerkt
Du wirst benachrichtigt, sobald die Anmeldung öffnet.
```

Der User kann die Vormerkung vor dem Anmeldestart wieder entfernen.

Admin-UX:

```text
Vorgemerkt: 27
Max. Fahrzeuge: 20
```

Die Zahl dient ausschließlich als Interessensindikator und beeinflusst die spätere Kapazitätslogik nicht.

#### Verbindliche Benachrichtigung beim Anmeldestart

Wenn `registration_open_at` erreicht wird, müssen alle zu diesem Zeitpunkt noch vorgemerkten Nutzer automatisch benachrichtigt werden.

Dafür die bestehende Notification-Infrastruktur verwenden:

```text
TOUR_REGISTRATION_OPEN
```

Mindestens immer als In-App-Notification. Zusätzlich als Web Push, sofern der betreffende User Push aktiviert hat.

Beispiel:

```text
Anmeldung jetzt geöffnet

Die Anmeldung für „Dolomiten Tour 2027“ ist jetzt möglich.

[ Jetzt anmelden ]
```

Der Deep Link führt direkt zu:

```text
/tours/:slug
```

Dort erfolgt ausschließlich die bestehende reguläre Anmeldung. Erst diese Anmeldung entscheidet über `confirmed`, `pending` oder `waitlisted` und belegt gegebenenfalls einen Fahrzeugplatz.

Benachrichtigungsregeln:

- Empfänger werden serverseitig aus `tour_interests` ermittelt.
- Nur aktuell vorgemerkte User werden benachrichtigt.
- Eine vor Öffnung entfernte Vormerkung erhält keine Benachrichtigung.
- `registration_open_notified_at` verhindert Doppelversand.
- Die Notification darf nicht davon abhängen, dass irgendein Nutzer oder Admin die App gerade geöffnet hat.
- Wird `registration_open_at` vor dem Versand geändert, gilt der neue tatsächliche Öffnungszeitpunkt.
- Wird die Anmeldung durch den Admin früher geöffnet, werden die vorgemerkten Nutzer zeitnah beim tatsächlichen Öffnen benachrichtigt.
- Bei einer abgesagten Tour darf keine Anmeldeöffnungs-Notification versendet werden.
- Eine bereits versendete Öffnungsbenachrichtigung wird nicht allein wegen einer nachträglichen Zeitänderung automatisch erneut verschickt.

Die bestehende serverseitige zeitgesteuerte Notification-/Push-Architektur ist zu erweitern; keine zweite unabhängige Push-Infrastruktur aufbauen.

**Umsetzungsstand:** implementiert (Migration `20260908113000_tour_interests.sql`).
Reines Self-Service-CRUD über RLS (eigene Zeile lesen/anlegen/löschen, Admin
zusätzlich lesend für den Zähler) statt RPC — die fachlichen Voraussetzungen
(Tour veröffentlicht, `registration_open_at` gesetzt und noch in der
Zukunft) prüft stattdessen ein `BEFORE INSERT`-Trigger serverseitig; lokal
gegen eine echte `authenticated`-Rolle bestätigt, dass ein Insert nach
Anmeldeöffnung, bei einer abgesagten Tour und mit fremder `user_id` (RLS)
jeweils abgelehnt wird. `TourInterestButton` auf der Tourdetailseite ersetzt
das Anmeldeformular, solange `registration_open_at` gesetzt und noch in der
Zukunft ist. Die verbindliche Benachrichtigung läuft über eine eigene Edge
Function `tour-interest-notifications`, zeitgesteuert per `pg_cron` nach
exakt demselben Muster wie `restaurant-order-notifications` (§27.20/§27.21):
Service-Role-Key als gemeinsames Geheimnis, `registration_open_notified_at`
pro Vormerkung verhindert Doppelversand, abgesagte Touren werden durch den
Query-Filter (`status = 'published'`) ausgeschlossen.

### 35.4 Gemeinsame Regeln für Phasen 16–18

- Noch nicht implementierte Punkte niemals als produktiv vorhanden darstellen.
- Bestehende Migrationen niemals rückwirkend ändern.
- Neue Felder/Tabellen/RPCs nur über neue versionierte Migrationen ergänzen.
- Bestehende Auth-, Tour-, Registrierungs-, Restaurant- und Notification-Architektur weiterverwenden.
- Export- und Share-Funktionen dürfen keine zusätzlichen Leserechte erzeugen.
- WhatsApp-Gruppenlinks bleiben geschützte Participant-Inhalte.
- Vormerkungen bleiben strikt von verbindlichen Tourregistrierungen und Fahrzeugkapazität getrennt.
- Zeitgesteuerte Notifications werden serverseitig ausgelöst und sind gegen Doppelversand abzusichern.
- Keine kostenpflichtigen Kommunikations-APIs ohne ausdrückliche Zustimmung einführen.
- Nach jeder Phase Build, Linter sowie relevante RLS-/RPC-/Regressionstests ausführen.

---

## 36. Entwicklungsphase 19 — Hotelvorschläge und Übernachtungsbestätigung

Phase 19 ist umgesetzt (Datenmodell, RPCs, Teilnehmer- und Admin-UI — siehe
§36.14 "Umsetzungsstand"). Die folgenden Abschnitte bleiben die verbindliche
fachliche Beschreibung.

Ziel ist die organisatorische Unterstützung von Übernachtungen bei
Mehrtagestouren, ohne SFT Drive zu einem Hotel-Buchungssystem zu machen.

SFT Drive:
- schlägt Unterkünfte vor,
- verlinkt auf die externe Buchungsmöglichkeit,
- erfasst ausschließlich, ob der Teilnehmer seine Übernachtung organisiert hat.

Die eigentliche Hotelbuchung erfolgt immer außerhalb von SFT Drive.

### 36.1 Grundprinzip

Die Funktion ist nur für Mehrtagestouren relevant:

```text
end_date > start_date
```

Die benötigten Übernachtungsnächte werden automatisch aus dem Tourzeitraum
abgeleitet.

Beispiel:

```text
Tour:
18.06.2027 bis 21.06.2027

Übernachtungen:
18./19.06.2027
19./20.06.2027
20./21.06.2027
```

Es gibt keine Übernachtung nach dem letzten Tourtag.

Der Admin muss die einzelnen Nächte nicht manuell anlegen.

### 36.2 Hotelvorschläge durch den Admin

Der planende Admin kann für jede Übernachtungsnacht einen oder mehrere
Hotel-/Unterkunftsvorschläge hinterlegen.

Ein Vorschlag kann mindestens enthalten:

- Hotel-/Unterkunftsname
- externe URL
- optionale Adresse
- optionale organisatorische Notiz
- optionale Buchungsdeadline / Hinweis auf ein Abrufkontingent
- Sortierreihenfolge

Beispiel:

```text
Übernachtung 18./19.06.2027

Hotel Alpenblick
Musterstraße 12, Bozen
Buchungskontingent bis 01.04.2027

[ Hotel öffnen ]

Hotel Dolomiti
[ Hotel öffnen ]
```

Mehrere Vorschläge pro Nacht sind zulässig.

Hotelvorschläge sind keine Reservierungen und erzeugen keinerlei
Verpflichtung oder Buchung innerhalb von SFT Drive.

Keine Booking.com-, Hotel-, Zahlungs- oder sonstige externe Buchungs-API
integrieren.

Externe Links sicher öffnen; bei neuen Fenstern mindestens
noopener/noreferrer beachten.

### 36.3 Teilnehmer muss kein vorgeschlagenes Hotel wählen

Ein bestätigter Teilnehmer muss SFT Drive NICHT mitteilen, welches Hotel
oder welche Unterkunft er tatsächlich gebucht hat.

Er darf:
- einen vorgeschlagenen Anbieter verwenden,
- ein anderes Hotel buchen,
- eine Ferienwohnung verwenden,
- privat übernachten,
- eine andere geeignete Unterkunft organisieren.

SFT Drive speichert ausschließlich den organisatorischen Status:

```text
"Übernachtung gebucht / organisiert"
```

Dadurch werden keine unnötigen privaten Reise- oder Buchungsdaten erfasst.

Insbesondere NICHT speichern:

- Buchungsnummer
- Reservierungsnummer
- Preis
- Zahlungsinformationen
- Kreditkartendaten
- Zimmernummer
- Zimmerkategorie
- Buchungsplattform
- sonstige unnötige Buchungsdetails

### 36.4 Teilnehmer-UX

Nur ein für die betreffende Tour bestätigter Teilnehmer darf seinen
Übernachtungsstatus verwalten.

Beispiel:

```text
Übernachtungen

18./19.06.2027

Hotelvorschläge:
Hotel Alpenblick
[ Hotel öffnen ]

[ ✓ Übernachtung gebucht ]
```

Nach Bestätigung:

```text
✓ Übernachtung gebucht
```

Bei mehreren Nächten wird der Status für jede Nacht separat geführt:

```text
18./19.06.   ✓ bestätigt
19./20.06.   Noch nicht bestätigt
20./21.06.   ✓ bestätigt
```

Der User kann eine Bestätigung wieder zurücknehmen, falls eine Buchung
storniert wurde oder sich seine Planung geändert hat.

Auch wenn für eine Nacht kein Hotelvorschlag hinterlegt ist, darf der
Teilnehmer bestätigen, dass seine Übernachtung organisiert ist.

Die Bestätigung bedeutet ausschließlich:

```text
"Der Teilnehmer hat SFT Drive mitgeteilt, dass seine Übernachtung für diese
Nacht organisiert ist."
```

Sie ist kein Beleg dafür, dass tatsächlich eine Buchung besteht.

### 36.5 Mögliches Datenmodell

Hotelvorschläge getrennt vom Teilnehmerstatus speichern.

Beispielsweise:

```text
tour_hotel_suggestions

id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
night_date DATE NOT NULL
name TEXT NOT NULL
url TEXT NULL
address TEXT NULL
note TEXT NULL
booking_deadline DATE NULL
sort_order INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Mehrere Hotelvorschläge für dieselbe Tour und Nacht sind zulässig.

Teilnehmerbestätigungen beispielsweise:

```text
tour_accommodation_confirmations

id UUID PRIMARY KEY
tour_id UUID REFERENCES tours(id)
user_id UUID REFERENCES auth.users(id)
night_date DATE NOT NULL
confirmed_at TIMESTAMPTZ NOT NULL
UNIQUE(tour_id, user_id, night_date)
```

Bei Umsetzung das tatsächliche bestehende Schema zuerst prüfen und die
bestehenden Namens-/FK-/Timestamp-Konventionen des Projekts übernehmen.

Keine alte Migration rückwirkend ändern.

### 36.6 Serverseitige Regeln für die Bestätigung

Die Bestätigung muss serverseitig abgesichert sein.

Bevorzugt über eine kontrollierte RPC oder eine gleichwertig sichere
RLS-/Trigger-Lösung.

Beispielsweise:

```text
set_accommodation_confirmation(
  tour_id,
  night_date,
  confirmed
)
```

Serverseitig mindestens prüfen:

1. Caller ist authentifiziert.
2. auth.uid() bestimmt den User; keine fremde user_id vom Client vertrauen.
3. Tour ist eine Mehrtagestour.
4. night_date gehört tatsächlich zu einer gültigen Übernachtungsnacht:
   start_date <= night_date < end_date.
5. Caller besitzt für die Tour aktuell eine Registrierung mit
   status = confirmed.
6. Tour ist organisatorisch noch für diese Aktion zulässig.
7. Bei Bestätigung wird confirmed_at ausschließlich serverseitig gesetzt.
8. Doppelbestätigungen dürfen nicht zu doppelten Datensätzen führen.
9. Der User darf ausschließlich seinen eigenen Status ändern.

pending, waitlisted, rejected oder cancelled dürfen keine
Übernachtungsbestätigung setzen.

Admins dürfen die Bestätigungen lesen, aber eine Teilnehmerbestätigung nicht
unbemerkt im Namen des Users erzeugen.

### 36.7 Sichtbarkeit

Hotelvorschläge und Übernachtungsstatus sind organisatorische
Participant-Inhalte.

Hotelvorschläge lesen dürfen:

- Admin
- bestätigte Teilnehmer der betreffenden Tour

Übernachtungsbestätigungen:

- Teilnehmer sieht und ändert ausschließlich die eigenen Bestätigungen.
- Admin darf alle Bestätigungen der Tour zur organisatorischen Auswertung lesen.
- Normale Mitglieder ohne bestätigte Teilnahme dürfen keine fremden
  Übernachtungsdaten sehen.
- Visitor erhalten keine Übernachtungsdaten.

Keine breite SELECT-Policy auf profiles oder tour_registrations dafür
einführen.

Bestehende sichere RPC-/RLS-Strukturen wiederverwenden.

### 36.8 Admin-Übersicht

Der wichtigste organisatorische Zweck ist, dass der Admin erkennt, bei
welchen bestätigten Teilnehmern noch keine Übernachtungsbestätigung vorliegt.

Für jede Nacht mindestens anzeigen:

```text
Übernachtung 18./19.06.2027

Bestätigt: 17 / 20
Noch nicht bestätigt: 3

Offene Teilnehmer:

S4shadow · Audi S4
RS3Tom · Audi RS3
TurboMike · Porsche 911
```

WICHTIGE BEZEICHNUNG:

Nicht formulieren:

```text
"hat kein Hotel"
```

sondern:

```text
"Übernachtung noch nicht bestätigt"
```

SFT Drive kann nicht wissen, ob der Teilnehmer bereits außerhalb der App
gebucht und nur die Bestätigung vergessen hat.

### 36.9 Status pro Teilnehmer

Bei mehreren Übernachtungen soll der Admin zusätzlich den Gesamtstatus pro
Teilnehmer erkennen können.

Beispiel:

```text
S4shadow

18./19.06.   ✓ bestätigt
19./20.06.   Noch nicht bestätigt
20./21.06.   ✓ bestätigt

Gesamtstatus:
Teilweise bestätigt
```

Mindestens folgende Filter:

- Alle Übernachtungen bestätigt
- Teilweise bestätigt
- Keine Übernachtung bestätigt

Die Auswertung basiert ausschließlich auf aktuell bestätigten
Tourteilnehmern.

Ein User, dessen Tourregistrierung nicht mehr confirmed ist, darf nicht als
offener Teilnehmer in der aktuellen Übernachtungsstatistik gezählt werden.

### 36.10 Gezielte Erinnerung durch den Admin

Der Admin soll Teilnehmer mit fehlender Übernachtungsbestätigung gezielt
ansprechen können.

Dafür bestehende Notification-Infrastruktur weiterverwenden.

Kein neues Nachrichtensystem bauen.

Der Admin kann:
- einen einzelnen offenen Teilnehmer auswählen,
- mehrere offene Teilnehmer auswählen,
- nach konkreter Übernachtungsnacht filtern,
- eine Erinnerung an die ausgewählten User senden.

Ein eigener Notification-Typ wie:

```text
ACCOMMODATION_REMINDER
```

ist zulässig.

Beispiel:

```text
Übernachtung noch nicht bestätigt

Für die Dolomiten Tour fehlt uns noch deine Bestätigung für die
Übernachtung vom 19. auf den 20. Juni.

Bitte bestätige in SFT Drive, sobald deine Unterkunft gebucht ist.

[ Tour öffnen ]
```

Deep Link zur bestehenden Tourdetailseite.

Wenn Push für den User aktiviert ist, darf die bestehende Push-Infrastruktur
verwendet werden.

Keine zweite Push-Infrastruktur aufbauen.

Zusätzlich kann die Admin-Ansicht optional "Liste kopieren" bzw. die bereits
vorhandene Share-/Clipboard-Infrastruktur aus Phase 16 verwenden, damit die
offenen Teilnehmer bei Bedarf extern über WhatsApp, E-Mail, iMessage usw.
angesprochen werden können.

Keine automatischen wiederkehrenden Hotel-Erinnerungen ohne separate
Produktentscheidung einführen.

### 36.11 Datumsänderungen der Tour

Die gültigen Übernachtungsnächte werden immer aus start_date und end_date
abgeleitet.

Bei einer Änderung des Tourzeitraums:

- passende Nächte weiterhin verwenden,
- Hotelvorschläge und Bestätigungen außerhalb des neuen Zeitraums nicht
  mehr als gültig anzeigen oder zählen,
- vorhandene Daten nicht stillschweigend und destruktiv löschen,
- Admin bei betroffenen bereits vorhandenen Hotel-/Bestätigungsdaten
  entsprechend warnen bzw. eine kontrollierte Bereinigung vorsehen.

Beim vollständigen Löschen einer Tour dürfen abhängige Hotelvorschläge und
Bestätigungen entsprechend der bestehenden Projektkonvention sauber
mitgelöscht werden.

### 36.12 Sicherheits- und Datenschutzregeln

- keine Zahlungsdaten speichern
- keine Reservierungs-/Buchungsnummern speichern
- keine unnötigen Reisedaten speichern
- kein service_role im Client
- keine zusätzlichen laufenden Kosten
- keine externe Hotel-API erforderlich
- keine Hotelbuchung durch SFT Drive
- auth.uid() serverseitig als Identität verwenden
- Admin-Zugriff über bestehende Adminprüfung absichern
- bestätigte Teilnehmer dürfen nur eigene Bestätigungen schreiben
- bestehende RLS-Grenzen niemals lockern

### 36.13 Mindesttests bei späterer Umsetzung

Mindestens testen:

- eintägige Tour zeigt keine Hotel-/Übernachtungsfunktion
- Mehrtagestour leitet Nächte korrekt ab
- letzte Tournacht ist der Tag vor end_date
- mehrere Hotelvorschläge pro Nacht funktionieren
- bestätigter Teilnehmer kann eigene gültige Nacht bestätigen
- pending kann nicht bestätigen
- waitlisted kann nicht bestätigen
- fremde user_id kann nicht verwendet werden
- ungültige night_date außerhalb des Tourzeitraums wird abgelehnt
- Doppelbestätigung erzeugt keinen zweiten Datensatz
- Bestätigung kann wieder zurückgenommen werden
- Nicht-Teilnehmer können Hotel-/Bestätigungsdaten nicht lesen
- Admin kann Hotelvorschläge verwalten
- Admin sieht bestätigt/offen pro Nacht korrekt
- Admin-Offenliste enthält ausschließlich aktuell confirmed Teilnehmer
- vollständig/teilweise/nicht bestätigt wird korrekt berechnet
- Datumsspannenänderungen führen nicht zu falschen offenen Nächten
- Kennzeichen, Buchungsdaten oder sonstige nicht benötigte private Daten
  werden nicht an andere Teilnehmer ausgegeben

### 36.14 Umsetzungsstand

**Umsetzungsstand:** implementiert (Migration `20260908120000_accommodation.sql`,
lokal gegen eine echte, nicht-privilegierte Postgres-Rolle auf RLS und die
serverseitigen Vorbedingungen aus §36.6 getestet, nicht nur als Superuser).

- `tour_hotel_suggestions` (Hotelvorschläge, Participant-Inhalt, gleiches
  RLS-Muster wie `tour_stops`/`tour_stages`: bestätigte Teilnehmer und Admins
  lesen, nur Admins schreiben) und `tour_accommodation_confirmations`
  (bewusst ohne direkte Insert/Update/Delete-Policies — jede Statusänderung
  läuft ausschließlich über die RPC unten).
- `set_accommodation_confirmation(p_tour_id, p_night_date, p_confirmed)` prüft
  serverseitig Authentifizierung, Existenz und Mehrtägigkeit der Tour
  (`NOT_MULTIDAY_TOUR`), Gültigkeit der Nacht innerhalb `[start_date,
  end_date)` (`INVALID_NIGHT_DATE`) sowie eine aktuell bestätigte Registrierung
  des Callers (`REGISTRATION_NOT_FOUND`), bevor die Bestätigung gesetzt bzw.
  bei `p_confirmed = false` die Zeile gelöscht wird.
- `admin_send_accommodation_reminder(p_tour_id, p_user_ids, p_night_date)`
  leitet den tatsächlichen Empfängerkreis serverseitig aus aktuell
  bestätigten Registrierungen dieser Tour ab (Schnittmenge mit `p_user_ids`)
  statt der Client-Liste zu vertrauen, und legt `ACCOMMODATION_REMINDER`-
  Mitteilungen über die bestehende `notifications`-Tabelle an — kein neues
  Nachrichtensystem.
- `send-push` wurde um ein optionales `user_ids`-Feld erweitert (nur
  zusammen mit `tour_id` zulässig), damit die gezielte Erinnerung aus §36.10
  tatsächlich nur an die ausgewählten offenen Teilnehmer pushen kann, statt
  nur an alle bestätigten Teilnehmer der Tour oder per Broadcast.
- Admin-UI unter `/admin/tours/:id/hotels` (verlinkt aus `/admin/tours` neben
  „Tagesrouten verwalten“, nur bei Mehrtagestouren): pro automatisch aus dem
  Tourzeitraum abgeleiteter Nacht Hotelvorschläge pflegen, bestätigten/offenen
  Status je Teilnehmer mit dem Wortlaut „Übernachtung noch nicht bestätigt“
  (nicht „hat kein Hotel“) sowie gezielter Erinnerungs-Button für die noch
  offenen Teilnehmer dieser Nacht.
- Teilnehmer-UI auf der Tourdetailseite (`AccommodationSection`, nur für
  bestätigte Teilnehmer von Mehrtagestouren): Hotelvorschläge pro Nacht sowie
  Bestätigen/Zurücknehmen-Button je Nacht.
- Lokal als `authenticated`-Rolle getestet: erfolgreiche Bestätigung einer
  gültigen Nacht, Ablehnung bei eintägiger Tour, Ablehnung bei nachtdatum
  außerhalb des Tourzeitraums (Starttag vor Beginn und letzter Tag als
  „Nacht“), Ablehnung für nicht bestätigte Caller, RLS-Isolation auf
  `tour_accommodation_confirmations` (fremde Bestätigungen nicht lesbar,
  Admin sieht sie), RLS auf `tour_hotel_suggestions` (nicht bestätigte
  Teilnehmer sehen und schreiben nichts), sowie korrekte Empfänger-Filterung
  der Erinnerungs-RPC (nur tatsächlich bestätigte Teilnehmer, sonst
  `USER_NOT_FOUND`).

---

## 37. Entwicklungsphase 20 — Tourduplikat und YouTube-Video

Phase 20 ist umgesetzt: zwei kleine, additive Komfortfunktionen für die
Tourenverwaltung.

### 37.1 Tour duplizieren

Ziel ist, eine neue Tour schneller anlegen zu können, indem eine bestehende
Tour als Ausgangspunkt kopiert wird, statt alle Felder erneut einzutippen.

Da das gesamte Anlegen/Bearbeiten einer Tour bereits frontend-seitig über
`AdminTourFormPage` direkt gegen `tours` (RLS `tours_admin_all`) sowie
`tour_member_details`/`tour_participant_details` läuft und es keinen
serverseitigen Slug-Mechanismus gibt (§8.3 "Umsetzungsentscheidung: Slug ist
kein Admin-Eingabefeld"), war dafür **keine neue Migration oder RPC
notwendig** — die Duplizierung ist eine reine Vorbefüllung desselben
Formulars.

Umsetzung:

- In `/admin/tours` besitzt jede Tourzeile zusätzlich zu den bestehenden
  Aktionen einen Button „Tour duplizieren“, der zu
  `/admin/tours/new?duplicate=<sourceId>` navigiert.
- `AdminTourFormPage` lädt bei `?duplicate=<id>` (nur wenn keine eigene `id`
  aus der Route vorliegt, also nur im Neu-anlegen-Fall) die Quelltour samt
  `tour_member_details`/`tour_participant_details` und befüllt daraus ein
  neues Formular. Übernommen werden u. a. Region, Streckenlänge,
  Fahrzeuglimit, Bestätigungsmodus, Leistungs-/Alters-/Kennzeichenanforderung,
  Check-in-Konfiguration, Titelbild, YouTube-Feld (§37.2), Mitglieder-/
  Teilnehmertext, Treffpunkte, Kurviger-/Zello-/WhatsApp-Link.
- Bewusst **nicht** übernommen: Status (immer `draft`, damit die Kopie nicht
  versehentlich sofort live ist), Start-/Enddatum, Treffpunktzeit,
  Anmeldefenster, Personenzahl-Änderungsdeadline und der Slug — das sind
  Entscheidungen für die neue Ausfahrt, keine Kopie der alten. Der Titel wird
  um den Zusatz „(Kopie)“ ergänzt, damit die Kopie im Formular erkennbar ist;
  der Admin passt Titel und die genannten Felder anschließend an und
  speichert ganz normal über den bestehenden Anlegen-Pfad (inklusive der
  bestehenden slugkollisionssicheren Insert-Logik).
- Registrierungen, Tour-Stopps, Tagesrouten und Hotelvorschläge der
  Ausgangstour werden nicht mitkopiert — die neue Tour startet organisatorisch
  leer.
- Der bestehende `localStorage`-Formularentwurf (§16 "Formular-Resilienz bei
  Tab-Reloads") verwendet für den Duplizieren-Fall einen eigenen Schlüssel
  (`sft-drive-tour-draft-duplicate-<sourceId>`) statt des generischen
  `…-draft-new`, damit ein noch offener, unabhängiger "neue Tour"-Entwurf
  nicht mit einer Duplizierung kollidiert oder sie überschreibt.

### 37.2 YouTube-Video pro Tour

Ziel ist, optional ein YouTube-Video (Ankündigung oder Rückblick) an eine
Tour anzuhängen — entweder eingebettet abspielbar oder nur als Link.

Datenmodell (neue Migration `20260909050000_tour_youtube_video.sql`, rein
additiv, `tours` bleibt sonst unverändert):

```text
tours.youtube_url    TEXT NULL
tours.youtube_embed  BOOLEAN NOT NULL DEFAULT TRUE
```

Bewusste Platzierung auf der öffentlichen `tours`-Zeile statt in
`tour_participant_details`: ein Tour-Video ist wie das Titelbild
(`cover_image_url`) ein öffentlicher Marketinginhalt und kein interner
Teilnehmer-Inhalt — es enthält keinen Treffpunkt, Kurviger- oder Zello-Zugang
und unterliegt deshalb nicht der Participant-Sichtbarkeitsgrenze aus §8/§10.

Datenschutz (§7, konsistent mit der bereits bestehenden Entscheidung, Google
Fonts selbst zu hosten statt Google-Infrastruktur unaufgefordert zu
kontaktieren): Es wird **kein** YouTube-Thumbnail vorab geladen und **kein**
iframe automatisch eingebettet. Vor einem expliziten Klick auf „Video laden“
geht keine Anfrage an YouTube-Server. Im Link-Modus öffnet der Klick den
externen Link direkt in einem neuen Tab (`noopener`/`noreferrer`); im
Embed-Modus wird nach dem Klick `youtube-nocookie.com` als iframe-Quelle
verwendet.

Sicherheit: Die Video-ID wird nicht direkt als iframe-`src` verwendet,
sondern über `extractYouTubeId()` (`src/utils/youtube.ts`) aus bekannten
URL-Formen (`watch?v=`, `youtu.be/`, `embed/`, `shorts/`) per Regex
extrahiert und auf ein sicheres ID-Muster geprüft. Jede nicht erkannte URL
liefert `null` und fällt automatisch auf die reine Link-Anzeige zurück —
kein unvalidierter Wert erreicht ein iframe.

Umsetzung:

- Admin-Formular (`AdminTourFormPage`, Abschnitt „Grunddaten“ neben dem
  Titelbild): Feld „YouTube-Video-URL“ sowie — nur sichtbar, wenn eine URL
  eingetragen ist — ein Umschalter „Video eingebettet anzeigen“
  (Standard: aktiviert).
- Tourdetailseite (`YouTubeVideo`-Komponente, `src/features/tours/YouTubeVideo.tsx`):
  öffentlich sichtbar für jeden Besucher, direkt unter der öffentlichen
  Beschreibung, unabhängig vom Anmelde- oder Teilnahmestatus.
- Die Duplizieren-Funktion aus §37.1 übernimmt `youtube_url`/`youtube_embed`
  wie die übrigen öffentlichen Feststoffe der Quelltour.

Kosten: Keine — YouTube-Einbettung ist kostenlos, `youtube-nocookie.com` ist
YouTubes eigener datensparsamerer Embed-Host und erfordert keinen API-Key.

### 37.3 Tour löschen (Entwurf/Abgesagt)

Ziel ist, dass ein Admin eine Tour, die nie über den Entwurfsstatus
hinauskam oder inzwischen abgesagt wurde, aus der Tourenverwaltung entfernen
kann, statt sie dauerhaft liegen zu lassen. Gelöscht werden die Tour und
ihre organisatorischen Tourdaten (Anmeldungen, Stopps/Speisekarte/
Bestellungen, Tagesetappen, Hotelvorschläge/-bestätigungen, Vormerkungen) —
bewusst **nicht**: bereits versendete Mitteilungen (bleiben erhalten, siehe
unten) und hochgeladene Coverbilder im gemeinsamen `tour-covers`-Storage
(unabhängig von der Tour, ggf. von anderen/duplizierten Touren
weiterverwendet).

Bewusst nur in genau diesen beiden Status möglich:

```text
draft
cancelled
```

`published`, `registration_closed`, `completed` und `archived` bleiben
ausdrücklich nicht löschbar — dort gilt weiterhin §23.14 ("bereits
gespeicherte historische Daten dürfen nicht unbeabsichtigt überschrieben
oder gelöscht werden"). Eine abgesagte Tour zu löschen ist eine bewusste,
zusätzliche Aufräummöglichkeit für den Admin (ausdrücklicher Wunsch des
Projektinhabers) — im Normalfall archiviert `apply_tour_lifecycle()` (§8.3)
eine abgesagte Tour ohnehin automatisch nach ihrem Starttag.

Umsetzung (Migration `20260909060000_admin_delete_tour.sql`):

- `admin_delete_tour(p_tour_id)`: prüft `is_admin()` und den Status, löscht
  dann explizit in Abhängigkeitsreihenfolge — `tour_member_details`,
  `tour_participant_details`, `tour_stages`, `tour_registrations`,
  `tour_hotel_suggestions`, `tour_accommodation_confirmations`,
  `tour_interests` sowie unter den Tour-Stopps `meal_order_items`,
  `meal_orders`, `menu_items`, `restaurant_stop_settings`, `tour_stops` —
  bevor die `tours`-Zeile selbst gelöscht wird. Notifications mit Bezug auf
  die Tour bleiben erhalten und verlieren nur ihren Tourbezug (bereits
  bestehende `on delete set null`-Regel auf `notifications.tour_id`) — ihr
  `target_path` (typischerweise `/tours/<slug>`) wird dabei zusätzlich
  geleert, damit eine alte Mitteilung nach dem Löschen nicht auf eine nicht
  mehr existierende Tour verlinkt.
- Die explizite Reihenfolge ist nötig, weil `meal_order_items.menu_item_id`
  seit 20260909020000 bewusst `ON DELETE RESTRICT` verwendet (§27.21) — ein
  einfaches `DELETE FROM tours` und reines Verlassen auf FK-Kaskaden könnte
  daran scheitern, solange noch Bestellpositionen auf ein Menügericht dieser
  Tour verweisen. Lokal gegen eine echte `authenticated`-Rolle mit einer
  Tour samt vollständig befüllten Abhängigkeiten (Registrierung,
  Restaurant-Stopp mit Menü/Bestellung/Bestellposition, Etappe,
  Hotelvorschlag, Übernachtungsbestätigung, Mitteilung) getestet: löscht
  restlos, ohne FK-Fehler; eine `published`-Tour und eine nicht existierende
  Tour-ID werden korrekt mit `TOUR_NOT_DELETABLE` bzw. `TOUR_NOT_FOUND`
  abgelehnt, ein nicht-Admin mit `FORBIDDEN`.
- Admin-Tourformular (`AdminTourFormPage`, nur im Bearbeiten-Fall): eigener
  Abschnitt „Tour löschen" mit Bestätigungsdialog (`window.confirm`, analog
  zu „Tour absagen"). Die Sichtbarkeit richtet sich bewusst nach dem beim
  Laden gespeicherten `originalStatus` und nicht nach dem gerade im
  Formular bearbeiteten, noch ungespeicherten `form.status` — sonst könnte
  der Abschnitt kurzzeitig erscheinen, während eine tatsächlich noch
  `published`e Tour im Formular erst auf Entwurf umgestellt, aber noch
  nicht gespeichert wurde (oder umgekehrt verschwinden, obwohl der
  gespeicherte Status weiterhin löschbar ist).
- Tourenverwaltung (`/admin/tours`): Wischen-zum-Löschen (bestehende
  `SwipeToDelete`-Komponente, gleiches Muster wie bei Mitteilungen, §27.20),
  ebenfalls mit Bestätigungsdialog — anders als eine einzelne Mitteilung ist
  eine Tour inklusive ihrer organisatorischen Daten nicht trivial
  wiederherstellbar. Nur Tourzeilen mit Status Entwurf oder Abgesagt sind
  wischbar; alle anderen bleiben unverändert nur per Tap erreichbar. Ein
  `deletingId`-State deaktiviert die betroffene Tourkarte während die RPC
  läuft (verhindert Doppelauslösung) und entfernt nach Erfolg zusätzlich
  einen eventuell noch vorhandenen lokalen `localStorage`-Formularentwurf
  dieser Tour.

---

## 38. Native macOS-Admin-App & optionale KI-Unterstützung

Diese Phase ist **geplant, noch nicht umgesetzt**. Der Abschnitt hält die
bisher getroffenen Architekturentscheidungen fest, bevor mit der
Implementierung begonnen wird — er darf nicht als bereits produktiver Stand
missverstanden werden (§34.5/§35.4-Grundsatz: "Noch nicht implementierte
Punkte niemals als produktiv vorhanden darstellen").

Ziel: Zusätzlich zur mobilen PWA entsteht eine eigenständige native
macOS-Anwendung ausschließlich für Administratoren. Sie ist kein
Web-Wrapper und keine Desktop-Version der PWA, sondern eine echte
Desktop-App, die für umfangreiche Planung, Administration und Auswertung
optimiert ist.

### 38.1 Native macOS-Anwendung

Die Anwendung soll sich funktional auf die Administration konzentrieren.
Die PWA bleibt primär für Teilnehmer und mobile Administration bestehen.

Zielplattform: **Swift + SwiftUI**. Damit erhalten wir eine echte
macOS-App mit nativen Fenstern, Tabellen, Sidebars, Tastaturbedienung,
Drag & Drop, macOS Keychain usw.

Die Desktop-App arbeitet mit dem gleichen Supabase-Projekt und damit
demselben Datenbestand wie SFT Drive. Eine in der PWA vorgenommene
Änderung ist anschließend unmittelbar auch in der Mac-App sichtbar und
umgekehrt.

Wichtig: „Direkter Datenbankzugriff" bedeutet dabei **nicht**, dass
Datenbankpasswort oder Supabase-Service-Role-Key in die App eingebaut
werden. Die Anwendung verwendet Supabase Auth, RLS und die bestehenden
beziehungsweise dafür vorgesehenen RPCs. Dadurch kann die Mac-App
umfassende Administrationsrechte erhalten, ohne einen universellen
geheimen Datenbankschlüssel auszuliefern.

### 38.2 Ausschließlich für Administratoren

Die Mac-App besitzt einen eigenen Login.

Verwendet werden dieselben Supabase-Benutzerkonten wie in der PWA.

Nach dem Login muss serverseitig geprüft werden:

```text
user_roles.role = admin
```

Nur wenn der angemeldete Benutzer aktuell Administrator ist, darf die
Anwendung geöffnet und dürfen administrative Daten geladen werden.

Damit gilt:

```text
PWA-Admin
    ↓
gleicher Account
    ↓
Mac-App verwendbar

normaler PWA-User
    ↓
Mac-App Login abgelehnt
```

Die Adminberechtigung darf niemals ausschließlich lokal geprüft werden.

Wird einem Benutzer die Adminrolle entzogen, verliert er damit auch die
Berechtigung für die Mac-App.

Sessions und Zugangsdaten werden ausschließlich sicher im macOS Keychain
gespeichert.

### 38.3 Desktop-optimiertes Design

Das Design soll eindeutig zu SFT Drive gehören und sich an der
vorhandenen PWA orientieren:

```text
Schwarz / Anthrazit
Rot als Primär-/Aktionsfarbe
helle Typografie
Archivo / JetBrains Mono bzw. passende native Entsprechung
gleiche Statusfarben
gleiche Begriffe
gleiche Icons / visuelle Sprache
```

Die Oberfläche wird aber nicht einfach auf Desktopgröße hochskaliert.

Für macOS sollen stattdessen Desktop-Möglichkeiten genutzt werden:

```text
Sidebar-Navigation
mehrspaltige Ansichten
große Datentabellen
Sortierung
Filter
Suche
Detailbereich neben der Tabelle
Kontextmenüs
Mehrfachauswahl
Tastaturkürzel
Drag & Drop
größere Planungsübersichten
```

Damit können beispielsweise Teilnehmerliste und ausgewählter Teilnehmer
gleichzeitig dargestellt werden.

### 38.4 Administrativer Gesamtumfang

Langfristig soll die Mac-App alle administrativen Funktionen der PWA
enthalten und für Desktop-Bedienung verbessern.

Dazu gehören insbesondere:

- Touren erstellen, bearbeiten, duplizieren, veröffentlichen, absagen, archivieren und – soweit erlaubt – löschen
- Teilnehmer verwalten, bestätigen, ablehnen, entfernen und administrativ hinzufügen
- Warteliste und Kapazitäten
- Fahrzeuge und Fahrzeugdaten
- Personen-/Mitfahrerzahlen
- Leistungs- und Altersbedingungen
- Anmeldezeiträume
- Check-in
- Tagesetappen
- Kurviger-/Routenlinks
- Stopps und Restaurants
- Speisekarten und Vorbestellungen
- Hotelvorschläge und Übernachtungsbestätigungen
- Interessenten/Vormerkungen
- WhatsApp-/Zello-/weitere Tourlinks
- Mitteilungen und Push
- Coverbilder und Medien
- YouTube-Inhalte
- Benutzerverwaltung
- CSV-/Datenexport

Die detaillierte Straßenroute soll nach der bisherigen Architektur
weiterhin nicht unnötig in SFT Drive dupliziert werden. Kurviger bleibt
dafür die spezialisierte Routingquelle; SFT Drive verwaltet die
dazugehörigen Planungs- und Organisationsinformationen.

### 38.5 Planungs- und Analysebereich

Die Mac-App soll einen größeren Planungsschwerpunkt bekommen als die PWA.

Beispielsweise kann eine Tour auf einem Bildschirm zusammengeführt werden:

```text
20 Fahrzeuge bestätigt
27 Personen
18 / 20 Hotel bestätigt
16 / 20 Essen bestellt
17 / 20 eingecheckt
3 Warteliste
4 Vormerkungen
2 offene Admin-Aufgaben
```

Dazu kommen Filter und Auswertungen nach Fahrzeug, Personen, Status,
Übernachtung, Restaurant, Check-in usw.

Das soll dem Organisator ermöglichen, Unstimmigkeiten früh zu erkennen,
ohne mehrere mobile Ansichten durchsuchen zu müssen.

---

## 39. Optionale KI-Assistenz für die Tourplanung

Ebenfalls **geplant, noch nicht umgesetzt** (siehe Hinweis zu Beginn von
§38).

### 39.1 Grundidee

Die Mac-App erhält optional einen KI-Assistenten oberhalb beziehungsweise
innerhalb des Planungsbereiches.

Die KI soll vor allem unstrukturierte Kommunikation in strukturierte
SFT-Drive-Daten übersetzen.

Typischer Anwendungsfall:

```text
E-Mail vom Hotel
        ↓
KI
        ↓
strukturierte Daten
        ↓
Vorschau in SFT Drive
        ↓
Admin bestätigt
        ↓
Datenbank
```

Copy & Paste von E-Mails soll als erste und einfachste Variante
unterstützt werden.

Später kann ein direkter E-Mail-Import ergänzt werden.

### 39.2 Beispiele

Eine Hotel-Mail wie:

```text
Wir können Ihnen vom 18. bis 20. Juni 15 Doppelzimmer anbieten.
Reservierung bis 30. April. Frühstück ist enthalten …
```

könnte beispielsweise strukturiert zurückgegeben werden als:

```json
{
  "type": "hotel_offer",
  "hotel": "...",
  "arrival": "2027-06-18",
  "departure": "2027-06-20",
  "rooms": 15,
  "booking_deadline": "2027-04-30",
  "notes": "Frühstück inklusive"
}
```

Eine Restaurant-Mail könnte beispielsweise extrahieren:

```json
{
  "type": "restaurant",
  "name": "...",
  "reservation_time": "...",
  "order_deadline": "...",
  "menu_items": []
}
```

Die Anwendung übersetzt dieses definierte Schema anschließend in die
entsprechenden SFT-Drive-Felder.

### 39.3 KI darf nicht ungeprüft schreiben

Ein wichtiger Architekturpunkt:

Die KI selbst bekommt keinen freien Datenbankzugriff.

Stattdessen:

```text
E-Mail/Text
↓
KI analysiert
↓
JSON / strukturiertes Ergebnis
↓
App validiert Schema
↓
Admin sieht Vorschau
↓
„Übernehmen"
↓
normale SFT-Drive-RPC/API
↓
Datenbank
```

Dadurch kann ein Modell weder versehentlich Touren verändern noch Daten
erfinden und ungeprüft speichern.

Ideal wäre eine Änderungsansicht wie:

```text
ERKANNT
Hotel: Hotel Alpenblick
Check-in: 18.06.2027
Check-out: 20.06.2027
Deadline: 30.04.2027
Zimmer: 15
[ Verwerfen ]       [ Übernehmen ]
```

### 39.4 KI komplett optional

Die Mac-App muss ohne KI vollständig funktionsfähig bleiben.

In den Einstellungen:

```text
KI-Unterstützung
[ AN / AUS ]

Provider
Ollama
OpenAI
...

Modell
<aus verfügbaren Modellen>

Fallback
[ AN / AUS ]
```

Kein administrativer Kernworkflow darf von der Verfügbarkeit eines
KI-Anbieters abhängig sein.

### 39.5 Provider-Abstraktion

Die Anwendung soll nicht auf einen einzelnen Anbieter fest programmiert
werden.

Intern bekommt die KI-Schicht eine gemeinsame Schnittstelle, sinngemäß:

```text
AIProvider
  analyse(text, schema)
    → StructuredResult
```

Dahinter können unterschiedliche Provider betrieben werden.

Beispielsweise:

```text
Ollama
OpenAI
weitere OpenAI-kompatible APIs
lokale Modelle
spätere Anbieter
```

Damit kann ein Modell ausgetauscht werden, ohne die Planungslogik
umzubauen.

### 39.6 Ollama als bevorzugte kostenlose/lokale Option

Ollama soll ausdrücklich als unterstützte Variante vorgesehen werden.

Möglich sind sowohl lokal erreichbare Ollama-Modelle als auch
entsprechend konfigurierte kompatible Endpunkte.

Das eignet sich für den Anwendungsfall besonders, weil primär Text
analysiert wird und kein großes multimodales Modell erforderlich ist.

Die Mac-App soll einen konfigurierbaren Endpoint und ein Modell verwenden
können.

Beispiel:

```text
Provider: Ollama
Endpoint: http://localhost:11434
Modell: <ausgewähltes Modell>
```

Damit kann ein Modell lokal auf dem Mac oder auf einem eigenen
Rechner/Server laufen.

### 39.7 Flexible Modellauswahl und Fallback

Mehrere Modelle können konfiguriert werden.

Beispiel:

```text
1. Modell A
2. Modell B
3. Modell C
```

Ist Modell A nicht verfügbar oder ist ein Kontingent ausgeschöpft, kann –
sofern aktiviert – Modell B versucht werden. Danach Modell C.

Wichtig: Ein automatischer Wechsel von einem lokalen Modell auf einen
Cloud-Anbieter darf nicht still stattfinden, weil dadurch E-Mail-Inhalte
an einen externen Dienst übertragen würden.

Ein solcher Cloud-Fallback muss vom Admin ausdrücklich erlaubt sein.

### 39.8 Datenschutz und Secrets

Gerade E-Mail-Kommunikation kann Namen, E-Mail-Adressen,
Buchungsinformationen und andere personenbezogene Inhalte enthalten.

Daher:

```text
lokale KI:  Daten verlassen das eigene System nicht
Cloud-KI:   vor Verarbeitung klare Kennzeichnung
```

Es sollen nur die für die Planung notwendigen Daten an das Modell
geschickt werden.

**Verbindliche Korrektur/Präzisierung gegenüber einer früheren
Gesprächsformulierung:** API-Keys werden **niemals fest in die App
eingebaut** (kein hartkodierter Schlüssel im Quellcode/Binary) — eine
verteilte `.app` lässt sich extrahieren, ein eingebetteter Schlüssel wäre
damit kompromittiert. Für Ollama ohne Auth ist lokal ohnehin kein
Schlüssel nötig. Benötigte Provider-Credentials (z. B. ein OpenAI-Key)
gehören ausschließlich in den macOS Keychain, vom Admin selbst dort
eingetragen — nie im Quellcode, nie in einer mit der App ausgelieferten
Konfigurationsdatei.

KI-API-Schlüssel gehören außerdem niemals:

```text
ins Git-Repository
in CLAUDE.md
in Supabase site_settings
in Klartext-Konfigurationsdateien
```

### 39.9 KI-Konfiguration pro Mac

Nicht geheime Einstellungen können lokal gespeichert werden:

```text
Provider
Endpoint
Modell
Fallback-Reihenfolge
Timeout
KI aktiviert/deaktiviert
```

Credentials/API-Schlüssel dagegen ausschließlich im Keychain (§39.8).

### 39.10 Langfristiges Ziel

Die KI soll kein Chatbot als Selbstzweck sein.

Ihre Aufgabe lautet: unstrukturierte Planungsinformationen erkennen und
in valide SFT-Drive-Daten übersetzen.

Damit könnte ein großer Teil der organisatorischen Arbeit von:

```text
E-Mail lesen
→ Daten herausschreiben
→ Hotelmaske suchen
→ Werte eintippen
→ Restaurantmaske öffnen
→ Werte eintippen
```

zu:

```text
E-Mail einfügen
→ Analyse
→ Ergebnis kontrollieren
→ Übernehmen
```

reduziert werden.
