# SFT Drive Admin

Die einzige Produktspezifikation bleibt die CLAUDE.md in ../CLAUDE.md im selben Repository, Abschnitte 38–40 und die dort referenzierten Produktregeln. Vor fachlichen Änderungen diese lesen. Keine konkurrierende Spezifikation hier anlegen.

macOS 15+, native SwiftUI, MVVM, Supabase Swift. Views verwenden Repositories, keine direkten Datenbankzugriffe. Sessions und Provider-Credentials ausschließlich im Keychain. Keine Service-Role-Schlüssel. Sicherheitskritische Änderungen über bestehende RPCs. Backend-Migrationen gehören in das PWA-Repository.

Build und Tests: scripts/check.sh auf einem Mac mit Xcode 16.4+. Manuelle Verteilung ohne Developer-ID/Notarisierung. Kein kostenpflichtiger Dienst ohne Zustimmung.
