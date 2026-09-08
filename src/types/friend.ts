// Entspricht dem Schema aus supabase/migrations/20260908090000_friendships.sql
// (siehe CLAUDE.md §34.1).

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'
export type FriendshipDirection = 'incoming' | 'outgoing'

export interface Friendship {
  friendship_id: string
  other_user_id: string
  other_username: string
  status: FriendshipStatus
  direction: FriendshipDirection
  created_at: string
}

export interface UserSearchResult {
  id: string
  username: string
}
