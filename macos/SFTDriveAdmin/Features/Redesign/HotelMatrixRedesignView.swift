import SwiftUI

// Hotelplanung als Matrix Teilnehmer × Nächte.
// Die Tour MUSS wählbar sein – die Zeilen ergeben sich aus der gewählten Tour.

struct HotelMatrixRedesignView: View {
    var tours: [TourRow]
    @Binding var selectedTourID: String

    var plan: (String) -> HotelPlan = { SFTRedesignSample.hotelPlan(for: $0) }
    var remind: (String, String) -> Void = { _, _ in }
    /// Setzen mit Vermerk „durch Admin“ – niemals durch KI.
    var confirmByAdmin: (String, String) -> Void = { _, _ in }

    @State private var openCell: HotelCell?

    private var tour: TourRow? { tours.first { $0.id == selectedTourID } }
    private var current: HotelPlan { plan(selectedTourID) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                capacityCards
                matrix
                legend
            }
            .padding(.horizontal, 28)
            .padding(.top, 24)
            .padding(.bottom, 28)
        }
        .background(SFT.canvas)
    }

    // MARK: Kopf mit Tour-Wähler

    private var header: some View {
        HStack(alignment: .bottom, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 12) {
                    Text("Hotelplanung").font(SFT.ui(26, .bold))
                    TourPicker(tours: tours, selectedTourID: $selectedTourID)
                }
                Text(current.subtitle)
                    .font(SFT.ui(13))
                    .foregroundStyle(SFT.inkTertiary)
                + Text(current.openConfirmations > 0 ? " · \(current.openConfirmations) Rückbestätigungen offen" : "")
                    .font(SFT.ui(13))
                    .foregroundStyle(SFT.amber)
            }
            Spacer(minLength: 12)
            HStack(spacing: 8) {
                Button("CSV") { }.buttonStyle(SFTSecondaryButtonStyle())
                Button("Alle Offenen erinnern") { }
                    .buttonStyle(SFTAmberButtonStyle())
                    .keyboardShortcut("e", modifiers: [.command, .shift])
            }
        }
    }

    private var capacityCards: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(spacing: 10), count: max(current.capacities.count, 1)),
            spacing: 10
        ) {
            ForEach(current.capacities) { card in
                SFTCard(padding: 14) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(card.hotelAndNight).font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text("\(card.confirmed)")
                                .font(SFT.mono(18, .bold))
                                .foregroundStyle(
                                    card.isOverbooked ? SFT.red
                                        : (card.confirmed < card.expected ? SFT.amber : SFT.ink)
                                )
                            Text("/ \(card.expected) Kontingent \(card.allotment)")
                                .font(SFT.ui(11))
                                .foregroundStyle(SFT.inkTertiary)
                        }
                        .padding(.top, 5)
                        SFTProgressBar(
                            fraction: card.fraction,
                            tint: card.isOverbooked ? SFT.red : (card.confirmed < card.expected ? SFT.amber : SFT.green)
                        )
                        .padding(.top, 8)
                    }
                }
            }
        }
    }

    // MARK: Matrix

    private var matrix: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("TEILNEHMER")
                    .font(SFT.mono(10, .medium)).tracking(0.8)
                    .foregroundStyle(SFT.inkTertiary)
                    .frame(width: 240, alignment: .leading)
                ForEach(current.nights) { night in
                    Text("\(night.weekday) \(night.date)")
                        .font(SFT.mono(10, .medium)).tracking(0.8)
                        .foregroundStyle(SFT.inkTertiary)
                        .frame(maxWidth: .infinity)
                }
                Text("AKTION")
                    .font(SFT.mono(10, .medium)).tracking(0.8)
                    .foregroundStyle(SFT.inkTertiary)
                    .frame(width: 120, alignment: .trailing)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

            ForEach(current.rows) { row in
                matrixRow(row)
            }
        }
        .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
    }

    private func matrixRow(_ row: HotelMatrixRow) -> some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 1) {
                Text(row.participant).font(SFT.ui(12, .semibold))
                Text(row.vehicle).font(SFT.ui(10)).foregroundStyle(SFT.inkTertiary)
            }
            .frame(width: 240, alignment: .leading)

            ForEach(row.cells) { cell in
                cellView(cell, participant: row.participant)
                    .frame(maxWidth: .infinity)
            }

            trailing(row)
                .frame(width: 120, alignment: .trailing)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
    }

    @ViewBuilder private func cellView(_ cell: HotelCell, participant: String) -> some View {
        switch cell.state {
        case .confirmed(let code):
            pill(text: code, tone: .confirmed, cell: cell)
        case .pending(let code):
            pill(text: code.map { "\($0)?" } ?? "offen", tone: .open, cell: cell, emphasized: openCell?.id == cell.id)
        case .waitlisted:
            pill(text: "Warteliste", tone: .blocked, cell: cell)
        case .privateStay:
            Text("privat").font(SFT.mono(10, .medium)).foregroundStyle(SFT.inkTertiary)
        case .notNeeded:
            Text("—").font(SFT.mono(10)).foregroundStyle(SFT.decoration)
        }
    }

    private func pill(
        text: String, tone: SFTStatusTone, cell: HotelCell, emphasized: Bool = false
    ) -> some View {
        Button { openCell = cell } label: {
            SFTStatusPill(text: text, tone: tone, emphasized: emphasized)
        }
        .buttonStyle(.plain)
        .disabled(cell.detail == nil)
        .popover(isPresented: Binding(
            get: { openCell?.id == cell.id },
            set: { if !$0 { openCell = nil } }
        )) {
            if let detail = cell.detail {
                HotelCellPopover(
                    detail: detail,
                    remind: { remind(cell.id, cell.nightID); openCell = nil },
                    confirmByAdmin: { confirmByAdmin(cell.id, cell.nightID); openCell = nil }
                )
            }
        }
    }

    @ViewBuilder private func trailing(_ row: HotelMatrixRow) -> some View {
        switch row.trailingAction {
        case .complete:
            Text("vollständig").font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
        case .remind:
            Button("Erinnern") { }.buttonStyle(SFTSmallButtonStyle())
        case .rebook:
            Button("Umbuchen") { }.buttonStyle(SFTSmallButtonStyle())
        }
    }

    private var legend: some View {
        HStack(spacing: 18) {
            legendItem("rückbestätigt", SFT.green)
            legendItem("offen", SFT.amber)
            legendItem("Kontingent voll", SFT.red)
            legendItem("privat organisiert", SFT.decoration)
            Spacer()
            Text(current.legendNote).font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
        }
        .font(SFT.ui(11))
    }

    private func legendItem(_ text: String, _ color: Color) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(text).foregroundStyle(SFT.inkTertiary)
        }
    }
}

