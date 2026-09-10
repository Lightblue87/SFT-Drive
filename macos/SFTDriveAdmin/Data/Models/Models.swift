import Foundation

// Read models match the existing PWA/SQL contract. Write payloads are separately allowlisted.

struct HotelSuggestion: Codable, Sendable, Identifiable {
    var id: String
    var tour_id: String
    var night_date: String
    var name: String
    var url: String?
    var address: String?
    var note: String?
    var booking_deadline: String?
    var sort_order: Int
}

struct AccommodationConfirmation: Codable, Sendable, Identifiable {
    var id: String
    var tour_id: String
    var user_id: String
    var night_date: String
    var confirmed_at: String
}

struct RestaurantStopSettings: Codable, Sendable {
    var tour_stop_id: String
    var ordering_enabled: Bool
    var ordering_open_at: String?
    var ordering_deadline_at: String?
    var restaurant_note: String?
}

struct MenuItem: Codable, Sendable, Identifiable {
    var id: String
    var restaurant_stop_id: String
    var name: String
    var description: String?
    var price: Decimal?
    var is_available: Bool
    var is_vegetarian: Bool
    var is_vegan: Bool
    var allergen_info: String?
    var sort_order: Int
}

struct Tour: Codable, Sendable, Identifiable {
    var id: String
    var slug: String
    var title: String
    var short_description: String?
    var public_description: String?
    var start_date: String
    var end_date: String
    var meeting_at: String?
    var planned_end_at: String?
    var region: String
    var route_length_km: Double?
    var meeting_point_public: String?
    var max_vehicles: Int
    var confirmation_mode: String
    var license_plate_required: Bool
    var min_power_ps: Int?
    var max_power_ps: Int?
    var min_driver_age: Int?
    var registration_open_at: String?
    var registration_close_at: String?
    var passenger_edit_deadline_at: String?
    var check_in_enabled: Bool
    var check_in_open_minutes_before: Int
    var check_in_close_minutes_after: Int
    var status: String
    var cover_image_url: String?
    var youtube_url: String?
    var youtube_embed: Bool
    var created_by: String?
    var created_at: String
    var updated_at: String
    var published_at: String?
}

struct TourMemberDetails: Codable, Sendable {
    var tour_id: String
    var member_description: String?
}

struct TourParticipantDetails: Codable, Sendable {
    var tour_id: String
    var participant_description: String?
    var meeting_point_private: String?
    var kurviger_url: String?
    var zello_url: String?
    var whatsapp_group_url: String?
}

struct TourRegistration: Codable, Sendable, Identifiable {
    var id: String
    var tour_id: String
    var user_id: String
    var status: String
    var vehicle_manufacturer: String
    var vehicle_model: String
    var vehicle_power_ps: Int
    var license_plate: String?
    var passenger_count: Int
    var registered_at: String
    var checked_in_at: String?
}

struct ConfirmedVehicle: Codable, Sendable {
    var registration_id: String
    var username: String
    var first_name: String?
    var last_name: String?
    var vehicle_manufacturer: String
    var vehicle_model: String
    var vehicle_power_ps: Int
    var is_self: Bool
}

struct TourStage: Codable, Sendable, Identifiable {
    var id: String
    var tour_id: String
    var stage_date: String
    var stage_number: Int
    var title: String
    var description: String?
    var route_length_km: Double?
    var kurviger_url: String?
    var route_url: String?
    var meeting_point_private: String?
    var start_time: String?
}

struct TourStop: Codable, Sendable, Identifiable {
    var id: String
    var tour_id: String
    var stage_id: String?
    var type: String
    var title: String
    var description: String?
    var location_name: String?
    var address: String?
    var starts_at: String?
    var sort_order: Int
}

struct Vehicle: Codable, Sendable, Identifiable {
    var id: String
    var user_id: String
    var manufacturer: String
    var model: String
    var power_ps: Int
    var license_plate: String?
    var is_default: Bool
    var created_at: String
    var updated_at: String
}

struct AdminUser: Decodable, Identifiable, Sendable {
    let id: String
    let username: String
    let first_name: String
    let last_name: String
    let email: String
    let created_at: String
    let is_admin: Bool
    let is_banned: Bool
}
struct PlanningSummary: Decodable, Sendable {
    let confirmed_vehicles: Int
    let people: Int
    let checked_in: Int
    let waitlisted: Int
    let pending: Int
    let interests: Int
    let all_nights_confirmed: Int?
    let nights: [NightSummary]
    let restaurants: [RestaurantSummary]
    let calculated_at: String
}
struct NightSummary: Decodable, Identifiable, Sendable {
    var id: String { night_date }
    let night_date: String
    let confirmed: Int
}
struct RestaurantSummary: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let orders: Int
    let dishes: Int
}
