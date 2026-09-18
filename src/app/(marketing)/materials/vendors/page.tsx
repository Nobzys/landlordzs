import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Star, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export const metadata: Metadata = {
  title: 'Material Vendors — Landlordzs',
  description:
    'Browse verified building material suppliers and vendors across Cameroon.',
}

type VendorRow = {
  id:            string
  store_name:    string
  store_slug:    string
  city:          string | null
  rating_avg:    number | null
  rating_count:  number | null
  is_verified:   boolean
  product_count: number | null
}

export default async function MaterialVendorsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data } = await supabase
    .from('vendor_profiles')
    .select('id, store_name, store_slug, city, rating_avg, rating_count, is_verified, product_count')
    .order('is_verified', { ascending: false })
    .order('rating_avg',  { ascending: false }) as { data: VendorRow[] | null }

  const vendors = data ?? []

  return (
    <main className="min-h-screen bg-background">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a0505] via-[#420e0e] to-[#7f1111] py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Material Vendors</h1>
            <p className="text-white/80 max-w-xl">
              Verified building material suppliers serving contractors and builders across Cameroon.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/register?role=vendor"
              className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Register as Vendor
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Result count */}
        <p className="text-sm text-muted-foreground mb-6">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} listed
        </p>

        {vendors.length === 0 ? (
          <div className="text-center py-24 border rounded-xl text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium text-base">No vendors listed yet.</p>
            <p className="text-sm mt-1 mb-6">Be the first to register and reach buyers across Cameroon.</p>
            <Link
              href="/register?role=vendor"
              className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Register as Vendor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map(vendor => {
              const cityLabel = vendor.city
                ? (CAMEROON_CITIES.find(c => c.value === vendor.city)?.label ?? vendor.city)
                : null
              const rating      = vendor.rating_avg   ?? 0
              const ratingCount = vendor.rating_count ?? 0
              const productCount = vendor.product_count ?? 0

              return (
                <div key={vendor.id} className="rounded-xl border bg-card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-semibold text-base leading-tight truncate">
                          {vendor.store_name}
                        </h2>
                        {vendor.is_verified && (
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#B71C1C] shrink-0">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>
                      {cityLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cityLabel}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      {rating > 0 ? rating.toFixed(1) : '—'}
                      {ratingCount > 0 && ` (${ratingCount} review${ratingCount !== 1 ? 's' : ''})`}
                    </span>
                    <span>{productCount} product{productCount !== 1 ? 's' : ''}</span>
                  </div>

                  <Link
                    href={`/materials/${vendor.store_slug}`}
                    className="mt-auto inline-flex items-center justify-center rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Visit Store
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
