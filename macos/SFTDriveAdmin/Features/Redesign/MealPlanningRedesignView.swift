import SwiftUI

// Essensplanung: Tour wählen → Restaurant-Stopp wählen → Küchenzettel oder Teilnehmer.
// Der Umschalter ist bei JEDER Tour sichtbar.

struct MealPlanningRedesignView: View {
    var tours: [TourRow]
    @Binding var selectedTourID: String
    var openImport: () -> Void

    var plan: (String) -> MealPlan = { SFTRedesignSample.mealPlan(for: $0) }
    var remind: (String) -> Void = { _ in }
    var exportPDF: () -> Void = {}

    @State private var mode: Mode = .kitchen
    @State private var stopID: String?

    enum Mode: Hashable { case kitchen, guests }

    private var current: MealPlan { plan(selectedTourID) }
    private var activeStop: RestaurantStopChip? {
        current.stops.first { $0.id == stopID } ?? current.stops.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                SFTSegmented(
                    selection: $mode,
                    options: [(.kitchen, "Küchenzettel"), (.guests, "Teilnehmer")]
                )
                summaryCards
                switch mode {
                case .kitchen: kitchenSheet
                case .guests: guestList
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 24)
            .padding(.bottom, 28)
        }
        .background(SFT.canvas)
        .onChange(of: selectedTourID) { _, _ in stopID = plan(selectedTourID).stops.first?.id }
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 12) {
                    Text("Essensplanung").font(SFT.ui(26, .bold))
                    TourPicker(tours: tours, selectedTourID: $selectedTourID)
                }
                HStack(spacing: 8) {
                    ForEach(current.stops) { stop in
                        Button { stopID = stop.id } label: {
                            Text(stop.title)
                                .font(SFT.ui(11, activeStop?.id == stop.id ? .semibold : .medium))
                                .foregroundStyle(activeStop?.id == stop.id ? SFT.ink : SFT.inkTertiary)
                                .padding(.horizontal, 11)
                                .padding(.vertical, 5)
                                .background(
                                    activeStop?.id == stop.id ? SFT.red.opacity(0.16) : SFT.raised,
                                    in: RoundedRectangle(cornerRadius: 7)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 7).strokeBorder(
                                        activeStop?.id == stop.id ? SFT.red.opacity(0.45) : SFT.border
                                    )
                                )
                        }
                        .buttonStyle(.plain)
                    }

                    Text("\(current.summary.confirmedVehicles) bestätigte Fahrzeuge · Bestellfrist ")
                        .font(SFT.ui(12))
                        .foregroundStyle(SFT.inkTertiary)
                    + Text(current.summary.deadlineText)
                        .font(SFT.ui(12))
                        .foregroundStyle(current.summary.deadlineIsUrgent ? SFT.red : SFT.inkTertiary)
                }
            }
            Spacer(minLength: 12)
            HStack(spacing: 8) {
                Button("Speisekarte importieren", action: openImport).buttonStyle(SFTSecondaryButtonStyle())
                Button("PDF ans Restaurant", action: exportPDF).buttonStyle(SFTSecondaryButtonStyle())
                if current.openOrders > 0 {
                    Button("\(current.openOrders) Offene erinnern") { remind(selectedTourID) }
                        .buttonStyle(SFTAmberButtonStyle())
                        .keyboardShortcut("e", modifiers: [.command, .shift])
                }
            }
        }
    }

    private var summaryCards: some View {
        LazyVGrid(columns: Array(repeating: GridItem(spacing: 10), count: 4), spacing: 10) {
            summaryCard("Bestellt", "\(current.summary.orderedVehicles) / \(current.summary.confirmedVehicles)")
            summaryCard("Gerichte gesamt", "\(current.summary.dishes)")
            summaryCard("Vegetarisch / vegan", "\(current.summary.vegetarian) / \(current.summary.vegan)")
            summaryCard("Summe", format(current.summary.total, suffix: " €"))
        }
    }

    private func summaryCard(_ title: String, _ value: String) -> some View {
        SFTCard(padding: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
                Text(value).font(SFT.mono(20, .bold))
            }
        }
    }

    // MARK: Küchenzettel

    private var kitchenSheet: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    columnHeader("GERICHT", maxWidth: .infinity, alignment: .leading)
                    columnHeader("ANZAHL", width: 90, alignment: .trailing)
                    columnHeader("PREIS", width: 90, alignment: .trailing)
                    columnHeader("SUMME", width: 110, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

                ForEach(current.menu) { line in
                    HStack(spacing: 0) {
                        HStack(spacing: 6) {
                            Text(line.name).font(SFT.ui(13, .semibold))
                            if line.isVegan {
                                SFTBadge(text: "vegan", tone: .confirmed)
                            } else if line.isVegetarian {
                                SFTBadge(text: "veg", tone: .confirmed)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        Text("\(line.count)").font(SFT.mono(14, .bold)).frame(width: 90, alignment: .trailing)
                        Text(format(line.price)).font(SFT.mono(12)).foregroundStyle(SFT.inkTertiary)
                            .frame(width: 90, alignment: .trailing)
                        Text(format(line.total)).font(SFT.mono(13, .medium)).frame(width: 110, alignment: .trailing)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 11)
                    .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
                }

                HStack(spacing: 0) {
                    Text(current.kitchenFooter)
                        .font(SFT.ui(12, .semibold))
                        .foregroundStyle(SFT.inkTertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("\(current.summary.dishes)").font(SFT.mono(14, .bold)).frame(width: 90, alignment: .trailing)
                    Spacer().frame(width: 90)
                    Text(format(current.summary.total)).font(SFT.mono(14, .bold)).frame(width: 110, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(SFT.raised)
            }
            .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
            .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))

            if current.openOrders > 0 {
                HStack(spacing: 12) {
                    Text("\(current.openOrders) Fahrzeuge haben noch nicht bestellt — Frist \(current.summary.deadlineText).")
                        .font(SFT.ui(12))
                        .foregroundStyle(SFT.redInk)
                    Spacer()
                    Button("Offene anzeigen") { mode = .guests }.buttonStyle(SFTSmallButtonStyle())
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(SFT.red.opacity(0.09), in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SFT.red.opacity(0.28)))
            } else {
                SFTNotice(
                    text: "Bestellung vollständig — Küchenzettel kann ans Restaurant gehen.",
                    tone: .confirmed
                )
            }
        }
    }

    // MARK: Teilnehmer

    private var guestList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                columnHeader("TEILNEHMER", width: 230, alignment: .leading)
                columnHeader("BESTELLUNG", maxWidth: .infinity, alignment: .leading)
                columnHeader("SUMME", width: 120, alignment: .trailing)
                columnHeader("AKTION", width: 110, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

            ForEach(current.orders) { entry in
                HStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(entry.participant).font(SFT.ui(12, .semibold))
                        Text(entry.detail).font(SFT.ui(10)).foregroundStyle(SFT.inkTertiary)
                    }
                    .frame(width: 230, alignment: .leading)

                    Text(entry.order ?? "noch nichts bestellt")
                        .font(SFT.ui(12))
                        .foregroundStyle(entry.order == nil ? SFT.amber : SFT.inkSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(entry.total.map { format($0) } ?? "—")
                        .font(SFT.mono(12, .medium))
                        .foregroundStyle(entry.total == nil ? SFT.inkTertiary : SFT.ink)
                        .frame(width: 120, alignment: .trailing)

                    Group {
                        if entry.order == nil {
                            Button("Erinnern") { remind(entry.id) }.buttonStyle(SFTSmallButtonStyle())
                        } else {
                            Text("bestellt").font(SFT.mono(10)).foregroundStyle(SFT.inkTertiary)
                        }
                    }
                    .frame(width: 110, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(entry.order == nil ? SFT.amber.opacity(0.05) : .clear)
                .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
            }

            HStack {
                Text(current.guestFooter).font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                Spacer()
                Button("Alle \(current.summary.confirmedVehicles) anzeigen") { }
                    .buttonStyle(SFTSmallButtonStyle())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(SFT.raised)
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
            .frame(minWidth: width, idealWidth: width, maxWidth: width ?? maxWidth, alignment: alignment)
    }

    private func format(_ value: Decimal, suffix: String = "") -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "de_DE")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        let text = formatter.string(from: value as NSDecimalNumber) ?? "\(value)"
        return text + suffix
    }
}

/// Alles, was die Essensplanung für eine Tour und einen Stopp braucht.
struct MealPlan: Sendable {
    var stops: [RestaurantStopChip]
    var summary: MealSummary
    var menu: [MenuLine]
    var orders: [ParticipantOrder]
    var kitchenFooter: String
    var guestFooter: String
    var openOrders: Int
}

#Preview {
    MealPlanningRedesignView(
        tours: SFTRedesignSample.tours,
        selectedTourID: .constant(SFTRedesignSample.tours[0].id),
        openImport: {}
    )
    .frame(width: 1160, height: 820)
    .preferredColorScheme(.dark)
}
