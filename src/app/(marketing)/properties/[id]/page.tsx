import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PropertyGallery } from '@/components/properties/PropertyGallery'
import { PropertyDetails } from '@/components/properties/PropertyDetails'
import { PropertyAmenities } from '@/components/properties/PropertyAmenities'
import { PropertyInquiryForm } from '@/components/properties/PropertyInquiryForm'
import type { PropertyWithDetails } from '@/types/property'

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
  const property = await getProperty(id)

  const VIEWABLE_STATUSES = ['active', 'under_offer', 'pending_verification']
  if (!property || !VIEWABLE_STATUSES.includes(property.status)) {
    notFound()
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <PropertyInquiryForm propertyId={property.id} />
          </div>
        </div>
      </div>
    </main>
  )
}
