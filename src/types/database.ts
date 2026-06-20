// ─────────────────────────────────────────────────────────────────────────────
// Supabase Database types — hand-written approximation.
// Replace with the generated file:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enum mirrors ─────────────────────────────────────────────────────────────

export type DbUserRole    = 'admin'|'buyer'|'seller'|'agent'|'vendor'|'contractor'|'engineer'|'architect'|'lawyer'
export type DbAccountStatus = 'active'|'suspended'|'banned'|'pending_verification'
export type DbPropertyType  = 'villa'|'apartment'|'studio'|'duplex'|'penthouse'|'house'|'commercial_space'|'office'|'warehouse'|'shop'|'land'|'farm'|'hotel'
export type DbListingType   = 'sale'|'rent'|'shortlet'
export type DbPropertyStatus = 'draft'|'pending_review'|'active'|'under_offer'|'sold'|'rented'|'off_market'|'expired'|'rejected'|'archived'
export type DbLandTitle     = 'titre_foncier'|'bail_emphyteotique'|'concession'|'none'
export type DbCameroonCity  = 'yaounde'|'douala'|'buea'|'bamenda'|'limbe'|'kribi'|'bafoussam'|'ngaoundere'|'maroua'|'bertoua'|'ebolowa'|'kumba'
export type DbCurrency      = 'XAF'|'USD'|'EUR'
export type DbVerificationStatus = 'pending'|'submitted'|'under_review'|'approved'|'rejected'|'expired'
export type DbBookingStatus = 'pending'|'confirmed'|'active'|'completed'|'cancelled'
export type DbOrderStatus   = 'pending'|'confirmed'|'processing'|'shipped'|'delivered'|'cancelled'
export type DbPaymentStatus = 'pending'|'processing'|'completed'|'failed'|'refunded'|'cancelled'
export type DbEscrowStatus  = 'pending'|'funded'|'released'|'disputed'|'cancelled'
export type DbNotificationType = 'property_inquiry'|'property_favorite'|'order_update'|'payment_received'|'escrow_funded'|'escrow_released'|'review_received'|'message_received'|'account_verified'|'system'
export type DbReportStatus  = 'pending'|'reviewed'|'resolved'|'dismissed'
export type DbPostStatus    = 'active'|'closed'|'deleted'

