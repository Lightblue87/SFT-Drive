import Foundation

/// Lossless, typed JSON used only at the repository/form boundary. Nulls must be
/// encoded explicitly, otherwise clearing an optional PostgREST field does nothing.
enum JSONValue: Codable, Equatable, Sendable {
    case string(String), number(Double), bool(Bool), null, array([JSONValue]), object([String: JSONValue])
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSONValue].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .null: try c.encodeNil()
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }
    var text: String {
        switch self {
        case .string(let v): return v
        case .number(let v): return v == v.rounded() ? String(format: "%.0f", v) : String(v)
        case .bool(let v): return v ? "Ja" : "Nein"
        default: return ""
        }
    }
    var boolean: Bool { if case .bool(let v) = self { return v }; return false }
    var integer: Int { if case .number(let v) = self { return Int(v) }; return 0 }
}
typealias Payload = [String: JSONValue]
extension Dictionary where Key == String, Value == JSONValue {
    func text(_ key: String) -> String { self[key]?.text ?? "" }
    func integer(_ key: String) -> Int { self[key]?.integer ?? 0 }
    func boolean(_ key: String) -> Bool { self[key]?.boolean ?? false }
}
struct DataRow: Identifiable, Codable, Sendable {
    var values: Payload
    var id: String { values.text("id").isEmpty ? values.text("tour_stop_id") : values.text("id") }
    init(_ values: Payload) { self.values = values }
    init(from decoder: Decoder) throws { values = try Payload(from: decoder) }
    func encode(to encoder: Encoder) throws { try values.encode(to: encoder) }
}
struct AppError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
struct RPCResult: Decodable {
    let code: String
    let registration_id: String?
    func check(allowing codes: Set<String> = ["OK"]) throws {
        guard codes.contains(code) else { throw AppError(Self.messages[code] ?? "Aktion abgewiesen: \(code)") }
    }
    static let messages = [
        "FORBIDDEN": "Keine Administrator-Berechtigung.", "UNAUTHENTICATED": "Bitte erneut anmelden.",
        "TOUR_FULL": "Die Tour ist voll.", "TOUR_NOT_FOUND": "Tour nicht gefunden.",
        "VEHICLE_DATA_INVALID": "Fahrzeugdaten oder Kapazität ungültig. Bereits bestätigte Fahrzeuge beachten.",
        "LICENSE_PLATE_REQUIRED": "Für diese Tour ist ein Kennzeichen erforderlich.",
        "LAST_ADMIN": "Der letzte Administrator muss erhalten bleiben.",
        "TOUR_NOT_DELETABLE": "Nur Entwürfe und abgesagte Touren dürfen gelöscht werden."
    ]
}
