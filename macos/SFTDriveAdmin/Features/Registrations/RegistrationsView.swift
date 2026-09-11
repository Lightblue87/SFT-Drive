import SwiftUI

@MainActor final class RegistrationsModel: ScreenModel {
    @Published var rows: [TourRegistration] = []
    @Published var users: [AdminUser] = []
    @Published var selection: Set<String> = []
    @Published var filter = "all"
    @Published var query = ""
    @Published var results: [String] = []
    @Published var matrix: [DataRow] = []
    let repository: PeopleRepository
    let tourID: String
    init(_ repository: PeopleRepository, tourID: String) { self.repository = repository; self.tourID = tourID }
    func load() async {
        await perform {
            let registrations = try await repository.registrations(tourID)
            let people = try await repository.users()
            try Task.checkCancellation()
            rows = registrations; users = people
            matrix = try await PlanningRepository(repository.client).participantMatrix([tourID])
            selection.formIntersection(Set(rows.map(\.id)))
        }
    }
    func name(_ row: TourRegistration) -> String { users.first { $0.id == row.user_id }?.username ?? row.user_id }
    // Klarname ist Admin-Inhalt (§5/§12 "Admin kann ... Klarname sehen"), anders als die
    // datensparsame Teilnehmer-Fahrzeugliste (§8.9) oder der CSV-Export (§35.1, dort weiterhin
    // ohne Klarname per Default) -- deshalb nur für die Anzeige hier, nicht für name()/den Export.
    func displayName(_ row: TourRegistration) -> String {
        guard let user = users.first(where: { $0.id == row.user_id }) else { return row.user_id }
        let full = "\(user.first_name) \(user.last_name)".trimmingCharacters(in: .whitespaces)
        return full.isEmpty ? user.username : "\(full) · \(user.username)"
    }
    var filtered: [TourRegistration] {
        rows.filter { (filter == "all" || (filter == "arrived" ? $0.checked_in_at != nil && $0.status == "confirmed" : $0.status == filter)) &&
            (query.isEmpty || "\(displayName($0)) \($0.vehicle_manufacturer) \($0.vehicle_model)".localizedCaseInsensitiveContains(query)) }
        .sorted { ($0.registered_at, $0.id) < ($1.registered_at, $1.id) }
    }
    func apply(_ action: String) async {
        let targets = rows.filter { selection.contains($0.id) }
        await perform {
            results = []
            for row in targets {
                try Task.checkCancellation()
                do { try await repository.change(row.id, action: action); results.append("\(name(row)): erledigt") }
                catch { results.append("\(name(row)): \(error.localizedDescription)") }
            }
        }
        await load()
    }
}
struct RegistrationsView: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model: RegistrationsModel
    @State private var action: String?
    @State private var adding = false
    @State private var totalPersons = 1
    @State private var includePrivateExportFields = false
    init(services: AppServices, tour: Tour) {
        self.services = services; self.tour = tour
        _model = StateObject(wrappedValue: RegistrationsModel(services.people, tourID: tour.id))
    }
    private var selected: TourRegistration? { model.rows.first { model.selection.contains($0.id) } }
    var body: some View {
        VStack(alignment: .leading) {
            ErrorBanner(message: model.error)
            HStack {
                TextField("Name oder Fahrzeug", text: $model.query).textFieldStyle(.roundedBorder)
                Picker("Status", selection: $model.filter) { Text("Alle").tag("all"); ForEach(["confirmed", "pending", "waitlisted", "cancelled", "rejected", "arrived"], id: \.self) { Text($0 == "arrived" ? "Eingecheckt" : Labels.status($0)).tag($0) } }
            }
            HStack {
                Button("Hinzufügen", systemImage: "plus") { adding = true }
                Menu("Auswahl (\(model.selection.count))") {
                    Button("Bestätigen") { action = "approve_tour_registration" }
                    Button("Ablehnen") { action = "reject_tour_registration" }
                    Button("Entfernen", role: .destructive) { action = "admin_remove_registration" }
                }.disabled(model.selection.isEmpty || model.busy)
                Button("CSV exportieren") { export() }
                Toggle("Klarname & Kennzeichen einschließen", isOn: $includePrivateExportFields).toggleStyle(.checkbox)
                Button("Laden", systemImage: "arrow.clockwise") { Task { await model.load() } }.labelStyle(.iconOnly)
            }
            Table(model.filtered, selection: $model.selection) {
                TableColumn("Fahrer") { Text(model.displayName($0)) }
                TableColumn("Fahrzeug") { Text("\($0.vehicle_manufacturer) \($0.vehicle_model)") }
                TableColumn("PS") { Text("\($0.vehicle_power_ps)") }.width(45)
                TableColumn("Personen") { Text("\($0.passenger_count + 1)") }.width(60)
                TableColumn("Status") { StatusBadge(value: $0.status) }
            }.contextMenu {
                Button("Auswahl bestätigen") { action = "approve_tour_registration" }.disabled(model.selection.isEmpty)
                Button("Auswahl entfernen", role: .destructive) { action = "admin_remove_registration" }.disabled(model.selection.isEmpty)
            }
            GroupBox("Teilnehmermatrix") {
                if model.matrix.isEmpty { Text("Keine bestätigten Teilnehmer.").foregroundStyle(.secondary) }
                else { ScrollView(.horizontal) { Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 8) {
                    GridRow { Text("Teilnehmer").bold(); Text("Status").bold(); Text("Personen").bold(); Text("Unterkunft").bold(); Text("Essen").bold(); Text("Check-in").bold() }
                    Divider()
                    ForEach(model.matrix) { row in GridRow {
                        Text("\(row.values.text("username")) · \(row.values.text("vehicle"))")
                        Text(Labels.status(row.values.text("status")))
                        Text("\(row.values.integer("persons"))")
                        Text(row.values.text("status") == "confirmed" ? matrixAccommodation(row) : "–")
                        Text(row.values.text("status") == "confirmed" ? matrixMeals(row) : "–")
                        Text(row.values.text("status") == "confirmed" ? (row.values.text("checked_in_at").isEmpty ? "Offen" : "Eingecheckt") : "–")
                    } }
                } } }
            }
            if let selected, model.selection.count == 1 {
                GroupBox("\(model.displayName(selected)) · \(selected.vehicle_manufacturer) \(selected.vehicle_model)") {
                    HStack {
                        Text("Kennzeichen: \(selected.license_plate ?? "–")").textSelection(.enabled)
                        Spacer()
                        if selected.status == "confirmed" {
                            Button(selected.checked_in_at == nil ? "Als angekommen markieren" : "Check-in zurücknehmen") {
                                Task { await model.perform { try await services.people.checkIn(selected.id, arrived: selected.checked_in_at == nil) }; await model.load() }
                            }
                        }
                    }
                    HStack {
                        Stepper("Personen: \(totalPersons)", value: $totalPersons, in: 1...99)
                        Button("Personenzahl speichern") { Task { await model.perform { try await services.people.persons(selected.id, total: totalPersons) }; await model.load() } }
                    }
                }.disabled(model.busy)
                .onChange(of: selected.id, initial: true) { _, _ in totalPersons = selected.passenger_count + 1 }
            }
            if !model.results.isEmpty { DisclosureGroup("Ergebnis je Teilnehmer") { ScrollView { ForEach(Array(model.results.enumerated()), id: \.offset) { Text($0.element).frame(maxWidth: .infinity, alignment: .leading) } }.frame(maxHeight: 130) } }
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }.task { await model.load() }
        .sheet(isPresented: $adding) { AddRegistrationView(repository: services.people, tour: tour) { adding = false; Task { await model.load() } } }
        .confirmationDialog("\(model.selection.count) ausgewählte Anmeldungen ändern? \(action == "admin_remove_registration" ? "Entfernen gibt Plätze frei und kann Wartelisten-Nachrücken auslösen." : "Die serverseitigen Teilnahme- und Kapazitätsregeln gelten weiterhin.")", isPresented: Binding(get: { action != nil }, set: { if !$0 { action = nil } }), titleVisibility: .visible) {
            Button("Auswahl ändern", role: .destructive) { let selectedAction = action!; action = nil; Task { await model.apply(selectedAction) } }
        }
    }
    private func matrixAccommodation(_ row: DataRow) -> String {
        guard case .array(let nights) = row.values["accommodation"] else { return "–" }
        return nights.compactMap { value -> String? in guard case .object(let night) = value else { return nil }; return night.boolean("confirmed") ? (night.text("hotel_name").nilIfEmpty ?? (night.text("choice") == "other_accommodation" ? "Andere Unterkunft" : "Bestätigt")) : "Offen" }.joined(separator: " | ")
    }
    private func matrixMeals(_ row: DataRow) -> String {
        guard case .array(let stops) = row.values["restaurants"] else { return "–" }
        return stops.compactMap { value -> String? in guard case .object(let stop) = value else { return nil }; return "\(stop.text("title")): \(stop.boolean("ordered") ? "bestellt" : "offen")" }.joined(separator: " | ")
    }
    // §35.1: Klarname und Kennzeichen nur mit ausdrücklicher Admin-Auswahl in den Export
    // aufnehmen, Standard aus -- analog zur bestehenden PWA-Checkbox "Klarname & Kennzeichen
    // einschließen" in AdminTourFormPage/Teilnehmerverwaltung.
    private func export() {
        do {
            let header = ["Username", "Hersteller", "Modell", "PS", "Personen", "Status"] + (includePrivateExportFields ? ["Vorname", "Nachname", "Kennzeichen"] : [])
            let rows = model.filtered.map { row -> [String] in
                var fields = [model.name(row), row.vehicle_manufacturer, row.vehicle_model, String(row.vehicle_power_ps), String(row.passenger_count + 1), Labels.status(row.status)]
                if includePrivateExportFields {
                    let user = model.users.first { $0.id == row.user_id }
                    fields += [user?.first_name ?? "", user?.last_name ?? "", row.license_plate ?? ""]
                }
                return fields
            }
            try ExportDialog.save(CSV.encode([header] + rows), name: "Teilnehmer.csv")
        } catch { model.error = error.localizedDescription }
    }
}
@MainActor final class AddRegistrationModel: ScreenModel {
    @Published var users: [AdminUser] = []
    @Published var vehicles: [Vehicle] = []
    @Published var userID = ""
    @Published var vehicleID = ""
    @Published var fields: Payload = [:]
    @Published var persons = 1
}
struct AddRegistrationView: View {
    let repository: PeopleRepository
    let tour: Tour
    let close: () -> Void
    @StateObject private var model = AddRegistrationModel()
    private let fields: [FormField] = [.init("p_vehicle_manufacturer", "Hersteller", required: true), .init("p_vehicle_model", "Modell", required: true), .init("p_vehicle_power_ps", "Leistung (PS)", .integer, required: true), .init("p_license_plate", "Kennzeichen")]
    var body: some View {
        VStack {
            Text("Teilnehmer zu \(tour.title) hinzufügen").font(.headline)
            Text("Umgeht Anmeldefrist und Leistungs-/Altersbedingungen. Fahrzeuglimit und Kennzeichenpflicht bleiben wirksam.").font(.caption).foregroundStyle(.secondary)
            ErrorBanner(message: model.error)
            Form {
                Picker("Nutzer", selection: $model.userID) { Text("Auswählen").tag(""); ForEach(model.users) { Text("\($0.username) · \($0.first_name) \($0.last_name)").tag($0.id) } }
                Picker("Garage", selection: $model.vehicleID) { Text("Eigene Eingabe").tag(""); ForEach(model.vehicles) { Text("\($0.manufacturer) \($0.model)").tag($0.id) } }
                FormFields(fields: fields, values: $model.fields)
                Stepper("Personen inkl. Fahrer: \(model.persons)", value: $model.persons, in: 1...99)
            }.formStyle(.grouped)
            HStack { Button("Abbrechen", action: close); Spacer(); Button("Verbindlich hinzufügen") {
                Task { await model.perform {
                    var payload = try FormValidation.payload(model.fields, fields: fields)
                    payload["p_passenger_count"] = .number(Double(model.persons - 1))
                    try await repository.addRegistration(tourID: tour.id, userID: model.userID, fields: payload); close()
                } }
            }.buttonStyle(.borderedProminent).disabled(model.userID.isEmpty || model.busy) }
        }.padding().frame(width: 560, height: 590).interactiveDismissDisabled().protectDraft(!model.userID.isEmpty)
        .task { await model.perform { model.users = try await repository.users() } }
        .task(id: model.userID) {
            guard !model.userID.isEmpty else { return }
            model.vehicles = []; model.vehicleID = ""; model.fields = [:]
            await model.perform {
                let vehicles = try await repository.vehicles(model.userID); try Task.checkCancellation()
                model.vehicles = vehicles; model.vehicleID = vehicles.first(where: \.is_default)?.id ?? vehicles.first?.id ?? ""
            }
        }
        .onChange(of: model.vehicleID) { _, id in
            if let v = model.vehicles.first(where: { $0.id == id }) {
                model.fields = ["p_vehicle_manufacturer": .string(v.manufacturer), "p_vehicle_model": .string(v.model), "p_vehicle_power_ps": .number(Double(v.power_ps)), "p_license_plate": v.license_plate.map(JSONValue.string) ?? .null]
            }
        }
    }
}
