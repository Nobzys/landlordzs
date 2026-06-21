import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle, Mail, MapPin, Phone, Calendar, Wallet,
  Building2, ShoppingBag, Briefcase, Heart, Star, Bell, ShieldCheck,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startUserPreview, endUserPreview } from '@/lib/actions/admin-moderation'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatRelative, formatXAF } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Viewing as User — Admin' }

type TargetProfile = {
  id: string
  full_name: string | null
  display_name: string | null
  email: string
  avatar_url: string | null
  role: string
  city: string | null
  phone: string | null
  is_verified: boolean
  verified_at: string | null
  account_status: string
  created_at: string
}

export default async function AdminUserPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const caller = await getServerProfile()
  if (!caller || caller.role !== 'admin') redirect('/login')

  const { id } = await params
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (adminClient as any)
    .from('profiles')
    .select('id, full_name, display_name, email, avatar_url, role, city, phone, is_verified, verified_at, account_status, created_at')
    .eq('id', id)
    .single() as { data: TargetProfile | null }

  if (!target) notFound()

  const preview = await startUserPreview(target.id)
  const logId = 'data' in preview ? preview.data?.logId : undefined

  const role = target.role as UserRole
  const isBuyer = role === 'buyer'
  const isSellerOrAgent = role === 'seller' || role === 'agent'
  const isVendor = role === 'vendor'
  const isProfessional = ['contractor', 'engineer', 'architect', 'lawyer'].includes(role)
  const hasRating = role === 'agent' || isVendor || isProfessional

  const [walletRes, notificationsRes, favoritesRes, propertiesRes, vendorRes, professionalRes, agentRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('wallets').select('balance, locked, currency').eq('user_id', id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('notifications').select('id, title, body, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(5),
    isBuyer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('property_favorites').select('id, created_at, properties(id, title, price, city)').eq('user_id', id).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    isSellerOrAgent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('properties').select('id, title, status, price, city, created_at').or(`owner_id.eq.${id},agent_id.eq.${id}`).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    isVendor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('vendor_profiles').select('store_name, store_description, rating_avg, rating_count, product_count, order_count').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    isProfessional
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('professional_profiles').select('profession_type, company_name, rating_avg, rating_count, project_count').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === 'agent'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('agent_profiles').select('rating_avg, rating_count, listing_count, sold_count').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const wallet = walletRes.data as { balance: number; locked: number; currency: string } | null
  const notifications = (notificationsRes.data ?? []) as { id: string; title: string; body: string; created_at: string }[]
  const favorites = (favoritesRes.data ?? []) as { id: string; created_at: string; properties: { id: string; title: string; price: number; city: string } | null }[]
  const properties = (propertiesRes.data ?? []) as { id: string; title: string; status: string; price: number; city: string; created_at: string }[]
  const vendor = vendorRes.data as { store_name: string; store_description: string | null; rating_avg: number; rating_count: number; product_count: number; order_count: number } | null
  const professional = professionalRes.data as { profession_type: string; company_name: string | null; rating_avg: number; rating_count: number; project_count: number } | null
  const agent = agentRes.data as { rating_avg: number; rating_count: number; listing_count: number; sold_count: number } | null

  const displayName = target.full_name?.trim() || target.display_name?.trim() || target.email?.trim() || 'Unnamed user'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Warning banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center justify-between gap-4 flex-wrap sticky top-2 z-10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Viewing as {displayName} — Read Only</p>
        </div>
        <form action={async () => {
          'use server'
          if (logId) await endUserPreview(logId)
          redirect(`/admin/users/${target.id}`)
        }}>
          <Button type="submit" size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100">
            Exit Preview
          </Button>
        </form>
      </div>

      {/* Read-only profile header */}
      <div className="rounded-xl border p-5 flex items-start gap-4 flex-wrap">
        <Avatar src={target.avatar_url} name={displayName} size="lg" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{displayName}</p>
            <Badge variant="secondary" className="text-xs">{ROLE_LABELS[role] ?? target.role}</Badge>
            {target.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {target.email}</p>
          {target.phone && <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {target.phone}</p>}
          {target.city && <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {target.city}</p>}
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined {formatDate(target.created_at)}</p>
        </div>
      </div>

      {/* Wallet (read-only) */}
      {wallet && (
        <div className="rounded-xl border p-5">
          <h2 className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Wallet</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{formatXAF(wallet.balance)}</p><p className="text-xs text-muted-foreground">Available</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{formatXAF(wallet.locked)}</p><p className="text-xs text-muted-foreground">Locked</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{wallet.currency}</p><p className="text-xs text-muted-foreground">Currency</p></div>
          </div>
        </div>
      )}

      {/* Listings */}
      {isSellerOrAgent && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Building2 className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Listings</h2></div>
          {properties.length > 0 ? (
            <div className="divide-y">
              {properties.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{pr.title}</p><p className="text-xs text-muted-foreground">{pr.city} · {formatXAF(pr.price)}</p></div>
                  <Badge variant="secondary" className="text-xs shrink-0 capitalize">{pr.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No listings yet.</p>}
        </div>
      )}

      {/* Agent summary */}
      {role === 'agent' && agent && (
        <div className="rounded-xl border p-5 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.listing_count}</p><p className="text-xs text-muted-foreground">Listings</p></div>
          <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.sold_count}</p><p className="text-xs text-muted-foreground">Sold</p></div>
          <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{agent.rating_count} reviews</p></div>
        </div>
      )}

      {/* Vendor store */}
      {isVendor && vendor && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-muted-foreground" /> Store</h2>
          <p className="text-sm font-medium">{vendor.store_name}</p>
          {vendor.store_description && <p className="text-xs text-muted-foreground">{vendor.store_description}</p>}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.product_count}</p><p className="text-xs text-muted-foreground">Products</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.order_count}</p><p className="text-xs text-muted-foreground">Orders</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{vendor.rating_count} reviews</p></div>
          </div>
        </div>
      )}

      {/* Professional services */}
      {isProfessional && professional && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Services</h2>
          <p className="text-sm font-medium">{professional.company_name ?? ROLE_LABELS[role]}</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.project_count}</p><p className="text-xs text-muted-foreground">Projects</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{professional.rating_count} reviews</p></div>
          </div>
        </div>
      )}

      {/* Buyer saved items */}
      {isBuyer && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Heart className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Saved Items</h2></div>
          {favorites.length > 0 ? (
            <div className="divide-y">
              {favorites.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-sm truncate">{f.properties?.title ?? 'Listing removed'}</p>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(f.created_at)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No saved listings.</p>}
        </div>
      )}

      {hasRating && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Reviews and full history are available in the admin user detail page.</p>
      )}

      {/* Notifications */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b"><Bell className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Notifications</h2></div>
        {notifications.length > 0 ? (
          <div className="divide-y">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{n.title}</p><p className="text-xs text-muted-foreground truncate">{n.body}</p></div>
                <p className="text-xs text-muted-foreground shrink-0">{formatRelative(n.created_at)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground text-center py-8">No notifications.</p>}
      </div>

      <div className="text-center">
        <LinkButton href={`/admin/users/${target.id}`} variant="ghost" size="sm">← Back to admin user detail</LinkButton>
      </div>
    </div>
  )
}
