import SwiftUI

/// Besitzt die einzige DashboardModel-Instanz der Sitzung und lädt sie genau
/// einmal beim Start. RedesignShellView liest daraus sowohl den Dashboard-
/// Bildschirm als auch die Sidebar-Zähler ("Touren"/"Hotelplanung"/
/// "Essensplanung") -- vorher lud ein separater RedesignLiveDataLoader
/// dieselben Touren/PlanningSummaries ein zweites Mal nur für die Sidebar,
/// und rechnete die Essen-Kennzahl zudem falsch (`confirmedVehicles -
/// max(orders)` statt der Summe offener Bestellungen je Restaurant-Stopp).
/// Eine gemeinsame Instanz beseitigt beides: kein doppelter Request (§6/§24),
/// dieselbe -- bereits korrekte -- Formel wie im Dashboard selbst (§7,
/// DashboardMetric.count in Features/Dashboard/DashboardView.swift).
struct LiveRedesignShellView: View {
    let services: AppServices
    @StateObject private var dashboard: DashboardModel
    init(services: AppServices) {
        self.services = services
        _dashboard = StateObject(wrappedValue: DashboardModel(
            toursRepository: services.tours, people: services.people, planning: services.planning))
    }
    var body: some View {
        RedesignShellView(services: services, dashboard: dashboard)
            .task { await dashboard.load() }
    }
}
