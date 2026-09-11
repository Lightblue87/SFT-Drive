import SwiftUI

enum DashboardMetric: String, Identifiable, CaseIterable {
    case pending, waitlisted
    var id: String { rawValue }
    var title: String {
        switch self {
        case .pending: return "Fahrzeuge bestätigen"
        case .waitlisted: return "Warteliste"
        }
    }
    var symbol: String {
        switch self {
        case .pending: return "person.badge.clock"
        case .waitlisted: return "clock"
        }
    }
    var statuses: Set<String> {
        switch self {
        case .pending: return ["pending"]
        case .waitlisted: return ["waitlisted"]
        }
    }
    func count(_ summary: PlanningSummary?) -> Int {
        guard let summary else { return 0 }
        switch self {
        case .pending: return summary.pending
        case .waitlisted: return summary.waitlisted
        }
    }
}

enum DashboardInfo: String, Identifiable, CaseIterable {
    case tours, next, people, vehicles
    var id: String { rawValue }
    var title: String {
        switch self {
        case .tours: return "Kommende Touren"
        case .next: return "Nächste Tour"
        case .people: return "Teilnehmer"
        case .vehicles: return "Bestätigte Fahrzeuge"
        }
    }
    var symbol: String {
        switch self {
        case .tours: return "calendar"
        case .next: return "arrow.right.circle"
        case .people: return "person.2"
        case .vehicles: return "steeringwheel"
        }
    }
}

@MainActor final class DashboardModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var summaries: [String: PlanningSummary] = [:]
    @Published var users: [AdminUser] = []
    @Published var expandedMetric: DashboardMetric?
    @Published var expandedInfo: DashboardInfo?
    @Published var expandedTours: Set<String> = []
    @Published var registrations: [String: [TourRegistration]] = [:]
    let toursRepository: ToursRepository
    let people: PeopleRepository
    let planning: PlanningRepository
    init(toursRepository: ToursRepository, people: PeopleRepository, planning: PlanningRepository) {
        self.toursRepository = toursRepository; self.people = people; self.planning = planning
    }
    func total(_ metric: DashboardMetric) -> Int { tours.reduce(0) { $0 + metric.count(summaries[$1.id]) } }
    // Klarname ist Admin-Inhalt (§5/§12 "Admin kann ... Klarname sehen").
    func name(_ row: TourRegistration) -> String {
        guard let user = users.first(where: { $0.id == row.user_id }) else { return row.user_id }
        let full = "\(user.first_name) \(user.last_name)".trimmingCharacters(in: .whitespaces)
        return full.isEmpty ? user.username : "\(full) · \(user.username)"
    }
    func load() async {
        await perform {
            tours = try await toursRepository.upcoming()
            users = try await people.users()
            let rows = try await planning.summaries(tours.map(\.id))
            summaries = Dictionary(uniqueKeysWithValues: rows.compactMap { row in row.summary.map { (row.tour_id, $0) } })
            // A failed summary must not silently read as an empty/zero planning
            // state (PR #18 review) -- surface which tours it affects.
            let failed = rows.filter { $0.summary == nil }
            if !failed.isEmpty {
                let titles = failed.compactMap { row in tours.first { $0.id == row.tour_id }?.title ?? row.tour_id }.joined(separator: ", ")
                error = "Planungsdaten konnten nicht geladen werden für: \(titles)."
            }
        }
    }
    func toggle(_ metric: DashboardMetric) { expandedMetric = expandedMetric == metric ? nil : metric; expandedInfo = nil }
    func toggleInfo(_ info: DashboardInfo) {
        expandedInfo = expandedInfo == info ? nil : info
        expandedMetric = nil
        switch expandedInfo {
        case .next: if let id = tours.first?.id { Task { await loadRegistrations(id) } }
        case .people, .vehicles: Task { await loadAllRegistrations() }
        case .tours, nil: break
        }
    }
    // Lädt Registrierungen aller kommenden Touren nach, die noch nicht im Cache
    // sind -- nur beim expliziten Öffnen von "Teilnehmer"/"Bestätigte Fahrzeuge"
    // (Drilldown), nicht beim initialen Dashboard-Laden. Ein Request statt
    // eines Loops je Tour (§4 N+1-Regel).
    func loadAllRegistrations() async {
        let missing = tours.map(\.id).filter { registrations[$0] == nil }
        guard !missing.isEmpty else { return }
        await perform {
            let rows = try await people.registrationsBulk(missing)
            var byTour = Dictionary(grouping: rows, by: \.tour_id)
            for id in missing { registrations[id] = byTour.removeValue(forKey: id) ?? [] }
        }
    }
    func setExpanded(_ tourID: String, _ expanded: Bool) {
        if expanded { expandedTours.insert(tourID); Task { await loadRegistrations(tourID) } }
        else { expandedTours.remove(tourID) }
    }
    func loadRegistrations(_ tourID: String) async {
        guard registrations[tourID] == nil else { return }
        do { registrations[tourID] = try await people.registrations(tourID) }
        catch { self.error = error.localizedDescription }
    }
    func apply(_ row: TourRegistration, action: String) async {
        await perform {
            try await people.change(row.id, action: action)
            registrations[row.tour_id] = try await people.registrations(row.tour_id)
            // Keep the prior summary and surface the failure instead of wiping this
            // tour's counts to nil on a refresh hiccup (Codex review on #18) -- the
            // registration change itself already succeeded above.
            do { summaries[row.tour_id] = try await planning.summary(row.tour_id) }
            catch { self.error = "Aktion ausgeführt, aber aktuelle Zahlen für diese Tour konnten nicht neu geladen werden: \(error.localizedDescription)" }
        }
    }
}

