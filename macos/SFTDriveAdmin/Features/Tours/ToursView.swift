import SwiftUI
import UniformTypeIdentifiers

@MainActor final class ToursViewModel: ScreenModel {
    @Published var tours: [Tour] = []
    @Published var query = ""
    @Published var archived = false
    @Published var selection: String?
    @Published var more = false
    let repository: ToursRepository
    init(_ repository: ToursRepository) { self.repository = repository }
    func load(append: Bool = false) async {
        await perform {
            let rows = try await repository.list(query: query, offset: append ? tours.count : 0, archived: archived)
            try Task.checkCancellation()
            tours = append ? tours + rows : rows; more = rows.count == 100
        }
    }
}
struct TourEditorRequest: Identifiable {
    let id = UUID()
    var sourceID: String?
    var duplicate = false
}
struct ToursView: View {
    let services: AppServices
    @StateObject private var model: ToursViewModel
    @State private var editor: TourEditorRequest?
    @State private var sortOrder = [KeyPathComparator(\Tour.start_date, order: .reverse)]
    init(services: AppServices) { self.services = services; _model = StateObject(wrappedValue: ToursViewModel(services.tours)) }
    private var selected: Tour? { model.tours.first { $0.id == model.selection } }
    var body: some View {
        VStack(spacing: 0) {
            ErrorBanner(message: model.error)
            HSplitView {
                VStack {
                    HStack { TextField("Touren suchen", text: $model.query).textFieldStyle(.roundedBorder)
                        Toggle("Archiv", isOn: $model.archived).toggleStyle(.checkbox) }.padding()
                    Table(model.tours.sorted(using: sortOrder), selection: $model.selection, sortOrder: $sortOrder) {
                        TableColumn("Ausfahrt", value: \.title).width(min: 150, ideal: 230)
                        TableColumn("Beginn", value: \.start_date).width(100)
                        TableColumn("Region", value: \.region)
                        TableColumn("Status") { StatusBadge(value: $0.status) }
                    }
                    if model.more { Button("Weitere Touren laden") { Task { await model.load(append: true) } }.disabled(model.busy) }
                    if model.tours.isEmpty && !model.busy { ContentUnavailableView("Keine Touren", systemImage: "map", description: Text("Suche ändern oder eine Ausfahrt anlegen.")) }
                }.frame(minWidth: 450)
                if let selected {
                    TourWorkspace(services: services, tour: selected, edit: { editor = .init(sourceID: selected.id) })
                        .id(selected.id).frame(minWidth: 440)
                } else { ContentUnavailableView("Ausfahrt auswählen", systemImage: "steeringwheel").frame(minWidth: 400) }
            }
            RefreshFooter(time: model.refreshedAt, busy: model.busy)
        }
        .navigationTitle("Tourenverwaltung")
        .toolbar {
            Button("Neue Tour", systemImage: "plus") { editor = .init() }.keyboardShortcut("n")
            Button("Duplizieren", systemImage: "doc.on.doc") { if let selected { editor = .init(sourceID: selected.id, duplicate: true) } }.disabled(selected == nil)
            Button("Aktualisieren", systemImage: "arrow.clockwise") { Task { await model.load() } }.keyboardShortcut("r").disabled(model.busy)
        }
        .task(id: "\(model.query)|\(model.archived)") {
            do { try await Task.sleep(for: .milliseconds(250)); await model.load() } catch { }
        }
        .sheet(item: $editor) { request in
            TourEditorView(repository: services.tours, request: request) { editor = nil; Task { await model.load() } }
        }
    }
}
struct TourWorkspace: View {
    let services: AppServices
    let tour: Tour
    let edit: () -> Void
    @State private var section = "Planung"
    private var sections: [String] { ["Planung", "Teilnehmer", "Stopps"] + (tour.end_date > tour.start_date ? ["Hotels", "Tagesrouten"] : []) + ["KI-Assistenz"] }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack { VStack(alignment: .leading) { Text(tour.title).font(.title2.bold()); Text("\(tour.start_date) – \(tour.end_date) · \(tour.region)").foregroundStyle(.secondary) }
                Spacer(); Button("Bearbeiten", action: edit) }
            Picker("Bereich", selection: $section) { ForEach(sections, id: \.self) { Text($0).tag($0) } }.pickerStyle(.menu)
            switch section {
            case "Teilnehmer": RegistrationsView(services: services, tour: tour)
            case "Stopps": ResourceListView(services: services, kind: .stops, parentID: tour.id, tour: tour)
            case "Hotels": AccommodationView(services: services, tour: tour)
            case "Tagesrouten": StagesView(services: services, tour: tour)
            case "KI-Assistenz": ExtractionReviewView(services: services, tour: tour)
            default: PlanningView(repository: services.planning, tour: tour)
            }
        }.padding()
    }
}

