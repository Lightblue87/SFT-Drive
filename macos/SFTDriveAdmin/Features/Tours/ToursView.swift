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
                VStack(alignment: .leading, spacing: 0) {
                    HStack { TextField("Touren suchen", text: $model.query).textFieldStyle(.roundedBorder)
                        Toggle("Archiv", isOn: $model.archived).toggleStyle(.checkbox) }.padding()
                    if model.tours.isEmpty && !model.busy {
                        ContentUnavailableView("Keine Touren", systemImage: "map", description: Text("Suche ändern oder eine Ausfahrt anlegen."))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        Table(model.tours.sorted(using: sortOrder), selection: $model.selection, sortOrder: $sortOrder) {
                            TableColumn("Ausfahrt", value: \.title).width(min: 150, ideal: 230)
                            TableColumn("Beginn", value: \.start_date).width(100)
                            TableColumn("Region", value: \.region)
                            TableColumn("Status") { StatusBadge(value: $0.status) }
                        }
                        if model.more { Button("Weitere Touren laden") { Task { await model.load(append: true) } }.disabled(model.busy).padding(8) }
                    }
                }.frame(minWidth: 450, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                if let selected {
                    TourWorkspace(services: services, tour: selected, edit: { editor = .init(sourceID: selected.id) })
                        .id(selected.id).frame(minWidth: 440, maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                } else { ContentUnavailableView("Ausfahrt auswählen", systemImage: "steeringwheel").frame(minWidth: 400, maxWidth: .infinity, maxHeight: .infinity) }
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
// §38.6: die Tour ist das zentrale Arbeitsobjekt. Der Workspace bündelt alle
// tourbezogenen Bereiche in einem zusammenhängenden Satz von Tabs statt
// isolierter Hauptwelten. "Stopps" bleibt bewusst die einzige CRUD-Oberfläche
// für Tour-Stopps jeder Art (auch Restaurant-Stopps) -- "Restaurants" daneben
// ist ein zusätzlicher, gefilterter Schnelleinstieg zur Speisekarten-/
// Bestellverwaltung, keine zweite Anlege-/Bearbeiten-Oberfläche dafür.
struct TourWorkspace: View {
    let services: AppServices
    let tour: Tour
    let edit: () -> Void
    @State private var section = "Übersicht"
    private var multiDay: Bool { tour.end_date > tour.start_date }
    private let sections = ["Übersicht", "Tourdaten", "Tagesplanung", "Teilnehmer", "Restaurants", "Übernachtungen", "Kommunikation", "Medien", "KI-Assistenz"]
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack { VStack(alignment: .leading) { Text(tour.title).font(.title2.bold()); Text("\(tour.start_date) – \(tour.end_date) · \(tour.region)").foregroundStyle(.secondary) }
                Spacer(); Button("Bearbeiten", action: edit) }
            Picker("Bereich", selection: $section) { ForEach(sections, id: \.self) { Text($0).tag($0) } }.pickerStyle(.menu)
            switch section {
            case "Tourdaten": TourDataTab(tour: tour, edit: edit)
            case "Tagesplanung": TagesplanungTab(services: services, tour: tour, multiDay: multiDay)
            case "Teilnehmer": RegistrationsView(services: services, tour: tour)
            case "Restaurants": RestaurantsTab(services: services, tour: tour)
            case "Übernachtungen":
                if multiDay { AccommodationView(services: services, tour: tour) }
                else { ContentUnavailableView("Nicht anwendbar", systemImage: "bed.double", description: Text("Übernachtungen gelten nur für Touren mit mehreren Tagen.")) }
            case "Kommunikation": CommunicationTab(services: services, tour: tour, edit: edit)
            case "Medien": MediaTab(tour: tour, edit: edit)
            case "KI-Assistenz": ExtractionReviewView(services: services, tour: tour)
            default: PlanningView(repository: services.planning, tour: tour)
            }
        }.padding()
    }
}
struct TourDataTab: View {
    let tour: Tour
    let edit: () -> Void
    var body: some View {
        Form {
            Section("Grunddaten") {
                LabeledContent("Titel", value: tour.title)
                LabeledContent("Region", value: tour.region)
                LabeledContent("Zeitraum", value: "\(tour.start_date) – \(tour.end_date)")
                LabeledContent("Status", value: Labels.status(tour.status))
                LabeledContent("Fahrzeuglimit", value: "\(tour.max_vehicles)")
                LabeledContent("Bestätigungsmodus", value: Labels.status(tour.confirmation_mode))
                if let km = tour.route_length_km { LabeledContent("Streckenlänge", value: "\(km) km") }
            }
            Section("Anforderungen") {
                LabeledContent("Kennzeichen", value: tour.license_plate_required ? "Pflicht" : "Optional")
                if let min = tour.min_power_ps { LabeledContent("Mindestleistung", value: "\(min) PS") }
                if let max = tour.max_power_ps { LabeledContent("Maximalleistung", value: "\(max) PS") }
                if let age = tour.min_driver_age { LabeledContent("Mindestalter", value: "\(age)") }
            }
            Section { Button("Tourdaten bearbeiten", action: edit) }
        }.formStyle(.grouped)
    }
}
struct TagesplanungTab: View {
    let services: AppServices
    let tour: Tour
    let multiDay: Bool
    var body: some View {
        // Kein umschließender ScrollView: StagesView und ResourceListView enthalten
        // jeweils eine eigene List, die innerhalb eines unbegrenzten vertikalen
        // ScrollView keine Höhe ableiten kann und dadurch kollabiert (Codex-Review
        // auf #19) -- StagesView bekommt stattdessen eine feste, selbst scrollbare
        // Höhe, ResourceListView füllt den verbleibenden Platz des VStack.
        VStack(alignment: .leading, spacing: 16) {
            if multiDay {
                StagesView(services: services, tour: tour).frame(minHeight: 220, maxHeight: 260)
                Divider()
            }
            ResourceListView(services: services, kind: .stops, parentID: tour.id, tour: tour)
        }
    }
}
@MainActor final class RestaurantsTabModel: ScreenModel {
    @Published var stops: [DataRow] = []
    func load(_ repository: ContentRepository, tourID: String) async {
        await perform { stops = try await repository.restaurantStops([tourID]) }
    }
}
struct RestaurantsTab: View {
    let services: AppServices
    let tour: Tour
    @StateObject private var model = RestaurantsTabModel()
    @State private var openStop: DataRow?
    @State private var adding = false
    var body: some View {
        VStack(alignment: .leading) {
            HStack { Text("Restaurant-Stopps").font(.headline); Spacer()
                Button("Neu anlegen", systemImage: "plus") { adding = true }
                Button("Laden", systemImage: "arrow.clockwise") { Task { await load() } }.labelStyle(.iconOnly)
            }
            ErrorBanner(message: model.error)
            if model.stops.isEmpty && !model.busy {
                ContentUnavailableView("Keine Restaurant-Stopps", systemImage: "fork.knife", description: Text("Über „Neu anlegen“ oder den Bereich „Tagesplanung“ → Stopps hinzufügen."))
            } else {
                List(model.stops) { stop in
                    HStack {
                        Text(stop.values.text("title")).bold()
                        Spacer()
                        Button("Speisekarte & Bestellungen") { openStop = stop }
                    }
                }
            }
        }.task { await load() }
        .sheet(item: $openStop) { stop in RestaurantView(services: services, tour: tour, stop: stop) { openStop = nil; Task { await load() } } }
        .sheet(isPresented: $adding) {
            ResourceEditorView(repository: services.content, kind: .stops, parentID: tour.id, tour: tour, request: .init()) { adding = false; Task { await load() } }
        }
    }
    private func load() async { await model.load(services.content, tourID: tour.id) }
}
@MainActor final class CommunicationModel: ScreenModel {
    @Published var kurviger = ""
    @Published var zello = ""
    @Published var whatsapp = ""
    func load(_ repository: ToursRepository, tourID: String) async {
        await perform {
            let snapshot = try await repository.details(tourID)
            guard case .object(let participant) = snapshot["participant"] else { return }
            kurviger = participant.text("kurviger_url"); zello = participant.text("zello_url"); whatsapp = participant.text("whatsapp_group_url")
        }
    }
}
struct CommunicationTab: View {
    let services: AppServices
    let tour: Tour
    let edit: () -> Void
    @StateObject private var model = CommunicationModel()
    var body: some View {
        Form {
            Section("Links für bestätigte Teilnehmer") {
                linkRow("Kurviger", model.kurviger)
                linkRow("Zello", model.zello)
                linkRow("WhatsApp-Gruppe", model.whatsapp)
            }
            Section { Button("Links bearbeiten", action: edit) }
        }.formStyle(.grouped).task { await model.load(services.tours, tourID: tour.id) }
    }
    @ViewBuilder private func linkRow(_ title: String, _ value: String) -> some View {
        if let url = URL(string: value), !value.isEmpty { LabeledContent(title) { Link("Öffnen", destination: url) } }
        else { LabeledContent(title, value: "Nicht hinterlegt") }
    }
}
struct MediaTab: View {
    let tour: Tour
    let edit: () -> Void
    var body: some View {
        Form {
            Section("Titelbild") {
                if let url = tour.cover_image_url, let imageURL = URL(string: url) {
                    AsyncImage(url: imageURL) { $0.resizable().aspectRatio(contentMode: .fit) } placeholder: { ProgressView() }
                        .frame(maxHeight: 220)
                } else { Text("Kein Titelbild hinterlegt.").foregroundStyle(.secondary) }
            }
            Section("YouTube") {
                if let url = tour.youtube_url, let videoURL = URL(string: url), !url.isEmpty {
                    LabeledContent("Video") { Link("Öffnen", destination: videoURL) }
                    LabeledContent("Eingebettet anzeigen", value: tour.youtube_embed ? "Ja" : "Nein")
                } else { Text("Kein Video hinterlegt.").foregroundStyle(.secondary) }
            }
            Section { Button("Medien bearbeiten", action: edit) }
        }.formStyle(.grouped)
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
