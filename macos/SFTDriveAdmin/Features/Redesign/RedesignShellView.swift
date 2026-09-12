import SwiftUI

// Navigations-Shell des Redesigns -- die einzige produktive Admin-Oberfläche
// (RootView → LiveRedesignShellView, App/SFTDriveAdminApp.swift). Siehe
// CLAUDE.md §40.12 für den verbindlichen Zielzustand.
//
// Jeder Bereich rendert eine bereits produktiv genutzte, echte Ansicht mit
// echten Repositories -- keine der früheren kosmetischen
// DashboardRedesignView/ToursRedesignView/HotelMatrixRedesignView/
// MealPlanningRedesignView/TourWizardRedesignView/TourEditorRedesignView/
// OfferImportRedesignView-Mockups (samt SFTRedesignSample-Platzhalterdaten)
// sind noch Teil der Navigation; sie wurden entfernt statt als tote,
// parallele Fach-"Welt" im Repository zu verbleiben (§2/§17/§18).

enum RedesignSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case tours = "Touren"
    case planning = "Planung"
    case hotels = "Hotelplanung"
    case meals = "Essensplanung"
    case offerImport = "Import"
    case users = "Nutzer"
    case notifications = "Mitteilungen"
    case legal = "Impressum & Datenschutz"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .tours: return "steeringwheel"
        case .planning: return "checklist"
        case .hotels: return "bed.double"
        case .meals: return "fork.knife"
        case .offerImport: return "tray.and.arrow.down"
        case .users: return "person.2"
        case .notifications: return "bell"
        case .legal: return "doc.text"
        }
    }

    /// ⌘⌥1 … ⌘⌥6 -- exakt die sechs Hauptbereiche der Sidebar (navigationGroup),
    /// keine weiteren Ziffern versprochen als tatsächlich belegt sind.
    var shortcut: Character? {
        switch self {
        case .dashboard: return "1"
        case .tours: return "2"
        case .planning: return "3"
        case .hotels: return "4"
        case .meals: return "5"
        case .offerImport: return "6"
        default: return nil
        }
    }
}

struct RedesignShellView: View {
    let services: AppServices
    @ObservedObject var dashboard: DashboardModel
    @EnvironmentObject private var auth: AuthManager
    @State private var section: RedesignSection = .dashboard
    @AppStorage("redesign.showShortcutBar") private var showShortcutBar = true

