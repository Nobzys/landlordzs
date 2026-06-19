import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ChevronLeft, Mail, MapPin, Phone, Calendar, Wallet, Bell,
  Activity, Star, Building2, ShoppingBag, Briefcase, Heart, MessageSquare,
  ShieldCheck, ShieldAlert, KeyRound, Eye, History, Clock, FileText,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminSuspendAccount, adminActivateAccount, adminAssignRole } from '@/lib/actions/auth'
import { adminVerifyManually, adminResetUserPassword } from '@/lib/actions/admin-moderation'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { DocumentViewerModal } from '@/components/admin/DocumentViewerModal'
import { formatDate, formatRelative, formatXAF } from '@/lib/utils/format'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'User Details — Admin' }

const ALL_ROLES: UserRole[] = ['buyer', 'seller', 'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer', 'admin']

const STATUS_COLOR: Record<string, string> = {
  active:               'bg-green-100 text-green-700',
  suspended:            'bg-red-100 text-red-700',
  banned:               'bg-red-200 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-700',
}

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
  is_premium: boolean
  account_status: string
  onboarding_completed: boolean
  created_at: string
  last_seen_at: string | null
}

export default async function AdminUserDetailPage({
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
    .select('id, full_name, display_name, email, avatar_url, role, city, phone, is_verified, verified_at, is_premium, account_status, onboarding_completed, created_at, last_seen_at')
    .eq('id', id)
    .single() as { data: TargetProfile | null }

  if (!target) notFound()

  const role = target.role as UserRole
  const isBuyer = role === 'buyer'
  const isSellerOrAgent = role === 'seller' || role === 'agent'
  const isVendor = role === 'vendor'
  const isProfessional = ['contractor', 'engineer', 'architect', 'lawyer'].includes(role)
  const hasRating = role === 'agent' || isVendor || isProfessional

  const [
    walletRes,
    notificationsRes,
    activityRes,
    noticesRes,
    kycRes,
    reviewsRes,
    favoritesRes,
    inquiriesRes,
    propertiesRes,
    vendorRes,
    ordersRes,
    professionalRes,
    portfolioRes,
    agentRes,
    impersonationRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('wallets').select('balance, locked, currency').eq('user_id', id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('notifications').select('id, type, title, body, is_read, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('activity_logs').select('id, action, entity_type, entity_id, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('account_notices').select('id, type, reason, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(5),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('kyc_records').select('id, status, level, submitted_at, reviewed_at, created_at, national_id_front, national_id_back, selfie_url, proof_of_address, business_reg').eq('user_id', id).order('created_at', { ascending: false }),
    hasRating
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('reviews').select('id, rating, title, body, created_at').eq('target_type', role).eq('target_id', id).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    isBuyer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('property_favorites').select('id, created_at, properties(id, title, price, city)').eq('user_id', id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    isBuyer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('property_inquiries').select('id, message, inquiry_type, is_read, created_at, properties(id, title)').eq('sender_id', id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    isSellerOrAgent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('properties').select('id, title, status, price, city, created_at').or(`owner_id.eq.${id},agent_id.eq.${id}`).order('created_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    isVendor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('vendor_profiles').select('store_name, store_description, is_verified, is_featured, rating_avg, rating_count, product_count, order_count, city').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    isVendor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('orders').select('id, status, total, currency, payment_status, created_at').eq('vendor_id', id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    isProfessional
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('professional_profiles').select('profession_type, company_name, license_number, license_verified, is_verified, experience_years, rating_avg, rating_count, project_count').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    isProfessional
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('portfolio_items').select('id, title, project_type, city, completed_at, created_at').eq('professional_id', id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    role === 'agent'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (adminClient as any).from('agent_profiles').select('license_number, license_verified, experience_years, rating_avg, rating_count, listing_count, sold_count, commission_rate').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any).from('admin_impersonation_logs').select('id, admin_id, started_at, ended_at').eq('target_user_id', id).order('started_at', { ascending: false }).limit(5),
  ])

  const wallet = walletRes.data as { balance: number; locked: number; currency: string } | null
  const notifications = (notificationsRes.data ?? []) as { id: string; type: string; title: string; body: string; is_read: boolean; created_at: string }[]
  const activity = (activityRes.data ?? []) as { id: string; action: string; entity_type: string | null; entity_id: string | null; created_at: string }[]
  const notices = (noticesRes.data ?? []) as { id: string; type: string; reason: string; created_at: string }[]
  const kycRecords = (kycRes.data ?? []) as {
    id: string; status: string; level: string; submitted_at: string | null; reviewed_at: string | null; created_at: string
    national_id_front: string | null; national_id_back: string | null; selfie_url: string | null; proof_of_address: string | null; business_reg: string | null
  }[]
  const latestKyc = kycRecords[0] ?? null

  const toSignedUrl = async (path: string | null) => {
    if (!path) return null
    const { data } = await adminClient.storage.from(STORAGE_BUCKETS.VERIFY_DOCS).createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }
  const documents = latestKyc
    ? await Promise.all([
        toSignedUrl(latestKyc.national_id_front).then((url) => ({ label: 'ID Front', url })),
        toSignedUrl(latestKyc.national_id_back).then((url) => ({ label: 'ID Back', url })),
        toSignedUrl(latestKyc.selfie_url).then((url) => ({ label: 'Selfie', url })),
        toSignedUrl(latestKyc.proof_of_address).then((url) => ({ label: 'Proof of Address', url })),
        toSignedUrl(latestKyc.business_reg).then((url) => ({ label: 'Certificate / Business Registration', url })),
      ])
    : []
  const reviews = (reviewsRes.data ?? []) as { id: string; rating: number; title: string | null; body: string | null; created_at: string }[]
  const favorites = (favoritesRes.data ?? []) as { id: string; created_at: string; properties: { id: string; title: string; price: number; city: string } | null }[]
  const inquiries = (inquiriesRes.data ?? []) as { id: string; message: string; inquiry_type: string | null; is_read: boolean; created_at: string; properties: { id: string; title: string } | null }[]
  const properties = (propertiesRes.data ?? []) as { id: string; title: string; status: string; price: number; city: string; created_at: string }[]
  const vendor = vendorRes.data as { store_name: string; store_description: string | null; is_verified: boolean; is_featured: boolean; rating_avg: number; rating_count: number; product_count: number; order_count: number; city: string | null } | null
  const orders = (ordersRes.data ?? []) as { id: string; status: string; total: number; currency: string; payment_status: string; created_at: string }[]
  const professional = professionalRes.data as { profession_type: string; company_name: string | null; license_number: string | null; license_verified: boolean; is_verified: boolean; experience_years: number | null; rating_avg: number; rating_count: number; project_count: number } | null
  const portfolio = (portfolioRes.data ?? []) as { id: string; title: string; project_type: string | null; city: string | null; completed_at: string | null; created_at: string }[]
  const agent = agentRes.data as { license_number: string | null; license_verified: boolean; experience_years: number | null; rating_avg: number; rating_count: number; listing_count: number; sold_count: number; commission_rate: number } | null
  const impersonationLogs = (impersonationRes.data ?? []) as { id: string; admin_id: string; started_at: string; ended_at: string | null }[]

  const displayName = target.full_name?.trim() || target.display_name?.trim() || target.email?.trim() || 'Unnamed user'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin/users" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={target.avatar_url} name={displayName} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate flex items-center gap-2">
              {displayName}
              {target.is_verified && <ShieldCheck className="h-5 w-5 text-blue-600" />}
            </h1>
            <p className="text-sm text-muted-foreground">User ID: {target.id}</p>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="rounded-xl border p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{ROLE_LABELS[role] ?? target.role}</Badge>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[target.account_status] ?? 'bg-gray-100 text-gray-700'}`}>
            {target.account_status.replace(/_/g, ' ')}
          </span>
          {target.is_premium && <Badge className="text-xs bg-purple-100 text-purple-700">Premium</Badge>}
          {target.is_verified && (
            <span className="text-xs text-blue-600 font-medium">Verified{target.verified_at ? ` · ${formatDate(target.verified_at)}` : ''}</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {target.email}</p>
          {target.phone && <p className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {target.phone}</p>}
          {target.city && <p className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {target.city}</p>}
          <p className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined {formatDate(target.created_at)}</p>
          <p className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last login {target.last_seen_at ? formatRelative(target.last_seen_at) : 'Never'}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3"><p className="text-lg font-bold">{wallet ? formatXAF(wallet.balance) : formatXAF(0)}</p><p className="text-xs text-muted-foreground">Wallet Balance</p></div>
        <div className="rounded-lg border p-3"><p className="text-lg font-bold">{isVendor ? vendor?.product_count ?? 0 : properties.length}</p><p className="text-xs text-muted-foreground">{isVendor ? 'Products' : 'Listings'}</p></div>
        <div className="rounded-lg border p-3"><p className="text-lg font-bold">{isVendor ? orders.length : hasRating ? reviews.length : 0}</p><p className="text-xs text-muted-foreground">{isVendor ? 'Orders' : 'Reviews'}</p></div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border p-4 flex flex-wrap gap-2">
        <LinkButton href={`/admin/users/${target.id}/preview`} variant="outline" size="sm">
          <Eye className="h-3.5 w-3.5 mr-1.5" /> View as User
        </LinkButton>

        {target.account_status === 'suspended' ? (
          <form action={async () => { 'use server'; await adminActivateAccount(target.id) }}>
            <Button type="submit" variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">Activate</Button>
          </form>
        ) : caller.id !== target.id ? (
          <form action={async () => { 'use server'; await adminSuspendAccount(target.id, 'Admin action') }}>
            <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">Suspend</Button>
          </form>
        ) : null}

        {!target.is_verified && (
          <form action={async () => { 'use server'; await adminVerifyManually(target.id) }}>
            <Button type="submit" variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Verify Manually
            </Button>
          </form>
        )}

        <form action={async () => { 'use server'; await adminResetUserPassword(target.id) }}>
          <Button type="submit" variant="outline" size="sm"><KeyRound className="h-3.5 w-3.5 mr-1.5" /> Send Password Reset</Button>
        </form>

        {caller.id !== target.id && (
          <form
            action={async (fd: FormData) => {
              'use server'
              const newRole = fd.get('role') as string
              if (newRole) await adminAssignRole(target.id, newRole as UserRole)
            }}
            className="flex items-center gap-1.5"
          >
            <select name="role" defaultValue={target.role} className="rounded-md border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring">
              {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Change Role</Button>
          </form>
        )}
      </div>

      {/* Wallet summary */}
      {wallet && (
        <div className="rounded-xl border p-5">
          <h2 className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Wallet Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{formatXAF(wallet.balance)}</p><p className="text-xs text-muted-foreground">Available</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{formatXAF(wallet.locked)}</p><p className="text-xs text-muted-foreground">Locked</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{wallet.currency}</p><p className="text-xs text-muted-foreground">Currency</p></div>
          </div>
        </div>
      )}

      {/* Role information: Seller/Agent listings */}
      {isSellerOrAgent && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Building2 className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Listings ({properties.length})</h2></div>
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

      {/* Agent profile */}
      {role === 'agent' && agent && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Agent Profile</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.listing_count}</p><p className="text-xs text-muted-foreground">Listings</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.sold_count}</p><p className="text-xs text-muted-foreground">Sold</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{agent.rating_count} reviews</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{agent.commission_rate}%</p><p className="text-xs text-muted-foreground">Commission</p></div>
          </div>
          {agent.license_number && <p className="text-xs text-muted-foreground">License: {agent.license_number} {agent.license_verified && '(verified)'}</p>}
        </div>
      )}

      {/* Vendor store information */}
      {isVendor && vendor && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-muted-foreground" /> Store Information</h2>
          <p className="text-sm font-medium">{vendor.store_name}</p>
          {vendor.store_description && <p className="text-xs text-muted-foreground">{vendor.store_description}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.product_count}</p><p className="text-xs text-muted-foreground">Products</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.order_count}</p><p className="text-xs text-muted-foreground">Orders</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{vendor.rating_count} reviews</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{vendor.is_verified ? 'Yes' : 'No'}</p><p className="text-xs text-muted-foreground">Verified</p></div>
          </div>
        </div>
      )}

      {/* Vendor orders */}
      {isVendor && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><ShoppingBag className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Recent Orders ({orders.length})</h2></div>
          {orders.length > 0 ? (
            <div className="divide-y">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><p className="text-sm font-medium">{formatXAF(o.total)}</p><p className="text-xs text-muted-foreground">{formatRelative(o.created_at)}</p></div>
                  <Badge variant="secondary" className="text-xs capitalize">{o.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>}
        </div>
      )}

      {/* Professional services + portfolio */}
      {isProfessional && professional && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Services</h2>
          <p className="text-sm font-medium">{professional.company_name ?? ROLE_LABELS[role]}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.project_count}</p><p className="text-xs text-muted-foreground">Projects</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.experience_years ?? 0}</p><p className="text-xs text-muted-foreground">Years exp.</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.rating_avg?.toFixed(1) ?? '0.0'}</p><p className="text-xs text-muted-foreground">{professional.rating_count} reviews</p></div>
            <div className="rounded-lg border p-3"><p className="text-lg font-bold">{professional.is_verified ? 'Yes' : 'No'}</p><p className="text-xs text-muted-foreground">Verified</p></div>
          </div>
          {professional.license_number && <p className="text-xs text-muted-foreground">License: {professional.license_number} {professional.license_verified && '(verified)'}</p>}
        </div>
      )}

      {isProfessional && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Briefcase className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Portfolio ({portfolio.length})</h2></div>
          {portfolio.length > 0 ? (
            <div className="divide-y">
              {portfolio.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs text-muted-foreground">{item.city ?? '—'}</p></div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(item.created_at)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No portfolio items yet.</p>}
        </div>
      )}

      {/* Buyer saved items */}
      {isBuyer && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Heart className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Saved Items ({favorites.length})</h2></div>
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

      {/* Buyer inquiries */}
      {isBuyer && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><MessageSquare className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Inquiries Sent ({inquiries.length})</h2></div>
          {inquiries.length > 0 ? (
            <div className="divide-y">
              {inquiries.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="text-sm truncate">{q.properties?.title ?? 'Listing removed'}</p><p className="text-xs text-muted-foreground truncate">{q.message}</p></div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(q.created_at)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No inquiries sent.</p>}
        </div>
      )}

      {/* Reviews */}
      {hasRating && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Star className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Reviews ({reviews.length})</h2></div>
          {reviews.length > 0 ? (
            <div className="divide-y">
              {reviews.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-2"><span className="text-amber-500 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>{r.title && <span className="text-sm font-medium">{r.title}</span>}</div>
                  {r.body && <p className="text-xs text-muted-foreground mt-0.5">{r.body}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>}
        </div>
      )}

      {/* Verification documents (latest submission only) */}
      {latestKyc && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Verification Documents</h2>
          <DocumentViewerModal documents={documents} />
        </div>
      )}

      {/* Verification history */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b"><History className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Verification History ({kycRecords.length})</h2></div>
        {kycRecords.length > 0 ? (
          <div className="divide-y">
            {kycRecords.map((k) => (
              <Link key={k.id} href={`/admin/verifications/${k.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent transition-colors">
                <div><p className="text-sm capitalize">{k.level} verification</p><p className="text-xs text-muted-foreground">{k.submitted_at ? formatRelative(k.submitted_at) : 'Not submitted'}</p></div>
                <Badge variant="secondary" className="text-xs capitalize">{k.status.replace(/_/g, ' ')}</Badge>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground text-center py-8">No verification requests.</p>}
      </div>

      {/* Account notices */}
      {notices.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><ShieldAlert className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Account Notices ({notices.length})</h2></div>
          <div className="divide-y">
            {notices.map((n) => (
              <div key={n.id} className="px-4 py-3">
                <Badge variant="secondary" className="text-xs capitalize">{n.type}</Badge>
                <p className="text-sm mt-1">{n.reason}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b"><Bell className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Notifications ({notifications.length})</h2></div>
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

      {/* Recent activity */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b"><Activity className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Recent Activity ({activity.length})</h2></div>
        {activity.length > 0 ? (
          <div className="divide-y">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm capitalize">{a.action.replace(/_/g, ' ')}{a.entity_type ? ` · ${a.entity_type}` : ''}</p>
                <p className="text-xs text-muted-foreground shrink-0">{formatRelative(a.created_at)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>}
      </div>

      {/* Preview history */}
      {impersonationLogs.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b"><Eye className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Admin Preview History</h2></div>
          <div className="divide-y">
            {impersonationLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm">Previewed {formatRelative(log.started_at)}</p>
                <p className="text-xs text-muted-foreground">{log.ended_at ? `Ended ${formatRelative(log.ended_at)}` : 'In progress'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
