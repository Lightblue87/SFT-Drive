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
            HStack { Text(kind.title).font(SFT.ui(15, .bold)); Spacer()
                Button("Hinzufügen", systemImage: "plus") { editor = .init(initial: defaults) }.buttonStyle(SFTSecondaryButtonStyle())
                Button("Laden", systemImage: "arrow.clockwise") { Task { await load() } }.labelStyle(.iconOnly).buttonStyle(SFTSecondaryButtonStyle())
            }.disabled(model.busy)
            ErrorBanner(message: model.error)
            // ContentUnavailableView blendet sein Icon aus, wenn der verfügbare Platz
            // knapp ist (adaptives Kompakt-Layout) -- in schmal gehaltenen Containern
            // wie der Hotelvorschläge-Box (frame(minHeight: 180) in AccommodationView)
            // verschwand das Piktogramm dadurch trotz gesetztem systemImage komplett
            // (Nutzerfeedback). Eigener, nicht-adaptiver Leerzustand zeigt Icon und
            // Text immer gemeinsam, unabhängig von der verfügbaren Höhe.
            if model.rows.isEmpty && !model.busy {
                Label("Noch keine Einträge", systemImage: kind.symbol).foregroundStyle(SFT.inkTertiary).padding(.vertical, 10)
            }
            List(model.rows) { row in
                VStack(alignment: .leading, spacing: 8) {
                    Text(row.values.text(kind.nameKey).isEmpty ? kind.title : row.values.text(kind.nameKey)).font(SFT.ui(13, .semibold))
                    if kind == .hotels { Text(hotelCaption(row)).font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
                    if kind == .menu {
                        HStack(spacing: 6) {
                            Text("\(row.values.text("price")) €").font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary)
                            SFTStatusPill(text: row.values.boolean("is_available") ? "Verfügbar" : "Deaktiviert", tone: row.values.boolean("is_available") ? .confirmed : .blocked)
                        }
                    }
                    HStack {
                        Button("Bearbeiten") { editor = .init(existing: row) }.buttonStyle(SFTSecondaryButtonStyle())
                        if kind == .menu { Button("Duplizieren") {
                            var copy = row.values; copy.removeValue(forKey: "id"); copy.removeValue(forKey: "created_at"); copy.removeValue(forKey: "updated_at")
                            copy["name"] = .string(row.values.text("name") + " (Kopie)")
                            copy["sort_order"] = .number(Double(row.values.integer("sort_order") + 1))
                            editor = .init(initial: copy)
                        }.buttonStyle(SFTSecondaryButtonStyle()) }
                        if kind == .stops && row.values.text("type") == "restaurant" { Button("Speisekarte & Bestellungen") { restaurant = row } .buttonStyle(SFTSecondaryButtonStyle())}
                        Button("Löschen", role: .destructive) { deleting = row }.buttonStyle(SFTDestructiveOutlineButtonStyle())
                    }
                }.padding(.vertical, 5)
                .listRowBackground(SFT.canvas)
            }
            .scrollContentBackground(.hidden)
            .background(SFT.canvas)
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }
        .foregroundStyle(SFT.ink)
        .task { await load() }
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
        if !row.values.text("price_per_night").isEmpty { text += " · \(row.values.text("price_per_night")) \(row.values.text("price_unit").nilIfEmpty ?? "€ / Nacht")" }
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
            Text("\(kind.title) · \(tour.title)").font(SFT.ui(16, .bold))
            ErrorBanner(message: model.error)
            if let latest = model.latest {
                DisclosureGroup("Aktueller Serverstand zum Vergleichen") {
                    ForEach(kind.fields) { field in
                        if latest.values[field.id] != model.values[field.id] {
                            LabeledContent(field.title, value: "Server: \(latest.values.text(field.id)) · Entwurf: \(model.values.text(field.id))")
                        }
                    }
                    Text("Entwurf bei Bedarf notieren, abbrechen und den Eintrag neu öffnen.").font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                }
                .tint(SFT.red)
            }
            Form { FormFields(fields: kind.fields, values: $model.values) }.formStyle(.grouped)
            HStack {
                Button("Abbrechen") { if model.initial != model.values { discard = true } else { close() } }.buttonStyle(SFTSecondaryButtonStyle())
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
                }.buttonStyle(SFTPrimaryButtonStyle()).keyboardShortcut("s").disabled(model.busy)
            }
        }.padding().frame(width: 610, height: 650).interactiveDismissDisabled().protectDraft(model.values != model.initial)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
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
                    VStack(alignment: .leading) { Text("Tag \(day.offset + 1) · \(day.element)").font(SFT.ui(13, .semibold))
                        Text(existing?.values.text("route_url").nilIfEmpty ?? existing?.values.text("kurviger_url").nilIfEmpty ?? "Kein Routen-Link").font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary).lineLimit(2) }
                    Spacer()
                    Button("Bearbeiten") {
                        var initial: Payload = ["stage_date": .string(day.element), "stage_number": .number(Double(day.offset + 1)), "title": .string("Tag \(day.offset + 1)")]
                        if let existing { initial = existing.values; if initial.text("route_url").isEmpty { initial["route_url"] = initial["kurviger_url"] } }
                        editor = .init(existing: existing.map { DataRow($0.values) }, initial: initial)
                    }.buttonStyle(SFTSecondaryButtonStyle())
                }
                .listRowBackground(SFT.canvas)
            }
            .scrollContentBackground(.hidden)
            .background(SFT.canvas)
        }
        .foregroundStyle(SFT.ink)
        .task { await model.load(services.content, kind: .stages, parentID: tour.id) }
        .sheet(item: $editor) { request in ResourceEditorView(repository: services.content, kind: .stages, parentID: tour.id, tour: tour, request: request) { editor = nil; Task { await model.load(services.content, kind: .stages, parentID: tour.id) } } }
    }
}
extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