    private var lastRefreshText: String {
        guard let date = dashboard.refreshedAt else { return "noch nicht" }
        return date.formatted(date: .omitted, time: .shortened)
    }

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Divider().overlay(SFT.border)
            VStack(spacing: 0) {
                detail
                if showShortcutBar { shortcutBar }
            }
            .background(SFT.canvas)
        }
        .frame(minWidth: 1100, minHeight: 720)
        .background(SFT.canvas)
        .foregroundStyle(SFT.ink)
        .tint(SFT.red)
        // Ein Admin bestätigt/lehnt Registrierungen, checkt ein, erinnert an
        // Übernachtungen usw. auf anderen Bildschirmen als dem Dashboard --
        // ohne aktive Invalidierung blieben dessen Kennzahlen und die
        // Sidebar-Badges (Hotels/Essen) danach veraltet stehen. Statt jede
        // mutierende Aktion app-weit an DashboardModel zu koppeln (hohe
        // Kopplung, hohes Risiko ohne lokalen Compiler), wird beim Wechsel
        // auf einen zähler-relevanten Bereich neu geladen -- deckt den
        // häufigsten Fall (zwischen Bereichen wechseln) ab, ohne
        // DashboardModel durch alle Editoren durchzureichen.
        .onChange(of: section) { _, new in
            guard new == .dashboard || new == .hotels || new == .meals else { return }
            Task { await dashboard.load() }
        }
    }

    // MARK: Sidebar

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Image("AppIcon")
                    .resizable()
                    .frame(width: 28, height: 28)
                    .clipShape(RoundedRectangle(cornerRadius: 7))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 1) {
                    Text("SFT DRIVE").font(SFT.ui(13, .bold)).tracking(0.8)
                    Text("ADMINISTRATION")
                        .font(SFT.mono(9))
                        .tracking(1.3)
                        .foregroundStyle(SFT.inkTertiary)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 20)
            .padding(.bottom, 16)

            VStack(spacing: 2) {
                ForEach(navigationGroup, id: \.self) { item in
                    navigationRow(item)
                }
                Divider().overlay(SFT.border).padding(.vertical, 10)
                ForEach(secondaryGroup, id: \.self) { item in
                    navigationRow(item)
                }
            }
            .padding(.horizontal, 10)

            Spacer(minLength: 12)

            VStack(alignment: .leading, spacing: 8) {
                Text("zuletzt \(lastRefreshText) aktualisiert")
                    .font(SFT.mono(11))
                    .foregroundStyle(SFT.inkTertiary)
                SettingsLink {
                    Text("Einstellungen").font(SFT.ui(12, .medium)).foregroundStyle(SFT.inkTertiary)
                }
                .buttonStyle(.plain)
                Toggle("Shortcut-Leiste", isOn: $showShortcutBar)
                    .font(SFT.ui(11))
                    .foregroundStyle(SFT.inkTertiary)
                    .toggleStyle(.switch)
                    .controlSize(.mini)
                Button {
                    if DraftRegistry.shared.confirmDiscard() { Task { await auth.logout() } }
                } label: {
                    Text("Abmelden").font(SFT.ui(12, .medium)).foregroundStyle(SFT.redInk)
                }
                .buttonStyle(.plain)
                .keyboardShortcut("l", modifiers: [.command, .shift])
            }
            .padding(18)
            .overlay(alignment: .top) { Divider().overlay(SFT.border) }
        }
        .frame(width: 216)
        .background(SFT.chrome)
    }

    private var navigationGroup: [RedesignSection] {
        [.dashboard, .tours, .planning, .hotels, .meals, .offerImport]
    }

    private var secondaryGroup: [RedesignSection] { [.users, .notifications, .legal] }

    private func navigationRow(_ item: RedesignSection) -> some View {
        let isActive = section == item
        return Button {
            // Ungespeicherte Entwürfe weiterhin schützen.
            if DraftRegistry.shared.confirmDiscard() { section = item }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: item.icon)
                    .font(.system(size: 12))
                    .frame(width: 14)
                    .foregroundStyle(isActive ? SFT.ink : SFT.inkTertiary)
                Text(item.rawValue)
                    .font(SFT.ui(13, isActive ? .semibold : .medium))
                    .foregroundStyle(isActive ? SFT.ink : SFT.inkSecondary)
                Spacer(minLength: 4)
                if let counter = counter(for: item) {
                    Text(counter.text)
                        .font(SFT.mono(10, .medium))
                        .foregroundStyle(counter.needsAction ? SFT.amber : SFT.inkTertiary)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isActive ? SFT.red.opacity(0.16) : .clear,
                in: RoundedRectangle(cornerRadius: 7)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .strokeBorder(isActive ? SFT.red.opacity(0.45) : .clear)
            )
            .overlay(alignment: .leading) {
                if isActive {
                    UnevenRoundedRectangle(
                        topLeadingRadius: 0, bottomLeadingRadius: 0,
                        bottomTrailingRadius: 3, topTrailingRadius: 3
                    )
                    .fill(SFT.red)
                    .frame(width: 3, height: 16)
                    .offset(x: -10)
                }
            }
        }
        .buttonStyle(.plain)
        .modifier(OptionalShortcut(key: item.shortcut))
    }

    // Badges = Anzahl offener Aufgaben, dieselbe Semantik und Formel wie im
    // Dashboard selbst (DashboardMetric.count in DashboardView.swift) -- eine
    // gemeinsame DashboardModel-Instanz statt einer zweiten, eigenen Berechnung
    // (§6/§7 Redesign-Zielzustand).
    private func counter(for item: RedesignSection) -> (text: String, needsAction: Bool)? {
        switch item {
        case .tours: return ("\(dashboard.tours.count)", false)
        case .hotels:
            let open = dashboard.total(.accommodation)
            return open > 0 ? ("\(open)", true) : nil
        case .meals:
            let open = dashboard.total(.meals)
            return open > 0 ? ("\(open)", true) : nil
        default: return nil
        }
    }

    // MARK: Detail

    @ViewBuilder private var detail: some View {
        switch section {
        case .dashboard:
            DashboardView(services: services, model: dashboard)
        case .tours:
            // ToursView regelt Anlegen/Bearbeiten/Duplizieren bereits selbst
            // (eigener "Neue Tour"-Button, eigenes Bearbeiten-Sheet mit dem
            // vollständigen, bestehenden achtstufigen Tour-Workspace).
            ToursView(services: services)
        case .planning:
            // Tourübergreifende Kontrollansicht: Teilnehmermatrix, Hotels,
            // Restaurants. "Teilnahme & To-dos" ist bewusst kein Tab hier --
            // das ist der eigenständige Dashboard-Bereich (kein doppeltes
            // DashboardModel).
            GlobalPlanningView(services: services)
        case .hotels:
            HotelsOverviewView(services: services)
        case .meals:
            RestaurantsOverviewView(services: services)
        case .offerImport:
            // Echte, bereits bestehende KI-Import-Funktion (ExtractionReviewView),
            // hier tourübergreifend über einen Tour-Wähler zugänglich gemacht
            // (ImportOverviewView, Features/Overview/TourResourceOverviews.swift).
            ImportOverviewView(services: services)
        case .users:
            UsersView(repository: services.people)
        case .notifications:
            NotificationsView(services: services)
        case .legal:
            LegalSettingsView(repository: services.content)
        }
    }

    private var shortcutBar: some View {
        HStack(spacing: 18) {
            Group {
                Text("⌘⌥1…6 Bereiche")
                Text("⇧⌘L abmelden")
            }
            Spacer()
        }
        .font(SFT.mono(10))
        .foregroundStyle(SFT.inkTertiary)
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
        .background(SFT.railDeep)
        .overlay(alignment: .top) { Divider().overlay(SFT.border) }
    }
}

private struct OptionalShortcut: ViewModifier {
    let key: Character?
    func body(content: Content) -> some View {
        if let key {
            content.keyboardShortcut(KeyEquivalent(key), modifiers: [.command, .option])
        } else {
            content
        }
    }
}