// ─── Row types ────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  role: DbUserRole
  city: DbCameroonCity | null
  phone: string | null
  phone_verified: boolean
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  is_premium: boolean
  is_public: boolean
  profile_view_count: number
  account_status: DbAccountStatus
  onboarding_completed: boolean
  expo_push_token: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  registration_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PropertyRow {
  id: string
  owner_id: string
  agent_id: string | null
  category_id: string | null
  title: string
  title_fr: string | null
  slug: string
  description: string | null
  description_fr: string | null
  listing_type: DbListingType
  property_type: DbPropertyType
  status: DbPropertyStatus
  city: DbCameroonCity
  neighborhood: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  price: number
  currency: DbCurrency
  bedrooms: number
  bathrooms: number
  toilets: number
  area_sqm: number | null
  land_area_sqm: number | null
  land_title: DbLandTitle
  year_built: number | null
  is_furnished: boolean
  is_negotiable: boolean
  has_security: boolean
  has_generator: boolean
  has_borehole: boolean
  is_featured: boolean
  is_verified: boolean
  view_count: number
  enquiry_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PropertyImageRow {
  id: string
  property_id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
}

export interface PropertyVideoRow {
  id: string
  property_id: string
  url: string
  thumbnail: string | null
  title: string | null
  duration_sec: number | null
  is_virtual_tour: boolean
  sort_order: number
  created_at: string
}

export interface PropertyAmenityRow {
  id: string
  property_id: string
  category: string
  name: string
  has_feature: boolean
}

export interface PropertyFavoriteRow {
  id: string
  user_id: string
  property_id: string
  created_at: string
}

export interface PropertyInquiryRow {
  id: string
  property_id: string
  sender_id: string | null
  agent_id: string | null
  name: string | null
  email: string | null
  phone: string | null
  message: string
  type: 'general'|'viewing'|'offer'
  is_read: boolean
  created_at: string
}

export interface PropertyVerificationRow {
  id: string
  property_id: string
  verified_by: string | null
  status: DbVerificationStatus
  title_document: string | null
  survey_plan: string | null
  other_docs: string[]
  notes: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PropertyCategoryRow {
  id: string
  name: string
  name_fr: string
  slug: string
  icon: string | null
  sort_order: number
}

export interface NotificationRow {
  id: string
  user_id: string
  type: DbNotificationType
  title: string
  body: string
  data: Json
  is_read: boolean
  created_at: string
}

export interface WalletRow {
  id: string
  user_id: string
  balance: number
  locked: number
  currency: DbCurrency
  updated_at: string
}

// ─── Database schema type ─────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:    ProfileRow
        Insert: Omit<ProfileRow, 'created_at'|'updated_at'> & { created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      properties: {
        Row:    PropertyRow
        Insert: Omit<PropertyRow, 'id'|'slug'|'created_at'|'updated_at'|'view_count'|'enquiry_count'|'is_featured'|'is_verified'> & {
          id?: string; slug?: string; created_at?: string; updated_at?: string;
          view_count?: number; enquiry_count?: number; is_featured?: boolean; is_verified?: boolean
        }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
      }
      property_images: {
        Row:    PropertyImageRow
        Insert: Omit<PropertyImageRow, 'id'> & { id?: string }
        Update: Partial<PropertyImageRow>
      }
      property_videos: {
        Row:    PropertyVideoRow
        Insert: Omit<PropertyVideoRow, 'id'> & { id?: string }
        Update: Partial<PropertyVideoRow>
      }
      property_amenities: {
        Row:    PropertyAmenityRow
        Insert: Omit<PropertyAmenityRow, 'id'> & { id?: string }
        Update: Partial<PropertyAmenityRow>
      }
      property_favorites: {
        Row:    PropertyFavoriteRow
        Insert: Omit<PropertyFavoriteRow, 'id'|'created_at'> & { id?: string; created_at?: string }
        Update: never
      }
      property_inquiries: {
        Row:    PropertyInquiryRow
        Insert: Omit<PropertyInquiryRow, 'id'|'created_at'|'is_read'> & { id?: string; created_at?: string; is_read?: boolean }
        Update: Partial<PropertyInquiryRow>
      }
      property_verifications: {
        Row:    PropertyVerificationRow
        Insert: Omit<PropertyVerificationRow, 'id'|'created_at'> & { id?: string; created_at?: string }
        Update: Partial<PropertyVerificationRow>
      }
      property_categories: {
        Row:    PropertyCategoryRow
        Insert: Omit<PropertyCategoryRow, 'id'> & { id?: string }
        Update: Partial<PropertyCategoryRow>
      }
      notifications: {
        Row:    NotificationRow
        Insert: Omit<NotificationRow, 'id'|'created_at'|'is_read'> & { id?: string; created_at?: string; is_read?: boolean }
        Update: Partial<NotificationRow>
      }
      wallets: {
        Row:    WalletRow
        Insert: Omit<WalletRow, 'id'|'updated_at'> & { id?: string; updated_at?: string }
        Update: Partial<WalletRow>
      }
    }
    Functions: {
      increment_property_views: {
        Args: { p_property_id: string; p_viewer_id: string | null; p_ip: string | null }
        Returns: void
      }
      release_escrow: {
        Args: { p_escrow_id: string }
        Returns: void
      }
      wallet_transfer: {
        Args: { p_from_id: string | null; p_to_id: string; p_amount: number; p_currency: string; p_ref: string; p_type: string; p_note: string }
        Returns: void
      }
      is_admin:      { Args: Record<never, never>; Returns: boolean }
      is_moderator:  { Args: Record<never, never>; Returns: boolean }
      get_my_role:   { Args: Record<never, never>; Returns: string }
    }
  }
}

// ─── Convenience helper types ─────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
