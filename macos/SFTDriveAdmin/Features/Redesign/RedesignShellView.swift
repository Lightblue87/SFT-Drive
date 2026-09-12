import SwiftUI

// Navigations-Shell des Redesigns, jetzt aktiv in RootView (App/SFTDriveAdminApp.swift)
// über LiveRedesignShellView (RedesignLiveData.swift). AdminShell bleibt im Code, wird
// aber nicht mehr verwendet.
//
// Nur "Import" ist noch ein reines Mockup (kein Speicherpfad, siehe eigene
// Kommentare in OfferImportRedesignView.swift) -- alle anderen Bereiche zeigen
// die bereits produktiv genutzten, vollständig funktionsfähigen bestehenden
// Views (ToursView, HotelsOverviewView, RestaurantsOverviewView, DashboardView,
// UsersView, NotificationsView, LegalSettingsView), nur unter der neuen
// Sidebar/Optik. Die kosmetischen ToursRedesignView/HotelMatrixRedesignView/
// MealPlanningRedesignView/TourWizardRedesignView/TourEditorRedesignView
// bleiben als Entwürfe im Repository (weiterhin einzeln per Preview
// betrachtbar), sind aber aktuell nicht mehr in die Navigation eingehängt.

enum RedesignSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case tours = "Touren"
    case newTour = "Neue Tour"
    case editor = "Tour-Editor"
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
        case .newTour: return "plus.rectangle.on.rectangle"
        case .editor: return "slider.horizontal.3"
        case .hotels: return "bed.double"
        case .meals: return "fork.knife"
        case .offerImport: return "tray.and.arrow.down"
        case .users: return "person.2"
        case .notifications: return "bell"
        case .legal: return "doc.text"
        }
    }

    /// ⌘⌥1 … ⌘⌥5 -- nur für die tatsächlich in der Sidebar sichtbaren Einträge
    /// (.newTour/.editor werden nur noch intern als Navigationsziel verwendet,
    /// siehe detail-Switch weiter unten).
    var shortcut: Character? {
        switch self {
        case .dashboard: return "1"
        case .tours: return "2"
        case .hotels: return "3"
        case .meals: return "4"
        case .offerImport: return "5"
        default: return nil
        }
    }
}

struct RedesignShellView: View {
    let services: AppServices
    @State private var section: RedesignSection = .dashboard
    @State private var selectedTourID: String
    @AppStorage("redesign.showShortcutBar") private var showShortcutBar = true

    /// Nur noch für die Sidebar-Deko (Zähler-Badges, "zuletzt aktualisiert")
    /// und den Tour-Picker im noch-kosmetischen Import-Mockup -- die echten
    /// Bildschirme laden ihre Daten selbst über `services`.
    var tours: [TourRow]
    var openAccommodations: Int
    var openMeals: Int
    var lastRefresh: String

    init(
        services: AppServices,
        tours: [TourRow] = SFTRedesignSample.tours,
        openAccommodations: Int = 9,
        openMeals: Int = 14,
        lastRefresh: String = "14:32"
    ) {
        self.services = services
        self.tours = tours
        self.openAccommodations = openAccommodations
        self.openMeals = openMeals
        self.lastRefresh = lastRefresh
        _selectedTourID = State(initialValue: tours.first?.id ?? "")
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
        // Live-Daten laden asynchron nach: springt auf die erste echte Tour,
        // sobald sie eintrifft, statt dauerhaft auf der Platzhalter-ID stehen
        // zu bleiben (die Ansicht selbst bleibt über section/selectedTourID
        // bestehen, @State wird beim erneuten Rendern nicht neu initialisiert).
        .onChange(of: tours.map(\.id)) { _, ids in
            if !ids.contains(selectedTourID) { selectedTourID = ids.first ?? "" }
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
                Text("zuletzt \(lastRefresh) aktualisiert")
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
            }
            .padding(18)
            .overlay(alignment: .top) { Divider().overlay(SFT.border) }
        }
        .frame(width: 216)
        .background(SFT.chrome)
    }

    private var navigationGroup: [RedesignSection] {
        [.dashboard, .tours, .hotels, .meals, .offerImport]
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

    private func counter(for item: RedesignSection) -> (text: String, needsAction: Bool)? {
        switch item {
        case .tours: return ("\(tours.count)", false)
        case .hotels: return openAccommodations > 0 ? ("\(openAccommodations)", true) : nil
        case .meals: return openMeals > 0 ? ("\(openMeals)", true) : nil
        default: return nil
        }
    }

    // MARK: Detail

    @ViewBuilder private var detail: some View {
        switch section {
        case .dashboard:
            DashboardView(services: services)
        case .tours, .newTour, .editor:
            // Anlegen/Bearbeiten/Duplizieren regelt ToursView bereits selbst
            // (eigener "Neue Tour"-Button, eigenes Bearbeiten-Sheet) -- ein
            // gezielter Sprung von außen direkt in den Editor einer bestimmten
            // Tour (wie es das Mockup mit .editor vorsah) ist damit (noch)
            // nicht möglich; der Admin öffnet die Tour stattdessen hier aus
            // der Liste.
            ToursView(services: services)
        case .hotels:
            HotelsOverviewView(services: services)
        case .meals:
            RestaurantsOverviewView(services: services)
        case .offerImport:
            // Einziger Bereich ohne echten Speicherpfad (siehe Kommentare in
            // OfferImportRedesignView.swift) -- vorher gab es dafür noch gar
            // keine Ansicht, also kein Funktionsverlust gegenüber vorher.
            OfferImportRedesignView(
                tours: tours,
                selectedTourID: $selectedTourID,
                finish: { section = .meals }
            )
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
                Text("⌘N neue Tour")
                Text("⌘D duplizieren")
                Text("⌘F suchen")
                Text("⌘S sichern")
                Text("⇧⌘E erinnern")
                Text("⌘⌥1…6 Bereiche")
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

// Kein #Preview mehr hier: RedesignShellView braucht jetzt echte AppServices
// (siehe init oben) statt reiner Anzeigemodelle. Die einzelnen kosmetischen
// Redesign-Views (DashboardRedesignView, ToursRedesignView, ...) behalten
// ihre eigenen #Preview-Blöcke mit SFTRedesignSample-Platzhalterdaten.