@MainActor final class AccommodationModel: ScreenModel {
    @Published var confirmations: [AccommodationConfirmation] = []
    @Published var registrations: [TourRegistration] = []
    @Published var users: [AdminUser] = []
    @Published var matrix: [DataRow] = []
    @Published var night = ""
    @Published var selection: Set<String> = []
}
struct AccommodationView: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model = AccommodationModel()
    @State private var confirmReminder = false
    private var missing: [TourRegistration] { model.registrations.filter { row in !model.confirmations.contains { $0.user_id == row.user_id && $0.night_date == model.night } } }
    private var nights: [String] { TourDates.days(start: tour.start_date, end: tour.end_date, nights: true) }
    var body: some View {
        VStack(alignment: .leading) {
            ResourceListView(services: services, kind: .hotels, parentID: tour.id, tour: tour).frame(minHeight: 180, alignment: .top)
            Divider()
            // §36.8/§38.10: eine echte Matrix -- Zeile je bestätigtem Teilnehmer,
            // Spalte je Übernachtungsnacht -- statt nur einer Nacht auf einmal, damit
            // der Admin den Gesamtstatus (vollständig/teilweise/nicht bestätigt) ohne
            // Durchklicken jeder Nacht erkennt. Nutzt dieselben bereits gebündelt
            // geladenen Teilnehmermatrix-Daten wie die Teilnehmer- und die
            // tourübergreifende Planungsansicht (kein zusätzlicher Request je Nacht).
            Text("Hotelmatrix").font(SFT.ui(15, .bold))
            if model.matrix.isEmpty {
                Text("Keine bestätigten Teilnehmer.").foregroundStyle(SFT.inkTertiary).padding(.vertical, 6)
            } else {
                SFTCard {
                    ScrollView(.horizontal) {
                        Grid(alignment: .leading, horizontalSpacing: 14, verticalSpacing: 8) {
                            GridRow {
                                Text("Teilnehmer").font(SFT.ui(11, .bold)).foregroundStyle(SFT.inkTertiary)
                                ForEach(nights, id: \.self) { night in Text(shortNight(night)).font(SFT.mono(10, .bold)).foregroundStyle(SFT.inkTertiary) }
                            }
                            Divider().overlay(SFT.border)
                            ForEach(model.matrix.filter { $0.values.text("status") == "confirmed" }) { row in
                                GridRow {
                                    Text("\(row.values.text("username")) · \(row.values.text("vehicle"))").font(SFT.ui(12, .medium))
                                    ForEach(nights, id: \.self) { night in
                                        let cell = accommodationCell(row, night: night)
                                        SFTStatusPill(text: cell.label, tone: cell.confirmed ? .confirmed : .open)
                                    }
                                }
                            }
                        }
                    }.frame(maxHeight: 220)
                }
            }
            Divider().overlay(SFT.border); Text("Gezielte Erinnerung je Nacht").font(SFT.ui(15, .bold))
            ErrorBanner(message: model.error)
            if let notice = model.notice { Text(notice).font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
            Picker("Nacht", selection: $model.night) { ForEach(nights, id: \.self) { Text($0).tag($0) } }
            Text("\(model.registrations.count - missing.count) / \(model.registrations.count) bestätigt").font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary)
            List(model.registrations, selection: $model.selection) { row in
                let confirmation = model.confirmations.first { $0.user_id == row.user_id && $0.night_date == model.night }
                HStack {
                    Text(model.users.first(where: { $0.id == row.user_id })?.username ?? row.user_id).font(SFT.ui(12, .medium))
                    Spacer()
                    if let confirmation { SFTStatusPill(text: confirmation.accommodation_choice == "other_accommodation" ? "Andere Unterkunft" : confirmation.hotel_suggestion_id == nil ? "Bestätigt" : "Hotelvorschlag gewählt", tone: .confirmed) }
                    else { SFTStatusPill(text: "Übernachtung noch nicht bestätigt", tone: .open) }
                }.tag(row.user_id)
                .listRowBackground(SFT.canvas)
            }
            .scrollContentBackground(.hidden)
            .background(SFT.canvas)
            .frame(minHeight: 100)
            Button("Auswahl erinnern (\(model.selection.count))") { confirmReminder = true }.buttonStyle(SFTPrimaryButtonStyle()).disabled(model.selection.isEmpty || model.busy)
        }
        .foregroundStyle(SFT.ink)
        .task {
            model.night = tour.start_date
            await model.perform {
                model.confirmations = try await services.planning.accommodation(tour.id)
                model.registrations = try await services.people.registrations(tour.id).filter { $0.status == "confirmed" }
                model.users = try await services.people.users()
                model.matrix = try await services.planning.participantMatrix([tour.id])
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
    private func shortNight(_ night: String) -> String { night.count >= 10 ? String(night.suffix(5)) : night }
    private func accommodationCell(_ row: DataRow, night targetNight: String) -> (label: String, confirmed: Bool) {
        guard case .array(let allNights) = row.values["accommodation"],
              let entry = allNights.first(where: { value in guard case .object(let n) = value else { return false }; return n.text("night_date") == targetNight }),
              case .object(let fields) = entry else { return ("–", false) }
        guard fields.boolean("confirmed") else { return ("Offen", false) }
        if let hotelName = fields.text("hotel_name").nilIfEmpty { return (hotelName, true) }
        return (fields.text("choice") == "other_accommodation" ? "Andere Unterkunft" : "Bestätigt", true)
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
            HStack { Text(stop.values.text("title")).font(SFT.ui(20, .bold)); Spacer(); Button("Schließen", action: close).buttonStyle(SFTSecondaryButtonStyle()) }
            ErrorBanner(message: model.error)
            Button("Bestellfenster bearbeiten") { settingsEditor = .init(existing: model.settings) }.buttonStyle(SFTSecondaryButtonStyle())
            HSplitView {
                ResourceListView(services: services, kind: .menu, parentID: stop.id, tour: tour)
                VStack(alignment: .leading) {
                    HStack { Text("Eingereichte Bestellungen").font(SFT.ui(15, .bold)); Spacer(); Button("CSV") { export() }.buttonStyle(SFTSecondaryButtonStyle()); Button("Laden") { Task { await load() } }.buttonStyle(SFTSecondaryButtonStyle()) }
                    List(validOrders) { row in
                        VStack(alignment: .leading) {
                            Text(vehicle(row)).font(SFT.ui(13, .semibold))
                            ForEach(Array(items(row).enumerated()), id: \.offset) { Text("\($0.element.integer("quantity")) × \(dishName($0.element)) · \($0.element.text("note"))").font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
                            Button("Bestellung korrigieren") { model.editOrder = row }.buttonStyle(SFTSecondaryButtonStyle())
                        }
                        .listRowBackground(SFT.canvas)
                    }
                    .scrollContentBackground(.hidden)
                    .background(SFT.canvas)
                }.frame(minWidth: 380)
            }
        }
        .padding().frame(width: 1050, height: 730)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .task { await load() }
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
            Text("Bestellung korrigieren").font(SFT.ui(16, .bold)); ErrorBanner(message: model.error)
            Form { ForEach(menu) { item in
                Stepper("\(item.values.text("name")): \(quantities[item.id] ?? 0)", value: Binding(get: { quantities[item.id] ?? 0 }, set: { quantities[item.id] = $0 }), in: 0...99)
                TextField("Hinweis", text: Binding(get: { notes[item.id] ?? "" }, set: { notes[item.id] = $0 }))
            } }.formStyle(.grouped)
            HStack { Button("Abbrechen", action: close).buttonStyle(SFTSecondaryButtonStyle()); Spacer(); Button("Bestellung ersetzen") {
                Task { await model.perform {
                    let payload: [Payload] = quantities.filter { $0.value > 0 }.map { ["menu_item_id": .string($0.key), "quantity": .number(Double($0.value)), "note": notes[$0.key].flatMap { $0.nilIfEmpty }.map(JSONValue.string) ?? .null] }
                    try await repository.order(stopID: stopID, registrationID: order.values.text("registration_id"), expected: order.values, items: payload); close()
                } }
            }.buttonStyle(SFTPrimaryButtonStyle()).disabled(model.busy) }
        }.padding().frame(width: 540, height: 570).interactiveDismissDisabled().protectDraft(true)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .onAppear { if case .array(let items) = order.values["meal_order_items"] { for case .object(let item) in items { quantities[item.text("menu_item_id")] = item.integer("quantity"); notes[item.text("menu_item_id")] = item.text("note") } } }
    }
}
