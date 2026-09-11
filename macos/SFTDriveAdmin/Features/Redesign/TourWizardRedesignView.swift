import SwiftUI

// Wizard für neue Touren: Vorlage · Basisdaten & Termin · Etappen & Routen ·
// Restaurants · Texte & Bilder. Hotels, Stopps und Regeln bewusst NICHT im Wizard —
// die erledigt der Editor, wo der Fortschritt als Checkliste stehen bleibt.

struct TourWizardRedesignView: View {
    var templates: [TourTemplate] = SFTRedesignSample.templates
    var finish: () -> Void
    var cancel: () -> Void

    @State private var step: Step = .template
    @State private var selectedTemplateID: String?
    @State private var scope = CopyOptions.templateScope

    enum Step: Int, CaseIterable, Identifiable {
        case template = 1, basics, stages, restaurants, texts
        var id: Int { rawValue }

        var title: String {
            switch self {
            case .template: return "Vorlage wählen"
            case .basics: return "Basisdaten & Termin"
            case .stages: return "Etappen & Routen"
            case .restaurants: return "Restaurants"
            case .texts: return "Texte & Bilder"
            }
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            rail
            Divider().overlay(SFT.border)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text(step.title).font(SFT.ui(24, .bold))
                    Text(subtitle).font(SFT.ui(13)).foregroundStyle(SFT.inkTertiary).padding(.top, 4)

                    switch step {
                    case .template: templateStep
                    default: placeholderStep
                    }

                    HStack(spacing: 8) {
                        Button("Abbrechen", action: cancel).buttonStyle(SFTSecondaryButtonStyle())
                        Spacer()
                        if step != .template {
                            Button("Zurück") { advance(-1) }.buttonStyle(SFTSecondaryButtonStyle())
                        }
                        Button(step == .texts ? "Entwurf speichern & Editor öffnen" : "Weiter: \(nextTitle) →") {
                            if step == .texts { finish() } else { advance(1) }
                        }
                        .buttonStyle(SFTPrimaryButtonStyle())
                        .disabled(step == .template && selectedTemplateID == nil)
                    }
                    .padding(.top, 22)
                }
                .padding(.horizontal, 28)
                .padding(.vertical, 26)
            }
            .background(SFT.canvas)
        }
    }

    private var subtitle: String {
        switch step {
        case .template: return "Alles aus der Vorlage lässt sich später überschreiben."
        default: return "Pflichtfelder bleiben markiert, bis sie gefüllt sind."
        }
    }

    private var nextTitle: String {
        Step(rawValue: step.rawValue + 1)?.title ?? ""
    }

    private func advance(_ delta: Int) {
        if let next = Step(rawValue: step.rawValue + delta) { step = next }
    }

    private var rail: some View {
        VStack(alignment: .leading, spacing: 0) {
            SFTSectionLabel(text: "Neue Tour")
            VStack(spacing: 2) {
                ForEach(Step.allCases) { item in
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(item == step ? SFT.red : .clear)
                                .overlay(
                                    Circle().strokeBorder(
                                        item == step ? .clear : SFT.decoration, lineWidth: 1.5
                                    )
                                )
                            Text("\(item.rawValue)")
                                .font(SFT.mono(11, .bold))
                                .foregroundStyle(item == step ? .white : SFT.inkTertiary)
                        }
                        .frame(width: 20, height: 20)

                        Text(item.title)
                            .font(SFT.ui(12, item == step ? .semibold : .medium))
                            .foregroundStyle(item == step ? SFT.ink : SFT.inkTertiary)
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 9)
                    .background(
                        item == step ? SFT.red.opacity(0.16) : .clear,
                        in: RoundedRectangle(cornerRadius: 7)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 7)
                            .strokeBorder(item == step ? SFT.red.opacity(0.45) : .clear)
                    )
                }
            }
            .padding(.top, 16)

            SFTCard(padding: 12) {
                Text("Hotels, Stopps und Regeln erledigst du danach im Editor — der Fortschritt bleibt dort als Checkliste stehen.")
                    .font(SFT.ui(11))
                    .foregroundStyle(SFT.inkTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, 22)

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 26)
        .frame(width: 230)
        .background(SFT.railDeep)
    }

    private var templateStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            LazyVGrid(columns: Array(repeating: GridItem(spacing: 12), count: 3), spacing: 12) {
                ForEach(templates) { template in
                    templateCard(template)
                }
                templateCard(TourTemplate(
                    id: "blank", title: "Leere Tour",
                    summary: "Nur Basisdaten\nalles manuell anlegen", usageCount: 0
                ))
            }
            .padding(.top, 20)

            SFTCard {
                VStack(alignment: .leading, spacing: 12) {
                    SFTSectionLabel(text: "Übernehmen aus Vorlage")
                    HStack(spacing: 8) {
                        scopeChip("Etappen & Routen", $scope.stages)
                        scopeChip("Hotels", $scope.hotels)
                        scopeChip("Restaurants & Karte", $scope.restaurants)
                        scopeChip("Fristen & Anmeldung", $scope.rulesAndDeadlines)
                        scopeChip("Texte", $scope.descriptions)
                    }
                }
            }
            .padding(.top, 22)
        }
    }

    private func templateCard(_ template: TourTemplate) -> some View {
        let isSelected = selectedTemplateID == template.id
        return Button { selectedTemplateID = template.id } label: {
            VStack(alignment: .leading, spacing: 0) {
                SFTStripePlaceholder().frame(height: 70)
                Text(template.title).font(SFT.ui(14, .semibold)).padding(.top, 12)
                Text(template.summary)
                    .font(SFT.ui(11))
                    .foregroundStyle(SFT.inkTertiary)
                    .lineSpacing(3)
                    .padding(.top, 6)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, minHeight: 190, alignment: .leading)
            .padding(16)
            .background(isSelected ? SFT.raised : SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: SFT.Radius.card)
                    .strokeBorder(isSelected ? SFT.red : SFT.border, lineWidth: isSelected ? 1.5 : 1)
            )
            .overlay(alignment: .topTrailing) {
                if isSelected {
                    Circle().fill(SFT.red).frame(width: 18, height: 18).padding(12)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func scopeChip(_ title: String, _ binding: Binding<Bool>) -> some View {
        Button { binding.wrappedValue.toggle() } label: {
            Text(title)
                .font(SFT.ui(12, .medium))
                .foregroundStyle(binding.wrappedValue ? SFT.ink : SFT.inkTertiary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    binding.wrappedValue ? SFT.red.opacity(0.14) : SFT.raised,
                    in: Capsule()
                )
                .overlay(
                    Capsule().strokeBorder(binding.wrappedValue ? SFT.red.opacity(0.4) : SFT.border)
                )
        }
        .buttonStyle(.plain)
    }

    private var placeholderStep: some View {
        SFTCard {
            Text("Formularfelder dieses Schritts – Aufbau wie im Editor (SFTField), Werte aus der Vorlage vorbelegt.")
                .font(SFT.ui(12))
                .foregroundStyle(SFT.inkTertiary)
        }
        .padding(.top, 20)
    }
}

// MARK: - Editor

struct TourEditorRedesignView: View {
    var tourID: String
    var openHotels: () -> Void
    var openMeals: () -> Void
    var openImport: () -> Void

    var draft: TourEditorDraft = SFTRedesignSample.editorDraft
    var save: (TourEditorDraft) -> Void = { _ in }

    @State private var section: EditorSection = .basics
    @State private var values = SFTRedesignSample.editorDraft
    @State private var showDuplicate = false

    enum EditorSection: String, CaseIterable, Identifiable {
        case basics = "Basisdaten"
        case rules = "Regeln & Anmeldung"
        case stages = "Etappen"
        case stops = "Stopps"
        case hotels = "Hotels"
        case restaurants = "Restaurants"
        case offerImport = "Import aus Angebot"
        case texts = "Texte & Bilder"
        case publish = "Veröffentlichung"

        var id: String { rawValue }
    }

    var body: some View {
        HStack(spacing: 0) {
            rail
            Divider().overlay(SFT.border)
            VStack(spacing: 0) {
                toolbar
                ScrollView {
                    content
                        .padding(.horizontal, 26)
                        .padding(.vertical, 22)
                }
            }
            .background(SFT.canvas)
        }
        .sheet(isPresented: $showDuplicate) {
            DuplicateTourSheet(
                tour: TourRow(
                    id: tourID, title: values.title, subtitle: "", dateRange: "",
                    region: values.region, confirmedVehicles: nil,
                    maxVehicles: values.maxVehicles, lifecycle: .draft, planning: []
                ),
                confirm: { _ in showDuplicate = false },
                cancel: { showDuplicate = false }
            )
        }
    }

    private var rail: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(values.title).font(SFT.ui(14, .bold))
            Text("\(values.statusText) · zuletzt \(values.updatedAt)")
                .font(SFT.ui(11))
                .foregroundStyle(SFT.inkTertiary)
                .padding(.top, 2)

            SFTProgressBar(fraction: Double(values.completedSections) / Double(EditorSection.allCases.count))
                .padding(.top, 12)
            Text("\(values.completedSections) von \(EditorSection.allCases.count) Abschnitten fertig")
                .font(SFT.mono(10))
                .foregroundStyle(SFT.inkTertiary)
                .padding(.top, 6)

            VStack(spacing: 2) {
                ForEach(EditorSection.allCases) { item in
                    Button {
                        switch item {
                        case .hotels: openHotels()
                        case .restaurants: openMeals()
                        case .offerImport: openImport()
                        default: section = item
                        }
                    } label: {
                        HStack(spacing: 9) {
                            Circle()
                                .fill(statusTone(item).dot)
                                .frame(width: 8, height: 8)
                            Text(item.rawValue)
                                .font(SFT.ui(12, section == item ? .semibold : .medium))
                                .foregroundStyle(statusTone(item) == .inactive ? SFT.inkTertiary : SFT.inkSecondary)
                            Spacer(minLength: 0)
                            if let note = values.sectionNotes[item.rawValue] {
                                Text(note)
                                    .font(SFT.mono(10, .medium))
                                    .foregroundStyle(note == "offen" ? SFT.amber : SFT.inkTertiary)
                            }
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(
                            section == item ? SFT.red.opacity(0.16) : .clear,
                            in: RoundedRectangle(cornerRadius: 7)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 7)
                                .strokeBorder(section == item ? SFT.red.opacity(0.45) : .clear)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 16)

            SFTCard(padding: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    SFTSectionLabel(text: "Noch offen")
                    ForEach(values.openItems, id: \.self) { item in
                        Text("· \(item)")
                            .font(SFT.ui(11))
                            .foregroundStyle(SFT.inkSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(.top, 18)

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 22)
        .frame(width: 230)
        .background(SFT.railDeep)
    }

    private func statusTone(_ item: EditorSection) -> SFTStatusTone {
        switch values.sectionStates[item.rawValue] ?? "missing" {
        case "done": return .confirmed
        case "open": return .open
        default: return .inactive
        }
    }

    private var toolbar: some View {
        HStack(spacing: 10) {
            Text(section.rawValue).font(SFT.ui(18, .bold))
            Spacer()
            Button("Duplizieren ⌘D") { showDuplicate = true }
                .buttonStyle(SFTSecondaryButtonStyle())
                .keyboardShortcut("d", modifiers: .command)
            Button("Vorschau") { }.buttonStyle(SFTSecondaryButtonStyle())
            Button("Sichern ⌘S") { save(values) }
                .buttonStyle(SFTPrimaryButtonStyle())
                .keyboardShortcut("s", modifiers: .command)
        }
        .padding(.horizontal, 26)
        .padding(.vertical, 16)
        .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }
    }

    @ViewBuilder private var content: some View {
        if section == .basics {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 14) {
                    SFTField(label: "Titel") { TextField("", text: $values.title).textFieldStyle(.plain) }
                    SFTField(label: "Slug", mono: true) {
                        Text(values.slug).foregroundStyle(SFT.inkTertiary)
                    }
                }
                HStack(alignment: .top, spacing: 14) {
                    SFTField(label: "Start", mono: true) { TextField("", text: $values.startDate).textFieldStyle(.plain) }
                    SFTField(label: "Ende", mono: true) { TextField("", text: $values.endDate).textFieldStyle(.plain) }
                    SFTField(label: "Treffpunkt", mono: true) { TextField("", text: $values.meetingAt).textFieldStyle(.plain) }
                }
                HStack(alignment: .top, spacing: 14) {
                    SFTField(label: "Region") { TextField("", text: $values.region).textFieldStyle(.plain) }
                    SFTField(label: "Max. Fahrzeuge", mono: true) {
                        TextField("", value: $values.maxVehicles, format: .number).textFieldStyle(.plain)
                    }
                    SFTField(label: "Streckenlänge", mono: true) {
                        TextField("", text: $values.routeLength).textFieldStyle(.plain)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Bestätigungsmodus").font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
                    HStack(spacing: 8) {
                        modeCard(
                            "Manuell", "Admin gibt jedes Fahrzeug frei",
                            isSelected: values.confirmationMode == "manual"
                        ) { values.confirmationMode = "manual" }
                        modeCard(
                            "Automatik", "bis Limit, dann Warteliste",
                            isSelected: values.confirmationMode == "automatic"
                        ) { values.confirmationMode = "automatic" }
                    }
                }

                Divider().overlay(SFT.border)
                SFTSectionLabel(text: "Fristen")
                HStack(alignment: .top, spacing: 14) {
                    SFTField(label: "Anmeldung öffnet", mono: true) {
                        TextField("", text: $values.registrationOpenAt).textFieldStyle(.plain)
                    }
                    SFTField(label: "Anmeldeschluss", mono: true) {
                        TextField("", text: $values.registrationCloseAt).textFieldStyle(.plain)
                    }
                }

                if values.shiftedFromTemplate {
                    SFTNotice(text: "Aus Vorlage übernommen und auf den neuen Termin verschoben — bitte prüfen.")
                }
            }
            .frame(maxWidth: 720, alignment: .leading)
        } else {
            SFTCard {
                Text("Abschnitt „\(section.rawValue)“ – bestehende Formularlogik (Shared/FormSchema.swift) hier einsetzen.")
                    .font(SFT.ui(12))
                    .foregroundStyle(SFT.inkTertiary)
            }
            .frame(maxWidth: 720)
        }
    }

    private func modeCard(
        _ title: String, _ explainer: String,
        isSelected: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(SFT.ui(12, .semibold)).foregroundStyle(isSelected ? SFT.ink : SFT.inkTertiary)
                Text(explainer).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 13)
            .padding(.vertical, 11)
            .background(
                isSelected ? SFT.red.opacity(0.14) : SFT.card,
                in: RoundedRectangle(cornerRadius: SFT.Radius.control)
            )
            .overlay(
                RoundedRectangle(cornerRadius: SFT.Radius.control)
                    .strokeBorder(isSelected ? SFT.red : SFT.border, lineWidth: isSelected ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Entwurfszustand des Editors. Feldnamen wie in Data/Models/Models.swift.
struct TourEditorDraft: Sendable {
    var title: String
    var slug: String
    var startDate: String
    var endDate: String
    var meetingAt: String
    var region: String
    var maxVehicles: Int
    var routeLength: String
    var confirmationMode: String
    var registrationOpenAt: String
    var registrationCloseAt: String
    var statusText: String
    var updatedAt: String
    var completedSections: Int
    var shiftedFromTemplate: Bool
    var sectionStates: [String: String]
    var sectionNotes: [String: String]
    var openItems: [String]
}

#Preview("Wizard") {
    TourWizardRedesignView(finish: {}, cancel: {})
        .frame(width: 1160, height: 820)
        .preferredColorScheme(.dark)
}

#Preview("Editor") {
    TourEditorRedesignView(tourID: "t1", openHotels: {}, openMeals: {}, openImport: {})
        .frame(width: 1160, height: 820)
        .preferredColorScheme(.dark)
}
