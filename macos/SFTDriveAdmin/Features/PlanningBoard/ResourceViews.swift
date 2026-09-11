import SwiftUI

@MainActor final class ResourceModel: ScreenModel {
    @Published var rows: [DataRow] = []
    @Published var selection: String?
    func load(_ repository: ContentRepository, kind: ResourceKind, parentID: String) async {
        await perform {
            let values = try await repository.load(kind, parentID: parentID); try Task.checkCancellation()
            rows = values.sorted { ($0.values.integer("sort_order"), $0.id) < ($1.values.integer("sort_order"), $1.id) }
        }
    }
}
struct ResourceEditorRequest: Identifiable { var id = UUID(); var existing: DataRow?; var initial: Payload = [:] }
struct ResourceListView: View {
    let services: AppServices
    let kind: ResourceKind
    let parentID: String
    let tour: Tour
    @StateObject private var model = ResourceModel()
    @State private var editor: ResourceEditorRequest?
    @State private var deleting: DataRow?
    @State private var restaurant: DataRow?
    var body: some View {
        VStack(alignment: .leading) {
            HStack { Text(kind.title).font(.headline); Spacer()
                Button("Hinzufügen", systemImage: "plus") { editor = .init(initial: defaults) }
                Button("Laden", systemImage: "arrow.clockwise") { Task { await load() } }.labelStyle(.iconOnly)
            }.disabled(model.busy)
            ErrorBanner(message: model.error)
            if model.rows.isEmpty && !model.busy { ContentUnavailableView("Noch keine Einträge", systemImage: "list.bullet.rectangle") }
            List(model.rows) { row in
                VStack(alignment: .leading, spacing: 8) {
                    Text(row.values.text(kind.nameKey).isEmpty ? kind.title : row.values.text(kind.nameKey)).font(.headline)
                    if kind == .hotels { Text(hotelCaption(row)).font(.caption) }
                    if kind == .menu { Text("\(row.values.text("price")) € · \(row.values.boolean("is_available") ? "Verfügbar" : "Deaktiviert")").font(.caption) }
                    HStack {
                        Button("Bearbeiten") { editor = .init(existing: row) }
                        if kind == .stops && row.values.text("type") == "restaurant" { Button("Speisekarte & Bestellungen") { restaurant = row } }
                        Button("Löschen", role: .destructive) { deleting = row }
                    }.buttonStyle(.bordered)
                }.padding(.vertical, 5)
            }
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }.task { await load() }
        .sheet(item: $editor) { request in
            ResourceEditorView(repository: services.content, kind: kind, parentID: parentID, tour: tour, request: request) { editor = nil; Task { await load() } }
        }
        .sheet(item: $restaurant) { stop in RestaurantView(services: services, tour: tour, stop: stop) { restaurant = nil } }
        .confirmationDialog("Eintrag endgültig löschen? Zugehörige Daten können betroffen sein. Bereits bestellte Gerichte können nur deaktiviert werden.", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("Löschen", role: .destructive) { guard let row = deleting else { return }; deleting = nil
                Task { await model.perform { try await services.content.remove(kind, id: row.id, parentID: parentID, expected: row.values) }; await load() }
            }
        }
    }
    private var defaults: Payload { kind == .hotels ? ["night_date": .string(tour.start_date), "night_date_end": .string(tour.start_date)] : [:] }
    private func load() async { await model.load(services.content, kind: kind, parentID: parentID) }
    // Zeigt einen Zeitraum ("18.–20.06.2027"), wenn der Vorschlag mehrere
    // Nächte abdeckt, statt für jede Nacht denselben Eintrag zu wiederholen.
    private func hotelCaption(_ row: DataRow) -> String {
        let start = row.values.text("night_date")
        let end = row.values.text("night_date_end")
        var text = "Nacht: \(start)" + (end.isEmpty || end == start ? "" : " – \(end)")
        if !row.values.text("price_per_night").isEmpty { text += " · \(row.values.text("price_per_night")) € / Nacht" }
        return text
    }
}
@MainActor final class ResourceEditorModel: ScreenModel {
    @Published var values: Payload = [:]
    @Published var latest: DataRow?
    var initial: Payload = [:]
    var id = UUID().uuidString.lowercased()
}
struct ResourceEditorView: View {
    let repository: ContentRepository
    let kind: ResourceKind
    let parentID: String
    let tour: Tour
    let request: ResourceEditorRequest
    let close: () -> Void
    @StateObject private var model = ResourceEditorModel()
    @State private var discard = false
    var body: some View {
        VStack {
            Text("\(kind.title) · \(tour.title)").font(.headline)
            ErrorBanner(message: model.error)
            if let latest = model.latest {
                DisclosureGroup("Aktueller Serverstand zum Vergleichen") {
                    ForEach(kind.fields) { field in
                        if latest.values[field.id] != model.values[field.id] {
                            LabeledContent(field.title, value: "Server: \(latest.values.text(field.id)) · Entwurf: \(model.values.text(field.id))")
                        }
                    }
                    Text("Entwurf bei Bedarf notieren, abbrechen und den Eintrag neu öffnen.").font(.caption)
                }
            }
            Form { FormFields(fields: kind.fields, values: $model.values) }.formStyle(.grouped)
            HStack {
                Button("Abbrechen") { if model.initial != model.values { discard = true } else { close() } }
                Spacer()
                Button("Speichern") {
                    Task { await model.perform {
                        let payload = try FormValidation.payload(model.values, fields: kind.fields)
                        if kind == .hotels {
                            let nights = TourDates.days(start: tour.start_date, end: tour.end_date, nights: true)
                            guard nights.contains(payload.text("night_date")) else { throw AppError("Gültige Tournacht wählen.") }
                            let end = payload.text("night_date_end")
                            if !end.isEmpty && (end < payload.text("night_date") || !nights.contains(end)) { throw AppError("„Übernachtung bis“ muss eine gültige Tournacht sein und darf nicht vor „Übernachtung von“ liegen.") }
                        }
                        if kind == .restaurantSettings { try FormValidation.window(payload, open: "ordering_open_at", close: "ordering_deadline_at") }
                        do { try await repository.save(kind, id: model.id, parentID: parentID, expected: request.existing?.values, values: payload) }
                        catch {
                            model.latest = try? await repository.load(kind, parentID: parentID).first(where: { $0.id == model.id })
                            throw error
                        }
                        close()
                    } }
                }.buttonStyle(.borderedProminent).keyboardShortcut("s").disabled(model.busy)
            }
        }.padding().frame(width: 610, height: 650).interactiveDismissDisabled().protectDraft(model.values != model.initial)
        .onAppear {
            model.values = Dictionary(uniqueKeysWithValues: kind.fields.map { ($0.id, $0.initial) })
            model.values.merge(request.existing?.values ?? request.initial) { _, new in new }
            if kind == .stages && model.values.text("route_url").isEmpty { model.values["route_url"] = request.initial["route_url"] ?? model.values["kurviger_url"] ?? .null }
            // "Übernachtung bis" ist ein Pflichtfeld, damit immer zwei sichtbare
            // Datumsfelder erscheinen -- bestehende Einträge ohne night_date_end
            // (vor 20260911050000 angelegt) werden hier defensiv mit night_date
            // vorbefüllt, statt den Admin mit einem "festlegen"-Button zu stoppen.
            if kind == .hotels && model.values.text("night_date_end").isEmpty { model.values["night_date_end"] = model.values["night_date"] }
            model.id = request.existing?.id ?? (kind == .restaurantSettings ? parentID : model.id)
            model.initial = model.values
        }
        .confirmationDialog("Änderungen verwerfen?", isPresented: $discard, titleVisibility: .visible) { Button("Verwerfen", role: .destructive, action: close) }
    }
}
struct StagesView: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model = ResourceModel()
    @State private var editor: ResourceEditorRequest?
    var body: some View {
        VStack {
            ErrorBanner(message: model.error)
            List(Array(TourDates.days(start: tour.start_date, end: tour.end_date).enumerated()), id: \.element) { day in
                let existing = model.rows.first { $0.values.text("stage_date") == day.element }
                HStack {
                    VStack(alignment: .leading) { Text("Tag \(day.offset + 1) · \(day.element)").bold()
                        Text(existing?.values.text("route_url").nilIfEmpty ?? existing?.values.text("kurviger_url").nilIfEmpty ?? "Kein Routen-Link").font(.caption).lineLimit(2) }
                    Spacer()
                    Button("Bearbeiten") {
                        var initial: Payload = ["stage_date": .string(day.element), "stage_number": .number(Double(day.offset + 1)), "title": .string("Tag \(day.offset + 1)")]
                        if let existing { initial = existing.values; if initial.text("route_url").isEmpty { initial["route_url"] = initial["kurviger_url"] } }
                        editor = .init(existing: existing.map { DataRow($0.values) }, initial: initial)
                    }
                }
            }
        }.task { await model.load(services.content, kind: .stages, parentID: tour.id) }
        .sheet(item: $editor) { request in ResourceEditorView(repository: services.content, kind: .stages, parentID: tour.id, tour: tour, request: request) { editor = nil; Task { await model.load(services.content, kind: .stages, parentID: tour.id) } } }
    }
}
extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