struct DashboardView: View {
    let services: AppServices
    @StateObject private var model: DashboardModel
    init(services: AppServices) {
        self.services = services
        _model = StateObject(wrappedValue: DashboardModel(toursRepository: services.tours, people: services.people, planning: services.planning))
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Ausfahrten im Blick").font(.largeTitle.bold())
                        Text("Planung, Anfragen und Organisation über alle kommenden Touren.").foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.disabled(model.busy)
                }
                ErrorBanner(message: model.error)
                if model.tours.isEmpty && !model.busy {
                    ContentUnavailableView("Keine anstehenden Touren", systemImage: "map", description: Text("Veröffentlichte Touren erscheinen hier."))
                } else {
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible()), .init(.flexible())], spacing: 12) {
                        infoTile(.tours, "\(model.tours.count)")
                        if let next = model.tours.first { infoTile(.next, "\(next.start_date) · \(next.title)") }
                        infoTile(.people, "\(model.tours.reduce(0) { $0 + (model.summaries[$1.id]?.people ?? 0) })")
                        infoTile(.vehicles, "\(model.tours.reduce(0) { $0 + (model.summaries[$1.id]?.confirmed_vehicles ?? 0) })")
                        ForEach(DashboardMetric.allCases) { metric in
                            metricTile(metric)
                        }
                    }
                    if let metric = model.expandedMetric { drillDown(metric) }
                    if let info = model.expandedInfo { infoDrillDown(info) }
                }
                RefreshFooter(time: model.refreshedAt, busy: model.busy)
            }.padding(28)
        }.navigationTitle("Dashboard").task { await model.load() }
    }
    private func infoTile(_ info: DashboardInfo, _ value: String) -> some View {
        Button { model.toggleInfo(info) } label: {
            VStack(alignment: .leading, spacing: 10) {
                Label(info.title, systemImage: info.symbol).font(.caption).foregroundStyle(.secondary)
                Text(value).font(.system(size: 22, weight: .semibold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.7)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
                .background(model.expandedInfo == info ? Color.sftRed.opacity(0.18) : Color.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(model.expandedInfo == info ? Color.sftRed : .clear, lineWidth: 1.5))
        }.buttonStyle(.plain)
    }
    private func metricTile(_ metric: DashboardMetric) -> some View {
        Button { model.toggle(metric) } label: {
            VStack(alignment: .leading, spacing: 10) {
                Label(metric.title, systemImage: metric.symbol).font(.caption).foregroundStyle(.secondary)
                Text("\(model.total(metric))").font(.system(size: 26, weight: .semibold, design: .rounded)).monospacedDigit()
            }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
                .background(model.expandedMetric == metric ? Color.sftRed.opacity(0.18) : Color.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(model.expandedMetric == metric ? Color.sftRed : .clear, lineWidth: 1.5))
        }.buttonStyle(.plain)
    }
    private func drillDown(_ metric: DashboardMetric) -> some View {
        let relevant = model.tours.filter { metric.count(model.summaries[$0.id]) > 0 }
        return VStack(alignment: .leading, spacing: 4) {
            Text(metric.title).font(.title3.bold())
            if relevant.isEmpty {
                Text("Aktuell keine Einträge.").foregroundStyle(.secondary).padding(.vertical, 8)
            } else {
                ForEach(relevant) { tour in
                    DisclosureGroup(isExpanded: Binding(
                        get: { model.expandedTours.contains(tour.id) },
                        set: { model.setExpanded(tour.id, $0) }
                    )) {
                        tourRows(tour, metric: metric)
                    } label: {
                        HStack {
                            Text(tour.title).bold()
                            Text(tour.start_date).foregroundStyle(.secondary).font(.caption)
                            Spacer()
                            Text("\(metric.count(model.summaries[tour.id]))").foregroundStyle(.secondary)
                        }
                    }.padding(.vertical, 6)
                    Divider()
                }
            }
        }.padding(18).background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 14))
    }
    @ViewBuilder private func infoDrillDown(_ info: DashboardInfo) -> some View {
        switch info {
        case .tours: toursList()
        case .next: nextTourDetail()
        case .people: participantsList()
        case .vehicles: vehiclesList()
        }
    }
    private func sectionBox<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.title3.bold())
            content()
        }.padding(18).background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 14))
    }
    @ViewBuilder private func toursList() -> some View {
        sectionBox(DashboardInfo.tours.title) {
            if model.tours.isEmpty {
                Text("Keine Touren vorhanden.").foregroundStyle(.secondary).padding(.vertical, 8)
            } else {
                ForEach(model.tours) { tour in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(tour.title).bold()
                            Text("\(tour.start_date) · \(tour.region)").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }.padding(.vertical, 6)
                    Divider()
                }
            }
        }
    }
    @ViewBuilder private func nextTourDetail() -> some View {
        sectionBox(DashboardInfo.next.title) {
            if let tour = model.tours.first {
                let summary = model.summaries[tour.id]
                VStack(alignment: .leading, spacing: 6) {
                    Text(tour.title).font(.headline)
                    Text("\(tour.region) · \(tour.start_date)\(tour.end_date != tour.start_date ? " – \(tour.end_date)" : "")").foregroundStyle(.secondary)
                    if let meeting = tour.meeting_at, let date = TourDates.instant(meeting) {
                        Text("Treffpunkt: \(date.formatted(date: .omitted, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                    }
                    if let length = tour.route_length_km { Text("\(Int(length)) km").font(.caption).foregroundStyle(.secondary) }
                    if let summary { Text("\(summary.confirmed_vehicles) / \(tour.max_vehicles) Fahrzeuge bestätigt · \(summary.people) Personen").font(.caption) }
                }
                Divider().padding(.vertical, 4)
                Text("Teilnehmer").font(.subheadline.bold())
                if let rows = model.registrations[tour.id] {
                    let confirmed = rows.filter { $0.status == "confirmed" }.sorted { $0.registered_at < $1.registered_at }
                    if confirmed.isEmpty {
                        Text("Noch keine bestätigten Teilnehmer.").foregroundStyle(.secondary).padding(.vertical, 6)
                    } else {
                        ForEach(confirmed) { row in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(model.name(row)).bold()
                                    Text("\(row.vehicle_manufacturer) \(row.vehicle_model) · \(row.passenger_count + 1) Personen").font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                            }.padding(.vertical, 4)
                        }
                    }
                } else {
                    ProgressView().padding(.vertical, 10).frame(maxWidth: .infinity)
                }
            } else {
                Text("Keine anstehende Tour.").foregroundStyle(.secondary).padding(.vertical, 8)
            }
        }
    }
    private var confirmedByTour: [(Tour, TourRegistration)] {
        model.tours.flatMap { tour in (model.registrations[tour.id] ?? []).filter { $0.status == "confirmed" }.map { (tour, $0) } }
    }
    private var stillLoadingAcrossTours: Bool { model.tours.contains { model.registrations[$0.id] == nil } }
    @ViewBuilder private func participantsList() -> some View {
        sectionBox(DashboardInfo.people.title) {
            if stillLoadingAcrossTours {
                ProgressView().padding(.vertical, 10).frame(maxWidth: .infinity)
            } else if confirmedByTour.isEmpty {
                Text("Keine bestätigten Teilnehmer.").foregroundStyle(.secondary).padding(.vertical, 8)
            } else {
                ForEach(Array(confirmedByTour.enumerated()), id: \.offset) { _, pair in
                    let (tour, row) = pair
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(model.name(row)).bold()
                            Text("\(tour.title) · \(row.vehicle_manufacturer) \(row.vehicle_model)").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }.padding(.vertical, 4)
                    Divider()
                }
            }
        }
    }
    @ViewBuilder private func vehiclesList() -> some View {
        sectionBox(DashboardInfo.vehicles.title) {
            if stillLoadingAcrossTours {
                ProgressView().padding(.vertical, 10).frame(maxWidth: .infinity)
            } else if confirmedByTour.isEmpty {
                Text("Keine bestätigten Fahrzeuge.").foregroundStyle(.secondary).padding(.vertical, 8)
            } else {
                ForEach(Array(confirmedByTour.enumerated()), id: \.offset) { _, pair in
                    let (tour, row) = pair
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(row.vehicle_manufacturer) \(row.vehicle_model)\(row.license_plate.map { " · \($0)" } ?? "")").bold()
                            Text("\(tour.title) · \(model.name(row)) · \(row.passenger_count + 1) Personen").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }.padding(.vertical, 4)
                    Divider()
                }
            }
        }
    }
    @ViewBuilder private func tourRows(_ tour: Tour, metric: DashboardMetric) -> some View {
        if let rows = model.registrations[tour.id] {
            let filtered = rows.filter { metric.statuses.contains($0.status) }.sorted { $0.registered_at < $1.registered_at }
            if filtered.isEmpty {
                Text("Keine Einträge mehr.").foregroundStyle(.secondary).padding(.vertical, 6)
            } else {
                ForEach(filtered) { row in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(model.name(row)) · \(row.vehicle_manufacturer) \(row.vehicle_model)").bold()
                            Text("\(row.vehicle_power_ps) PS · \(row.passenger_count + 1) Personen").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        StatusBadge(value: row.status)
                        // approve_tour_registration() akzeptiert serverseitig ausschließlich status='pending'
                        // (REGISTRATION_NOT_PENDING sonst) -- ein Warteliste-Eintrag rückt in Automatik-/
                        // Manuellmodus über die eigene Nachrücklogik nach (§9.5), nicht per Direkt-Bestätigung.
                        if metric == .pending {
                            Button("Bestätigen") { Task { await model.apply(row, action: "approve_tour_registration") } }.disabled(model.busy)
                        }
                        Button("Ablehnen", role: .destructive) { Task { await model.apply(row, action: "reject_tour_registration") } }
                            .disabled(model.busy || row.status == "rejected")
                    }.padding(.vertical, 6)
                }
            }
        } else {
            ProgressView().padding(.vertical, 10).frame(maxWidth: .infinity)
        }
    }
}
