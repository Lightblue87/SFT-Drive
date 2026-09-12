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
            Button("Ollama Cloud (https://ollama.com) verwenden") { configuration.endpoint = "https://ollama.com" }.buttonStyle(.link)
            SecureField("Zugangsschlüssel (API-Key für Cloud, optional für eigenen Server)", text: $token)
            Toggle("Cloud-Modell (Text verlässt diesen Mac an Ollama)", isOn: $configuration.cloudConfirmed)
            Text("Bei Ollama Cloud wird der eingefügte Text an ollama.com übertragen. Modellname gemäß https://ollama.com/models manuell eintragen (z. B. \"…-cloud\"); die lokale Modellliste gilt dafür nicht.").font(.caption).foregroundStyle(.secondary)
            Toggle("Lokale Modelle; Cloud-Funktionen in Ollama deaktiviert", isOn: $configuration.localInferenceConfirmed)
                .disabled(configuration.cloudConfirmed)
            Text("Ollama mit OLLAMA_NO_CLOUD=1 neu starten. Ein localhost-Endpunkt allein verhindert keine Cloud-Weiterleitung. Es werden keine Modelle installiert.").font(.caption).foregroundStyle(.secondary)
            TextField("Modell", text: $configuration.model)
            if !models.isEmpty { Picker("Installierte Modelle", selection: $configuration.model) { Text("Auswählen").tag(""); ForEach(models, id: \.self) { Text($0).tag($0) } } }
            Button("Modelle laden") { Task { await state.perform {
                try saveCredential()
                models = try await OllamaProvider(configuration: configuration, model: configuration.model).models()
            } } }.disabled(configuration.cloudConfirmed)
            if configuration.cloudConfirmed { Text("Bei Cloud-Nutzung nicht verfügbar -- die lokale Modellliste (api/tags) gehört zum lokalen Ollama-Daemon.").font(.caption).foregroundStyle(.secondary) }
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
    @State private var restaurantDraft = false
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
                            if key == "menu_items", case .array(let items) = result.values[key] {
                                Text("Speisekarte: \(items.count) Gerichte")
                                ForEach(Array(items.enumerated()), id: \.offset) { entry in
                                    if case .object(let item) = entry.element {
                                        Text("\(item.text("name")) · \(item.text("price")) €")
                                        Text("Quelle: \(item.text("evidence"))").font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            } else { LabeledContent(label(key), value: result.values.text(key).nilIfEmpty ?? "Ungeklärt") }
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
                if AIConfiguration.load().cloudConfirmed {
                    Text("Cloud-Modell: der unten stehende Text verlässt diesen Mac und wird an den genannten Empfänger übertragen.")
                        .font(.caption).foregroundStyle(.orange)
                }
                if AIConfiguration.load().fallbackEnabled { Text("Weitere freigegebene Modelle: \(AIConfiguration.load().fallbackModels)").font(.caption) }
                ScrollView { Text(model.text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }.frame(height: 260)
                Text("Systemauftrag: ausschließlich belegte Hotel-/Restaurantfelder extrahieren; unklare Angaben leer lassen. Keine Datenbankdaten oder Zugangsschlüssel werden an das Modell geschickt.").font(.caption)
                HStack { Button("Abbrechen") { consent = false }; Spacer(); Button("Jetzt analysieren") { consent = false; model.analyze() }.buttonStyle(.borderedProminent) }
            }.padding().frame(width: 600)
        }
        .sheet(item: $editor) { request in ResourceEditorView(repository: services.content, kind: model.kind == .hotel_offer ? .hotels : .stops, parentID: tour.id, tour: tour, request: request) { editor = nil; model.clear() } }
        .sheet(isPresented: $restaurantDraft) {
            if let result = model.result { RestaurantImportReviewView(repository: services.content, tour: tour, result: result) { restaurantDraft = false; model.clear() } }
        }
    }
    private func openDraft(_ result: StructuredResult) {
        if model.kind == .hotel_offer {
            var values = result.values
            let departure = values.text("departure")
            values.removeValue(forKey: "arrival"); values.removeValue(forKey: "departure")
            values["night_date"] = .string(night)
            if let date = TourDates.day(departure), let lastNight = Calendar.current.date(byAdding: .day, value: -1, to: date) { values["night_date_end"] = .string(TourDates.dayString(lastNight)) }
            else { values["night_date_end"] = .string(night) }
            values["sort_order"] = .number(0)
            editor = .init(initial: values)
        } else {
            restaurantDraft = true
        }
    }
    private func label(_ key: String) -> String {
        ["name": "Name", "arrival": "Anreise", "departure": "Abreise", "booking_deadline": "Buchungsfrist", "note": "Hinweise", "address": "Adresse", "hotel_url": "Hotel-URL", "booking_url": "Buchungslink", "price_per_night": "Preis", "price_unit": "Preiseinheit", "room_type": "Zimmerart", "breakfast_details": "Frühstück", "parking_details": "Parkplatz", "cancellation_terms": "Stornierung", "allotment_details": "Kontingent", "contact": "Kontakt", "reservation_time": "Reservierungszeit", "order_deadline": "Bestellfrist", "reservation_people": "Reservierte Personen", "reservation_contact": "Kontakt", "reservation_status": "Status"][key] ?? key
    }
}

