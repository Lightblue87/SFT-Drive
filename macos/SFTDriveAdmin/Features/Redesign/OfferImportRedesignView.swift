import SwiftUI

// Import aus Angebot: PDF, E-Mail-Text oder Foto → geprüfter Entwurf → speichern.
// Nichts wird automatisch gespeichert; vor dem Senden Einwilligung mit vollem Text.
// Keine Übernachtungsbestätigung durch KI.

struct OfferImportRedesignView: View {
    var tours: [TourRow]
    @Binding var selectedTourID: String
    var finish: () -> Void

    /// In der App: lokale Texterkennung (Vision) bzw. PDFKit, danach AIProvider.
    var analyze: (ImportKind, String) async -> ExtractionResult? = { kind, _ in
        SFTRedesignSample.extraction(for: kind)
    }
    var consent: (ImportKind, String) -> ImportConsent = { _, _ in SFTRedesignSample.consent }
    var save: (ExtractionResult) -> Void = { _ in }

    @State private var step: ImportStep = .source
    @State private var kind: ImportKind = .restaurant
    @State private var sourceKind: ImportSourceKind = .pdf
    @State private var pastedText = ""
    @State private var showConsent = false
    @State private var result: ExtractionResult?
    @State private var isWorking = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                stepper
                switch step {
                case .source: sourceStep
                case .review, .save:
                    if let result { reviewStep(result) }
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 24)
            .padding(.bottom, 28)
        }
        .background(SFT.canvas)
        .sheet(isPresented: $showConsent) {
            ImportConsentSheet(
                consent: consent(kind, pastedText),
                cancel: { showConsent = false },
                run: {
                    showConsent = false
                    isWorking = true
                    Task {
                        result = await analyze(kind, pastedText)
                        isWorking = false
                        if result != nil { step = .review }
                    }
                }
            )
        }
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Import aus Angebot").font(SFT.ui(26, .bold))
                Text("PDF, E-Mail-Text oder Foto → geprüfter Entwurf → erst dann gespeichert")
                    .font(SFT.ui(13))
                    .foregroundStyle(SFT.inkTertiary)
            }
            Spacer(minLength: 12)
            HStack(spacing: 8) {
                Text("Zieltour").font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
                TourPicker(tours: tours, selectedTourID: $selectedTourID)
            }
        }
    }

    private var stepper: some View {
        HStack(spacing: 10) {
            stepChip(.source, "Quelle")
            connector
            stepChip(.review, "Erkennung prüfen")
            connector
            stepChip(.save, "Entwurf speichern")
            Spacer()
            SFTSegmented(
                selection: $kind,
                options: [(.restaurant, ImportKind.restaurant.title), (.hotelOffer, ImportKind.hotelOffer.title)]
            )
        }
    }

    private var connector: some View {
        Rectangle().fill(SFT.borderStrong).frame(width: 18, height: 1)
    }

    private func stepChip(_ target: ImportStep, _ title: String) -> some View {
        let isDone = target.rawValue < step.rawValue
        let isCurrent = target == step
        return Button {
            if isDone { step = target }
        } label: {
            HStack(spacing: 7) {
                ZStack {
                    Circle()
                        .fill(isCurrent ? SFT.red : (isDone ? SFT.green : .clear))
                        .overlay(
                            Circle().strokeBorder(isCurrent || isDone ? .clear : SFT.decoration, lineWidth: 1.5)
                        )
                    Text(isDone ? "✓" : "\(target.rawValue)")
                        .font(SFT.mono(9, .bold))
                        .foregroundStyle(isDone ? Color(sftHex: 0x0A2A16) : (isCurrent ? .white : SFT.inkTertiary))
                }
                .frame(width: 16, height: 16)

                Text(title)
                    .font(SFT.ui(11, .semibold))
                    .foregroundStyle(isCurrent ? SFT.ink : (isDone ? SFT.greenInk : SFT.inkTertiary))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                isCurrent ? SFT.red.opacity(0.14) : (isDone ? SFT.green.opacity(0.12) : SFT.card),
                in: Capsule()
            )
            .overlay(
                Capsule().strokeBorder(
                    isCurrent ? SFT.red.opacity(0.45) : (isDone ? SFT.green.opacity(0.35) : SFT.border)
                )
            )
        }
        .buttonStyle(.plain)
        .disabled(!isDone)
    }

    // MARK: Schritt 1 — Quelle

    private var sourceStep: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                LazyVGrid(columns: Array(repeating: GridItem(spacing: 10), count: 3), spacing: 10) {
                    ForEach(ImportSourceKind.allCases) { item in
                        Button { sourceKind = item } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(sourceKind == item ? SFT.red : SFT.decoration)
                                        .frame(width: 10, height: 10)
                                    Text(item.title)
                                        .font(SFT.ui(13, .semibold))
                                        .foregroundStyle(sourceKind == item ? SFT.ink : SFT.inkSecondary)
                                }
                                Text(item.explainer)
                                    .font(SFT.ui(11))
                                    .foregroundStyle(SFT.inkTertiary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(
                                sourceKind == item ? SFT.raised : SFT.card,
                                in: RoundedRectangle(cornerRadius: 11)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 11).strokeBorder(
                                    sourceKind == item ? SFT.red : SFT.border,
                                    lineWidth: sourceKind == item ? 1.5 : 1
                                )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                dropZone

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("oder Text einfügen").font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
                        Spacer()
                        Text("⌘V").font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
                    }
                    TextEditor(text: $pastedText)
                        .font(SFT.ui(12))
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 110)
                        .padding(10)
                        .background(SFT.card, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SFT.border))
                }

                HStack(spacing: 10) {
                    Button("Analysevorschau …") { showConsent = true }
                        .buttonStyle(SFTPrimaryButtonStyle())
                        .disabled(isWorking)
                    Button("Ohne KI: manuell erfassen") {
                        result = SFTRedesignSample.emptyExtraction(for: kind)
                        step = .review
                    }
                    .buttonStyle(SFTSecondaryButtonStyle())
                    Text("Vor dem Senden siehst du Empfänger, Modell und den vollständigen Text.")
                        .font(SFT.ui(11))
                        .foregroundStyle(SFT.inkTertiary)
                }

                if isWorking {
                    ProgressView("Analyse läuft …").font(SFT.ui(11)).controlSize(.small)
                }
            }

            rightColumn.frame(width: 320)
        }
    }

    private var dropZone: some View {
        VStack(spacing: 8) {
            Text("Datei hier ablegen").font(SFT.ui(14, .semibold))
            Text("PDF, PNG, JPG oder HEIC · oder Datei wählen …")
                .font(SFT.ui(12))
                .foregroundStyle(SFT.inkTertiary)
            Text("max. 20 MB · bleibt lokal auf diesem Mac")
                .font(SFT.mono(10))
                .foregroundStyle(SFT.inkTertiary)
        }
        .frame(maxWidth: .infinity, minHeight: 190)
        .background(SFT.railDeep, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: SFT.Radius.card)
                .strokeBorder(SFT.borderStrong, style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
        )
        // In der App: .dropDestination(for: URL.self) { urls, _ in … }
    }

    private var rightColumn: some View {
        VStack(spacing: 12) {
            SFTCard {
                VStack(alignment: .leading, spacing: 10) {
                    SFTSectionLabel(text: "Was erkannt wird")
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(recognizedItems, id: \.self) { item in
                            Text("· \(item)").font(SFT.ui(12)).foregroundStyle(SFT.inkSecondary)
                        }
                    }
                    Divider().overlay(SFT.border)
                    Text("Jedes Feld bekommt einen Quellenbeleg aus dem Originaltext. Nicht belegte Felder bleiben leer und werden als „ungeklärt“ markiert.")
                        .font(SFT.ui(11))
                        .foregroundStyle(SFT.inkTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            SFTCard {
                VStack(alignment: .leading, spacing: 10) {
                    SFTSectionLabel(text: "Analyse")
                    HStack(spacing: 8) {
                        Circle().fill(SFT.green).frame(width: 8, height: 8)
                        Text("Lokal · Ollama").font(SFT.ui(12, .medium))
                    }
                    Text(SFTRedesignSample.consent.endpoint + " · " + SFTRedesignSample.consent.model)
                        .font(SFT.mono(11))
                        .foregroundStyle(SFT.inkTertiary)
                    SFTNotice(text: "Nichts wird automatisch gespeichert. Keine Übernachtungsbestätigung durch KI.")
                }
            }

            SFTCard {
                VStack(alignment: .leading, spacing: 10) {
                    SFTSectionLabel(text: "Zuletzt importiert")
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(SFTRedesignSample.recentImports, id: \.self) { line in
                            Text(line).font(SFT.ui(12)).foregroundStyle(SFT.inkSecondary)
                        }
                    }
                }
            }
        }
    }

    private var recognizedItems: [String] {
        switch kind {
        case .restaurant:
            return [
                "Restaurantname, Adresse, Kontakt",
                "Reservierungszeit und Bestellfrist",
                "Gerichte mit Preis, vegetarisch/vegan",
                "Allergenhinweise"
            ]
        case .hotelOffer:
            return [
                "Hotelname, Adresse, Kontakt",
                "Nächte, Zimmertypen, Preise",
                "Frühstück, Parken, Kontingent",
                "Storno- und Optionsfristen"
            ]
        }
    }

    // MARK: Schritt 2 — Entwurf prüfen

    private func reviewStep(_ result: ExtractionResult) -> some View {
        HStack(alignment: .top, spacing: 16) {
            sourcePane(result).frame(width: 400)

            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Text(result.banner).font(SFT.ui(12)).foregroundStyle(SFT.greenInk)
                    Spacer()
                    Text(result.modelLine).font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(SFT.green.opacity(0.08), in: RoundedRectangle(cornerRadius: 11))
                .overlay(RoundedRectangle(cornerRadius: 11).strokeBorder(SFT.green.opacity(0.28)))

                SFTCard {
                    VStack(alignment: .leading, spacing: 12) {
                        SFTSectionLabel(text: kind == .restaurant ? "Restaurant-Stopp" : "Hotelangebot")
                        LazyVGrid(columns: Array(repeating: GridItem(spacing: 12), count: 2), spacing: 12) {
                            ForEach(result.fields) { field in
                                if let value = field.value {
                                    VStack(alignment: .leading, spacing: 4) {
                                        SFTField(label: field.label, mono: field.mono) { Text(value) }
                                        if let evidence = field.evidence {
                                            Text("Quelle: „\(evidence)“")
                                                .font(SFT.ui(10))
                                                .foregroundStyle(SFT.inkTertiary)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                } else {
                                    SFTUnresolvedField(label: field.label, hint: field.unresolvedHint)
                                }
                            }
                        }
                    }
                }

                dishList(result)

                HStack(spacing: 10) {
                    Button("Verwerfen") {
                        self.result = nil
                        step = .source
                    }
                    .buttonStyle(SFTSecondaryButtonStyle())

                    Text("Erst „Speichern“ legt Stopp, Bestellfenster und Gerichte gemeinsam an.")
                        .font(SFT.ui(11))
                        .foregroundStyle(SFT.inkTertiary)
                    Spacer()
                    Button("Geprüften Entwurf speichern") {
                        save(result)
                        finish()
                    }
                    .buttonStyle(SFTPrimaryButtonStyle())
                }
            }
        }
    }

    private func sourcePane(_ result: ExtractionResult) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("Quelle").font(SFT.ui(12, .semibold))
                Text(result.sourceName).font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                Spacer()
                Text("Beleg anklickbar").font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(result.sourceText.split(separator: "\n").enumerated()), id: \.offset) { _, line in
                        let text = String(line)
                        let isHighlighted = result.highlights.contains { text.contains($0) }
                        Text(text)
                            .font(SFT.ui(12))
                            .foregroundStyle(isHighlighted ? SFT.ink : SFT.inkTertiary)
                            .padding(.horizontal, isHighlighted ? 4 : 0)
                            .background(isHighlighted ? SFT.red.opacity(0.18) : .clear)
                            .overlay(alignment: .bottom) {
                                if isHighlighted { Rectangle().fill(SFT.red).frame(height: 1) }
                            }
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
            }
            .frame(maxHeight: 520)
        }
        .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
    }

    private func dishList(_ result: ExtractionResult) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                SFTSectionLabel(text: "Gerichte · \(result.dishes.count)")
                Spacer()
                Button("Gericht ergänzen") { }.buttonStyle(SFTSmallButtonStyle())
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

            ForEach(result.dishes) { dish in
                HStack(spacing: 10) {
                    SFTCheckbox(isOn: dish.include)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(dish.name).font(SFT.ui(12, .semibold))
                        if let warning = dish.warning {
                            Text(warning).font(SFT.ui(10)).foregroundStyle(SFT.amber)
                        } else if let evidence = dish.evidence {
                            Text("Quelle: „\(evidence)“").font(SFT.ui(10)).foregroundStyle(SFT.inkTertiary)
                        }
                    }
                    Spacer(minLength: 8)
                    Text(verbatim: dish.price.map { "\($0)" } ?? "—")
                        .font(SFT.mono(12, .medium))
                        .frame(width: 70, alignment: .trailing)
                    Group {
                        if dish.isVegan {
                            SFTBadge(text: "vegan", tone: .confirmed)
                        } else if dish.isVegetarian {
                            SFTBadge(text: "vegetarisch", tone: .confirmed)
                        }
                    }
                    .frame(width: 100, alignment: .leading)
                    Button("entfernen") { }
                        .buttonStyle(.plain)
                        .font(SFT.mono(10))
                        .foregroundStyle(SFT.inkTertiary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
            }
        }
        .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
    }
}

