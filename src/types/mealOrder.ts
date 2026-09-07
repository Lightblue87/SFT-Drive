// Entspricht restaurant_stop_settings, menu_items, meal_orders, meal_order_items (§27.3-§27.6).
export interface RestaurantStopSettings {
  tour_stop_id: string
  ordering_enabled: boolean
  ordering_open_at: string | null
  ordering_deadline_at: string | null
  restaurant_note: string | null
}

export interface MenuItem {
  id: string
  restaurant_stop_id: string
  name: string
  description: string | null
  price: number | null
  is_available: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  allergen_info: string | null
  sort_order: number
}

export interface MealOrderItem {
  id: string
  menu_item_id: string
  quantity: number
  note: string | null
}
