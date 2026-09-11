import Foundation

enum FieldType { case text, multiline, integer, decimal, toggle, date, instant, url, choice([String]) }
struct FormField: Identifiable {
    let id: String
    let title: String
    var type: FieldType = .text
    var required = false
    var initial: JSONValue = .null
    init(_ id: String, _ title: String, _ type: FieldType = .text, required: Bool = false, initial: JSONValue = .null) {
        self.id = id; self.title = title; self.type = type; self.required = required; self.initial = initial
    }
}
enum ResourceKind: String, CaseIterable, Identifiable {
    case stops, hotels, stages, menu, restaurantSettings
    var id: String { rawValue }
    var table: String {
        switch self { case .stops: return "tour_stops"; case .hotels: return "tour_hotel_suggestions"
        case .stages: return "tour_stages"; case .menu: return "menu_items"; case .restaurantSettings: return "restaurant_stop_settings" }
    }
    var parentKey: String { self == .menu ? "restaurant_stop_id" : self == .restaurantSettings ? "tour_stop_id" : "tour_id" }
    var title: String {
        switch self { case .stops: return "Stopps"; case .hotels: return "Hotelvorschläge"; case .stages: return "Tagesrouten"
        case .menu: return "Speisekarte"; case .restaurantSettings: return "Bestellfenster" }
    }
    var nameKey: String { self == .menu || self == .hotels ? "name" : self == .restaurantSettings ? "restaurant_note" : "title" }
    var fields: [FormField] {
        switch self {
        case .stops: return [
            .init("title", "Bezeichnung", required: true), .init("type", "Art", .choice(["restaurant", "meeting", "fuel", "break", "hotel", "viewpoint", "other"]), required: true, initial: .string("restaurant")),
            .init("description", "Beschreibung", .multiline), .init("location_name", "Ort"), .init("address", "Adresse"),
            .init("starts_at", "Zeitpunkt (Europe/Berlin)", .instant), .init("sort_order", "Reihenfolge", .integer, required: true, initial: .number(0))]
        case .hotels: return [
            .init("night_date", "Übernachtung von", .date, required: true),
            .init("night_date_end", "Übernachtung bis (optional, für mehrere Nächte)", .date),
            .init("name", "Hotel", required: true), .init("price_per_night", "Preis pro Nacht (€)", .decimal),
            .init("url", "Hotel-Link", .url), .init("address", "Adresse"), .init("note", "Hinweise", .multiline),
            .init("booking_deadline", "Buchungsfrist", .date), .init("sort_order", "Reihenfolge", .integer, required: true, initial: .number(0))]
        case .stages: return [
            .init("stage_date", "Tourtag", .date, required: true), .init("stage_number", "Tag", .integer, required: true),
            .init("title", "Bezeichnung", required: true), .init("route_url", "Routen-Link", .url)]
        case .menu: return [
            .init("name", "Gericht", required: true), .init("description", "Beschreibung", .multiline), .init("price", "Preis (€)", .decimal),
            .init("is_available", "Verfügbar", .toggle, initial: .bool(true)), .init("is_vegetarian", "Vegetarisch", .toggle, initial: .bool(false)),
            .init("is_vegan", "Vegan", .toggle, initial: .bool(false)), .init("allergen_info", "Allergene"),
            .init("sort_order", "Reihenfolge", .integer, required: true, initial: .number(0))]
        case .restaurantSettings: return [
            .init("ordering_enabled", "Vorbestellung aktiv", .toggle, initial: .bool(false)),
            .init("ordering_open_at", "Bestellstart (Europe/Berlin)", .instant), .init("ordering_deadline_at", "Bestellschluss (Europe/Berlin)", .instant),
            .init("restaurant_note", "Restaurant-Hinweise", .multiline)]
        }
    }
}
enum TourFormSchema {
    static let publicFields: [FormField] = [
        .init("title", "Titel", required: true), .init("region", "Region", required: true),
        .init("start_date", "Beginn", .date, required: true), .init("end_date", "Ende", .date, required: true),
        .init("short_description", "Kurzbeschreibung", .multiline), .init("public_description", "Öffentliche Beschreibung", .multiline),
        .init("route_length_km", "Streckenlänge (km)", .decimal), .init("meeting_point_public", "Öffentlicher Treffpunkthinweis"),
        .init("meeting_at", "Treffpunktzeit (Europe/Berlin)", .instant), .init("planned_end_at", "Geplantes Ende (Europe/Berlin)", .instant),
        .init("max_vehicles", "Maximale Fahrzeuge", .integer, required: true, initial: .number(20)),
        .init("confirmation_mode", "Bestätigung", .choice(["automatic", "manual"]), required: true, initial: .string("automatic")),
        .init("license_plate_required", "Kennzeichen erforderlich", .toggle, initial: .bool(false)),
        .init("min_power_ps", "Mindestleistung (PS)", .integer), .init("max_power_ps", "Maximalleistung (PS)", .integer),
        .init("min_driver_age", "Mindestalter", .integer), .init("registration_open_at", "Anmeldestart (Europe/Berlin)", .instant),
        .init("registration_close_at", "Anmeldeschluss (Europe/Berlin)", .instant), .init("passenger_edit_deadline_at", "Mitfahrer-Änderungsfrist (Europe/Berlin)", .instant),
        .init("check_in_enabled", "Check-in aktiv", .toggle, initial: .bool(false)),
        .init("check_in_open_minutes_before", "Check-in: Minuten vor Treffpunkt", .integer, required: true, initial: .number(30)),
        .init("check_in_close_minutes_after", "Check-in: Minuten nach Treffpunkt", .integer, required: true, initial: .number(15)),
        .init("cover_image_url", "Titelbild-URL", .url), .init("youtube_url", "YouTube-Video", .url),
        .init("youtube_embed", "Video nach Klick einbetten", .toggle, initial: .bool(true))
    ]
    static let memberFields: [FormField] = [.init("member_description", "Nur für Mitglieder", .multiline)]
    static let participantFields: [FormField] = [
        .init("participant_description", "Nur für bestätigte Teilnehmer", .multiline), .init("meeting_point_private", "Genauer Treffpunkt"),
        .init("kurviger_url", "Routen-Link", .url), .init("zello_url", "Zello-Link", .url), .init("whatsapp_group_url", "WhatsApp-Gruppenlink", .url)]
    static func validate(_ values: Payload) throws {
        try FormValidation.validate(values, fields: publicFields)
        guard let start = TourDates.day(values.text("start_date")), let end = TourDates.day(values.text("end_date")), start <= end else {
            throw AppError("Das Enddatum darf nicht vor dem Beginn liegen.")
        }
        guard values.integer("max_vehicles") > 0 else { throw AppError("Die Fahrzeugkapazität muss positiv sein.") }
        if values.boolean("check_in_enabled") && values.text("meeting_at").isEmpty { throw AppError("Check-in benötigt eine Treffpunktzeit.") }
        if values.integer("check_in_open_minutes_before") < 0 || values.integer("check_in_close_minutes_after") < 0 { throw AppError("Check-in-Minuten dürfen nicht negativ sein.") }
        if !values.text("min_power_ps").isEmpty && values.integer("min_power_ps") <= 0 { throw AppError("Mindestleistung muss positiv sein.") }
        if !values.text("max_power_ps").isEmpty && values.integer("max_power_ps") < max(1, values.integer("min_power_ps")) { throw AppError("Maximalleistung ist ungültig.") }
        if !values.text("min_driver_age").isEmpty && values.integer("min_driver_age") < 18 { throw AppError("Mindestalter muss mindestens 18 sein.") }
        try FormValidation.window(values, open: "registration_open_at", close: "registration_close_at")
    }
}
enum FormValidation {
    static func validate(_ values: Payload, fields: [FormField]) throws {
        for field in fields {
            let text = values.text(field.id)
            if field.required && text.isEmpty { throw AppError("\(field.title) fehlt.") }
            if text.isEmpty { continue }
            if text.count > 20000 { throw AppError("\(field.title) ist zu lang.") }
            switch field.type {
            case .integer: guard Int(text) != nil else { throw AppError("\(field.title): ganze Zahl eingeben.") }
            case .decimal: guard let d = Decimal(string: text, locale: Locale(identifier: "en_US_POSIX")), d >= 0 else { throw AppError("\(field.title): positive Zahl eingeben.") }
            case .url:
                guard let url = URL(string: text), ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil, url.user == nil, url.password == nil else { throw AppError("\(field.title): gültige HTTP(S)-URL eingeben.") }
            case .date: guard TourDates.day(text) != nil else { throw AppError("\(field.title): gültiges Datum wählen.") }
            case .instant: guard TourDates.instant(text) != nil else { throw AppError("\(field.title): gültigen Zeitpunkt wählen.") }
            case .choice(let options): guard options.contains(text) else { throw AppError("\(field.title): nicht unterstützter Wert '\(text)'.") }
            default: break
            }
        }
    }
    static func window(_ values: Payload, open: String, close: String) throws {
        if let start = TourDates.instant(values.text(open)), let end = TourDates.instant(values.text(close)), start > end {
            throw AppError("Das Ende des Zeitfensters liegt vor dem Beginn.")
        }
    }
    static func payload(_ values: Payload, fields: [FormField]) throws -> Payload {
        try validate(values, fields: fields)
        var result: Payload = [:]
        for field in fields {
            let value = values[field.id] ?? field.initial
            switch field.type {
            case .integer, .decimal:
                result[field.id] = value.text.isEmpty ? .null : .number(Double(value.text)!)
            case .toggle: result[field.id] = .bool(value.boolean)
            default: result[field.id] = value.text.isEmpty ? .null : .string(value.text)
            }
        }
        return result
    }
}
