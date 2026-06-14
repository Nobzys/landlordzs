import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store, Edit, Wallet, Package } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Vendor Dashboard' }

type VendorProfile = {
  store_name: string
  store_slug: string
  store_description: string | null
}

export default async function VendorPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from('vendor_profiles')
    .select('store_name, store_slug, store_description')
    .eq('id', profile.id)
    .single() as { data: VendorProfile | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wallet } = await (supabase as any)
    .from('wallets')
    .select('balance, currency')
    .eq('user_id', profile.id)
    .single() as { data: { balance: number; currency: string } | null }

  const displayName = profile.display_name ?? profile.full_name ?? 'there'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {vendor?.store_name ?? `Welcome, ${displayName}`}
            </h1>
            <p className="text-sm text-muted-foreground">Vendor Dashboard</p>
          </div>
        </div>
        {vendor && (
          <Badge variant="outline" className="text-xs font-mono">
            /{vendor.store_slug}
          </Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Wallet Balance</span>
          </div>
          <p className="text-xl font-bold leading-tight">
            {wallet ? formatXAF(wallet.balance) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{wallet?.currency ?? 'XAF'}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Store Status</span>
          </div>
          <p className="text-xl font-bold">
            {vendor ? 'Active' : 'Setup needed'}
          </p>
          <p className="text-xs text-muted-foreground">
            {vendor ? 'Listed on LANDLORDZS' : 'Complete your profile'}
          </p>
        </div>

        <div className="rounded-xl border p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Store className="h-4 w-4" />
            <span className="text-xs font-medium">Verification</span>
          </div>
          <p className="text-xl font-bold">
            {profile.is_verified ? 'Verified' : 'Unverified'}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile.city ? profile.city : 'No city set'}
          </p>
        </div>
      </div>

      {/* Store card */}
      {vendor ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Store Information</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/profile" className="gap-2">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Store Name</p>
              <p className="font-medium">{vendor.store_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Store URL</p>
              <p className="text-sm font-mono text-muted-foreground">/materials/{vendor.store_slug}</p>
            </div>
            {vendor.store_description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{vendor.store_description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium mb-1">Store not set up yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Complete your vendor profile to appear in the materials marketplace.
            </p>
            <Button asChild size="sm">
              <Link href="/account/profile">Set Up Store</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/account/profile">Edit Profile</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/account/wallet">View Wallet</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">Browse Properties</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
