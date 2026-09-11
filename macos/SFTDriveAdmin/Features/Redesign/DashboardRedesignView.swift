import SwiftUI

struct DashboardRedesignView: View {
    var tours: [TourRow]
    var openTour: (String) -> Void
    var openHotels: (String) -> Void
    var openMeals: (String) -> Void
    var createTour: () -> Void

    var seasonBars: [SeasonBar] = SFTRedesignSample.seasonBars
    var metricValues: [RedesignDashboardMetric: Int] = SFTRedesignSample.metricValues
    var registrations: [RegistrationRow] = SFTRedesignSample.registrations
    var deadlines: [DeadlineRow] = SFTRedesignSample.deadlines
    var activity: [ActivityRow] = SFTRedesignSample.activity
    var nextTour: NextTourCard = SFTRedesignSample.nextTour
    var refresh: () -> Void = {}

    @State private var activeMetric: RedesignDashboardMetric? = .pendingVehicles
    @State private var selection: Set<String> = []
    @AppStorage("redesign.showSeasonStrip") private var showSeasonStrip = true

    private let months = ["APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT"]
    private let columns = 14

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if showSeasonStrip { seasonStrip }
                HStack(alignment: .top, spacing: 16) {
                    VStack(spacing: 14) {
                        metricGrid
                        drilldown
                    }
                    rightColumn.frame(width: 320)
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 24)
            .padding(.bottom, 28)
        }
        .background(SFT.canvas)
    }

    // MARK: Kopf

    private var header: some View {
        SFTPageHeader(title: "Ausfahrten im Blick") {
            Text("Saison 2026 · \(tours.count) Touren · \(metricValues[.deadlines] ?? 0) Fristen in den nächsten 7 Tagen")
                .font(SFT.ui(13))
                .foregroundStyle(SFT.inkTertiary)
        } trailing: {
            Button(action: createTour) {
                HStack(spacing: 8) {
                    Text("Neue Tour")
                    Text("⌘N").font(SFT.mono(10, .medium)).opacity(0.75)
                }
            }
            .buttonStyle(SFTPrimaryButtonStyle())
            .keyboardShortcut("n", modifiers: .command)

            Button(action: refresh) {
                HStack(spacing: 8) {
                    Text("Aktualisieren")
                    Text("⌘R").font(SFT.mono(10, .medium)).foregroundStyle(SFT.inkTertiary)
                }
            }
            .buttonStyle(SFTSecondaryButtonStyle())
            .keyboardShortcut("r", modifiers: .command)
        }
    }

    // MARK: Saison-Streifen

    private var seasonStrip: some View {
        SFTCard(padding: 16) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("SAISON 2026").font(SFT.ui(12, .semibold)).tracking(0.5)
                    Spacer()
                    HStack(spacing: 14) {
                        legendItem("veröffentlicht", SFT.red)
                        legendItem("Anmeldung offen", SFT.amber)
                        legendItem("Entwurf", SFT.decoration)
                    }
                }

                HStack(spacing: 0) {
                    ForEach(months, id: \.self) { month in
                        Text(month)
                            .font(SFT.mono(10, .medium))
                            .foregroundStyle(SFT.inkTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.bottom, 6)
                .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

                VStack(spacing: 5) {
                    ForEach(seasonBars) { bar in
                        seasonRow(bar)
                    }
                }
                .padding(.top, 2)
            }
        }
    }

    private func seasonRow(_ bar: SeasonBar) -> some View {
        GeometryReader { geo in
            let unit = geo.size.width / CGFloat(columns)
            Button { openTour(bar.tourID) } label: {
                HStack {
                    Text(bar.title)
                        .font(SFT.ui(11, .semibold))
                        .foregroundStyle(bar.lifecycle == .draft ? SFT.inkTertiary : SFT.ink)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 9)
                .frame(width: max(unit * CGFloat(bar.span) - 4, 40), height: 26, alignment: .leading)
                .background(tint(bar.lifecycle).opacity(bar.lifecycle == .draft ? 0.06 : 0.22),
                            in: RoundedRectangle(cornerRadius: SFT.Radius.pill))
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(tint(bar.lifecycle))
                        .frame(width: 3)
                }
                .clipShape(RoundedRectangle(cornerRadius: SFT.Radius.pill))
                .offset(x: unit * CGFloat(bar.startColumn - 1))
            }
            .buttonStyle(.plain)
            .help(bar.title)
        }
        .frame(height: 26)
    }

    private func tint(_ lifecycle: TourLifecycle) -> Color {
        switch lifecycle {
        case .live: return SFT.red
        case .registration: return SFT.amber
        case .draft, .archived: return SFT.decoration
        }
    }

    private func legendItem(_ text: String, _ color: Color) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 8, height: 8)
            Text(text).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
        }
    }

    // MARK: Kacheln

    private var metricGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(spacing: 10), count: 3), spacing: 10) {
            ForEach(RedesignDashboardMetric.allCases) { metric in
                let value = metricValues[metric] ?? 0
                SFTMetricTile(
                    title: metric.title,
                    value: "\(value)",
                    needsAction: metric.signalsAction && value > 0,
                    isZero: value == 0,
                    isActive: activeMetric == metric
                ) {
                    activeMetric = activeMetric == metric ? nil : metric
                    selection.removeAll()
                }
            }
        }
    }

    // MARK: Drilldown

    @ViewBuilder private var drilldown: some View {
        if let metric = activeMetric {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Text(metric.drilldownTitle).font(SFT.ui(13, .semibold))
                    Text(hint(for: metric)).font(SFT.mono(11)).foregroundStyle(SFT.inkTertiary)
                    Spacer()
                    Button("Alle auswählen") {
                        selection = Set(rows(for: metric).filter(\.canApprove).map(\.id))
                    }
                    .buttonStyle(SFTSmallButtonStyle())

                    Button("\(selection.count) bestätigen") { selection.removeAll() }
                        .buttonStyle(SFTSmallButtonStyle())
                        .disabled(selection.isEmpty)
                        .foregroundStyle(SFT.greenInk)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 13)
                .overlay(alignment: .bottom) { Divider().overlay(SFT.border) }

                ForEach(rows(for: metric)) { row in
                    registrationRow(row)
                }
            }
            .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
            .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
        }
    }

    private func hint(for metric: RedesignDashboardMetric) -> String {
        switch metric {
        case .pendingVehicles: return "Anfragen über mehrere Touren · Mehrfachauswahl möglich"
        case .waitlist: return "rücken bei Absagen automatisch nach"
        case .accommodation: return "fehlende Rückbestätigungen"
        case .meals: return "fehlende Bestellungen"
        case .checkIn: return "am Tourtag relevant"
        case .deadlines: return "nächste sieben Tage"
        }
    }

    private func rows(for metric: RedesignDashboardMetric) -> [RegistrationRow] {
        switch metric {
        case .waitlist: return registrations.filter { $0.status == "waitlisted" }
        default: return registrations.filter { $0.status == "pending" }
        }
    }

    private func registrationRow(_ row: RegistrationRow) -> some View {
        HStack(spacing: 12) {
            Button {
                if selection.contains(row.id) { selection.remove(row.id) } else { selection.insert(row.id) }
            } label: {
                SFTCheckbox(isOn: selection.contains(row.id))
            }
            .buttonStyle(.plain)
            .disabled(!row.canApprove)
            .opacity(row.canApprove ? 1 : 0.4)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(row.name) · \(row.username)").font(SFT.ui(13, .semibold))
                Text(row.vehicle).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
            }
            Spacer(minLength: 8)

            Text(row.tourTitle)
                .font(SFT.ui(11))
                .foregroundStyle(SFT.inkTertiary)
                .frame(width: 150, alignment: .leading)

            SFTBadge(text: row.status, tone: row.canApprove ? .open : .neutral)

            // Wartelisteneinträge dürfen serverseitig nicht bestätigt werden.
            if row.canApprove {
                Button("Bestätigen") { }.buttonStyle(SFTSmallButtonStyle())
                Button("Ablehnen") { }.buttonStyle(SFTDestructiveOutlineButtonStyle())
            } else {
                Text("rückt automatisch nach")
                    .font(SFT.mono(10))
                    .foregroundStyle(SFT.inkTertiary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .overlay(alignment: .bottom) { Divider().overlay(SFT.hairline) }
    }

    // MARK: Rechte Spalte

    private var rightColumn: some View {
        VStack(spacing: 12) {
            SFTCard {
                VStack(alignment: .leading, spacing: 0) {
                    SFTSectionLabel(text: "Nächste Tour")
                    Text(nextTour.title).font(SFT.ui(17, .bold)).padding(.top, 8)
                    Text(nextTour.meta).font(SFT.ui(12)).foregroundStyle(SFT.inkTertiary).padding(.top, 3)

                    LazyVGrid(columns: Array(repeating: GridItem(spacing: 8), count: 2), spacing: 8) {
                        miniStat("Fahrzeuge", nextTour.vehicles, false)
                        miniStat("Personen", nextTour.people, false)
                        miniStat("Nächte ok", nextTour.nights, nextTour.nightsNeedAction)
                        miniStat("Bestellungen", nextTour.orders, nextTour.ordersNeedAction)
                    }
                    .padding(.top, 14)

                    HStack(spacing: 8) {
                        Button("Hotelmatrix") { openHotels(nextTour.tourID) }
                            .buttonStyle(SFTSmallButtonStyle())
                            .frame(maxWidth: .infinity)
                        Button("Essen") { openMeals(nextTour.tourID) }
                            .buttonStyle(SFTSmallButtonStyle())
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.top, 12)
                }
            }

            SFTCard {
                VStack(alignment: .leading, spacing: 10) {
                    SFTSectionLabel(text: "Fristen")
                    ForEach(deadlines) { deadline in
                        HStack(alignment: .top, spacing: 10) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(deadline.isUrgent ? SFT.red : SFT.amber)
                                .frame(width: 3)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(deadline.title).font(SFT.ui(12, .semibold))
                                Text(deadline.context).font(SFT.ui(11)).foregroundStyle(SFT.inkTertiary)
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            SFTCard {
                VStack(alignment: .leading, spacing: 9) {
                    SFTSectionLabel(text: "Teilnehmer-Aktionen")
                    ForEach(activity) { entry in
                        (
                            Text(entry.actor).font(SFT.ui(12, .semibold)).foregroundStyle(SFT.ink)
                            + Text(" \(entry.text) · \(entry.time)").font(SFT.ui(12)).foregroundStyle(SFT.inkSecondary)
                        )
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private func miniStat(_ title: String, _ value: String, _ needsAction: Bool) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(SFT.ui(10)).foregroundStyle(SFT.inkTertiary)
            Text(value).font(SFT.mono(16, .bold)).foregroundStyle(needsAction ? SFT.amber : SFT.ink)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SFT.raised, in: RoundedRectangle(cornerRadius: SFT.Radius.control))
    }
}

#Preview {
    DashboardRedesignView(
        tours: SFTRedesignSample.tours,
        openTour: { _ in }, openHotels: { _ in }, openMeals: { _ in }, createTour: {}
    )
    .frame(width: 1160, height: 860)
    .preferredColorScheme(.dark)
}
