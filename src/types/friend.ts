// Entspricht dem Schema aus supabase/migrations/20260908090000_friendships.sql
// (siehe CLAUDE.md §34.1).

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'
export type FriendshipDirection = 'incoming' | 'outgoing'

export interface Friendship {
  friendship_id: string
  other_user_id: string
  other_username: string
  // Nur bei `accepted` gesetzt — eine offene Anfrage gibt keinen Klarnamen
  // frei (§34.1).
  other_first_name: string | null
  other_last_name: string | null
  // Nur bei `accepted` und wenn der Freund eine Nummer hinterlegt und die
  // Freigabe nicht pausiert hat (§41).
  other_phone_number: string | null
  status: FriendshipStatus
  direction: FriendshipDirection
  created_at: string
}

export interface UserSearchResult {
  id: string
  username: string
}