@MainActor final class AccommodationModel: ScreenModel {
    @Published var confirmations: [AccommodationConfirmation] = []
    @Published var registrations: [TourRegistration] = []
    @Published var users: [AdminUser] = []
    @Published var night = ""
    @Published var selection: Set<String> = []
}
struct AccommodationView: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model = AccommodationModel()
    @State private var confirmReminder = false
    private var missing: [TourRegistration] { model.registrations.filter { row in !model.confirmations.contains { $0.user_id == row.user_id && $0.night_date == model.night } } }
    var body: some View {
        VStack(alignment: .leading) {
            ResourceListView(services: services, kind: .hotels, parentID: tour.id, tour: tour).frame(minHeight: 180)
            Divider(); Text("Übernachtungsbestätigungen").font(.headline)
            ErrorBanner(message: model.error)
            if let notice = model.notice { Text(notice).font(.caption) }
            Picker("Nacht", selection: $model.night) { ForEach(TourDates.days(start: tour.start_date, end: tour.end_date, nights: true), id: \.self) { Text($0).tag($0) } }
            Text("\(model.registrations.count - missing.count) / \(model.registrations.count) bestätigt")
            List(missing, selection: $model.selection) { row in
                Text("\(model.users.first(where: { $0.id == row.user_id })?.username ?? row.user_id) · Übernachtung noch nicht bestätigt").tag(row.user_id)
            }.frame(minHeight: 100)
            Button("Auswahl erinnern (\(model.selection.count))") { confirmReminder = true }.disabled(model.selection.isEmpty || model.busy)
        }.task {
            model.night = tour.start_date
            await model.perform {
                model.confirmations = try await services.planning.accommodation(tour.id)
                model.registrations = try await services.people.registrations(tour.id).filter { $0.status == "confirmed" }
                model.users = try await services.people.users()
            }
        }.onChange(of: model.night) { _, _ in model.selection = [] }
        .confirmationDialog("Ausgewählte Teilnehmer an die Übernachtungsbestätigung für \(model.night) erinnern?", isPresented: $confirmReminder, titleVisibility: .visible) {
            Button("Erinnerung senden") { Task { await model.perform {
                let valid = Set(missing.map(\.user_id)).intersection(model.selection)
                model.notice = try await services.planning.reminder(tourID: tour.id, night: model.night, userIDs: Array(valid)) ?? "Erinnerung gesendet."
                model.selection = []
            } } }
        }
    }
}

