import Foundation

// Anzeigemodelle des Redesigns. Sie sind absichtlich vom Datenzugriff getrennt:
// die Views bekommen ausschließlich diese Strukturen, gefüllt entweder aus den
// bestehenden Repositories (ToursRepository, PeopleRepository, PlanningRepository,
// ContentRepository) oder – im Xcode-Preview – aus SFTRedesignSample.
//
// Feldnamen orientieren sich an Data/Models/Models.swift.

enum TourLifecycle: String, Sendable {
    case draft, registration, live, archived

    var badge: String {
        switch self {
        case .draft: return "Entwurf"
        case .registration: return "Anmeldung"
        case .live: return "Live"
        case .archived: return "Archiv"
        }
    }
}

struct TourRow: Identifiable, Sendable {
    let id: String
    var title: String
    var subtitle: String          // "5 Etappen · 4 Nächte · 2 Restaurants"
    var dateRange: String         // "12.–16.06."
    var region: String
    var confirmedVehicles: Int?
    var maxVehicles: Int
    var lifecycle: TourLifecycle
    /// Etappen · Stopps · Hotels · Essen
    var planning: [PlanningSegment]

    var vehiclesText: String {
        guard let confirmedVehicles else { return "— / \(maxVehicles)" }
        return "\(confirmedVehicles) / \(maxVehicles)"
    }
}

enum PlanningSegment: Sendable {
    case done, open, missing
}

struct SeasonBar: Identifiable, Sendable {
    let id: String
    var tourID: String
    var title: String
    var startColumn: Int          // 1 … 14 (Halbmonate Apr–Okt)
    var span: Int
    var lifecycle: TourLifecycle
}

enum RedesignDashboardMetric: String, CaseIterable, Identifiable, Sendable {
    case pendingVehicles, waitlist, accommodation, meals, checkIn, deadlines

    var id: String { rawValue }

    var title: String {
        switch self {
        case .pendingVehicles: return "Fahrzeuge bestätigen"
        case .waitlist: return "Warteliste"
        case .accommodation: return "Unterkunft offen"
        case .meals: return "Essen offen"
        case .checkIn: return "Check-in offen"
        case .deadlines: return "Fristen · 7 Tage"
        }
    }

    var drilldownTitle: String {
        switch self {
        case .pendingVehicles: return "Fahrzeuge bestätigen"
        case .waitlist: return "Warteliste"
        case .accommodation: return "Unterkunft offen"
        case .meals: return "Essen offen"
        case .checkIn: return "Check-in offen"
        case .deadlines: return "Fristen · 7 Tage"
        }
    }

    /// Bernstein statt Weiß, wenn die Zahl Handlungsbedarf bedeutet.
    var signalsAction: Bool {
        switch self {
        case .accommodation, .meals, .deadlines: return true
        default: return false
        }
    }
}

struct RegistrationRow: Identifiable, Sendable {
    let id: String                // registration_id
    var name: String
    var username: String
    var vehicle: String           // "Porsche 911 GT3 · 510 PS · 2 Personen"
    var tourTitle: String
    var status: String            // "pending" | "waitlisted" …
    /// approve_tour_registration akzeptiert serverseitig nur status == "pending".
    var canApprove: Bool { status == "pending" }
}

struct DeadlineRow: Identifiable, Sendable {
    let id: String
    var title: String
    var context: String
    var isUrgent: Bool            // < 48 h → rot
}

struct ActivityRow: Identifiable, Sendable {
    let id: String
    var actor: String
    var text: String
    var time: String
}

struct NextTourCard: Sendable {
    var tourID: String
    var title: String
    var meta: String              // "Alpen · 12.–16. Juni · 1 240 km"
    var vehicles: String
    var people: String
    var nights: String
    var orders: String
    var nightsNeedAction: Bool
    var ordersNeedAction: Bool
}

struct TourTemplate: Identifiable, Sendable {
    let id: String
    var title: String
    var summary: String
    var usageCount: Int
}

/// Bausteine, die beim Duplizieren bzw. aus einer Vorlage übernommen werden.
struct CopyOptions: Sendable {
    var stages = true
    var stops = true
    var hotels = true
    var restaurants = true
    var rulesAndDeadlines = true
    var descriptions = false

    static let templateScope = CopyOptions(
        stages: true, stops: false, hotels: true,
        restaurants: true, rulesAndDeadlines: true, descriptions: true
    )
}

// MARK: - Hotelplanung

struct HotelNightColumn: Identifiable, Sendable {
    let id: String                // night_date
    var weekday: String           // "DO"
    var date: String              // "12.06."
}

struct HotelCapacityCard: Identifiable, Sendable {
    let id: String
    var hotelAndNight: String     // "Alpenhof · Do"
    var confirmed: Int
    var expected: Int
    var allotment: Int