/// Popover einer Matrixzelle. „Als bestätigt setzen“ nur durch Admin, mit Protokollvermerk.
struct HotelCellPopover: View {
    let detail: HotelCellDetail
    var remind: () -> Void
    var confirmByAdmin: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(detail.isConfirmed ? SFT.green : SFT.amber)
                        .frame(width: 8, height: 8)
                    Text("\(detail.participant) · \(detail.night)").font(SFT.ui(13, .semibold))
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(detail.hotel) · \(detail.roomType)")
                    Text(detail.priceLine)
                    Text(detail.termsLine)
                }
                .font(SFT.ui(11))
                .foregroundStyle(SFT.inkTertiary)
                .padding(.top, 8)
                .fixedSize(horizontal: false, vertical: true)

                if !detail.isConfirmed {
                    SFTNotice(text: detail.statusNote).padding(.top, 10)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 12)

            VStack(spacing: 6) {
                Button("Erinnerung senden", action: remind)
                    .buttonStyle(SFTPrimaryButtonStyle())
                    .frame(maxWidth: .infinity)
                Button("Als bestätigt setzen (durch Admin)", action: confirmByAdmin)
                    .buttonStyle(SFTSmallButtonStyle())
                    .frame(maxWidth: .infinity)
                Text("wird im Protokoll als Admin-Eintrag vermerkt")
                    .font(SFT.ui(10))
                    .foregroundStyle(SFT.inkTertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(SFT.raised)
            .overlay(alignment: .top) { Divider().overlay(SFT.border) }
        }
        .frame(width: 290)
        .background(SFT.control)
        .foregroundStyle(SFT.ink)
    }
}

/// Tour-Wähler für Hotel-, Essensplanung und Import.
struct TourPicker: View {
    let tours: [TourRow]
    @Binding var selectedTourID: String
    @State private var isOpen = false

    private var selected: TourRow? { tours.first { $0.id == selectedTourID } }

    var body: some View {
        Button { isOpen.toggle() } label: {
            HStack(spacing: 9) {
                Circle().fill(dot(selected?.lifecycle ?? .draft)).frame(width: 8, height: 8)
                Text(selected?.title ?? "Tour wählen").font(SFT.ui(13, .semibold))
                Text("▾").foregroundStyle(SFT.inkTertiary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(SFT.raised, in: RoundedRectangle(cornerRadius: SFT.Radius.control))
            .overlay(RoundedRectangle(cornerRadius: SFT.Radius.control).strokeBorder(SFT.borderStrong))
        }
        .buttonStyle(.plain)
        .popover(isPresented: $isOpen) {
            VStack(alignment: .leading, spacing: 2) {
                SFTSectionLabel(text: "Tour wählen").padding(.horizontal, 10).padding(.top, 7).padding(.bottom, 5)
                ForEach(tours) { tour in
                    Button {
                        selectedTourID = tour.id
                        isOpen = false
                    } label: {
                        HStack(spacing: 9) {
                            Circle().fill(dot(tour.lifecycle)).frame(width: 7, height: 7)
                            Text(tour.title)
                                .font(SFT.ui(12, .medium))
                                .foregroundStyle(tour.lifecycle == .archived ? SFT.inkTertiary : SFT.ink)
                            Spacer(minLength: 12)
                            Text(tour.lifecycle == .archived ? "abgeschlossen" : tour.dateRange)
                                .font(SFT.mono(10))
                                .foregroundStyle(SFT.inkTertiary)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(5)
            .frame(width: 300)
            .background(SFT.control)
        }
    }

    private func dot(_ lifecycle: TourLifecycle) -> Color {
        switch lifecycle {
        case .live: return SFT.red
        case .registration: return SFT.amber
        case .draft: return SFT.decoration
        case .archived: return SFT.decoration
        }
    }
}

/// Alles, was die Matrix für eine Tour braucht.
struct HotelPlan: Sendable {
    var subtitle: String
    var openConfirmations: Int
    var nights: [HotelNightColumn]
    var capacities: [HotelCapacityCard]
    var rows: [HotelMatrixRow]
    var legendNote: String
}

#Preview {
    HotelMatrixRedesignView(
        tours: SFTRedesignSample.tours,
        selectedTourID: .constant(SFTRedesignSample.tours[0].id)
    )
    .frame(width: 1160, height: 820)
    .preferredColorScheme(.dark)
}
