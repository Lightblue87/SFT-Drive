import Foundation
@preconcurrency import Supabase

extension Notification.Name { static let sftAdminAccessRevoked = Notification.Name("sftAdminAccessRevoked") }

@MainActor class Repository {
    let client: SupabaseClient
    init(_ client: SupabaseClient) { self.client = client }
    func requireAdmin() async throws {
        let allowed: Bool = try await client.rpc("is_admin").execute().value
        guard allowed else {
            NotificationCenter.default.post(name: .sftAdminAccessRevoked, object: nil)
            throw AppError("Administrator-Berechtigung entzogen. Die Sitzung wird gesperrt.")
        }
    }
    func action(_ name: String, _ params: Payload, allowing: Set<String> = ["OK"]) async throws {
        try await requireAdmin()
        let result: RPCResult = try await client.rpc(name, params: params).execute().value
        try result.check(allowing: allowing)
    }
    func rows(_ table: String, key: String, value: String) async throws -> [DataRow] {
        try await requireAdmin()
        var result: [DataRow] = []; var offset = 0
        while true {
            try Task.checkCancellation()
            let page: [DataRow] = try await client.from(table).select().eq(key, value: value)
                .order("id").range(from: offset, to: offset + 499).execute().value
            result += page
            if page.count < 500 { return result }
            offset += 500
        }
    }
}

@MainActor final class ToursRepository: Repository {
    func list(query: String, offset: Int, archived: Bool) async throws -> [Tour] {
        try await requireAdmin()
        var request = client.from("tours").select()
        if !archived { request = request.neq("status", value: "archived") }
        if !query.isEmpty { request = request.ilike("title", pattern: "%\(query)%") }
        return try await request.order("start_date", ascending: false).order("id")
            .range(from: offset, to: offset + 99).execute().value
    }
    // For Dashboard/Restaurant/Hotels overviews: filtered and sorted server-side so
    // relevant upcoming tours can't fall outside a client-side-filtered page (PR #18
    // review) -- list(archived:false) alone sorts newest-start-date-first and only
    // filters "upcoming" locally afterwards, which can drop near-term tours once
    // there are more than one page of them.
    func upcoming() async throws -> [Tour] {
        try await requireAdmin()
        let today = TourDates.dayString(Date())
        // Paginate to exhaustion (mirrors Repository.rows()) rather than a fixed cutoff --
        // a hard cap here would silently drop tours beyond it (PR #18 review).
        var result: [Tour] = []; var offset = 0
        while true {
            try Task.checkCancellation()
            let page: [Tour] = try await client.from("tours").select()
                .gte("end_date", value: today).neq("status", value: "cancelled")
                .neq("status", value: "draft").neq("status", value: "archived")
                .order("start_date", ascending: true).order("id")
                .range(from: offset, to: offset + 199).execute().value
            result += page
            if page.count < 200 { return result }
            offset += 200
        }
    }
    func details(_ id: String) async throws -> Payload {
        try await requireAdmin()
        let tour: Payload = try await client.from("tours").select().eq("id", value: id).single().execute().value
        let member: [Payload] = try await client.from("tour_member_details").select().eq("tour_id", value: id).execute().value
        let participant: [Payload] = try await client.from("tour_participant_details").select().eq("tour_id", value: id).execute().value
        return ["tour": .object(tour), "member": member.first.map(JSONValue.object) ?? .null,
                "participant": participant.first.map(JSONValue.object) ?? .null]
    }
    func save(id: String, expected: Payload?, tour: Payload, member: Payload, participant: Payload) async throws {
        try await action("admin_save_tour", ["p_id": .string(id), "p_expected": expected.map(JSONValue.object) ?? .null,
            "p_tour": .object(tour), "p_member": .object(member), "p_participant": .object(participant)])
    }
    func cancel(_ tour: Tour, reason: String) async throws -> String? {
        try await action("admin_cancel_tour", ["p_tour_id": .string(tour.id), "p_reason": .string(reason)])
        do {
            try await client.functions.invoke("send-push", options: .init(body: [
                "tour_id": JSONValue.string(tour.id), "title": .string("Tour abgesagt: \(tour.title)"),
                "body": .string(reason.isEmpty ? "Diese Ausfahrt wurde abgesagt." : reason),
                "statuses": .array([.string("confirmed"), .string("pending"), .string("waitlisted")])]))
            return nil
        } catch { return "Tour abgesagt. Zusätzlicher Push konnte nicht bestätigt werden; nicht erneut absagen." }
    }
    func delete(_ id: String) async throws { try await action("admin_delete_tour", ["p_tour_id": .string(id)]) }
    func uploadCover(data: Data, extension ext: String, contentType: String) async throws -> String {
        try await requireAdmin()
        guard data.count <= 5 * 1024 * 1024, ["jpg", "jpeg", "png", "webp"].contains(ext.lowercased()) else {
            throw AppError("JPG, PNG oder WebP bis 5 MB auswählen.")
        }
        let path = "\(UUID().uuidString.lowercased()).\(ext.lowercased())"
        try await client.storage.from("tour-covers").upload(path, data: data, options: .init(contentType: contentType))
        return try client.storage.from("tour-covers").getPublicURL(path: path).absoluteString
    }
}

