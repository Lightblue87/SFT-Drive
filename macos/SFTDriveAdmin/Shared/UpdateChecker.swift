import Foundation

/// Leichte, reine Benachrichtigungs-Prüfung auf eine neuere Version -- kein
/// Sparkle/Auto-Install: die App ist ad-hoc signiert, nicht mit Developer-ID
/// signiert und nicht notarisiert (§40.9). Ein automatischer Ersatz des
/// laufenden Bundles wäre ohne signierte Appcast-Infrastruktur (eigenes
/// EdDSA-Schlüsselpaar, Schlüsselverwaltung) ein Sicherheitsrisiko und eine
/// unnötige Komplexität für ein kleines Community-Projekt (§32).
///
/// Stattdessen: beim Start einmal die neueste GitHub-Release-Version
/// abfragen (öffentliche, unauthentifizierte GitHub-API, kein zusätzliches
/// Secret, kein kostenpflichtiger Dienst, §4) und bei einer neueren Version
/// einen dismissbaren Hinweis mit Link auf die Release-Seite anzeigen.
/// Download und Installation bleiben vollständig manuell (§40.9
/// "ausschließlich manuelle Weitergabe") -- diese Prüfung lädt nichts
/// herunter und ersetzt nichts, sie informiert nur.
@MainActor final class UpdateChecker: ObservableObject {
    struct Available: Equatable { let version: String; let url: URL }
    @Published private(set) var available: Available?

    private let repo = "Lightblue87/SFT-Drive"
    private let tagPrefix = "macos-admin-v"
    private let lastCheckKey = "updateChecker.lastCheckedAt"
    private let dismissedKey = "updateChecker.dismissedVersion"
    private let checkInterval: TimeInterval = 24 * 60 * 60

    /// Höchstens einmal pro Tag prüfen -- kein Grund, bei jedem App-Start
    /// oder jeder Rückkehr aus dem Hintergrund erneut GitHub zu befragen.
    func checkIfDue() async {
        let defaults = UserDefaults.standard
        if let last = defaults.object(forKey: lastCheckKey) as? Date,
            Date().timeIntervalSince(last) < checkInterval
        { return }
        await check()
    }

    func check() async {
        let defaults = UserDefaults.standard
        defaults.set(Date(), forKey: lastCheckKey)
        guard let url = URL(string: "https://api.github.com/repos/\(repo)/releases/latest") else { return }
        var request = URLRequest(url: url)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }
            let payload = try JSONDecoder().decode(ReleasePayload.self, from: data)
            // Das Repository enthält auch PWA-Releases (falls später welche
            // angelegt werden) -- nur Tags mit dem Mac-App-Präfix zählen hier.
            guard payload.tag_name.hasPrefix(tagPrefix) else { return }
            let remoteVersion = String(payload.tag_name.dropFirst(tagPrefix.count))
            let currentVersion =
                (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "0"
            guard Self.isNewer(remoteVersion, than: currentVersion) else { return }
            // Einmal abgelehnte Version nicht bei jedem Start erneut anzeigen --
            // erst eine noch neuere Version löst den Hinweis wieder aus.
            guard remoteVersion != defaults.string(forKey: dismissedKey) else { return }
            guard let releaseURL = URL(string: payload.html_url) else { return }
            available = Available(version: remoteVersion, url: releaseURL)
        } catch {
            // Fail-soft: eine Update-Prüfung ist nie Voraussetzung für die
            // App-Nutzung (analog §27.16 für Web Push in der PWA).
        }
    }

    func dismiss() {
        guard let available else { return }
        UserDefaults.standard.set(available.version, forKey: dismissedKey)
        self.available = nil
    }

    private struct ReleasePayload: Decodable {
        let tag_name: String
        let html_url: String
    }

    /// Einfacher komponentenweiser Vergleich (Major.Minor.Patch, beliebig
    /// viele Stellen). Reicht für dieses Projekt vollständig aus -- keine
    /// Abhängigkeit für vollständige SemVer-Prerelease-/Build-Metadaten
    /// nötig, solange Release-Tags schlicht `macos-admin-vX.Y.Z` lauten.
    /// `nonisolated`, weil die Funktion rein ist (kein Zugriff auf
    /// Instanz-/Actor-State) und synchron aus Tests aufrufbar bleiben soll --
    /// ohne das wäre sie wegen der @MainActor-Klasse implizit isoliert und
    /// nur noch asynchron aufrufbar (Swift 6 Strict Concurrency).
    nonisolated static func isNewer(_ remote: String, than current: String) -> Bool {
        func parts(_ s: String) -> [Int] { s.split(separator: ".").map { Int($0.filter(\.isNumber)) ?? 0 } }
        let remoteParts = parts(remote)
        let currentParts = parts(current)
        for index in 0..<max(remoteParts.count, currentParts.count) {
            let remoteValue = index < remoteParts.count ? remoteParts[index] : 0
            let currentValue = index < currentParts.count ? currentParts[index] : 0
            if remoteValue != currentValue { return remoteValue > currentValue }
        }
        return false
    }
}
