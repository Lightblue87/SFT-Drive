import Foundation
import Supabase

struct ConnectionConfiguration: Codable {
    var url = "https://spbbypvgjqjkpuskigau.supabase.co"
    var publishableKey = ""
    static func load() -> Self {
        guard let data = UserDefaults.standard.data(forKey: "connection"),
              let value = try? JSONDecoder().decode(Self.self, from: data) else { return Self() }
        return value
    }
    func validate() throws -> URL {
        guard let parsed = URL(string: url), parsed.scheme == "https", parsed.host != nil,
              parsed.user == nil, parsed.password == nil,
              !publishableKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw AppError("HTTPS-Supabase-URL und öffentlichen Publishable-/Anon-Key eintragen.")
        }
        guard !publishableKey.hasPrefix("sb_secret_") else { throw AppError("Secret-Keys dürfen nicht in die App.") }
        if !publishableKey.hasPrefix("sb_publishable_") {
            let parts = publishableKey.split(separator: ".")
            guard parts.count == 3 else { throw AppError("Öffentlichen Publishable- oder Anon-Key verwenden.") }
            var base64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
            base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
            guard let data = Data(base64Encoded: base64), let payload = try? JSONDecoder().decode(Payload.self, from: data),
                  payload.text("role") == "anon" else { throw AppError("Nur Anon-Keys sind zulässig, keine privilegierten JWTs.") }
        }
        return parsed
    }
    func save() throws { _ = try validate(); UserDefaults.standard.set(try JSONEncoder().encode(self), forKey: "connection") }
}

@MainActor final class AppServices {
    let client: SupabaseClient
    let tours: ToursRepository
    let people: PeopleRepository
    let planning: PlanningRepository
    let content: ContentRepository
    init(configuration: ConnectionConfiguration) throws {
        let url = try configuration.validate()
        client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.publishableKey,
            options: .init(auth: .init(storage: KeychainStore(service: "de.sportfahrertreff.sft-drive-admin.auth.\(url.host!)"))))
        tours = ToursRepository(client); people = PeopleRepository(client)
        planning = PlanningRepository(client); content = ContentRepository(client)
    }
}