@MainActor final class PeopleRepository: Repository {
    func users() async throws -> [AdminUser] {
        try await requireAdmin()
        // Existing RPC is unpaginated; a compatible filtered RPC can replace it independently.
        return try await client.rpc("admin_list_users").execute().value
    }
    func vehicles(_ userID: String) async throws -> [Vehicle] {
        try await requireAdmin()
        return try await client.rpc("admin_get_user_vehicles", params: ["p_user_id": userID]).execute().value
    }
    func registrations(_ tourID: String) async throws -> [TourRegistration] {
        let records = try await rows("tour_registrations", key: "tour_id", value: tourID)
        return try JSONDecoder().decode([TourRegistration].self, from: JSONEncoder().encode(records))
    }
    // Bündelt Registrierungen mehrerer Touren in einem Request statt einem
    // Aufruf je Tour (§4 N+1-Regel) -- für Dashboard-Drilldowns, die alle
    // kommenden Touren auf einmal brauchen (Teilnehmer/Fahrzeuge).
    func registrationsBulk(_ tourIDs: [String]) async throws -> [TourRegistration] {
        guard !tourIDs.isEmpty else { return [] }
        try await requireAdmin()
        let params: Payload = ["p_tour_ids": .array(tourIDs.map(JSONValue.string))]
        return try await client.rpc("admin_get_registrations_bulk", params: params).execute().value
    }
    func change(_ registrationID: String, action name: String) async throws {
        let allowed = ["approve_tour_registration", "reject_tour_registration", "admin_remove_registration"]
        guard allowed.contains(name) else { throw AppError("Unzulässige Teilnehmeraktion.") }
        var params: Payload = ["p_registration_id": .string(registrationID)]
        if name != "approve_tour_registration" { params["p_reason"] = .null }
        try await action(name, params, allowing: ["OK", "CONFIRMED", "REJECTED", "CANCELLED"])
    }
    func checkIn(_ registrationID: String, arrived: Bool) async throws {
        try await action("admin_set_checked_in", ["p_registration_id": .string(registrationID), "p_checked_in": .bool(arrived)])
    }
    func persons(_ registrationID: String, total: Int) async throws {
        guard total >= 1 else { throw AppError("Mindestens eine Person je Fahrzeug.") }
        try await action("admin_update_passenger_count", ["p_registration_id": .string(registrationID), "p_passenger_count": .number(Double(total - 1))])
    }
    func addRegistration(tourID: String, userID: String, fields: Payload) async throws {
        var params = fields
        params["p_tour_id"] = .string(tourID); params["p_user_id"] = .string(userID)
        try await action("admin_add_registration", params, allowing: ["CONFIRMED", "WAITLISTED"])
    }
    func setAdmin(_ user: AdminUser) async throws {
        try await action("admin_set_admin_role", ["p_user_id": .string(user.id), "p_grant": .bool(!user.is_admin)])
    }
    func manage(_ userID: String, operation: String) async throws {
        guard ["ban", "unban", "delete"].contains(operation) else { throw AppError("Ungültige Nutzeraktion.") }
        try await requireAdmin()
        try await client.functions.invoke("admin-manage-user", options: .init(body: ["action": operation, "user_id": userID]))
    }
}

@MainActor final class PlanningRepository: Repository {
    func summary(_ tourID: String) async throws -> PlanningSummary {
        try await requireAdmin()
        return try await client.rpc("admin_get_tour_planning_summary", params: ["p_tour_id": tourID]).execute().value
    }
    // One request for many tours instead of one admin_get_tour_planning_summary()
    // call per tour (PR #18 review: N+1 traffic, relevant under §4's free-tier goal).
    // A tour whose summary failed to compute comes back with summary=nil and a
    // populated error, rather than silently looking like an empty planning state.
    func summaries(_ tourIDs: [String]) async throws -> [TourPlanningSummaryRow] {
        guard !tourIDs.isEmpty else { return [] }
        try await requireAdmin()
        let params: Payload = ["p_tour_ids": .array(tourIDs.map(JSONValue.string))]
        return try await client.rpc("admin_get_tour_planning_summaries", params: params).execute().value
    }
    func accommodation(_ tourID: String) async throws -> [AccommodationConfirmation] {
        let records = try await rows("tour_accommodation_confirmations", key: "tour_id", value: tourID)
        return try JSONDecoder().decode([AccommodationConfirmation].self, from: JSONEncoder().encode(records))
    }
    func reminder(tourID: String, night: String, userIDs: [String]) async throws -> String? {
        try await action("admin_send_accommodation_reminder", ["p_tour_id": .string(tourID), "p_night_date": .string(night), "p_user_ids": .array(userIDs.map(JSONValue.string))])
        do {
            try await client.functions.invoke("send-push", options: .init(body: [
                "tour_id": JSONValue.string(tourID), "user_ids": .array(userIDs.map(JSONValue.string)),
                "title": .string("Übernachtung bestätigen"), "body": .string("Bitte Übernachtung für \(night) bestätigen.")]))
            return nil
        } catch { return "In-App-Erinnerung erstellt. Zusätzlicher Push konnte nicht bestätigt werden." }
    }
}

