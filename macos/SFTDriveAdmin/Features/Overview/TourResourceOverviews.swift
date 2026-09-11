import SwiftUI

@MainActor final class TourResourceOverviewModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var summaries: [String: PlanningSummary] = [:]
    @Published var restaurantStops: [String: [DataRow]] = [:]
    @Published var selection: String?
    let toursRepository: ToursRepository
    let planning: PlanningRepository
    let content: ContentRepository
    init(toursRepository: ToursRepository, planning: PlanningRepository, content: ContentRepository) {
        self.toursRepository = toursRepository; self.planning = planning; self.content = content
    }
    func load() async {
        await perform {
            tours = try await toursRepository.upcoming()
            let tourIDs = tours.map(\.id)
            async let summariesTask = planning.summaries(tourIDs)
            // Restaurant membership must not depend on admin_get_tour_planning_summary's
            // ordering_enabled filter (Codex review on #18) -- a newly created restaurant
            // stop needs to show up here precisely so it can be configured.
            async let stopsTask = content.restaurantStops(tourIDs)
            let (rows, stops) = try await (summariesTask, stopsTask)
            summaries = Dictionary(uniqueKeysWithValues: rows.compactMap { row in row.summary.map { (row.tour_id, $0) } })
            restaurantStops = Dictionary(grouping: stops, by: { $0.values.text("tour_id") })
            // A failed summary must not silently read as "no hotels/restaurants here"
            // (PR #18 review) -- surface which tours it affects.
            let failed = rows.filter { $0.summary == nil }
            if !failed.isEmpty {
                let titles = failed.compactMap { row in tours.first { $0.id == row.tour_id }?.title ?? row.tour_id }.joined(separator: ", ")
                error = "Planungsdaten konnten nicht geladen werden für: \(titles)."
            }
        }
    }
}

struct HotelsOverviewView: View {
    let services: AppServices
    @StateObject private var model: TourResourceOverviewModel
    init(services: AppServices) {
        self.services = services
        _model = StateObject(wrappedValue: TourResourceOverviewModel(toursRepository: services.tours, planning: services.planning, content: services.content))
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
    @State private var creating = false
    @State private var deleting: DataRow?
    init(services: AppServices) {
        self.services = services
        _model = StateObject(wrappedValue: TourResourceOverviewModel(toursRepository: services.tours, planning: services.planning, content: services.content))
    }
    private var withRestaurants: [Tour] { model.tours.filter { !(model.restaurantStops[$0.id]?.isEmpty ?? true) } }
    private var selected: Tour? { withRestaurants.first { $0.id == model.selection } }
    var body: some View {
        VStack(spacing: 0) {
            ErrorBanner(message: model.error)
            HSplitView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("Restaurant").font(.title3.bold()); Spacer()
                        Button("Neuer Restaurant-Stopp", systemImage: "plus") { creating = true }.disabled(model.busy || model.tours.isEmpty)
                        Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.disabled(model.busy)
                    }.padding()
                    if withRestaurants.isEmpty && !model.busy {
                        ContentUnavailableView("Keine Restaurant-Stopps", systemImage: "fork.knife", description: Text("Über „Neuer Restaurant-Stopp“ oben oder je Tour unter Tourenverwaltung → Stopps anlegen."))
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
                        List(model.restaurantStops[selected.id] ?? []) { stop in
                            let counts = model.summaries[selected.id]?.restaurants.first { $0.id == stop.id }
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(stop.values.text("title")).bold()
                                    if let counts { Text("\(counts.orders) Bestellungen · \(counts.dishes) Gerichte").font(.caption).foregroundStyle(.secondary) }
                                    else { Text("Bestellung noch nicht aktiviert").font(.caption).foregroundStyle(.secondary) }
                                }
                                Spacer()
                                Button("Öffnen") { openStop = stop }
                                Button("Löschen", role: .destructive) { deleting = stop }
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
        .confirmationDialog("Restaurant-Stopp endgültig löschen? Bereits eingereichte Bestellungen verhindern das Löschen -- diese müssten zuerst storniert werden.", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("Löschen", role: .destructive) {
                guard let stop = deleting, let tour = selected else { return }; deleting = nil
                Task { await model.perform { try await services.content.remove(.stops, id: stop.id, parentID: tour.id, expected: stop.values) }; await model.load() }
            }
        }
        .sheet(isPresented: $creating) {
            NewRestaurantStopSheet(services: services, tours: model.tours) { newTourID in
                creating = false
                if let newTourID { model.selection = newTourID; Task { await model.load() } }
            }
        }
    }
}

/// Erlaubt das Anlegen eines neuen Restaurant-Stopps direkt aus der
/// tourübergreifenden Restaurant-Übersicht heraus (statt nur über
/// Tourenverwaltung → Tour → Stopps), inklusive Auswahl der Zieltour --
/// erzeugt lediglich den Stopp (Typ "restaurant"); Bestellfenster und
/// Speisekarte werden wie bisher danach über "Öffnen" gepflegt.
@MainActor final class NewRestaurantStopModel: ScreenModel {
    @Published var tourID = ""
    @Published var title = ""
}
struct NewRestaurantStopSheet: View {
    let services: AppServices
    let tours: [Tour]
    let close: (String?) -> Void
    @StateObject private var model = NewRestaurantStopModel()
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Neuer Restaurant-Stopp").font(.headline)
            ErrorBanner(message: model.error)
            Form {
                Picker("Tour", selection: $model.tourID) {
                    Text("Auswählen").tag("")
                    ForEach(tours) { Text("\($0.title) · \($0.start_date)").tag($0.id) }
                }
                TextField("Bezeichnung", text: $model.title)
            }.formStyle(.grouped)
            HStack {
                Button("Abbrechen") { close(nil) }
                Spacer()
                Button("Anlegen") {
                    Task { await model.perform {
                        let name = model.title.trimmingCharacters(in: .whitespaces)
                        guard !model.tourID.isEmpty, !name.isEmpty else { throw AppError("Bitte Tour und Bezeichnung wählen.") }
                        let id = UUID().uuidString.lowercased()
                        let payload: Payload = ["title": .string(name), "type": .string("restaurant"), "sort_order": .number(0)]
                        try await services.content.save(.stops, id: id, parentID: model.tourID, expected: nil, values: payload)
                        close(model.tourID)
                    } }
                }.buttonStyle(.borderedProminent).disabled(model.busy)
            }
        }.padding().frame(width: 420, height: 240)
    }
}