@MainActor final class TourEditorModel: ScreenModel {
    @Published var fields: Payload = [:]
    @Published var member: Payload = [:]
    @Published var participant: Payload = [:]
    @Published var status = "draft"
    @Published var loaded = false
    @Published var conflict: Payload?
    var expected: Payload?
    var initial: Payload = [:]
    var savedID = UUID().uuidString.lowercased()
    let repository: ToursRepository
    let request: TourEditorRequest
    init(repository: ToursRepository, request: TourEditorRequest) { self.repository = repository; self.request = request }
    var combined: Payload { ["tour": .object(fields), "member": .object(member), "participant": .object(participant), "status": .string(status)] }
    var dirty: Bool { loaded && combined != initial }
    var allowedStatuses: [String] {
        guard let expected, case .object(let tour) = expected["tour"] else { return ["draft"] }
        switch tour.text("status") {
        case "draft": return ["draft", "published"]
        case "published": return ["published", "registration_closed", "completed", "archived"]
        case "registration_closed": return ["registration_closed", "published", "completed", "archived"]
        case "completed": return ["completed", "archived"]
        case "cancelled": return ["cancelled", "archived"]
        default: return [tour.text("status")]
        }
    }
    func load() async {
        await perform {
            fields = Dictionary(uniqueKeysWithValues: TourFormSchema.publicFields.map { ($0.id, $0.initial) })
            fields["start_date"] = .string(TourDates.dayString(Date())); fields["end_date"] = fields["start_date"]
            if let source = request.sourceID {
                let snapshot = try await repository.details(source)
                if case .object(let value) = snapshot["tour"] { fields.merge(value) { _, new in new }; status = value.text("status") }
                if case .object(let value) = snapshot["member"] { member = value }
                if case .object(let value) = snapshot["participant"] { participant = value }
                if request.duplicate {
                    fields["title"] = .string(fields.text("title") + " (Kopie)"); status = "draft"
                    for key in ["start_date", "end_date", "meeting_at", "planned_end_at", "registration_open_at", "registration_close_at", "passenger_edit_deadline_at"] { fields[key] = .null }
                } else { expected = snapshot; savedID = source }
            }
            loaded = true; initial = combined
        }
    }
    func save() async -> Bool {
        var saved = false
        await perform {
            var payload = try FormValidation.payload(fields, fields: TourFormSchema.publicFields)
            try TourFormSchema.validate(payload); payload["status"] = .string(status)
            let m = try FormValidation.payload(member, fields: TourFormSchema.memberFields)
            let p = try FormValidation.payload(participant, fields: TourFormSchema.participantFields)
            do {
                try await repository.save(id: savedID, expected: expected, tour: payload, member: m, participant: p)
                saved = true; initial = combined
            } catch {
                // Never retry an ambiguously completed write blindly. Fetch for review.
                conflict = try? await repository.details(savedID)
                throw error
            }
        }
        return saved
    }
}
struct TourEditorView: View {
    @StateObject private var model: TourEditorModel
    let close: () -> Void
    @State private var confirmDiscard = false
    @State private var destructiveAction: String?
    @State private var reason = ""
    @State private var importCover = false
    init(repository: ToursRepository, request: TourEditorRequest, close: @escaping () -> Void) {
        _model = StateObject(wrappedValue: TourEditorModel(repository: repository, request: request)); self.close = close
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack { Text(model.request.duplicate ? "Tour duplizieren" : "Tour bearbeiten").font(.title2.bold()); Spacer()
                Button("Abbrechen") { if model.dirty { confirmDiscard = true } else { close() } }.keyboardShortcut(.cancelAction)
                Button("Speichern") { Task { if await model.save() { close() } } }.buttonStyle(.borderedProminent).keyboardShortcut("s").disabled(model.busy || !model.loaded)
            }.padding()
            ErrorBanner(message: model.error)
            if let notice = model.notice { Text(notice).foregroundStyle(.orange).padding() }
            if model.conflict != nil {
                DisclosureGroup("Serverstand zum Vergleichen – eigene Eingaben bleiben erhalten") {
                    if case .object(let server) = model.conflict?["tour"] {
                        ForEach(TourFormSchema.publicFields) { field in
                            if server[field.id] != model.fields[field.id] {
                                LabeledContent(field.title, value: "Server: \(server.text(field.id)) · Entwurf: \(model.fields.text(field.id))")
                            }
                        }
                    }
                    Text("Abbrechen und neu öffnen, um auf dem aktuellen Stand weiterzuarbeiten. Bei unklarer Speicherung zuerst den Serverstand prüfen.").font(.caption)
                }.padding()
            }
            Form {
                Section("Öffentliche Tourdaten") { FormFields(fields: TourFormSchema.publicFields, values: $model.fields)
                    Button("Titelbild auswählen …") { importCover = true }
                    Picker("Status", selection: $model.status) { ForEach(model.allowedStatuses, id: \.self) { Text(Labels.status($0)).tag($0) } }
                }
                Section("Mitglieder") { FormFields(fields: TourFormSchema.memberFields, values: $model.member) }
                Section("Bestätigte Teilnehmer") { FormFields(fields: TourFormSchema.participantFields, values: $model.participant) }
                if model.expected != nil {
                    Section("Verwaltung") {
                        if ["published", "registration_closed"].contains(originalStatus) {
                            TextField("Begründung der Absage", text: $reason)
                            Button("Tour absagen", role: .destructive) { destructiveAction = "cancel" }
                        }
                        if ["draft", "cancelled"].contains(originalStatus) {
                            Button("Tour und zugehörige Organisation löschen", role: .destructive) { destructiveAction = "delete" }
                        }
                    }
                }
            }.formStyle(.grouped).disabled(model.busy || !model.loaded)
        }.frame(width: 760, height: 760).interactiveDismissDisabled(model.dirty || model.busy).protectDraft(model.dirty)
        .task { await model.load() }
        .confirmationDialog("Ungespeicherte Änderungen verwerfen?", isPresented: $confirmDiscard, titleVisibility: .visible) {
            Button("Verwerfen", role: .destructive, action: close); Button("Weiter bearbeiten", role: .cancel) { }
        }
        .confirmationDialog(destructiveAction == "delete" ? "Tour mitsamt Anmeldungen, Stopps und Bestellungen endgültig löschen?" : "Tour absagen und Teilnehmer benachrichtigen?", isPresented: Binding(get: { destructiveAction != nil }, set: { if !$0 { destructiveAction = nil } }), titleVisibility: .visible) {
            Button("Bestätigen", role: .destructive) {
                let operation = destructiveAction; destructiveAction = nil
                Task { await model.perform {
                    if operation == "delete" { try await model.repository.delete(model.savedID); close() }
                    else if case .object(let fields) = model.expected?["tour"] {
                        let tour = try JSONDecoder().decode(Tour.self, from: JSONEncoder().encode(fields))
                        let warning = try await model.repository.cancel(tour, reason: reason)
                        if let warning { model.notice = warning; await model.load() } else { close() }
                    }
                } }
            }
        }
        .fileImporter(isPresented: $importCover, allowedContentTypes: [.jpeg, .png, .webP]) { result in
            Task { await model.perform {
                let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                let data = try Data(contentsOf: url)
                let mime = url.pathExtension.lowercased() == "png" ? "image/png" : url.pathExtension.lowercased() == "webp" ? "image/webp" : "image/jpeg"
                model.fields["cover_image_url"] = .string(try await model.repository.uploadCover(data: data, extension: url.pathExtension, contentType: mime))
            } }
        }
    }
    private var originalStatus: String { if case .object(let tour) = model.expected?["tour"] { return tour.text("status") }; return "draft" }
}
