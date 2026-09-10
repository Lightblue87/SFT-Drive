import Foundation
import Supabase

@MainActor final class AuthManager: ObservableObject {
    @Published private(set) var authorized = false
    @Published private(set) var busy = false
    @Published var error: String?
    @Published private(set) var services: AppServices?
    private var listener: Task<Void, Never>?
    private var verifying = false
    func configure(_ configuration: ConnectionConfiguration) async {
        authorized = false; listener?.cancel(); error = nil
        do {
            services = try AppServices(configuration: configuration)
            guard let services else { return }
            listener = Task { [weak self] in
                for await (event, _) in services.client.auth.authStateChanges {
                    if Task.isCancelled { return }
                    if event == .signedOut { self?.authorized = false }
                    if event == .tokenRefreshed, let self, !self.busy { await self.restore() }
                }
            }
            await restore()
        } catch { services = nil; self.error = error.localizedDescription }
    }
    func restore() async {
        guard let services, !verifying else { return }
        verifying = true; busy = true
        defer { busy = false; verifying = false }
        do {
            _ = try await services.client.auth.session
            try await verify(services)
            authorized = true
        } catch {
            authorized = false
            // A missing saved session is expected at first launch. Other failures stay locked.
            if !(error is AuthError) { self.error = error.localizedDescription }
        }
    }
    func login(email: String, password: String) async {
        guard let services, !busy else { return }
        busy = true; error = nil; authorized = false
        defer { busy = false }
        do {
            try await services.client.auth.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            try await verify(services)
            authorized = true
        } catch { self.error = error.localizedDescription }
    }
    private func verify(_ services: AppServices) async throws {
        let allowed: Bool = try await services.client.rpc("is_admin").execute().value
        guard allowed else {
            try await services.client.auth.signOut(scope: .local)
            throw AppError("Kein Administrator-Zugriff. Bitte ein freigeschaltetes Administratorkonto verwenden.")
        }
    }
    func logout() async {
        authorized = false
        do { try await services?.client.auth.signOut(scope: .local) }
        catch { self.error = "Lokal abgemeldet. Die Server-Abmeldung konnte nicht bestätigt werden." }
    }
}
