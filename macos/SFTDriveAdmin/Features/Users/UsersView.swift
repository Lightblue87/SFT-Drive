import SwiftUI

@MainActor final class UsersModel: ScreenModel {
    @Published var users: [AdminUser] = []
    @Published var vehicles: [Vehicle] = []
    @Published var selection: String?
    @Published var query = ""
    let repository: PeopleRepository
    init(_ repository: PeopleRepository) { self.repository = repository }
    func load() async { await perform { users = try await repository.users() } }
    var filtered: [AdminUser] { users.filter { query.isEmpty || "\($0.username) \($0.first_name) \($0.last_name) \($0.email)".localizedCaseInsensitiveContains(query) }.sorted { $0.username.localizedStandardCompare($1.username) == .orderedAscending } }
}
struct UsersView: View {
    @StateObject private var model: UsersModel
    @State private var operation: String?
    @State private var sortOrder = [KeyPathComparator(\AdminUser.username)]
    init(repository: PeopleRepository) { _model = StateObject(wrappedValue: UsersModel(repository)) }
    private var selected: AdminUser? { model.users.first { $0.id == model.selection } }
    var body: some View {
        VStack(spacing: 0) {
            ErrorBanner(message: model.error)
            TextField("Nutzer nach Name, Username oder E-Mail suchen", text: $model.query).textFieldStyle(.roundedBorder).padding()
            HSplitView {
                Table(model.filtered.sorted(using: sortOrder), selection: $model.selection, sortOrder: $sortOrder) {
                    TableColumn("Username", value: \.username)
                    TableColumn("Vorname", value: \.first_name)
                    TableColumn("Nachname", value: \.last_name)
                    TableColumn("Rolle") { Text($0.is_admin ? "Admin" : "Mitglied") }
                    TableColumn("Zugang") { Text($0.is_banned ? "Gesperrt" : "Aktiv") }
                    TableColumn("Registriert") { Text(TourDates.displayDate($0.created_at)) }
                }.frame(minWidth: 550)
                if let selected {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            Text(selected.username).font(.title2.bold())
                            Text("\(selected.first_name) \(selected.last_name)"); Text(selected.email).textSelection(.enabled)
                            Text("Registriert: \(TourDates.displayDate(selected.created_at))").font(.caption)
                            Button(selected.is_admin ? "Adminrolle entziehen" : "Adminrolle vergeben") { operation = "role" }
                            Button(selected.is_banned ? "Entsperren" : "Sperren") { operation = selected.is_banned ? "unban" : "ban" }
                            Button("Konto löschen", role: .destructive) { operation = "delete" }
                            Divider(); Text("Fahrzeuggarage").font(.headline)
                            if model.vehicles.isEmpty { Text("Keine Fahrzeuge gespeichert.").foregroundStyle(.secondary) }
                            ForEach(model.vehicles) { v in
                                GroupBox {
                                    VStack(alignment: .leading) {
                                        Text("\(v.manufacturer) \(v.model)").bold()
                                        Text("\(v.power_ps) PS · \(v.license_plate ?? "Kein Kennzeichen")")
                                        if v.is_default { Label("Standardfahrzeug", systemImage: "star.fill").font(.caption) }
                                    }.frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }.padding()
                    }.frame(minWidth: 300).disabled(model.busy)
                }
            }
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }.navigationTitle("Nutzerverwaltung")
        .toolbar { Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.keyboardShortcut("r") }
        .task { await model.load() }
        .task(id: model.selection) {
            model.vehicles = []
            guard let id = model.selection else { return }
            do { let vehicles = try await model.repository.vehicles(id); try Task.checkCancellation(); model.vehicles = vehicles }
            catch is CancellationError { } catch { model.error = error.localizedDescription }
        }
        .confirmationDialog(operation == "delete" ? "Konto von \(selected?.username ?? "") endgültig löschen?" : "Zugang oder Rolle von \(selected?.username ?? "") ändern?", isPresented: Binding(get: { operation != nil }, set: { if !$0 { operation = nil } }), titleVisibility: .visible) {
            Button("Änderung bestätigen", role: .destructive) {
                guard let selected, let operation else { return }; self.operation = nil
                Task { await model.perform {
                    if operation == "role" { try await model.repository.setAdmin(selected) }
                    else { try await model.repository.manage(selected.id, operation: operation) }
                }; await model.load() }
            }
        }
    }
}
