import SwiftUI

@MainActor final class TourResourceOverviewModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var summaries: [String: PlanningSummary] = [:]
    @Published var selection: String?
    let toursRepository: ToursRepository
    let planning: PlanningRepository
    init(toursRepository: ToursRepository, planning: PlanningRepository) { self.toursRepository = toursRepository; self.planning = planning }
    func load() async {
        await perform {
            let all = try await toursRepository.list(query: "", offset: 0, archived: false)
            let today = TourDates.dayString(Date())
            tours = all.filter { $0.end_date >= today && $0.status != "cancelled" && $0.status != "draft" }
                .sorted { $0.start_date < $1.start_date }
            var next: [String: PlanningSummary] = [:]
            for tour in tours {
                try Task.checkCancellation()
                next[tour.id] = try? await planning.summary(tour.id)
            }
            summaries = next
        }
    }
}

struct HotelsOverviewView: View {
    let services: AppServices
    @StateObject private var model: TourResourceOverviewModel
    init(services: AppServices) {
        self.services = services
        _model = StateObject(wrappedValue: TourResourceOverviewModel(toursRepository: services.tours, planning: services.planning))
    }
    private var multiDay: [Tour] { model.tours.filter { $0.end_date > $0.start_date } }
    private var selected: Tour? { multiDay.first { $0.id == model.selection } }
    var body: some View {
        VStack(spacing: 0) {
            ErrorBanner(message: model.error)
            HSplitView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack { Text("Hotels").font(.title3.bold()); Spacer(); Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.disabled(model.busy) }.padding()
                    if multiDay.isEmpty && !model.busy {
                        ContentUnavailableView("Keine Mehrtagestouren", systemImage: "bed.double", description: Text("Übernachtungen gelten nur für Touren mit mehreren Tagen."))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List(multiDay, selection: $model.selection) { tour in
                            let summary = model.summaries[tour.id]
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tour.title).bold()
                                Text("\(tour.start_date) – \(tour.end_date) · \(tour.region)").font(.caption).foregroundStyle(.secondary)
                                if let summary {
                                    if let complete = summary.all_nights_confirmed {
                                        Text("\(complete) / \(summary.confirmed_vehicles) Fahrzeuge: alle Nächte bestätigt").font(.caption)
                                    }
                                    ForEach(summary.nights) { night in
                                        Text("\(night.night_date): \(night.confirmed) / \(summary.confirmed_vehicles) bestätigt").font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }.tag(tour.id).padding(.vertical, 4)
                        }
                    }
                }.frame(minWidth: 380, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                if let selected {
                    ScrollView { AccommodationView(services: services, tour: selected).padding() }
                        .id(selected.id).frame(minWidth: 440, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                } else { ContentUnavailableView("Tour auswählen", systemImage: "bed.double").frame(minWidth: 400, maxWidth: .infinity, maxHeight: .infinity) }
            }
        }.navigationTitle("Hotels").task { await model.load() }
    }
}

struct RestaurantsOverviewView: View {
    let services: AppServices
    @StateObject private var model: TourResourceOverviewModel
    @State private var openStop: DataRow?
    init(services: AppServices) {
        self.services = services
        _model = StateObject(wrappedValue: TourResourceOverviewModel(toursRepository: services.tours, planning: services.planning))
    }
    private var withRestaurants: [Tour] { model.tours.filter { !(model.summaries[$0.id]?.restaurants.isEmpty ?? true) } }
    private var selected: Tour? { withRestaurants.first { $0.id == model.selection } }
    var body: some View {
        VStack(spacing: 0) {
            ErrorBanner(message: model.error)
            HSplitView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack { Text("Restaurant").font(.title3.bold()); Spacer(); Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.disabled(model.busy) }.padding()
                    if withRestaurants.isEmpty && !model.busy {
                        ContentUnavailableView("Keine Restaurant-Stopps", systemImage: "fork.knife", description: Text("Restaurant-Stopps werden je Tour unter Tourenverwaltung → Stopps angelegt."))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List(withRestaurants, selection: $model.selection) { tour in
                            let restaurants = model.summaries[tour.id]?.restaurants ?? []
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tour.title).bold()
                                Text("\(tour.start_date) · \(tour.region)").font(.caption).foregroundStyle(.secondary)
                                Text("\(restaurants.reduce(0) { $0 + $1.orders }) Bestellungen · \(restaurants.reduce(0) { $0 + $1.dishes }) Gerichte").font(.caption)
                            }.tag(tour.id).padding(.vertical, 4)
                        }
                    }
                }.frame(minWidth: 380, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                if let selected {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(selected.title).font(.title2.bold())
                        Text("Restaurant-Stopps dieser Tour").foregroundStyle(.secondary)
                        List(model.summaries[selected.id]?.restaurants ?? []) { stop in
                            HStack {
                                VStack(alignment: .leading) { Text(stop.title).bold(); Text("\(stop.orders) Bestellungen · \(stop.dishes) Gerichte").font(.caption).foregroundStyle(.secondary) }
                                Spacer()
                                Button("Öffnen") { openStop = DataRow(["id": .string(stop.id), "title": .string(stop.title)]) }
                            }
                        }
                        Text("Neue Restaurant-Stopps: Tourenverwaltung → Tour → Stopps → Hinzufügen (Typ „Restaurant“), danach hier oder dort „Speisekarte & Bestellungen“ öffnen.")
                            .font(.caption).foregroundStyle(.secondary)
                    }.padding().id(selected.id).frame(minWidth: 440, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                } else { ContentUnavailableView("Tour auswählen", systemImage: "fork.knife").frame(minWidth: 400, maxWidth: .infinity, maxHeight: .infinity) }
            }
        }.navigationTitle("Restaurant").task { await model.load() }
        .sheet(item: $openStop) { stop in
            if let tour = selected { RestaurantView(services: services, tour: tour, stop: stop) { openStop = nil; Task { await model.load() } } }
        }
    }
}
