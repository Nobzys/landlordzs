import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { PropertyForm } from '@/components/properties/forms/PropertyForm'
import type { PropertyCreateInput } from '@/lib/validations/property'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Edit Listing' }

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('*, property_images(*), property_videos(*), property_amenities(*)')
    .eq('id', id)
    .eq('owner_id', profile.id)
    .single()

  if (!property) notFound()

  const defaultValues: Partial<PropertyCreateInput> = {
    title:         property.title,
    listing_type:  property.listing_type,
    property_type: property.property_type,
    city:          property.city,
    neighborhood:  property.neighborhood ?? undefined,
    address:       property.address ?? undefined,
    price:         property.price,
    is_negotiable: property.is_negotiable,
    description:   property.description ?? undefined,
    bedrooms:      property.bedrooms,
    bathrooms:     property.bathrooms,
    toilets:       property.toilets,
    area_sqm:      property.area_sqm ?? undefined,
    land_area_sqm: property.land_area_sqm ?? undefined,
    land_title:    property.land_title,
    year_built:    property.year_built ?? undefined,
    is_furnished:  property.is_furnished,
    has_security:  property.has_security,
    has_generator: property.has_generator,
    has_borehole:  property.has_borehole,
    amenities: (property.property_amenities ?? []).map(a => ({
      category:    a.category,
      name:        a.name,
      has_feature: a.has_feature,
    })),
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Edit Listing</h1>
      <PropertyForm
        mode="edit"
        propertyId={id}
        userId={profile.id}
        defaultValues={defaultValues}
      />
    </div>
  )
}
