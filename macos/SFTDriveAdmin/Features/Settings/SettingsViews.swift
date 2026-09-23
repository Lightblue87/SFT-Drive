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
    // Verlauf getrennt vom Sendeformular gehalten -- eine eigene
    // batchesLoading-/batchesError-Property statt des geteilten busy/error
    // aus perform(), damit der initiale Touren-Load und der Verlauf-Reload
    // (beide feuern gleichzeitig, ohne dass einer auf den anderen wartet)
    // sich nicht gegenseitig über perform()s "guard !busy" blockieren.
    @Published var batches: [NotificationBatch] = []
    @Published var batchesLoading = false
    @Published var batchesError: String?
}
struct NotificationsView: View {
    let services: AppServices
    @StateObject private var model = NotificationsModel()
    @State private var confirm = false
    @State private var openBatch: NotificationBatch?
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
            // Lesebestätigung/Verlauf bereits versendeter Mitteilungen an das
            // aktuell gewählte Ziel (§27.24) -- dieselben admin_list_notification_batches/
            // admin_get_notification_batch_recipients-RPCs wie in der PWA
            // (AdminNotificationsPage), keine eigene zweite Fach-Logik (§2/§23).
            Section("Verlauf") {
                if model.batchesLoading {
                    ProgressView().controlSize(.small)
                } else if let error = model.batchesError {
                    Text(error).font(SFT.mono(11)).foregroundStyle(.red)
                } else if model.batches.isEmpty {
                    Text("Noch keine Mitteilung an dieses Ziel gesendet.").font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                } else {
                    ForEach(model.batches) { batch in
                        Button { openBatch = batch } label: {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(batch.title).font(SFT.ui(13, .semibold)).foregroundStyle(SFT.ink)
                                    Text(batch.body).font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary).lineLimit(1)
                                    Text(NotificationBatch.displayTimestamp(batch.created_at)).font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
                                }
                                Spacer()
                                Text("\(batch.read_count) / \(batch.recipient_count) gelesen").font(SFT.mono(11)).foregroundStyle(SFT.inkSecondary)
                            }
                        }.buttonStyle(.plain)
                    }
                }
            }
        }.formStyle(.grouped).navigationTitle("Mitteilungen").protectDraft(!model.title.isEmpty || !model.body.isEmpty)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .task { await model.perform {
            var offset = 0
            while true { let page = try await services.tours.list(query: "", offset: offset, archived: false); model.tours += page; if page.count < 100 { break }; offset += 100; try Task.checkCancellation() }
        } }
        // .task(id:) bricht beim Zielwechsel automatisch die noch laufende
        // vorherige Anfrage ab, bevor die neue startet -- eine spätere, aber
        // langsamere Antwort für ein bereits verlassenes Ziel kann den
        // Verlauf des inzwischen aktuell gewählten Ziels damit nicht mehr
        // überschreiben (analog zum Request-Zähler-Fix in der PWA, PR-Review zu PR #29).
        .task(id: model.target) {
            model.batchesLoading = true; model.batchesError = nil
            do {
                let result = try await services.content.notificationBatches(tourID: model.target.nilIfEmpty)
                try Task.checkCancellation()
                model.batches = result
            } catch is CancellationError {
            } catch { model.batchesError = error.localizedDescription }
            model.batchesLoading = false
        }
        .confirmationDialog("An \(model.target.isEmpty ? "alle Nutzer" : model.tours.first(where: { $0.id == model.target })?.title ?? "Tourteilnehmer") senden?\n\(model.title)\n\(model.body)", isPresented: $confirm, titleVisibility: .visible) {
            Button("Jetzt senden") { Task { await model.perform {
                model.notice = try await services.content.notify(tourID: model.target.nilIfEmpty, title: model.title, body: model.body)
                model.title = ""; model.body = ""
                model.batches = try await services.content.notificationBatches(tourID: model.target.nilIfEmpty)
            } } }
        }
        .sheet(item: $openBatch) { batch in
            NotificationBatchDetailView(repository: services.content, batch: batch) { openBatch = nil }
        }
    }
}
struct NotificationBatchDetailView: View {
    let repository: ContentRepository
    let batch: NotificationBatch
    let close: () -> Void
    @StateObject private var model = ScreenModel()
    @State private var recipients: [NotificationBatchRecipient] = []
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(batch.title).font(SFT.ui(16, .bold))
            Text(batch.body).font(SFT.ui(13)).foregroundStyle(SFT.inkSecondary)
            Text("GELESEN \(batch.read_count) / \(batch.recipient_count)").font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
            ErrorBanner(message: model.error)
            if model.busy {
                ProgressView().controlSize(.small)
            } else {
                List(recipients) { recipient in
                    HStack {
                        Text(recipient.username).foregroundStyle(recipient.read_at != nil ? SFT.ink : SFT.inkSecondary)
                        Spacer()
                        Text(recipient.read_at.map(NotificationBatch.displayTimestamp) ?? "noch nicht gelesen")
                            .font(SFT.mono(10)).foregroundStyle(recipient.read_at != nil ? SFT.inkTertiary : .red)
                    }
                }.listStyle(.inset)
            }
            HStack { Spacer(); Button("Schließen", action: close).buttonStyle(SFTSecondaryButtonStyle()) }
        }.padding().frame(width: 480, height: 520)
        .background(SFT.canvas).foregroundStyle(SFT.ink)
        .task { await model.perform { recipients = try await repository.notificationBatchRecipients(batch.batch_id) } }
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
