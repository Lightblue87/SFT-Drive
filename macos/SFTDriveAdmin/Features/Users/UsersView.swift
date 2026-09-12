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
            SFTPageHeader(title: "Nutzerverwaltung") {
                EmptyView()
            } trailing: {
                Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.keyboardShortcut("r").buttonStyle(SFTSecondaryButtonStyle())
            }
            ErrorBanner(message: model.error)
            TextField("Nutzer nach Name, Username oder E-Mail suchen", text: $model.query).textFieldStyle(.roundedBorder).padding(.horizontal).padding(.bottom, 10)
            HSplitView {
                Table(model.filtered.sorted(using: sortOrder), selection: $model.selection, sortOrder: $sortOrder) {
                    TableColumn("Username", value: \.username)
                    TableColumn("Vorname", value: \.first_name)
                    TableColumn("Nachname", value: \.last_name)
                    TableColumn("Rolle") { SFTStatusPill(text: $0.is_admin ? "Admin" : "Mitglied", tone: $0.is_admin ? .confirmed : .neutral) }
                    TableColumn("Zugang") { SFTStatusPill(text: $0.is_banned ? "Gesperrt" : "Aktiv", tone: $0.is_banned ? .blocked : .confirmed) }
                    TableColumn("Registriert") { Text(TourDates.displayDate($0.created_at)).font(SFT.mono(11)) }
                }
                .scrollContentBackground(.hidden)
                .background(SFT.canvas)
                .frame(minWidth: 550)
                if let selected {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            Text(selected.username).font(SFT.ui(20, .bold))
                            Text("\(selected.first_name) \(selected.last_name)").font(SFT.ui(13)); Text(selected.email).font(SFT.mono(12)).foregroundStyle(SFT.inkSecondary).textSelection(.enabled)
                            Text("Registriert: \(TourDates.displayDate(selected.created_at))").font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                            Button(selected.is_admin ? "Adminrolle entziehen" : "Adminrolle vergeben") { operation = "role" }.buttonStyle(SFTSecondaryButtonStyle())
                            Button(selected.is_banned ? "Entsperren" : "Sperren") { operation = selected.is_banned ? "unban" : "ban" }.buttonStyle(SFTSecondaryButtonStyle())
                            Button("Konto löschen", role: .destructive) { operation = "delete" }.buttonStyle(SFTDestructiveOutlineButtonStyle())
                            Divider().overlay(SFT.border); Text("Fahrzeuggarage").font(SFT.ui(15, .bold))
                            if model.vehicles.isEmpty { Text("Keine Fahrzeuge gespeichert.").foregroundStyle(SFT.inkTertiary) }
                            ForEach(model.vehicles) { v in
                                SFTCard {
                                    VStack(alignment: .leading) {
                                        Text("\(v.manufacturer) \(v.model)").font(SFT.ui(13, .semibold))
                                        Text("\(v.power_ps) PS · \(v.license_plate ?? "Kein Kennzeichen")").font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary)
                                        if v.is_default { SFTStatusPill(text: "Standardfahrzeug", tone: .confirmed) }
                                    }.frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }.padding()
                    }.frame(minWidth: 300).disabled(model.busy).background(SFT.canvas)
                }
            }
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .navigationTitle("Nutzerverwaltung")
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
