import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Star } from 'lucide-react'
import { PropertyGallery } from '@/components/properties/PropertyGallery'
import { PropertyDetails } from '@/components/properties/PropertyDetails'
import { PropertyAmenities } from '@/components/properties/PropertyAmenities'
import { PropertyInquiryForm } from '@/components/properties/PropertyInquiryForm'
import { PropertyBookingForm } from '@/components/properties/PropertyBookingForm'
import { ContactButton } from '@/components/messaging/ContactButton'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { PropertyReviewForm } from '@/components/reviews/PropertyReviewForm'
import type { PropertyWithDetails } from '@/types/property'
import type { Review } from '@/types/review'

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

const PROFILE_COLS = 'id, full_name, display_name, avatar_url, phone, is_verified' as const

async function getProperty(id: string): Promise<PropertyWithDetails | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('properties')
    .select('*, property_images(*), property_videos(*), property_amenities(*)')
    .eq('id', id)
    .single() as { data: Record<string, any> | null; error: any }

  if (error || !data) return null

  // Fetch owner and agent profiles separately to avoid relying on FK constraint names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: owner }, { data: agent }] = await Promise.all([
    (supabase as any).from('profiles').select(PROFILE_COLS).eq('id', data.owner_id).single() as Promise<{ data: Record<string, any> | null }>,
    data.agent_id
      ? (supabase as any).from('profiles').select(PROFILE_COLS).eq('id', data.agent_id).single() as Promise<{ data: Record<string, any> | null }>
      : Promise.resolve({ data: null }),
  ])

  return {
    ...data,
    owner: owner ?? { id: data.owner_id, full_name: null, display_name: null, avatar_url: null, phone: null, is_verified: false },
    agent: agent ?? null,
  } as unknown as PropertyWithDetails
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) return { title: 'Property Not Found' }

  return {
    title: property.title,
    description: property.description?.slice(0, 160),
    openGraph: {
      title: property.title,
      images: property.property_images[0]
        ? [{ url: property.property_images[0].url }]
        : [],
    },
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const [property, { data: { user } }] = await Promise.all([
    getProperty(id),
    supabase.auth.getUser(),
  ])

  if (!property) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch reviews for this property
  const { data: rawReviews } = await sb
    .from('reviews')
    .select('*')
    .eq('target_type', 'property')
    .eq('target_id', property.id)
    .order('created_at', { ascending: false })

  const propertyReviews: Review[] = rawReviews ?? []

  // Batch-fetch reviewer profiles
  const reviewerIds = [...new Set(propertyReviews.map((r: Review) => r.reviewer_id))]
  const reviewerMap = new Map<string, { full_name: string | null; display_name: string | null; avatar_url: string | null }>()
  if (reviewerIds.length > 0) {
    const { data: reviewerProfiles } = await sb
      .from('profiles')
      .select('id, full_name, display_name, avatar_url')
      .in('id', reviewerIds)
    for (const p of (reviewerProfiles ?? [])) {
      reviewerMap.set(p.id, p)
    }
  }

  // Computed average (properties has no stored rating_avg column)
  const avgRating = propertyReviews.length > 0
    ? propertyReviews.reduce((s: number, r: Review) => s + r.rating, 0) / propertyReviews.length
    : null

  // Eligibility: user must have a funded escrow for this property
  let isEligibleBuyer = false
  let hasExistingReview = false
  if (user) {
    hasExistingReview = propertyReviews.some((r: Review) => r.reviewer_id === user.id)
    if (!hasExistingReview) {
      const { data: escrow } = await sb
        .from('escrow_accounts')
        .select('id')
        .eq('reference_type', 'property')
        .eq('reference_id', property.id)
        .eq('payer_id', user.id)
        .in('status', ['funded', 'released'])
        .limit(1)
        .maybeSingle()
      isEligibleBuyer = !!escrow
    }
  }

  const isOwnerOrAgent =
    !!user && (user.id === property.owner_id || user.id === property.agent_id)

  // active / under_offer  → publicly visible to everyone
  // draft / pending_review → owner or assigned agent only
  //   (RLS already enforces this at the DB layer; mirrored here for defence-in-depth)
  // sold / rented / off_market / expired / rejected → 404
  const PUBLIC_STATUSES = ['active', 'under_offer']
  const OWNER_STATUSES  = ['draft', 'pending_review']

  if (!PUBLIC_STATUSES.includes(property.status)) {
    if (!OWNER_STATUSES.includes(property.status) || !isOwnerOrAgent) {
      notFound()
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            <PropertyGallery
              images={property.property_images}
              title={property.title}
            />
            <PropertyDetails property={property} />
            {property.property_amenities.length > 0 && (
              <PropertyAmenities amenities={property.property_amenities} />
            )}

            {/* Reviews */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Reviews</h2>
                {avgRating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({propertyReviews.length}{' '}
                      {propertyReviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              {propertyReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {propertyReviews.map((review: Review) => {
                    const prof = reviewerMap.get(review.reviewer_id)
                    return (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        personName={prof?.display_name ?? prof?.full_name ?? 'Anonymous'}
                        personAvatarUrl={prof?.avatar_url}
                      />
                    )
                  })}
                </div>
              )}

              {isEligibleBuyer && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-base font-medium">Write a Review</h3>
                  <PropertyReviewForm propertyId={property.id} />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {!isOwnerOrAgent && !!user && (
              <ContactButton
                recipientId={property.agent_id ?? property.owner_id}
                contextType="property"
                contextId={property.id}
                label={property.agent_id ? 'Contact Agent' : 'Message Seller'}
                placeholder="Hi, I have a question about this property…"
              />
            )}
            {property.listing_type === 'short_term' ? (
              <PropertyBookingForm propertyId={property.id} />
            ) : (
              <PropertyInquiryForm
                propertyId={property.id}
                ownerId={property.owner_id}
                agentId={property.agent_id ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
