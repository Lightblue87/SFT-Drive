import SwiftUI
import AppKit

@main struct SFTDriveAdminApp: App {
    @NSApplicationDelegateAdaptor(SFTAppDelegate.self) private var appDelegate
    @StateObject private var auth = AuthManager()
    var body: some Scene {
        WindowGroup("SFT Drive Admin") {
            RootView().environmentObject(auth).tint(.sftRed).preferredColorScheme(.dark)
                .frame(minWidth: 1100, minHeight: 720).background(WindowCloseGuard())
        }
        .defaultSize(width: 1380, height: 880)
        .commands {
            CommandGroup(replacing: .newItem) { }
            CommandGroup(after: .appSettings) {
                Button("Abmelden") { if DraftRegistry.shared.confirmDiscard() { Task { await auth.logout() } } }.keyboardShortcut("l", modifiers: [.command, .shift])
            }
        }
        Settings { TabView { ConnectionView().tabItem { Label("Verbindung", systemImage: "network") }; AISettingsView().tabItem { Label("KI", systemImage: "sparkles") } }.environmentObject(auth).frame(width: 620, height: 620) }
    }
}
struct RootView: View {
    @EnvironmentObject private var auth: AuthManager
    @Environment(\.scenePhase) private var scenePhase
    @State private var initialized = false
    var body: some View {
        Group {
            if auth.authorized, let services = auth.services {
                LiveRedesignShellView(services: services).opacity(auth.busy ? 0 : 1).disabled(auth.busy)
                    .overlay { if auth.busy { ProgressView("Zugriffsberechtigung prüfen …") } }
            }
            else if auth.busy { ProgressView("Zugriffsberechtigung prüfen …") }
            else { LoginView() }
        }
        .task { guard !initialized else { return }; initialized = true; await auth.configure(.load()) }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active && initialized && auth.authorized { Task { await auth.restore() } }
        }
    }
}
struct LoginView: View {
    @EnvironmentObject private var auth: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var showConnection = false
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "gauge.with.dots.needle.67percent").font(.system(size: 70)).foregroundStyle(Color.sftRed).accessibilityHidden(true)
            Text("SFT Drive").font(.system(size: 36, weight: .bold, design: .rounded))
            Text("ADMINISTRATION · SPORTFAHRER TREFF").font(.system(.caption, design: .monospaced)).tracking(2).foregroundStyle(.secondary)
            TextField("E-Mail", text: $email).textContentType(.username)
            SecureField("Passwort", text: $password).textContentType(.password).onSubmit { login() }
            ErrorBanner(message: auth.error)
            Button("Anmelden", action: login).buttonStyle(.borderedProminent).controlSize(.large)
                .disabled(email.isEmpty || password.isEmpty || auth.services == nil || auth.busy)
            Button("Verbindung einrichten") { showConnection = true }
            Text("Zugang ausschließlich mit einem bestehenden Administratorkonto.").font(.caption).foregroundStyle(.secondary)
        }.textFieldStyle(.roundedBorder).frame(width: 410).padding(40)
        .sheet(isPresented: $showConnection) { VStack { ConnectionView(); Button("Schließen") { showConnection = false }.padding() } }
    }
    private func login() { let secret = password; password = ""; Task { await auth.login(email: email, password: secret) } }
}
// AdminShell/AppSection (die alte NavigationSplitView-Hauptoberfläche) wurden
// entfernt: RedesignShellView (Features/Redesign/) ist jetzt die einzige
// produktive Admin-Oberfläche, siehe CLAUDE.md §40.12. Ihre fachlichen
// Bildschirme sind dieselben wiederverwendeten Views wie zuvor hier
// (DashboardView, ToursView, GlobalPlanningView, UsersView,
// NotificationsView, LegalSettingsView) -- keine doppelte Fachlogik, nur eine
// einzige aktive Navigationshülle.