@MainActor final class RestaurantModel: ScreenModel {
    @Published var orders: [DataRow] = []
    @Published var settings: DataRow?
    @Published var menu: [DataRow] = []
    @Published var editOrder: DataRow?
}
struct RestaurantView: View {
    let services: AppServices
    let tour: Tour
    let stop: DataRow
    let close: () -> Void
    @StateObject private var model = RestaurantModel()
    @State private var settingsEditor: ResourceEditorRequest?
    var body: some View {
        VStack(alignment: .leading) {
            HStack { Text(stop.values.text("title")).font(.title2.bold()); Spacer(); Button("Schließen", action: close) }
            ErrorBanner(message: model.error)
            Button("Bestellfenster bearbeiten") { settingsEditor = .init(existing: model.settings) }
            HSplitView {
                ResourceListView(services: services, kind: .menu, parentID: stop.id, tour: tour)
                VStack(alignment: .leading) {
                    HStack { Text("Eingereichte Bestellungen").font(.headline); Spacer(); Button("CSV") { export() }; Button("Laden") { Task { await load() } } }
                    List(validOrders) { row in
                        VStack(alignment: .leading) {
                            Text(vehicle(row)).bold()
                            ForEach(Array(items(row).enumerated()), id: \.offset) { Text("\($0.element.integer("quantity")) × \(dishName($0.element)) · \($0.element.text("note"))") }
                            Button("Bestellung korrigieren") { model.editOrder = row }
                        }
                    }
                }.frame(minWidth: 380)
            }
        }.padding().frame(width: 1050, height: 730).task { await load() }
        .sheet(item: $settingsEditor) { request in ResourceEditorView(repository: services.content, kind: .restaurantSettings, parentID: stop.id, tour: tour, request: request) { settingsEditor = nil; Task { await load() } } }
        .sheet(item: $model.editOrder) { order in MealOrderEditor(repository: services.content, stopID: stop.id, order: order, menu: model.menu) { model.editOrder = nil; Task { await load() } } }
    }
    private var validOrders: [DataRow] { model.orders.filter { if case .object(let r) = $0.values["tour_registrations"] { return r.text("status") == "confirmed" }; return false } }
    private func vehicle(_ row: DataRow) -> String { if case .object(let v) = row.values["tour_registrations"] { return "\(v.text("vehicle_manufacturer")) \(v.text("vehicle_model"))" }; return "Fahrzeug" }
    private func items(_ row: DataRow) -> [Payload] { if case .array(let a) = row.values["meal_order_items"] { return a.compactMap { if case .object(let p) = $0 { return p }; return nil } }; return [] }
    private func dishName(_ item: Payload) -> String { if case .object(let v) = item["menu_items"] { return v.text("name") }; return "Gericht" }
    private func load() async { await model.perform {
        model.orders = try await services.content.orders(stop.id)
        model.settings = try await services.content.load(.restaurantSettings, parentID: stop.id).first
        model.menu = try await services.content.load(.menu, parentID: stop.id)
    } }
    private func export() { do {
        let rows = validOrders.flatMap { row in items(row).map { [vehicle(row), dishName($0), String($0.integer("quantity")), $0.text("note")] } }
        try ExportDialog.save(CSV.encode([["Fahrzeug", "Gericht", "Menge", "Hinweis"]] + rows), name: "Restaurant.csv")
    } catch { model.error = error.localizedDescription } }
}
struct MealOrderEditor: View {
    let repository: ContentRepository
    let stopID: String
    let order: DataRow
    let menu: [DataRow]
    let close: () -> Void
    @StateObject private var model = ScreenModel()
    @State private var quantities: [String: Int] = [:]
    @State private var notes: [String: String] = [:]
    var body: some View {
        VStack {
            Text("Bestellung korrigieren").font(.headline); ErrorBanner(message: model.error)
            Form { ForEach(menu) { item in
                Stepper("\(item.values.text("name")): \(quantities[item.id] ?? 0)", value: Binding(get: { quantities[item.id] ?? 0 }, set: { quantities[item.id] = $0 }), in: 0...99)
                TextField("Hinweis", text: Binding(get: { notes[item.id] ?? "" }, set: { notes[item.id] = $0 }))
            } }.formStyle(.grouped)
            HStack { Button("Abbrechen", action: close); Spacer(); Button("Bestellung ersetzen") {
                Task { await model.perform {
                    let payload: [Payload] = quantities.filter { $0.value > 0 }.map { ["menu_item_id": .string($0.key), "quantity": .number(Double($0.value)), "note": notes[$0.key].flatMap { $0.nilIfEmpty }.map(JSONValue.string) ?? .null] }
                    try await repository.order(stopID: stopID, registrationID: order.values.text("registration_id"), expected: order.values, items: payload); close()
                } }
            }.disabled(model.busy) }
        }.padding().frame(width: 540, height: 570).interactiveDismissDisabled().protectDraft(true)
        .onAppear { if case .array(let items) = order.values["meal_order_items"] { for case .object(let item) in items { quantities[item.text("menu_item_id")] = item.integer("quantity"); notes[item.text("menu_item_id")] = item.text("note") } } }
    }
}
