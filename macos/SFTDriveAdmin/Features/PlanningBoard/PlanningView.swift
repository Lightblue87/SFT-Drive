import SwiftUI

@MainActor final class PlanningModel: ScreenModel {
    @Published var summary: PlanningSummary?
    let repository: PlanningRepository
    init(_ repository: PlanningRepository) { self.repository = repository }
    func load(_ tourID: String) async {
        await perform { let result = try await repository.summary(tourID); try Task.checkCancellation(); summary = result }
    }
}
struct PlanningView: View {
    let tour: Tour
    @StateObject private var model: PlanningModel
    init(repository: PlanningRepository, tour: Tour) { self.tour = tour; _model = StateObject(wrappedValue: PlanningModel(repository)) }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack { Text("Planungsübersicht").font(.title3.bold()); Spacer(); Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load(tour.id) } }.disabled(model.busy) }
                ErrorBanner(message: model.error)
                if let summary = model.summary {
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                        metric("Fahrzeuge bestätigt", "\(summary.confirmed_vehicles) / \(tour.max_vehicles)", "steeringwheel")
                        metric("Personen", "\(summary.people)", "person.2")
                        metric("Eingecheckt", tour.check_in_enabled ? "\(summary.checked_in) / \(summary.confirmed_vehicles)" : "Nicht aktiviert", "checkmark.circle")
                        metric("Warteliste", "\(summary.waitlisted)", "clock")
                        metric("Offene Freigaben", "\(summary.pending)", "person.badge.clock")
                        metric("Vormerkungen", "\(summary.interests)", "bookmark")
                    }
                    if let complete = summary.all_nights_confirmed {
                        GroupBox("Übernachtungen") {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("\(complete) / \(summary.confirmed_vehicles) Fahrzeuge: alle Nächte bestätigt").bold()
                                ForEach(summary.nights) { night in LabeledContent(night.night_date, value: "\(night.confirmed) / \(summary.confirmed_vehicles) bestätigt") }
                            }.frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    GroupBox("Restaurant-Vorbestellungen") {
                        VStack(alignment: .leading, spacing: 10) {
                            if summary.restaurants.isEmpty { Text("Keine Restaurant-Vorbestellung aktiviert.").foregroundStyle(.secondary) }
                            ForEach(summary.restaurants) { stop in
                                VStack(alignment: .leading) { Text(stop.title).bold(); Text("\(stop.orders) / \(summary.confirmed_vehicles) Fahrzeuge bestellt · \(stop.dishes) Gerichte") }
                            }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if summary.pending > 0 { Label("\(summary.pending) Anmeldungen benötigen Freigabe.", systemImage: "exclamationmark.circle").foregroundStyle(.orange) }
                    Text("Berechnet: \(summary.calculated_at)").font(.caption).foregroundStyle(.secondary)
                } else if !model.busy { ContentUnavailableView("Planung nicht verfügbar", systemImage: "chart.bar", description: Text("Verbindung und Bereitstellung der Dashboard-Migration prüfen.")) }
                RefreshFooter(time: model.refreshedAt, busy: model.busy)
            }
        }.task { await model.load(tour.id) }
    }
    private func metric(_ title: String, _ value: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 10) { Label(title, systemImage: symbol).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.system(size: 26, weight: .semibold, design: .rounded)).monospacedDigit()
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 14))
    }
}
