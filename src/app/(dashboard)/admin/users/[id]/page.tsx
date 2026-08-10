import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, User, Mail, Phone, MapPin, Calendar,
  Shield, ShieldCheck, FileText, Activity, Clock, Settings, MessageSquare,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminReviewAppeal } from '@/lib/actions/auth'
import UserActionButtons from '@/components/admin/UserActionButtons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/types/auth'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { formatDate, formatRelative, getInitial } from '@/lib/utils/format'
import type { ProfileRow } from '@/types/database'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'User Detail — Admin' }

const STATUS_COLOR: Record<string, string> = {
  active:               'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended:            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  banned:               'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  pending_verification: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const KYC_COLOR: Record<string, string> = {
  pending:  'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

type KycRecord = {
  id: string
  status: string
  review_notes: string | null
  national_id_front: string | null
  national_id_back: string | null
  selfie_url: string | null
  proof_of_address: string | null
  business_reg: string | null
  submitted_at: string | null
  reviewed_at: string | null
}

type ActivityLog = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

type AdminLog = {
  id: string
  action: string
  actor_id: string | null
  created_at: string
}

type AppealRow = {
  id: string
  notice_id: string | null
  message: string
  status: string
  created_at: string
}

type AgentProfile = {
  license_number: string | null
  license_verified: boolean
  experience_years: number
  commission_rate: number
  listing_count: number
  sold_count: number
  rating_avg: number
  rating_count: number
  is_featured: boolean
}

type VendorProfile = {
  store_name: string
  store_slug: string
  city: string | null
  is_verified: boolean
  is_featured: boolean
  product_count: number
  order_count: number
  commission_rate: number
}

type ProfessionalProfile = {
  profession_type: string
  company_name: string | null
  license_number: string | null
  license_verified: boolean
  experience_years: number
  is_available: boolean
  is_verified: boolean
  is_featured: boolean
  project_count: number
  rating_avg: number
  rating_count: number
}

async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  try {
    const { data } = await createAdminClient()
      .storage.from(STORAGE_BUCKETS.VERIFY_DOCS)
      .createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [callerProfile, { id }] = await Promise.all([getServerProfile(), params])
  if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'moderator')) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // ── Core profile ──────────────────────────────────────────────────────────
  const { data: user } = (await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()) as { data: ProfileRow | null }

  if (!user) notFound()

  // ── KYC records ───────────────────────────────────────────────────────────
  const { data: kycRecords } = (await admin
    .from('kyc_records')
    .select('id,status,review_notes,national_id_front,national_id_back,selfie_url,proof_of_address,business_reg,submitted_at,reviewed_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })) as { data: KycRecord[] | null }

  // ── Role-specific profile ─────────────────────────────────────────────────
  const role = user.role as UserRole
  let agentProfile: AgentProfile | null = null
  let vendorProfile: VendorProfile | null = null
  let professionalProfile: ProfessionalProfile | null = null

  if (role === 'agent') {
    const { data } = (await admin
      .from('agent_profiles')
      .select('license_number,license_verified,experience_years,commission_rate,listing_count,sold_count,rating_avg,rating_count,is_featured')
      .eq('id', id)
      .single()) as { data: AgentProfile | null }
    agentProfile = data
  } else if (role === 'vendor') {
    const { data } = (await admin
      .from('vendor_profiles')
      .select('store_name,store_slug,city,is_verified,is_featured,product_count,order_count,commission_rate')
      .eq('id', id)
      .single()) as { data: VendorProfile | null }
    vendorProfile = data
  } else if (['contractor', 'engineer', 'architect', 'lawyer'].includes(role)) {
    const { data } = (await admin
      .from('professional_profiles')
      .select('profession_type,company_name,license_number,license_verified,experience_years,is_available,is_verified,is_featured,project_count,rating_avg,rating_count')
      .eq('id', id)
      .single()) as { data: ProfessionalProfile | null }
    professionalProfile = data
  }

  // ── Activity logs (most recent 10) ────────────────────────────────────────
  const { data: activityLogs } = (await admin
    .from('activity_logs')
    .select('id,action,entity_type,entity_id,created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10)) as { data: ActivityLog[] | null }

  // ── Admin action history on this user ─────────────────────────────────────
  const { data: adminLogs } = (await admin
    .from('admin_logs')
    .select('id,action,actor_id,created_at')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(10)) as { data: AdminLog[] | null }

  // ── Appeals submitted by this user ────────────────────────────────────────
  const { data: appeals } = (await admin
    .from('account_appeals')
    .select('id,notice_id,message,status,created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })) as { data: AppealRow[] | null }

  // ── Signed URLs for KYC documents ─────────────────────────────────────────
  const kyc = kycRecords?.[0] ?? null
  const [frontUrl, backUrl, selfieUrl, addressUrl, bizRegUrl] = await Promise.all([
    getSignedUrl(kyc?.national_id_front ?? null),
    getSignedUrl(kyc?.national_id_back ?? null),
    getSignedUrl(kyc?.selfie_url ?? null),
    getSignedUrl(kyc?.proof_of_address ?? null),
    getSignedUrl(kyc?.business_reg ?? null),
  ])

  const displayName = user.full_name?.trim() || user.display_name?.trim() || 'Unnamed User'
  const initial = getInitial(user.full_name, user.display_name, user.email)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin/users"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">User Detail</h1>
          <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
        </div>
      </div>

      {/* Profile card */}
      <section className="rounded-xl border p-6 space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl overflow-hidden">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : initial}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{displayName}</h2>
              {user.is_verified && (
                <ShieldCheck className="h-4 w-4 text-blue-500" />
              )}
              {user.is_premium && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                  Premium
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {ROLE_LABELS[role] ?? role}
              </Badge>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLOR[user.account_status] ?? 'bg-gray-100 text-gray-700'
              }`}>
                {user.account_status?.replace(/_/g, ' ') ?? 'unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={user.phone
              ? `${user.phone}${user.phone_verified ? ' ✓' : ' (unverified)'}`
              : 'Not set'
            }
          />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={user.city ?? 'Not set'} />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={formatDate(user.created_at)} />
          <InfoRow
            icon={<Shield className="h-4 w-4" />}
            label="Onboarding"
            value={user.onboarding_completed ? 'Completed' : 'Incomplete'}
          />
          <InfoRow
            icon={<Activity className="h-4 w-4" />}
            label="Last updated"
            value={formatRelative(user.updated_at)}
          />
        </div>

        {user.bio && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Bio</p>
            <p className="text-sm">{user.bio}</p>
          </div>
        )}
      </section>

      {/* KYC / Verification */}
      {kyc ? (
        <section className="rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Verification (KYC)
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                KYC_COLOR[kyc.status] ?? 'bg-gray-100 text-gray-700'
              }`}>
                {kyc.status}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/verifications/${kyc.id}`}>
                  Review Verification →
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {kyc.submitted_at && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Submitted" value={formatDate(kyc.submitted_at)} />
            )}
            {kyc.reviewed_at && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Reviewed" value={formatDate(kyc.reviewed_at)} />
            )}
          </div>

          {kyc.review_notes && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">Admin notes: </span>{kyc.review_notes}
            </div>
          )}

          {/* Documents */}
          {(frontUrl || backUrl || selfieUrl || addressUrl || bizRegUrl) ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents</p>
              <div className="flex flex-wrap gap-2">
                <DocLink href={frontUrl} label="ID Front" />
                <DocLink href={backUrl} label="ID Back" />
                <DocLink href={selfieUrl} label="Selfie" />
                <DocLink href={addressUrl} label="Proof of Address" />
                <DocLink href={bizRegUrl} label="Business Reg." />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" /> Verification (KYC)
          </h3>
          <p className="text-sm text-muted-foreground">No KYC records on file.</p>
        </section>
      )}

      {/* Role-specific profile */}
      {agentProfile && (
        <section className="rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Agent Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="License number" value={agentProfile.license_number ?? 'Not set'} />
            <InfoRow label="License verified" value={agentProfile.license_verified ? 'Yes' : 'No'} />
            <InfoRow label="Experience" value={`${agentProfile.experience_years} years`} />
            <InfoRow label="Commission rate" value={`${agentProfile.commission_rate}%`} />
            <InfoRow label="Listings" value={String(agentProfile.listing_count)} />
            <InfoRow label="Sales" value={String(agentProfile.sold_count)} />
            <InfoRow label="Rating" value={`${agentProfile.rating_avg} (${agentProfile.rating_count} reviews)`} />
            <InfoRow label="Featured" value={agentProfile.is_featured ? 'Yes' : 'No'} />
          </div>
        </section>
      )}

      {vendorProfile && (
        <section className="rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Vendor Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="Store name" value={vendorProfile.store_name} />
            <InfoRow label="Store slug" value={vendorProfile.store_slug} />
            <InfoRow label="City" value={vendorProfile.city ?? 'Not set'} />
            <InfoRow label="Verified" value={vendorProfile.is_verified ? 'Yes' : 'No'} />
            <InfoRow label="Products" value={String(vendorProfile.product_count)} />
            <InfoRow label="Orders" value={String(vendorProfile.order_count)} />
            <InfoRow label="Commission rate" value={`${vendorProfile.commission_rate}%`} />
            <InfoRow label="Featured" value={vendorProfile.is_featured ? 'Yes' : 'No'} />
          </div>
        </section>
      )}

      {professionalProfile && (
        <section className="rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Professional Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="Profession" value={professionalProfile.profession_type} />
            <InfoRow label="Company" value={professionalProfile.company_name ?? 'Not set'} />
            <InfoRow label="License number" value={professionalProfile.license_number ?? 'Not set'} />
            <InfoRow label="License verified" value={professionalProfile.license_verified ? 'Yes' : 'No'} />
            <InfoRow label="Experience" value={`${professionalProfile.experience_years} years`} />
            <InfoRow label="Available" value={professionalProfile.is_available ? 'Yes' : 'No'} />
            <InfoRow label="Verified" value={professionalProfile.is_verified ? 'Yes' : 'No'} />
            <InfoRow label="Projects" value={String(professionalProfile.project_count)} />
            <InfoRow
              label="Rating"
              value={`${professionalProfile.rating_avg} (${professionalProfile.rating_count} reviews)`}
            />
          </div>
        </section>
      )}

      {/* Admin Actions */}
      <section className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Admin Actions
        </h3>
        <UserActionButtons
          userId={user.id}
          currentStatus={user.account_status ?? 'unknown'}
          currentRole={user.role ?? 'buyer'}
          callerRole={callerProfile.role ?? 'admin'}
          isSelf={user.id === callerProfile.id}
        />
      </section>

      {/* Admin action history */}
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" /> Admin Action History
        </h3>
        {adminLogs && adminLogs.length > 0 ? (
          <div className="divide-y">
            {adminLogs.map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-4">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelative(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No admin actions recorded for this user.</p>
        )}
      </section>

      {/* Appeals */}
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Appeals
        </h3>
        {appeals && appeals.length > 0 ? (
          <div className="divide-y">
            {appeals.map((appeal) => {
              const isPending = appeal.status === 'pending'
              return (
                <div key={appeal.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{appeal.message}</p>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      isPending
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {appeal.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatRelative(appeal.created_at)}</p>
                  {isPending && callerProfile.role === 'admin' && (
                    <div className="flex gap-2 pt-1">
                      <form action={async () => {
                        'use server'
                        await adminReviewAppeal(appeal.id, 'approve')
                      }}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          Approve
                        </Button>
                      </form>
                      <form action={async () => {
                        'use server'
                        await adminReviewAppeal(appeal.id, 'dismiss')
                      }}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                        >
                          Dismiss
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No appeals submitted by this user.</p>
        )}
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" /> Recent Activity
        </h3>
        {activityLogs && activityLogs.length > 0 ? (
          <div className="divide-y">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {log.action}
                  </span>
                  {log.entity_type && (
                    <span className="text-xs text-muted-foreground truncate">{log.entity_type}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelative(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded for this user.</p>
        )}
      </section>

    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

function DocLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
    >
      <FileText className="h-3 w-3" />
      {label}
    </a>
  )
}
