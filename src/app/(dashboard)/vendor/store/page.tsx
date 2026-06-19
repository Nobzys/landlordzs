import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { StoreSettingsForm } from '@/components/marketplace/StoreSettingsForm'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Store Overview — Vendor' }

type VendorRow = {
  store_name: string
  store_description: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  business_hours: string | null
  delivery_areas: string[]
  store_logo: string | null
  store_banner: string | null
  is_verified: boolean
}

export default async function VendorStorePage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from('vendor_profiles')
    .select('store_name, store_description, phone, email, website, address, business_hours, delivery_areas, store_logo, store_banner, is_verified')
    .eq('id', profile.id)
    .single() as { data: VendorRow | null }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Store Overview</h1>
          <p className="text-sm text-muted-foreground">Manage your storefront details and contact information.</p>
        </div>
        <Badge variant={vendor?.is_verified ? 'default' : 'outline'} className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {vendor?.is_verified ? 'Verified' : 'Unverified'}
        </Badge>
      </div>

      <StoreSettingsForm
        userId={profile.id}
        storeLogo={vendor?.store_logo ?? null}
        storeBanner={vendor?.store_banner ?? null}
        initial={{
          store_name:        vendor?.store_name        ?? '',
          store_description: vendor?.store_description ?? '',
          phone:             vendor?.phone              ?? '',
          email:             vendor?.email              ?? '',
          website:           vendor?.website            ?? '',
          address:           vendor?.address            ?? '',
          business_hours:    vendor?.business_hours     ?? '',
          delivery_areas:    vendor?.delivery_areas     ?? [],
        }}
      />
    </div>
  )
}
