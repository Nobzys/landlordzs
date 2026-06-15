import type {
  PropertyRow,
  PropertyImageRow,
  PropertyVideoRow,
  PropertyAmenityRow,
  ProfileRow,
} from './database'
import type { DbCameroonCity, DbListingType, DbPropertyType, DbPropertyStatus, DbLandTitle } from './database'

export type { DbListingType as ListingType, DbPropertyType as PropertyType, DbPropertyStatus as PropertyStatus, DbLandTitle as LandTitle }

// ─── Rich join types ──────────────────────────────────────────────────────────

export interface PropertyWithImages extends PropertyRow {
  property_images: PropertyImageRow[]
}

type ContactPerson = Pick<ProfileRow, 'id' | 'full_name' | 'display_name' | 'avatar_url' | 'phone' | 'is_verified'> & {
  slug?: string | null
  role?: string | null
}

export interface PropertyWithDetails extends PropertyRow {
  property_images: PropertyImageRow[]
  property_videos: PropertyVideoRow[]
  property_amenities: PropertyAmenityRow[]
  owner: ContactPerson
  agent: ContactPerson | null
  is_favorited?: boolean
}

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface PropertyFilters {
  listing_type?: DbListingType
  property_type?: DbPropertyType
  city?: DbCameroonCity
  min_price?: number
  max_price?: number
  bedrooms?: number
  bathrooms?: number
  is_furnished?: boolean
  is_negotiable?: boolean
  has_security?: boolean
  has_generator?: boolean
  is_verified?: boolean
  search?: string
  sort_by?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'most_viewed'
}

// ─── Form input types ─────────────────────────────────────────────────────────

export interface PropertyBasicInput {
  title: string
  listing_type: DbListingType
  property_type: DbPropertyType
  city: DbCameroonCity
  neighborhood?: string
  address?: string
  price: number
  is_negotiable: boolean
  description?: string
}

export interface PropertyDetailsInput {
  bedrooms: number
  bathrooms: number
  toilets: number
  area_sqm?: number
  land_area_sqm?: number
  land_title: DbLandTitle
  year_built?: number
  is_furnished: boolean
}

export interface PropertyFeaturesInput {
  has_security: boolean
  has_generator: boolean
  has_borehole: boolean
  amenities: { category: string; name: string; has_feature: boolean }[]
}

export interface PropertyCreateInput
  extends PropertyBasicInput,
    PropertyDetailsInput,
    PropertyFeaturesInput {
  agent_id?: string
}

export interface InquiryInput {
  name?: string
  email?: string
  phone?: string
  message: string
  type: 'general' | 'viewing' | 'offer'
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedProperties {
  items: PropertyWithImages[]
  total: number
  page: number
  hasMore: boolean
}
