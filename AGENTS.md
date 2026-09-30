# SFT Drive — Arbeitsanweisungen für Codex

## Einstieg und maßgebliche Quellen

- `CLAUDE.md` bleibt die zentrale Produktspezifikation für PWA und Mac-App. Der Dateiname bindet die Regeln nicht an ein bestimmtes Entwicklungsmodell. Vor Änderungen die betroffenen Abschnitte und den tatsächlichen Code lesen; für `macos/` zusätzlich `macos/AGENTS.md` beachten.
- Explizite aktuelle Nutzerentscheidungen berücksichtigen. Historische Planung, implementierten Stand, ausgeführte Tests und produktive Bereitstellung unterscheiden. Widersprüche am Code und an dokumentierten Entscheidungen prüfen; nur fachlich entscheidende Unklarheiten zurückfragen.
- Vor Arbeit `git status` und Basisbranch prüfen. Bestehende Nutzeränderungen erhalten. Beim Abgleich am 13.09.2026 war `main` dem Standardbranch `claude/new-session-7ewrsz` um 53 Commits voraus; dies ist eine Momentaufnahme, vor neuer Arbeit erneut prüfen. Ohne andere Vorgabe vom aktuellen `main` in einem eigenen Arbeitszweig ausgehen.

## Projektkarte

- `src/`: React-/TypeScript-PWA mit Vite, Tailwind, React Router und Supabase; `src/features/`, `src/pages/`, `src/types/` vor fachlichen Änderungen prüfen.
- `supabase/migrations/` und `supabase/functions/`: gemeinsames Backend, RLS, RPCs und Edge Functions für beide Clients.
- `macos/`: native SwiftUI-Admin-App, macOS 15+, MVVM und Supabase Swift. Views verwenden die vorhandenen Repositories.
- GPT-6 Astra dient als Entwicklungsmodell in Codex. Seine Nutzung ändert weder die KI-Anbieter der App noch deren API-Konfiguration. Modell und Denkaufwand werden in Codex gewählt; keine OpenAI-Laufzeitabhängigkeit allein für die Entwicklung hinzufügen.

## Fachliche und technische Grenzen

- Tourkapazität wird in Fahrzeugen gemessen. Anmeldung, Freigabe und Wartelisten-Nachrücken müssen auch bei parallelen Zugriffen die Kapazität serverseitig einhalten.
- Sichtbarkeit gemäß `CLAUDE.md` bewahren: private Tourdaten nur für berechtigte Teilnehmer; Kennzeichen und andere geschützte Teilnehmerdaten nicht öffentlich ausgeben.
- Bestehende Auth-, RLS- und RPC-Prüfungen wiederverwenden. Keine Service-Role-Schlüssel im Client; Mac-Sessions und Provider-Credentials ausschließlich im Keychain.
- KI-Ergebnisse bleiben geprüfte Entwürfe und erhalten keinen eigenen Datenbank-Schreibpfad. Die bestehende Ollama-Konfiguration und Cloud-Freigaben nur bei entsprechendem Auftrag verändern.
- Keine kostenpflichtigen Dienste oder Abhängigkeiten ohne bestehende Autorisierung einführen. Migrationen versioniert unter `supabase/migrations/` ablegen; für Tests synthetische Daten verwenden.

## Durchführung und Prüfung

- Beauftragte Änderungen vollständig und in kleinen nachvollziehbaren Schritten erledigen. Routineentscheidungen selbst treffen; notwendige Rückfragen erst nach den davon unabhängigen Arbeiten stellen. Fachfremde Umbauten vermeiden.
- Nur Prüfungen ausführen, die den betroffenen Bereich sinnvoll absichern. Für reine Dokumentationsänderungen genügen Diff-, Pfad- und Konsistenzprüfung; keine App-Builds oder API-Aufrufe dafür starten.
- PWA-Code: nach Installation per `npm ci` im Repository-Hauptverzeichnis `npm run lint` und `npm run build`. Weitere Tests passend zur geänderten Funktion; derzeit kein Root-`npm test` vorhanden.
- Mac-Code: auf einem Mac mit Xcode 16.4+ im Ordner `macos/` `bash scripts/check.sh` (Swift-Tests und nativer Debug-Build). Unter Windows keine erfolgreiche Mac-Prüfung behaupten.
- Backend-Verträge/RLS: im Ordner `macos/tests/backend/` wie im Workflow `npm install --ignore-scripts --no-audit --no-fund`, danach `npm test`. Zusätzliche Fälle für geänderte Berechtigungen, Konflikte und Transaktionen ergänzen; dies ersetzt keinen vollständigen Produktionstest.
- Release nur bei entsprechendem Auftrag: im Ordner `macos/` `bash scripts/release.sh`. Manuelle ZIP-/DMG-Verteilung, keine Developer-ID/Notarisierung voraussetzen.
- Nach bestandenen relevanten Prüfungen nur bei neuen Änderungen oder offenen Fehlern weitere Läufe starten. Nicht ausgeführte Prüfungen und vorhandene Fehler ausdrücklich nennen.

## Übergabe und Veröffentlichung

- Ergebnis knapp mit Änderung, Zweck, Prüfergebnis und verbleibenden Einschränkungen berichten. Bei UI-Änderungen den betroffenen Nutzerablauf prüfen.
- Vor Merge, Produktionsdeployment oder produktiver Datenbankmigration die vorhandene Autorisierung prüfen. Ein Code-Commit beweist keine eingespielte SQL-Migration; ein Build beweist keine Geräteabnahme. GitHub/Cloudflare-Deploymentfolgen vor Veröffentlichung berücksichtigen.
- `CLAUDE.md` bei geänderten Produktentscheidungen gezielt fortschreiben; keine zweite konkurrierende Produktspezifikation anlegen.
