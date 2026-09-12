import SwiftUI

// Speist RedesignShellView mit echten Daten aus AppServices statt aus
// SFTRedesignSample. Nur die Tourliste selbst (Name, Zeitraum, Region,
// Fahrzeugzahlen, grober Planungsstatus) wird hier live geladen -- die
// Drilldowns (Hotelmatrix-Zellen, Essensbestellungen im Detail, Dashboard-
// Registrierungsliste/-Aktivität, Editor-Formular) verwenden weiterhin
// Platzhalterdaten; das bleibt gemäß PR-Beschreibung "Noch zu tun".
//
// Absichtlich eine reine Anzeige-Zusammenfassung: es werden ausschließlich
// bereits bestehende, admin-geschützte Lesepfade verwendet
// (ToursRepository.upcoming(), PlanningRepository.summaries(tourIDs:)) --
// keine neue RPC, keine Schreibpfade.
@MainActor final class RedesignLiveDataLoader: ObservableObject {
    @Published var tours: [TourRow] = []
    @Published var openAccommodations = 0
    @Published var openMeals = 0
    @Published var lastRefresh = "–"
    @Published var error: String?
    @Published var loading = false

    private let services: AppServices
    init(services: AppServices) { self.services = services }

    func load() async {
        loading = true; defer { loading = false }
        do {
            let liveTours = try await services.tours.upcoming()
            let summaries = try await services.planning.summaries(liveTours.map(\.id))
            var summaryByTour: [String: PlanningSummary] = [:]
            for row in summaries { if let summary = row.summary { summaryByTour[row.tour_id] = summary } }
            tours = liveTours.map { TourRow($0, summary: summaryByTour[$0.id]) }
            openAccommodations = summaryByTour.values.reduce(0) { $0 + RedesignLiveDataLoader.pendingNights(in: $1) }
            openMeals = summaryByTour.values.reduce(0) { $0 + RedesignLiveDataLoader.pendingMeals(in: $1) }
            lastRefresh = Date().formatted(date: .omitted, time: .shortened)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private static func pendingNights(in summary: PlanningSummary) -> Int {
        guard !summary.nights.isEmpty, let confirmed = summary.all_nights_confirmed else { return 0 }
        return max(0, summary.confirmed_vehicles - confirmed)
    }
    private static func pendingMeals(in summary: PlanningSummary) -> Int {
        guard !summary.restaurants.isEmpty else { return 0 }
        let mostOrdered = summary.restaurants.map(\.orders).max() ?? 0
        return max(0, summary.confirmed_vehicles - mostOrdered)
    }
}

extension TourRow {
    init(_ tour: Tour, summary: PlanningSummary?) {
        id = tour.id
        title = tour.title
        region = tour.region
        maxVehicles = tour.max_vehicles
        confirmedVehicles = summary?.confirmed_vehicles
        dateRange = TourRow.formattedRange(start: tour.start_date, end: tour.end_date)
        subtitle = TourRow.formattedSubtitle(tour: tour, summary: summary)
        lifecycle = TourRow.resolvedLifecycle(for: tour)
        planning = TourRow.planningSegments(summary: summary)
    }

    private static func formattedRange(start: String, end: String) -> String {
        guard let startDate = TourDates.day(start), let endDate = TourDates.day(end) else { return start }
        let df = DateFormatter(); df.calendar = Calendar(identifier: .gregorian)
        df.locale = Locale(identifier: "de_DE"); df.timeZone = TourDates.zone
        if start == end { df.dateFormat = "dd.MM.yyyy"; return df.string(from: startDate) }
        let sameMonth = Calendar(identifier: .gregorian).isDate(startDate, equalTo: endDate, toGranularity: .month)
        df.dateFormat = sameMonth ? "dd." : "dd.MM."
        let startText = df.string(from: startDate)
        df.dateFormat = "dd.MM.yyyy"
        return "\(startText)–\(df.string(from: endDate))"
    }

    private static func formattedSubtitle(tour: Tour, summary: PlanningSummary?) -> String {
        var parts: [String] = []
        if let km = tour.route_length_km { parts.append("\(Int(km)) km") }
        if let summary, !summary.nights.isEmpty { parts.append("\(summary.nights.count) Nächte") }
        if let summary, !summary.restaurants.isEmpty { parts.append("\(summary.restaurants.count) Restaurants") }
        return parts.isEmpty ? (tour.short_description ?? "") : parts.joined(separator: " · ")
    }

    private static func resolvedLifecycle(for tour: Tour) -> TourLifecycle {
        if tour.status == "draft" { return .draft }
        if ["completed", "archived", "cancelled"].contains(tour.status) { return .archived }
        let today = TourDates.dayString(Date())
        if tour.start_date <= today && tour.end_date >= today { return .live }
        return .registration
    }

    /// Etappen/Stopps sind in PlanningSummary (noch) nicht enthalten und bleiben
    /// deshalb neutral (`.open`) statt einen unbelegten Status vorzutäuschen.
    private static func planningSegments(summary: PlanningSummary?) -> [PlanningSegment] {
        guard let summary else { return [.open, .open, .open, .open] }
        let hotels: PlanningSegment
        if summary.nights.isEmpty || summary.confirmed_vehicles == 0 { hotels = .open }
        else if let allConfirmed = summary.all_nights_confirmed {
            hotels = allConfirmed == summary.confirmed_vehicles ? .done : (allConfirmed == 0 ? .missing : .open)
        } else { hotels = .open }
        let meals: PlanningSegment
        if summary.restaurants.isEmpty || summary.confirmed_vehicles == 0 { meals = .open }
        else {
            let mostOrdered = summary.restaurants.map(\.orders).max() ?? 0
            meals = mostOrdered >= summary.confirmed_vehicles ? .done : (mostOrdered == 0 ? .missing : .open)
        }
        return [.open, .open, hotels, meals]
    }
}

/// Lädt beim Erscheinen echte Touren/Planungszahlen und speist sie in RedesignShellView --
/// die einzige Stelle, an der RootView zwischen Platzhalter- und Live-Daten wählt.
struct LiveRedesignShellView: View {
    @StateObject private var loader: RedesignLiveDataLoader
    init(services: AppServices) {
        _loader = StateObject(wrappedValue: RedesignLiveDataLoader(services: services))
    }
    var body: some View {
        RedesignShellView(
            tours: loader.tours,
            openAccommodations: loader.openAccommodations,
            openMeals: loader.openMeals,
            lastRefresh: loader.lastRefresh
        )
        .overlay(alignment: .top) {
            if let error = loader.error {
                Text(error).font(SFT.ui(11)).foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(SFT.red, in: Capsule()).padding(.top, 8)
            }
        }
        .task { await loader.load() }
    }
}