struct RestaurantImportReviewView: View {
    let repository: ContentRepository
    let tour: Tour
    let result: StructuredResult
    let close: () -> Void
    @StateObject private var state = ScreenModel()
    @State private var stop: Payload = [:]
    @State private var settings: Payload = [:]
    @State private var menu: [DataRow] = []
    @State private var stopID = UUID().uuidString.lowercased()
    @State private var discard = false
    var body: some View {
        VStack {
            Text("Restaurant-Entwurf · \(tour.title)").font(.headline)
            Text("Neuer Stopp, Bestellfenster und ausgewählte Gerichte werden gemeinsam gespeichert.").font(.caption)
            ErrorBanner(message: state.error)
            Form {
                Section("Neuer Restaurant-Stopp") { FormFields(fields: ResourceKind.stops.fields.filter { $0.id != "type" }, values: $stop) }
                Section("Vorbestellung") { FormFields(fields: ResourceKind.restaurantSettings.fields, values: $settings) }
                Section("Gerichte prüfen") {
                    ForEach($menu) { $item in
                        FormFields(fields: ResourceKind.menu.fields, values: $item.values)
                        Button("Gericht aus Entwurf entfernen", role: .destructive) { menu.removeAll { $0.id == item.id } }
                        Divider()
                    }
                }
            }.formStyle(.grouped).disabled(state.busy)
            HStack { Button("Abbrechen") { discard = true }; Spacer(); Button("Geprüften Entwurf speichern") {
                Task { await state.perform {
                    let stopPayload = try FormValidation.payload(stop, fields: ResourceKind.stops.fields)
                    let settingsPayload = try FormValidation.payload(settings, fields: ResourceKind.restaurantSettings.fields)
                    try FormValidation.window(settingsPayload, open: "ordering_open_at", close: "ordering_deadline_at")
                    let items = try menu.map { item -> Payload in var payload = try FormValidation.payload(item.values, fields: ResourceKind.menu.fields); payload["id"] = .string(item.id); return payload }
                    try await repository.createRestaurant(id: stopID, tourID: tour.id, stop: stopPayload, settings: settingsPayload, menu: items)
                    close()
                } }
            }.buttonStyle(.borderedProminent).disabled(state.busy) }
        }.padding().frame(width: 690, height: 750).interactiveDismissDisabled().protectDraft(true)
        .onAppear {
            stop = Dictionary(uniqueKeysWithValues: ResourceKind.stops.fields.map { ($0.id, $0.initial) })
            stop["title"] = result.values["name"] ?? .null
            stop["description"] = result.values["note"] ?? .null
            stop["address"] = result.values["address"] ?? .null
            stop["starts_at"] = result.values["reservation_time"] ?? .null
            stop["reservation_people"] = result.values["reservation_people"] ?? .null
            stop["reservation_contact"] = result.values["reservation_contact"] ?? .null
            stop["reservation_status"] = result.values["reservation_status"] ?? .null
            settings = Dictionary(uniqueKeysWithValues: ResourceKind.restaurantSettings.fields.map { ($0.id, $0.initial) })
            settings["ordering_deadline_at"] = result.values["order_deadline"] ?? .null
            if case .array(let items) = result.values["menu_items"] {
                menu = items.compactMap { value in
                    guard case .object(let extracted) = value else { return nil }
                    var fields = Dictionary(uniqueKeysWithValues: ResourceKind.menu.fields.map { ($0.id, $0.initial) })
                    fields["id"] = .string(UUID().uuidString.lowercased()); fields["name"] = extracted["name"]; fields["price"] = extracted["price"]; fields["description"] = extracted["description"]; fields["allergen_info"] = extracted["allergen_info"]; fields["is_vegetarian"] = extracted["is_vegetarian"]; fields["is_vegan"] = extracted["is_vegan"]
                    return DataRow(fields)
                }
            }
        }
        .confirmationDialog("Restaurant-Entwurf verwerfen?", isPresented: $discard, titleVisibility: .visible) { Button("Verwerfen", role: .destructive, action: close) }
    }
}
