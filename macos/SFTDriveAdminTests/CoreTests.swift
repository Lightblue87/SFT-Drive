import XCTest
@testable import SFTDriveAdmin

final class CoreTests: XCTestCase {
    func testNightsAcrossDSTAndMonthBoundary() {
        XCTAssertEqual(TourDates.days(start: "2026-03-28", end: "2026-04-01", nights: true), ["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"])
        XCTAssertEqual(TourDates.days(start: "2026-09-10", end: "2026-09-10", nights: true), [])
        XCTAssertNil(TourDates.day("2026-02-30"))
    }
    func testCSVProtectsFormulaInjectionAndQuotes() {
        XCTAssertEqual(CSV.cell("=1+1"), "\"'=1+1\"")
        XCTAssertEqual(CSV.cell(" \t@SUM(A1)"), "\"' \t@SUM(A1)\"")
        XCTAssertEqual(CSV.cell("A\"B;C"), "\"A\"\"B;C\"")
    }
    func testClearedFieldsAreExplicitNull() throws {
        let payload = try FormValidation.payload(["url": .string("")], fields: [.init("url", "URL", .url)])
        XCTAssertEqual(String(data: try JSONEncoder().encode(payload), encoding: .utf8), "{\"url\":null}")
    }
    func testUnknownExtractionFieldsAreRejected() {
        var payload: Payload = Dictionary(uniqueKeysWithValues: ExtractionSchema.keys(.hotel_offer).map { ($0, .null) })
        payload["evidence"] = .object([:]); payload["sql"] = .string("DELETE")
        XCTAssertThrowsError(try ExtractionSchema.validate(payload, kind: .hotel_offer, source: "mail"))
    }
    func testInventedYearRejected() {
        var payload: Payload = Dictionary(uniqueKeysWithValues: ExtractionSchema.keys(.hotel_offer).map { ($0, .null) })
        payload["arrival"] = .string("2027-06-18"); payload["evidence"] = .object(["arrival": .string("18. Juni")])
        XCTAssertThrowsError(try ExtractionSchema.validate(payload, kind: .hotel_offer, source: "Anreise 18. Juni"))
    }
    func testExtractionNeedsRealSourceEvidence() throws {
        var payload: Payload = Dictionary(uniqueKeysWithValues: ExtractionSchema.keys(.hotel_offer).map { ($0, .null) })
        payload["name"] = .string("Alpenblick"); payload["evidence"] = .object(["name": .string("Hotel Alpenblick")])
        XCTAssertNoThrow(try ExtractionSchema.validate(payload, kind: .hotel_offer, source: "Angebot Hotel Alpenblick"))
        XCTAssertThrowsError(try ExtractionSchema.validate(payload, kind: .hotel_offer, source: "anderes Hotel"))
    }
    func testRemoteHTTPAndCredentialURLsRejected() {
        var config = AIConfiguration(); config.endpoint = "http://192.168.1.20:11434"
        XCTAssertThrowsError(try config.validatedEndpoint())
        config.endpoint = "https://user:pass@example.com"
        XCTAssertThrowsError(try config.validatedEndpoint())
        config.endpoint = "http://localhost:11434"
        XCTAssertNoThrow(try config.validatedEndpoint())
    }
    func testPrivilegedConnectionKeyRejected() {
        var config = ConnectionConfiguration(); config.publishableKey = "sb_secret_test"
        XCTAssertThrowsError(try config.validate())
        config.publishableKey = "sb_publishable_test"
        XCTAssertNoThrow(try config.validate())
    }
    func testInvalidOrderingWindowRejected() {
        XCTAssertThrowsError(try FormValidation.window(["open": .string("2026-09-11T10:00:00Z"), "close": .string("2026-09-10T10:00:00Z")], open: "open", close: "close"))
    }
}
