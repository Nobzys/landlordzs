// Reviews target a professional via a polymorphic (target_type, target_id) pair.
// Only roles handled by the refresh_rating() trigger may be reviewed.
export const REVIEWABLE_ROLES = ['contractor', 'engineer', 'architect', 'lawyer'] as const
export type ReviewableRole = (typeof REVIEWABLE_ROLES)[number]

export interface Review {
  id: string
  reviewer_id: string
  target_type: string
  target_id: string
  rating: number
  title: string | null
  body: string | null
  cleanliness: number | null
  communication: number | null
  value: number | null
  accuracy: number | null
  images: string[]
  is_verified: boolean
  is_featured: boolean
  is_hidden: boolean
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface ReviewablePerson {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  role: string | null
}

// A completed service request the current user can leave a review for,
// paired with the professional who was awarded the accepted quotation.
export interface ReviewableRequest {
  service_request_id: string
  request_title: string
  completed_at: string
  professional: ReviewablePerson
  existingReview: Review | null
}