/// Einwilligung vor dem Senden – entspricht dem bestehenden consent-Sheet in AI/.
struct ImportConsentSheet: View {
    let consent: ImportConsent
    var cancel: () -> Void
    var run: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Diese Analyse senden?").font(SFT.ui(16, .bold))

                Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 6) {
                    GridRow {
                        Text("Empfänger").foregroundStyle(SFT.inkTertiary)
                        Text(consent.endpoint).font(SFT.mono(12))
                    }
                    GridRow {
                        Text("Modell").foregroundStyle(SFT.inkTertiary)
                        Text(consent.model).font(SFT.mono(12))
                    }
                    GridRow {
                        Text("Quelle").foregroundStyle(SFT.inkTertiary)
                        Text(consent.sourceLine)
                    }
                }
                .font(SFT.ui(12))
                .padding(.top, 14)

                Text("Text, der gesendet wird")
                    .font(SFT.ui(11, .medium))
                    .foregroundStyle(SFT.inkTertiary)
                    .padding(.top, 12)

                ScrollView {
                    Text(consent.payload)
                        .font(SFT.ui(11))
                        .foregroundStyle(SFT.inkTertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(13)
                }
                .frame(height: 150)
                .background(SFT.card, in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(SFT.border))
                .padding(.top, 6)

                SFTNotice(text: consent.systemNote).padding(.top, 12)
            }
            .padding(20)

            HStack(spacing: 8) {
                Spacer()
                Button("Abbrechen", action: cancel)
                    .buttonStyle(SFTSmallButtonStyle())
                    .keyboardShortcut(.cancelAction)
                Button("Jetzt analysieren", action: run)
                    .buttonStyle(SFTPrimaryButtonStyle())
                    .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(SFT.card)
            .overlay(alignment: .top) { Divider().overlay(SFT.border) }
        }
        .frame(width: 560)
        .background(SFT.raised)
        .foregroundStyle(SFT.ink)
    }
}

#Preview {
    OfferImportRedesignView(
        tours: SFTRedesignSample.tours,
        selectedTourID: .constant(SFTRedesignSample.tours[0].id),
        finish: {}
    )
    .frame(width: 1160, height: 860)
    .preferredColorScheme(.dark)
}
