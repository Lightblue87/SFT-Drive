import SwiftUI

struct ToursRedesignView: View {
    var tours: [TourRow]
    var openEditor: (String) -> Void
    var createTour: () -> Void

    var templates: [TourTemplate] = SFTRedesignSample.templates
    /// Ruft in der App ToursRepository.duplicate(tourID:options:) auf und liefert die neue ID.
    var duplicate: (String, CopyOptions) -> String? = { id, _ in id }

    @State private var filter: Filter = .all
    @State private var query = ""
    @State private var selection: Set<String> = []
    @State private var duplicateTarget: TourRow?

    enum Filter: String, CaseIterable, Identifiable {
        case all = "Alle", published = "Veröffentlicht", drafts = "Entwürfe", archive = "Archiv"
        var id: String { rawValue }
    }

    private var visibleTours: [TourRow] {
        tours.filter { tour in
            let matchesFilter: Bool
            switch filter {
            case .all: matchesFilter = tour.lifecycle != .archived
            case .published: matchesFilter = tour.lifecycle == .live
            case .drafts: matchesFilter = tour.lifecycle == .draft
            case .archive: matchesFilter = tour.lifecycle == .archived
            }
            let matchesQuery = query.isEmpty
                || tour.title.localizedCaseInsensitiveContains(query)
                || tour.region.localizedCaseInsensitiveContains(query)
            return matchesFilter && matchesQuery
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                header
                filterRow
                if !selection.isEmpty { bulkBar }
                table
                templateLibrary
            }
            .padding(.horizontal, 28)
            .padding(.top, 24)
            .padding(.bottom, 28)
        }
        .background(SFT.canvas)
        .sheet(item: $duplicateTarget) { tour in
            DuplicateTourSheet(tour: tour) { options in
                if let newID = duplicate(tour.id, options) {
                    duplicateTarget = nil
                    openEditor(newID)
                }
            } cancel: {
                duplicateTarget = nil
            }
        }
    }

    private var header: some View {
        SFTPageHeader(title: "Touren") {
            Text("\(visibleTours.count) Touren · \(selection.count) ausgewählt · Rechtsklick für Duplizieren")
                .font(SFT.ui(13))
                .foregroundStyle(SFT.inkTertiary)
        } trailing: {
            Button {
                if let id = selection.first ?? visibleTours.first?.id {
                    duplicateTarget = tours.first { $0.id == id }
                }
            } label: {
                HStack(spacing: 8) {
                    Text("Duplizieren")
                    Text("⌘D").font(SFT.mono(10, .medium)).foregroundStyle(SFT.inkTertiary)
                }
            }
            .buttonStyle(SFTSecondaryButtonStyle())
            .keyboardShortcut("d", modifiers: .command)

            Button("Neue Tour ⌘N", action: createTour)
                .buttonStyle(SFTPrimaryButtonStyle())
                .keyboardShortcut("n", modifiers: .command)
        }
    }

    private var filterRow: some View {
        HStack(spacing: 8) {
            ForEach(Filter.allCases) { item in
                Button { filter = item } label: {
                    Text(item.rawValue)
                        .font(SFT.ui(11, filter == item ? .semibold : .medium))
                        .foregroundStyle(filter == item ? SFT.ink : SFT.inkTertiary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            filter == item ? SFT.red.opacity(0.16) : SFT.raised,
                            in: RoundedRectangle(cornerRadius: 7)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 7)
                                .strokeBorder(filter == item ? SFT.red.opacity(0.45) : SFT.border)
                        )
                }
                .buttonStyle(.plain)
            }
            Spacer()
            TextField("Suchen … ⌘F", text: $query)
                .textFieldStyle(.plain)
                .font(SFT.ui(11))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .frame(width: 220)
                .background(SFT.raised, in: RoundedRectangle(cornerRadius: 7))
                .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(SFT.border))
        }
    }

    private var bulkBar: some View {
        HStack(spacing: 10) {
            Text("\(selection.count) Touren ausgewählt").font(SFT.ui(12, .semibold))
            Spacer()
            Button("Als Vorlage sichern") { }.buttonStyle(SFTSmallButtonStyle())
            Button("CSV exportieren") { }.buttonStyle(SFTSmallButtonStyle())
            Button("Archivieren") { }.buttonStyle(SFTSmallButtonStyle())
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(SFT.red.opacity(0.10), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SFT.red.opacity(0.3)))
    }

    // MARK: Tabelle

    private var table: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Spacer().frame(width: 24)
                columnHeader("TOUR", maxWidth: .infinity, alignment: .leading)
                columnHeader("TERMIN", width: 110)
                columnHeader("REGION", width: 120)
                columnHeader("FAHRZEUGE", width: 90)
                columnHeader("PLANUNG", width: 90)
                columnHeader("STATUS", width: 100)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

            ForEach(visibleTours) { tour in
                tourRow(tour)
            }
        }
        .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
    }

    private func columnHeader(
        _ text: String, width: CGFloat? = nil,
        maxWidth: CGFloat? = nil, alignment: Alignment = .leading
    ) -> some View {
        Text(text)
            .font(SFT.mono(10, .medium))
            .tracking(0.8)
            .foregroundStyle(SFT.inkTertiary)
            .frame(width: width, maxWidth: maxWidth, alignment: alignment)
    }

    private func tourRow(_ tour: TourRow) -> some View {
        let isSelected = selection.contains(tour.id)
        return HStack(spacing: 10) {
            Button {
                if isSelected { selection.remove(tour.id) } else { selection.insert(tour.id) }
            } label: {
                SFTCheckbox(isOn: isSelected)
            }
            .buttonStyle(.plain)
            .frame(width: 24, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                Text(tour.title)
                    .font(SFT.ui(13, .semibold))
                    .foregroundStyle(tour.lifecycle == .draft ? SFT.inkTertiary : SFT.ink)
                Text(tour.subtitle).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(tour.dateRange).font(SFT.mono(12)).foregroundStyle(SFT.inkSecondary).frame(width: 110, alignment: .leading)
            Text(tour.region).font(SFT.ui(12)).foregroundStyle(SFT.inkTertiary).frame(width: 120, alignment: .leading)
            Text(tour.vehiclesText).font(SFT.mono(12, .medium)).frame(width: 90, alignment: .leading)
            SFTPlanningBars(states: tour.planning.map(tone)).frame(width: 90, alignment: .leading)
            SFTBadge(text: tour.lifecycle.badge, tone: badgeTone(tour.lifecycle))
                .frame(width: 100, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(isSelected ? SFT.red.opacity(0.07) : .clear)
        .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
        .contentShape(Rectangle())
        .onTapGesture(count: 2) { openEditor(tour.id) }
        .contextMenu {
            Button("Tour duplizieren …") { duplicateTarget = tour }
                .keyboardShortcut("d", modifiers: .command)
            Button("Bearbeiten") { openEditor(tour.id) }
            Button("Als Vorlage sichern") { }
            Button("Teilnehmerliste exportieren") { }
            Divider()
            Button("Archivieren", role: .destructive) { }
        }
    }

    private func tone(_ segment: PlanningSegment) -> SFTStatusTone {
        switch segment {
        case .done: return .confirmed
        case .open: return .open
        case .missing: return .inactive
        }
    }

    private func badgeTone(_ lifecycle: TourLifecycle) -> SFTStatusTone {
        switch lifecycle {
        case .live: return .blocked
        case .registration: return .open
        case .draft, .archived: return .neutral
        }
    }

    // MARK: Vorlagen

    private var templateLibrary: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("Vorlagen").font(SFT.ui(16, .bold))
                Text("Wiederverwendbare Bausteine — Etappen, Hotels, Speisekarten, Fristen, Regeln, Texte")
                    .font(SFT.ui(12))
                    .foregroundStyle(SFT.inkTertiary)
            }
            .padding(.top, 10)

            LazyVGrid(columns: Array(repeating: GridItem(spacing: 10), count: 4), spacing: 10) {
                ForEach(templates) { template in
                    Button(action: createTour) {
                        VStack(alignment: .leading, spacing: 0) {
                            SFTStripePlaceholder().frame(height: 52)
                            Text(template.title).font(SFT.ui(13, .semibold)).padding(.top, 10)
                            Text(template.summary).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary).padding(.top, 3)
                            Text("\(template.usageCount)× verwendet")
                                .font(SFT.mono(10))
                                .foregroundStyle(SFT.inkTertiary)
                                .padding(.top, 7)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(SFT.card, in: RoundedRectangle(cornerRadius: 11))
                        .overlay(RoundedRectangle(cornerRadius: 11).strokeBorder(SFT.border))
                    }
                    .buttonStyle(.plain)
                }

                Button(action: createTour) {
                    VStack(spacing: 6) {
                        Text("Neue Vorlage").font(SFT.ui(13, .semibold)).foregroundStyle(SFT.inkTertiary)
                        Text("aus bestehender Tour ableiten")
                            .font(SFT.ui(11))
                            .foregroundStyle(SFT.inkTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 128)
                    .padding(14)
                    .overlay(
                        RoundedRectangle(cornerRadius: 11)
                            .strokeBorder(SFT.borderStrong, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct SFTStripePlaceholder: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 7)
            .fill(SFT.raised)
            .overlay {
                GeometryReader { geo in
                    Path { path in
                        let step: CGFloat = 16
                        var x = -geo.size.height
                        while x < geo.size.width + geo.size.height {
                            path.move(to: CGPoint(x: x, y: geo.size.height))
                            path.addLine(to: CGPoint(x: x + geo.size.height, y: 0))
                            x += step
                        }
                    }
                    .stroke(Color.white.opacity(0.04), lineWidth: 8)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 7))
    }
}

// MARK: - Duplizieren

struct DuplicateTourSheet: View {
    let tour: TourRow
    var confirm: (CopyOptions) -> Void
    var cancel: () -> Void

    @State private var options = CopyOptions()

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text("„\(tour.title)“ duplizieren").font(SFT.ui(16, .bold))
                Text("Das Duplikat entsteht als Entwurf. Titel und Termin passt du danach im Editor an.")
                    .font(SFT.ui(12))
                    .foregroundStyle(SFT.inkTertiary)
                    .padding(.top, 4)

                SFTSectionLabel(text: "Was mitkopieren?").padding(.top, 18)

                LazyVGrid(columns: Array(repeating: GridItem(spacing: 8), count: 2), spacing: 8) {
                    copyToggle("Etappen & Routen", $options.stages)
                    copyToggle("Stopps", $options.stops)
                    copyToggle("Hotels & Konditionen", $options.hotels)
                    copyToggle("Restaurants & Karte", $options.restaurants)
                    copyToggle("Regeln & Fristen", $options.rulesAndDeadlines)
                    copyToggle("Beschreibungstexte", $options.descriptions)
                }
                .padding(.top, 10)

                SFTNotice(text: "Teilnehmer, Anmeldungen, Bestellungen und Bestätigungen werden nie mitkopiert.")
                    .padding(.top, 14)
            }
            .padding(20)

            HStack(spacing: 8) {
                Spacer()
                Button("Abbrechen", action: cancel)
                    .buttonStyle(SFTSmallButtonStyle())
                    .keyboardShortcut(.cancelAction)
                Button("Duplizieren & öffnen ↩") { confirm(options) }
                    .buttonStyle(SFTPrimaryButtonStyle())
                    .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(SFT.card)
            .overlay(alignment: .top) { Divider().overlay(SFT.border) }
        }
        .frame(width: 520)
        .background(SFT.raised)
        .foregroundStyle(SFT.ink)
    }

    private func copyToggle(_ title: String, _ binding: Binding<Bool>) -> some View {
        Button { binding.wrappedValue.toggle() } label: {
            HStack(spacing: 9) {
                SFTCheckbox(isOn: binding.wrappedValue)
                Text(title)
                    .font(SFT.ui(12, .medium))
                    .foregroundStyle(binding.wrappedValue ? SFT.ink : SFT.inkTertiary)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 9)
            .background(SFT.control, in: RoundedRectangle(cornerRadius: SFT.Radius.control))
        }
        .buttonStyle(.plain)
    }
}

extension View {
    /// sheet(item:) für nicht-optionale Inhalte mit Identifiable-Wert.
    func sheet<Item: Identifiable, Content: View>(
        item: Binding<Item?>,
        @ViewBuilder content: @escaping (Item) -> Content
    ) -> some View {
        sheet(isPresented: Binding(
            get: { item.wrappedValue != nil },
            set: { if !$0 { item.wrappedValue = nil } }
        )) {
            if let value = item.wrappedValue { content(value) }
        }
    }
}

#Preview {
    ToursRedesignView(tours: SFTRedesignSample.tours, openEditor: { _ in }, createTour: {})
        .frame(width: 1160, height: 860)
        .preferredColorScheme(.dark)
}
