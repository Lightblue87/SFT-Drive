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

@MainActor final class DashboardModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var summaries: [String: PlanningSummary] = [:]
    @Published var users: [AdminUser] = []
    @Published var expandedMetric: DashboardMetric?
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
            let all = try await toursRepository.list(query: "", offset: 0, archived: false)
            let today = TourDates.dayString(Date())
            tours = all.filter { $0.end_date >= today && $0.status != "cancelled" && $0.status != "draft" }
                .sorted { $0.start_date < $1.start_date }
            users = try await people.users()
            var next: [String: PlanningSummary] = [:]
            for tour in tours {
                try Task.checkCancellation()
                next[tour.id] = try? await planning.summary(tour.id)
            }
            summaries = next
        }
    }
    func toggle(_ metric: DashboardMetric) { expandedMetric = expandedMetric == metric ? nil : metric }
    func toggle(tour tourID: String) {
        if expandedTours.contains(tourID) { expandedTours.remove(tourID) }
        else { expandedTours.insert(tourID); Task { await loadRegistrations(tourID) } }
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
            summaries[row.tour_id] = try? await planning.summary(row.tour_id)
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
                        infoTile("Kommende Touren", "\(model.tours.count)", "calendar")
                        if let next = model.tours.first { infoTile("Nächste Tour", "\(next.start_date) · \(next.title)", "arrow.right.circle") }
                        infoTile("Personen gesamt", "\(model.tours.reduce(0) { $0 + (model.summaries[$1.id]?.people ?? 0) })", "person.2")
                        infoTile("Bestätigte Fahrzeuge", "\(model.tours.reduce(0) { $0 + (model.summaries[$1.id]?.confirmed_vehicles ?? 0) })", "steeringwheel")
                        ForEach(DashboardMetric.allCases) { metric in
                            metricTile(metric)
                        }
                    }
                    if let metric = model.expandedMetric { drillDown(metric) }
                }
                RefreshFooter(time: model.refreshedAt, busy: model.busy)
            }.padding(28)
        }.navigationTitle("Dashboard").task { await model.load() }
    }
    private func infoTile(_ title: String, _ value: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: symbol).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.system(size: 22, weight: .semibold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.7)
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 14))
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
                        set: { _ in model.toggle(tour: tour.id) }
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
                        Button("Bestätigen") { Task { await model.apply(row, action: "approve_tour_registration") } }
                            .disabled(model.busy || row.status == "confirmed")
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
