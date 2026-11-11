import SwiftUI

struct ConnectionView: View {
    @EnvironmentObject private var auth: AuthManager
    @State private var configuration = ConnectionConfiguration.load()
    @State private var message: String?
    var body: some View {
        Form {
            Section("Supabase-Verbindung") {
                TextField("Projekt-URL (HTTPS)", text: $configuration.url)
                TextField("Öffentlicher Publishable-/Anon-Key", text: $configuration.publishableKey)
                Text("Denselben öffentlichen Key wie in der PWA verwenden. Keine Admin- oder Service-Role-Schlüssel. Änderungen verbinden die App neu.").font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                Button("Verbindung speichern") {
                    do { try configuration.save(); Task { await auth.logout(); await auth.configure(configuration) }; message = "Verbindung gespeichert." }
                    catch { message = error.localizedDescription }
                }.buttonStyle(SFTPrimaryButtonStyle())
                if let message { Text(message).font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
            }
        }.formStyle(.grouped).frame(minWidth: 540, minHeight: 260).background(SFT.canvas).foregroundStyle(SFT.ink)
    }
}
@MainActor final class NotificationsModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var target = ""
    @Published var title = ""
    @Published var body = ""
}
struct NotificationsView: View {
    let services: AppServices
    @StateObject private var model = NotificationsModel()
    @State private var confirm = false
    var body: some View {
        Form {
            Section("Empfänger") {
                Picker("Mitteilung an", selection: $model.target) {
                    Text("Alle Nutzer").tag("")
                    ForEach(model.tours) { Text($0.title).tag($0.id) }
                }
            }
            Section("Mitteilung") {
                TextField("Titel", text: $model.title)
                TextEditor(text: $model.body).frame(minHeight: 150).accessibilityLabel("Mitteilungstext")
                Button("Vorschau und Senden") { confirm = true }.buttonStyle(SFTPrimaryButtonStyle())
                    .disabled(model.busy || model.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                ErrorBanner(message: model.error)
                if let notice = model.notice { Text(notice).font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
            }
        }.formStyle(.grouped).navigationTitle("Mitteilungen").protectDraft(!model.title.isEmpty || !model.body.isEmpty)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .task { await model.perform {
            var offset = 0
            while true { let page = try await services.tours.list(query: "", offset: offset, archived: false); model.tours += page; if page.count < 100 { break }; offset += 100; try Task.checkCancellation() }
        } }
        .confirmationDialog("An \(model.target.isEmpty ? "alle Nutzer" : model.tours.first(where: { $0.id == model.target })?.title ?? "Tourteilnehmer") senden?\n\(model.title)\n\(model.body)", isPresented: $confirm, titleVisibility: .visible) {
            Button("Jetzt senden") { Task { await model.perform {
                model.notice = try await services.content.notify(tourID: model.target.nilIfEmpty, title: model.title, body: model.body)
                model.title = ""; model.body = ""
            } } }
        }
    }
}
struct LegalSettingsView: View {
    let repository: ContentRepository
    @StateObject private var model = ScreenModel()
    @State private var values: Payload = [:]
    @State private var initial: Payload = [:]
    private let fields: [FormField] = [.init("organization_name", "Organisation"), .init("responsible_name", "Verantwortliche Person"), .init("street", "Straße"), .init("postal_code", "Postleitzahl"), .init("city", "Ort"), .init("contact_email", "Kontakt-E-Mail"), .init("phone", "Telefon")]
    var body: some View {
        Form {
            Section("Impressum & Datenschutz") { FormFields(fields: fields, values: $values) }
            ErrorBanner(message: model.error)
            if let notice = model.notice { Text(notice).font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary) }
            Button("Speichern") { Task { await model.perform { try await repository.saveSiteSettings(FormValidation.payload(values, fields: fields)); initial = values; model.notice = "Gespeichert." } } }.buttonStyle(SFTPrimaryButtonStyle()).disabled(model.busy)
        }.formStyle(.grouped).navigationTitle("Impressum & Datenschutz").protectDraft(values != initial)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .task { await model.perform { values = try await repository.siteSettings(); initial = values } }
    }
}
