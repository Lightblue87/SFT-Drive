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
                AdminShell(services: services).opacity(auth.busy ? 0 : 1).disabled(auth.busy)
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
enum AppSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard", tours = "Touren", restaurants = "Restaurant", hotels = "Hotels", users = "Nutzer", notifications = "Mitteilungen", legal = "Impressum & Datenschutz"
    var id: String { rawValue }
    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"; case .tours: return "steeringwheel"
        case .restaurants: return "fork.knife"; case .hotels: return "bed.double.fill"
        case .users: return "person.2"; case .notifications: return "bell"; case .legal: return "doc.text"
        }
    }
}
struct AdminShell: View {
    let services: AppServices
    @State private var selection: AppSection? = .dashboard
    @EnvironmentObject private var auth: AuthManager
    var body: some View {
        NavigationSplitView {
            List(AppSection.allCases, selection: Binding(get: { selection }, set: { value in if value == selection || DraftRegistry.shared.confirmDiscard() { selection = value } })) { section in Label(section.rawValue, systemImage: section.icon).tag(section) }
                .safeAreaInset(edge: .top) { HStack { Image(systemName: "gauge.with.dots.needle.67percent").foregroundStyle(Color.sftRed); Text("SFT DRIVE").font(.headline) }.padding(20) }
                .safeAreaInset(edge: .bottom) { VStack(alignment: .leading) { SettingsLink { Label("Einstellungen", systemImage: "gearshape") }; Button("Abmelden") { if DraftRegistry.shared.confirmDiscard() { Task { await auth.logout() } } } }.buttonStyle(.plain).padding(20) }
                .navigationSplitViewColumnWidth(min: 210, ideal: 225, max: 270)
        } detail: {
            switch selection ?? .dashboard {
            case .dashboard: DashboardView(services: services)
            case .tours: ToursView(services: services)
            case .restaurants: RestaurantsOverviewView(services: services)
            case .hotels: HotelsOverviewView(services: services)
            case .users: UsersView(repository: services.people)
            case .notifications: NotificationsView(services: services)
            case .legal: LegalSettingsView(repository: services.content)
            }
        }
    }
}