    var fraction: Double { expected == 0 ? 0 : Double(confirmed) / Double(expected) }
    var isOverbooked: Bool { confirmed > allotment }
}

enum HotelCellState: Sendable {
    case confirmed(code: String)          // rückbestätigt
    case pending(code: String?)           // offen
    case waitlisted                       // Kontingent voll
    case privateStay                      // privat organisiert
    case notNeeded
}

struct HotelCell: Identifiable, Sendable {
    let id: String                // "\(userID)-\(nightDate)"
    var nightID: String
    var state: HotelCellState
    var detail: HotelCellDetail?
}

struct HotelCellDetail: Sendable {
    var participant: String
    var night: String             // "Fr 13.06."
    var hotel: String
    var roomType: String
    var priceLine: String         // "142 € / Nacht · Frühstück inkl. · Tiefgarage 12 €"
    var termsLine: String         // "Kontingent bis 08.06. · kostenfrei stornierbar bis 10.06."
    var statusNote: String        // "noch nicht rückbestätigt · erinnert am 04.06."
    var isConfirmed: Bool
}

struct HotelMatrixRow: Identifiable, Sendable {
    let id: String                // user_id
    var participant: String
    var vehicle: String           // "Porsche 911 GT3 · 2 P."
    var cells: [HotelCell]
    var trailingAction: TrailingAction

    enum TrailingAction: Sendable {
        case complete, remind, rebook
    }
}

// MARK: - Essensplanung

struct RestaurantStopChip: Identifiable, Sendable {
    let id: String                // tour_stop_id
    var title: String             // "Berggasthof Lärchenhof · Fr 19:30"
}

struct MenuLine: Identifiable, Sendable {
    let id: String
    var name: String
    var count: Int
    var price: Decimal
    var isVegetarian: Bool
    var isVegan: Bool
    var allergenNote: String?

    var total: Decimal { price * Decimal(count) }
}

struct ParticipantOrder: Identifiable, Sendable {
    let id: String
    var participant: String
    var detail: String            // "2 Personen · Nussallergie"
    var order: String?            // nil = noch nichts bestellt
    var total: Decimal?
}

struct MealSummary: Sendable {
    var orderedVehicles: Int
    var confirmedVehicles: Int
    var dishes: Int
    var vegetarian: Int
    var vegan: Int
    var total: Decimal
    var deadlineText: String
    var deadlineIsUrgent: Bool
}

// MARK: - Import aus Angebot

enum ImportKind: String, CaseIterable, Sendable {
    case restaurant, hotelOffer

    /// entspricht ExtractionKind in AI/
    var wireValue: String {
        switch self {
        case .restaurant: return "restaurant"
        case .hotelOffer: return "hotel_offer"
        }
    }

    var title: String {
        switch self {
        case .restaurant: return "Speisekarte"
        case .hotelOffer: return "Hotelangebot"
        }
    }
}

enum ImportSourceKind: String, CaseIterable, Identifiable, Sendable {
    case pdf, mailText, image

    var id: String { rawValue }

    var title: String {
        switch self {
        case .pdf: return "PDF"
        case .mailText: return "E-Mail-Text"
        case .image: return "Bild / Foto"
        }
    }

    var explainer: String {
        switch self {
        case .pdf: return "Speisekarte oder Hotelangebot als Anhang. Text wird direkt ausgelesen."
        case .mailText: return "Mailtext einfügen. Signatur und Buchungsnummern vorher entfernen."
        case .image: return "Abfotografierte Karte. Texterkennung läuft lokal, danach wie Text."
        }
    }
}

enum ImportStep: Int, Sendable {
    case source = 1, review = 2, save = 3
}

/// Ein extrahiertes Feld samt Quellenbeleg. Ohne Beleg bleibt es „ungeklärt“.
struct ExtractedField: Identifiable, Sendable {
    let id: String
    var label: String
    var value: String?
    var evidence: String?
    var mono = false
    var unresolvedHint: String = "ungeklärt — bitte eintragen"
}

struct ExtractedDish: Identifiable, Sendable {
    let id: String
    var name: String
    var price: Decimal?
    var evidence: String?
    var warning: String?
    var isVegetarian = false
    var isVegan = false
    var include = true
}

struct ExtractionResult: Sendable {
    var sourceName: String        // "laerchenhof-karte.pdf · S. 1/2"
    var sourceText: String
    var highlights: [String]      // Textstellen, die hervorgehoben werden
    var banner: String            // "5 Gerichte und 6 Felder erkannt · 2 Felder ungeklärt"
    var modelLine: String         // "qwen2.5:7b · 1 840 / 410 Tokens"
    var fields: [ExtractedField]
    var dishes: [ExtractedDish]
}

struct ImportConsent: Sendable {
    var endpoint: String          // "http://127.0.0.1:11434"
    var model: String             // "qwen2.5:7b"
    var sourceLine: String
    var payload: String
    var systemNote: String
}
