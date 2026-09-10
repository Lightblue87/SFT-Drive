import SwiftUI

struct AISettingsView: View {
    @State private var configuration = AIConfiguration.load()
    @State private var token = ""
    @State private var models: [String] = []
    @StateObject private var state = ScreenModel()
    var body: some View {
        Form {
            Toggle("KI-Unterstützung", isOn: $configuration.enabled)
            Text("Ollama · optionale Analyse, keine automatischen Datenbankänderungen").font(.caption)
            TextField("Ollama-Endpunkt", text: $configuration.endpoint)
            SecureField("Zugangsschlüssel für eigenen Server (optional lokal)", text: $token)
            Toggle("Lokale Modelle; Cloud-Funktionen in Ollama deaktiviert", isOn: $configuration.localInferenceConfirmed)
            Text("Ollama mit OLLAMA_NO_CLOUD=1 neu starten. Ein localhost-Endpunkt allein verhindert keine Cloud-Weiterleitung. Es werden keine Modelle installiert.").font(.caption).foregroundStyle(.secondary)
            TextField("Modell", text: $configuration.model)
            if !models.isEmpty { Picker("Installierte Modelle", selection: $configuration.model) { Text("Auswählen").tag(""); ForEach(models, id: \.self) { Text($0).tag($0) } } }
            Button("Modelle laden") { Task { await state.perform {
                try saveCredential()
                models = try await OllamaProvider(configuration: configuration, model: configuration.model).models()
            } } }
            Toggle("Fallback bei vorübergehender Nichtverfügbarkeit", isOn: $configuration.fallbackEnabled)
            TextField("Weitere lokale Modelle (je eine Zeile)", text: $configuration.fallbackModels, axis: .vertical).lineLimit(3...4)
            Slider(value: $configuration.timeout, in: 10...180, step: 10) { Text("Zeitlimit") }
            Text("Gemeinsames Zeitlimit: \(Int(configuration.timeout)) Sekunden")
            Button("Einstellungen speichern") {
                do { try saveCredential(); try configuration.save(); state.notice = "Gespeichert." } catch { state.error = error.localizedDescription }
            }
            Button("Gespeicherten Zugangsschlüssel entfernen", role: .destructive) {
                do { try KeychainStore(service: "de.sportfahrertreff.sft-drive-admin.ai").remove(key: configuration.credentialKey); token = ""; state.notice = "Zugangsschlüssel entfernt." } catch { state.error = error.localizedDescription }
            }
            ErrorBanner(message: state.error)
            if let notice = state.notice { Text(notice) }
        }.formStyle(.grouped)
    }
    private func saveCredential() throws {
        _ = try configuration.validatedEndpoint()
        if !token.isEmpty { try KeychainStore(service: "de.sportfahrertreff.sft-drive-admin.ai").store(key: configuration.credentialKey, value: Data(token.utf8)); token = "" }
    }
}
@MainActor final class ExtractionModel: ScreenModel {
    @Published var text = ""
    @Published var kind: ExtractionKind = .hotel_offer
    @Published var result: StructuredResult?
    var task: Task<Void, Never>?
    func analyze() {
        task?.cancel(); result = nil
        let source = text; let schema = kind; let configuration = AIConfiguration.load()
        task = Task { await perform {
            let value = try await AIProviderChain(configuration: configuration).extract(text: source, kind: schema)
            try Task.checkCancellation(); result = value
        } }
    }
    func clear() { task?.cancel(); task = nil; result = nil; text = ""; error = nil }
}
struct ExtractionReviewView: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model = ExtractionModel()
    @State private var consent = false
    @State private var editor: ResourceEditorRequest?
    @State private var night = ""
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Planung aus einer E-Mail").font(.title3.bold())
                Text("Signaturen, Buchungsnummern und unnötige personenbezogene Angaben vorher entfernen. Der Text bleibt bis zur bewussten Analyse im Arbeitsspeicher.").font(.caption).foregroundStyle(.secondary)
                Picker("Inhalt", selection: $model.kind) { Text("Hotelangebot").tag(ExtractionKind.hotel_offer); Text("Restaurant").tag(ExtractionKind.restaurant) }.disabled(model.busy)
                TextEditor(text: $model.text).frame(height: 180).font(.body).accessibilityLabel("Ausgewählter E-Mail-Text").disabled(model.busy)
                HStack {
                    Button("Analysevorschau") { consent = true }.buttonStyle(.borderedProminent).disabled(model.busy || model.text.isEmpty)
                    if model.busy { ProgressView().controlSize(.small); Button("Abbrechen") { model.task?.cancel() } }
                    Button("Verwerfen") { model.clear() }
                }
                ErrorBanner(message: model.error)
                if let result = model.result {
                    Text("Erkannt mit \(result.model) · \(result.inputTokens ?? 0) Eingabe- / \(result.outputTokens ?? 0) Ausgabetokens").font(.caption)
                    ForEach(ExtractionSchema.keys(model.kind), id: \.self) { key in
                        VStack(alignment: .leading) {
                            LabeledContent(key, value: result.values.text(key).nilIfEmpty ?? "Ungeklärt")
                            if let evidence = result.evidence[key] { Text("Quelle: \(evidence)").font(.caption).foregroundStyle(.secondary).textSelection(.enabled) }
                        }.padding(8).background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 8))
                    }
                    if model.kind == .hotel_offer {
                        Picker("Zielnacht in \(tour.title)", selection: $night) { ForEach(TourDates.days(start: tour.start_date, end: tour.end_date, nights: true), id: \.self) { Text($0).tag($0) } }
                    }
                    Text("Die nächste Ansicht ist ein korrigierbarer Entwurf. Erst „Speichern“ legt den Hotelvorschlag bzw. Restaurant-Stopp an. Keine Buchungsbestätigung wird erzeugt.").font(.caption)
                    Button("Entwurf prüfen und übernehmen …") { openDraft(result) }.disabled(model.kind == .hotel_offer && night.isEmpty)
                }
            }
        }.onAppear { night = tour.end_date > tour.start_date ? tour.start_date : "" }
        .onDisappear { model.clear() }
        .onChange(of: model.kind) { _, _ in model.result = nil }
        .onChange(of: model.text) { _, _ in if !model.busy { model.result = nil } }
        .sheet(isPresented: $consent) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Diese Analyse senden?").font(.headline)
                Text("Empfänger: \(AIConfiguration.load().endpoint)\nModell: \(AIConfiguration.load().model)")
                ScrollView { Text(model.text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }.frame(height: 260)
                Text("Systemauftrag: ausschließlich belegte Hotel-/Restaurantfelder extrahieren; unklare Angaben leer lassen. Keine Datenbankdaten oder Zugangsschlüssel werden an das Modell geschickt.").font(.caption)
                HStack { Button("Abbrechen") { consent = false }; Spacer(); Button("Jetzt analysieren") { consent = false; model.analyze() }.buttonStyle(.borderedProminent) }
            }.padding().frame(width: 600)
        }
        .sheet(item: $editor) { request in ResourceEditorView(repository: services.content, kind: model.kind == .hotel_offer ? .hotels : .stops, parentID: tour.id, tour: tour, request: request) { editor = nil; model.clear() } }
    }
    private func openDraft(_ result: StructuredResult) {
        if model.kind == .hotel_offer {
            var values = result.values; values.removeValue(forKey: "arrival"); values.removeValue(forKey: "departure")
            values["night_date"] = .string(night); values["sort_order"] = .number(0)
            editor = .init(initial: values)
        } else {
            editor = .init(initial: ["title": result.values["name"] ?? .null, "type": .string("restaurant"), "description": result.values["note"] ?? .null,
                "address": result.values["address"] ?? .null, "starts_at": result.values["reservation_time"] ?? .null, "sort_order": .number(0)])
        }
    }
}