@MainActor final class ContentRepository: Repository {
    func createRestaurant(id: String, tourID: String, stop: Payload, settings: Payload, menu: [Payload]) async throws {
        try await action("admin_create_restaurant", ["p_id": .string(id), "p_tour_id": .string(tourID), "p_stop": .object(stop), "p_settings": .object(settings), "p_menu": .array(menu.map(JSONValue.object))])
    }
    func load(_ kind: ResourceKind, parentID: String) async throws -> [DataRow] {
        try await requireAdmin()
        if kind == .restaurantSettings {
            return try await client.from(kind.table).select().eq(kind.parentKey, value: parentID).execute().value
        }
        return try await rows(kind.table, key: kind.parentKey, value: parentID)
    }
    // For the Restaurant overview (PR #18 review): admin_get_tour_planning_summary's
    // restaurants list only includes stops with ordering_enabled=true, so a newly
    // created restaurant stop (no settings row yet, or ordering still off) would never
    // appear there -- exactly the case an admin needs this overview for, to configure
    // it. Queries tour_stops directly instead, independent of ordering state.
    func restaurantStops(_ tourIDs: [String]) async throws -> [DataRow] {
        guard !tourIDs.isEmpty else { return [] }
        try await requireAdmin()
        return try await client.from("tour_stops").select().eq("type", value: "restaurant")
            .in("tour_id", values: tourIDs).execute().value
    }
    func save(_ kind: ResourceKind, id: String, parentID: String, expected: Payload?, values: Payload) async throws {
        try await action("admin_save_tour_resource", ["p_kind": .string(kind.rawValue), "p_id": .string(id),
            "p_parent_id": .string(parentID), "p_expected": expected.map(JSONValue.object) ?? .null, "p_values": .object(values)])
    }
    func remove(_ kind: ResourceKind, id: String, parentID: String, expected: Payload) async throws {
        try await action("admin_delete_tour_resource", ["p_kind": .string(kind.rawValue), "p_id": .string(id),
            "p_parent_id": .string(parentID), "p_expected": .object(expected)])
    }
    func orders(_ stopID: String) async throws -> [DataRow] {
        try await requireAdmin()
        return try await client.from("meal_orders").select("*, tour_registrations(status, vehicle_manufacturer, vehicle_model), meal_order_items(menu_item_id, quantity, note, menu_items(name))")
            .eq("restaurant_stop_id", value: stopID).eq("status", value: "submitted").execute().value
    }
    func order(stopID: String, registrationID: String, expected: Payload, items: [Payload]) async throws {
        try await action("admin_replace_meal_order", ["p_restaurant_stop_id": .string(stopID), "p_registration_id": .string(registrationID), "p_expected": .object(expected), "p_items": .array(items.map(JSONValue.object))])
    }
    func notify(tourID: String?, title: String, body: String) async throws -> String {
        var params: Payload = ["p_title": .string(title), "p_body": .string(body)]
        if let tourID { params["p_tour_id"] = .string(tourID) }
        try await action(tourID == nil ? "admin_send_broadcast_notification" : "admin_send_tour_notification", params)
        var push: Payload = ["title": .string(title), "body": .string(body)]
        if let tourID { push["tour_id"] = .string(tourID) } else { push["broadcast"] = .bool(true) }
        do {
            try await client.functions.invoke("send-push", options: .init(body: push))
            return "In-App-Mitteilung erstellt und Push-Versand angefordert."
        } catch { return "In-App-Mitteilung erstellt. Push-Zustellung konnte nicht bestätigt werden; bitte nicht erneut senden." }
    }
    func siteSettings() async throws -> Payload {
        try await requireAdmin()
        return try await client.from("site_settings").select().eq("id", value: true).single().execute().value
    }
    func saveSiteSettings(_ values: Payload) async throws {
        try await requireAdmin()
        try await client.from("site_settings").update(values).eq("id", value: true).execute()
    }
}
