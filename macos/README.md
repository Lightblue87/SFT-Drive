# SFT Drive Admin für macOS

Native SwiftUI-Admin-App im Ordner `macos/` des bestehenden Repositorys.
Die zentrale Produktspezifikation bleibt [CLAUDE.md, §38–40](../CLAUDE.md).
Mindestversion: **macOS 15**. Entwicklung: **Xcode 16.4 oder neuer** (Swift 6.1).

## Öffnen und bauen

1. `macos/SFTDriveAdmin.xcodeproj` in Xcode öffnen.
2. Schema `SFTDriveAdmin`, Ziel `My Mac` auswählen. Xcode lädt die festgelegte Supabase-Swift-Version 2.55.2.
3. Mit Run starten. Kein Apple-Developer-Konto erforderlich.
4. „Verbindung einrichten“: Supabase-Projekt-URL und **öffentlichen** Publishable-/Anon-Key der PWA eingeben. Mit bestehendem Admin-Konto anmelden.

Tests und Debug-Build: `bash scripts/check.sh` im Ordner `macos/`.
Manuelles Release: `bash scripts/release.sh`. Universal-ZIP und -DMG für Apple Silicon und Intel, Versionshinweis und SHA-256-Prüfsummen (beide Dateien) liegen in `macos/build/distribution/`.

## Backend bereitstellen

Vor Verwendung der neuen Schreibmasken die additiven Migrationen aus `supabase/migrations/` in Dateiname-Reihenfolge einspielen:

- `20260910010000_admin_planning_summary.sql`
- `20260910020000_atomic_admin_tour_save.sql`
- `20260910030000_atomic_admin_resources.sql`
- `20260910040000_conflict_safe_meal_orders.sql`
- `20260910050000_atomic_restaurant_import.sql`

Diese Dateien werden nicht von der Mac-App ausgeführt. Code im Repository bedeutet nicht, dass das produktive Supabase-Projekt bereits migriert wurde. Ohne diese RPCs bleiben bestehende Lesefunktionen nutzbar, neue Masken melden beim Speichern einen Fehler. Entwicklung und Tests erfolgen mit synthetischen Daten; keine Produktionsdaten als Testfixtures verwenden.

Die App verwendet die vorhandenen Edge Functions `admin-manage-user` und `send-push`. Fehlgeschlagener zusätzlicher Push wird getrennt von einer erfolgreich erstellten In-App-Mitteilung angezeigt.

## Ollama

KI und Fallback sind zunächst aus. In Einstellungen → KI Endpunkt und installiertes Modell auswählen. Für lokale Inferenz Ollamas Cloud-Funktionen deaktivieren (`OLLAMA_NO_CLOUD=1`, Ollama neu starten). Es werden keine Modelle automatisch installiert. HTTP ist ausschließlich für Loopback erlaubt. Eigene Server erfordern HTTPS und Zugangsschlüssel; dieser wird im Keychain gespeichert.

Vor jeder Analyse werden Empfänger und Text gezeigt. Fehlende Daten bleiben ungeklärt, Quellenbelege werden geprüft. Hotel-/Restaurant-Ergebnisse werden in einen editierbaren Entwurf übernommen; erst dessen Speichern schreibt Daten. Keine Übernachtungsbestätigung durch KI. Cloudanbieter sind für diese erste Version ausdrücklich nicht vorgesehen.

## Manuelle Weitergabe

Nur die ZIP- oder DMG-Datei (beide enthalten dieselbe .app, DMG mit gewohntem In-Applications-Installationsablauf) über einen vertrauenswürdigen privaten Übergabeweg verteilen. Die App ist ad hoc signiert, **nicht** mit Developer-ID signiert und nicht notarisiert. macOS kann die bekannte App beim ersten Öffnen blockieren; falls zulässig gezielt unter Systemeinstellungen → Datenschutz & Sicherheit freigeben. Gatekeeper oder SIP nicht global abschalten.

Bei Updates die bisherige App schließen und ersetzen. Keychain-Zugriff nach Ad-hoc-Build-Wechsel kann erneute Freigabe bzw. erneuten Login erfordern. Vor Verteilung auf einem zweiten Mac ohne Entwicklungsumgebung testen.

## Prüfstatus

Der GitHub-Workflow `macOS Admin` baut und testet auf einem Mac-Runner und erstellt ein herunterladbares Artefakt mit ZIP und DMG. Ein erfolgreicher Build ersetzt nicht den Oberflächen- und Integrationstest mit einer freigegebenen Supabase-Testumgebung: Admin/normaler Nutzer, Rollenentzug, Token-Refresh, Offline-Start, konkurrierende Änderungen und Erstinstallation auf einem zweiten Mac prüfen. Produktionsmigration und tatsächliche manuelle Verteilung erfolgen separat.
