import SwiftUI

// Navigations-Shell des Redesigns. Parallel zu AdminShell in App/SFTDriveAdminApp.swift,
// damit der bestehende Aufbau unberührt bleibt. Umschalten:
//
//   AdminShell(services: services)          // bisher
//   RedesignShellView(services: services)   // neu

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
        }
    }

    /// ⌘⌥1 … ⌘⌥6
    var shortcut: Character? {
        switch self {
        case .dashboard: return "1"
        case .tours: return "2"
        case .newTour: return "3"
        case .editor: return "4"
        case .hotels: return "5"
        case .meals: return "6"
        default: return nil
        }
    }
}

struct RedesignShellView: View {
    @State private var section: RedesignSection = .dashboard
    @State private var selectedTourID: String
    @AppStorage("redesign.showShortcutBar") private var showShortcutBar = true

    /// In der App: `let services: AppServices` und die View-Models daraus speisen
    /// (siehe RedesignLiveData.swift / LiveRedesignShellView).
    var tours: [TourRow]
    var openAccommodations: Int
    var openMeals: Int
    var lastRefresh: String

    init(
        tours: [TourRow] = SFTRedesignSample.tours,
        openAccommodations: Int = 9,
        openMeals: Int = 14,
        lastRefresh: String = "14:32"
    ) {
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
        [.dashboard, .tours, .newTour, .editor, .hotels, .meals, .offerImport]
    }

    private var secondaryGroup: [RedesignSection] { [.users, .notifications] }

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
            DashboardRedesignView(
                tours: tours,
                openTour: { id in selectedTourID = id; section = .editor },
                openHotels: { id in selectedTourID = id; section = .hotels },
                openMeals: { id in selectedTourID = id; section = .meals },
                createTour: { section = .newTour }
            )
        case .tours:
            ToursRedesignView(
                tours: tours,
                openEditor: { id in selectedTourID = id; section = .editor },
                createTour: { section = .newTour }
            )
        case .newTour:
            TourWizardRedesignView(
                finish: { section = .editor },
                cancel: { section = .tours }
            )
        case .editor:
            TourEditorRedesignView(
                tourID: selectedTourID,
                openHotels: { section = .hotels },
                openMeals: { section = .meals },
                openImport: { section = .offerImport }
            )
        case .hotels:
            HotelMatrixRedesignView(tours: tours, selectedTourID: $selectedTourID)
        case .meals:
            MealPlanningRedesignView(
                tours: tours,
                selectedTourID: $selectedTourID,
                openImport: { section = .offerImport }
            )
        case .offerImport:
            OfferImportRedesignView(
                tours: tours,
                selectedTourID: $selectedTourID,
                finish: { section = .meals }
            )
        case .users, .notifications:
            // Bestehende Views bleiben unverändert eingebunden.
            VStack(spacing: 8) {
                Text(section.rawValue).font(SFT.ui(20, .bold))
                Text("unverändert – bestehende View einsetzen")
                    .font(SFT.ui(12))
                    .foregroundStyle(SFT.inkTertiary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
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

#Preview {
    RedesignShellView()
        .frame(width: 1380, height: 880)
        .preferredColorScheme(.dark)
}
