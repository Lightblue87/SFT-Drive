import Foundation

enum TourDates {
    static let zone = TimeZone(identifier: "Europe/Berlin")!
    static func day(_ text: String) -> Date? {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = zone; f.dateFormat = "yyyy-MM-dd"
        f.isLenient = false
        guard let date = f.date(from: text), f.string(from: date) == text else { return nil }
        return date
    }
    static func dayString(_ date: Date) -> String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = zone; f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func instant(_ text: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
    static func days(start: String, end: String, nights: Bool = false) -> [String] {
        guard var date = day(start), let last = day(end), date <= last else { return [] }
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
        var result: [String] = []
        while nights ? date < last : date <= last {
            result.append(dayString(date))
            guard let next = calendar.date(byAdding: .day, value: 1, to: date) else { break }
            date = next
        }
        return result
    }
}
enum CSV {
    static func cell(_ value: String) -> String {
        let first = value.trimmingCharacters(in: .whitespacesAndNewlines).first
        let safe = first.map { "=+-@".contains($0) } == true ? "'" + value : value
        return "\"" + safe.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
    static func encode(_ rows: [[String]]) -> String {
        "\u{FEFF}" + rows.map { $0.map(cell).joined(separator: ";") }.joined(separator: "\r\n")
    }
}
