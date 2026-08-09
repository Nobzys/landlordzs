import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, User, Mail, Calendar, MapPin,
  Shield, FileText, Clock, CheckCircle2, XCircle, MessageSquare,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  adminApproveProfessional,
  adminRejectProfessional,
  adminRequestMoreInfo,
} from '@/lib/actions/auth'
import DocumentViewerModal from '@/components/admin/DocumentViewerModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/types/auth'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { formatDate, formatRelative, getInitial } from '@/lib/utils/format'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Verification Detail — Admin' }

const KYC_COLOR: Record<string, string> = {
  pending:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  needs_more_info: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expired:         'bg-gray-100 text-gray-600',
}

const STATUS_COLOR: Record<string, string> = {
  active:               'bg-green-100 text-green-700',
  suspended:            'bg-red-100 text-red-700',
  banned:               'bg-red-200 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-700',
}

type KycRecord = {
  id:                string
  user_id:           string
  status:            string
  review_notes:      string | null
  national_id_front: string | null
  national_id_back:  string | null
  selfie_url:        string | null
  proof_of_address:  string | null
  business_reg:      string | null
  submitted_at:      string | null
  reviewed_at:       string | null
  reviewed_by:       string | null
}

type ProfileRow = {
  id:             string
  full_name:      string | null
  display_name:   string | null
  email:          string
  role:           string
  city:           string | null
  account_status: string
  is_verified:    boolean
  created_at:     string
}

type AdminLog = {
  id:         string
  action:     string
  actor_id:   string | null
  created_at: string
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

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [callerProfile, { id: kycId }] = await Promise.all([getServerProfile(), params])
  if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'moderator')) {
    redirect('/login')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // ── KYC record ────────────────────────────────────────────────────────────────
  const { data: kyc } = (await admin
    .from('kyc_records')
    .select('id,user_id,status,review_notes,national_id_front,national_id_back,selfie_url,proof_of_address,business_reg,submitted_at,reviewed_at,reviewed_by')
    .eq('id', kycId)
    .single()) as { data: KycRecord | null }

  if (!kyc) notFound()

  // ── User profile ──────────────────────────────────────────────────────────────
  const { data: user } = (await admin
    .from('profiles')
    .select('id,full_name,display_name,email,role,city,account_status,is_verified,created_at')
    .eq('id', kyc.user_id)
    .single()) as { data: ProfileRow | null }

  if (!user) notFound()

  // ── Admin action history for this KYC record ──────────────────────────────────
  const { data: adminLogs } = (await admin
    .from('admin_logs')
    .select('id,action,actor_id,created_at')
    .eq('target_id', kycId)
    .order('created_at', { ascending: false })
    .limit(10)) as { data: AdminLog[] | null }

  // ── Signed document URLs ───────────────────────────────────────────────────────
  const [frontUrl, backUrl, selfieUrl, addressUrl, bizRegUrl] = await Promise.all([
    getSignedUrl(kyc.national_id_front),
    getSignedUrl(kyc.national_id_back),
    getSignedUrl(kyc.selfie_url),
    getSignedUrl(kyc.proof_of_address),
    getSignedUrl(kyc.business_reg),
  ])

  const displayName = user.full_name?.trim() || user.display_name?.trim() || 'Unnamed User'
  const isAdminCaller = callerProfile.role === 'admin'
  const isActionable = isAdminCaller && (kyc.status === 'pending' || kyc.status === 'needs_more_info')
  const userId = user.id

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin/verifications"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Verification Review</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              KYC_COLOR[kyc.status] ?? 'bg-gray-100 text-gray-600'
            }`}>
              {kyc.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{kycId}</span>
          </div>
        </div>
      </div>

      {/* User profile card */}
      <section className="rounded-xl border p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center
            rounded-full bg-primary/10 text-primary font-bold text-lg">
            {getInitial(user.full_name, user.display_name, user.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              {user.is_verified && (
                <span className="text-xs text-blue-600 font-medium">✓ Verified</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {ROLE_LABELS[user.role as UserRole] ?? user.role}
              </Badge>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLOR[user.account_status] ?? 'bg-gray-100 text-gray-700'
              }`}>
                {user.account_status?.replace(/_/g, ' ') ?? 'unknown'}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/admin/users/${user.id}`}>
              <User className="h-3.5 w-3.5 mr-1.5" />
              Full Profile
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-sm">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          {user.city && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">City</p>
                <p className="font-medium capitalize">{user.city}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* KYC details */}
      <section className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Submission Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {kyc.submitted_at && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(kyc.submitted_at)}</p>
              </div>
            </div>
          )}
          {kyc.reviewed_at && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Last reviewed</p>
                <p className="font-medium">{formatDate(kyc.reviewed_at)}</p>
              </div>
            </div>
          )}
        </div>

        {kyc.review_notes && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">Review note: </span>{kyc.review_notes}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Documents
        </h3>
        <DocumentViewerModal
          docs={[
            { label: 'ID Front',          url: frontUrl },
            { label: 'ID Back',           url: backUrl },
            { label: 'Selfie',            url: selfieUrl },
            { label: 'Proof of Address',  url: addressUrl },
            { label: 'Business / Cert',   url: bizRegUrl },
          ]}
        />
      </section>

      {/* Admin Actions */}
      {isActionable ? (
        <section className="rounded-xl border p-6 space-y-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> Admin Actions
          </h3>

          {/* Approve */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Approve
            </p>
            <form action={async () => {
              'use server'
              await adminApproveProfessional(userId, kycId)
            }}>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Approve Verification
              </Button>
            </form>
          </div>

          {/* Reject */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reject
            </p>
            <form
              action={async (fd: FormData) => {
                'use server'
                const reason = (fd.get('reason') as string | null)?.trim()
                  || 'Documents did not meet requirements.'
                await adminRejectProfessional(userId, reason, kycId)
              }}
              className="space-y-2"
            >
              <textarea
                name="reason"
                placeholder="Rejection reason (shown to user)…"
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                  resize-none"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Reject
              </Button>
            </form>
          </div>

          {/* Request More Info */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Request More Information
            </p>
            <form
              action={async (fd: FormData) => {
                'use server'
                const message = (fd.get('message') as string | null)?.trim() || ''
                if (message) await adminRequestMoreInfo(kycId, userId, message)
              }}
              className="space-y-2"
            >
              <textarea
                name="message"
                placeholder="Describe what additional documents or information are needed…"
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                  resize-none"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-amber-700 border-amber-200 hover:bg-amber-50
                  dark:hover:bg-amber-900/20"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Request More Info
              </Button>
            </form>
          </div>
        </section>
      ) : !isAdminCaller ? (
        <section className="rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4" /> Admin Actions
          </h3>
          <p className="text-sm text-muted-foreground italic">
            Moderators can review verification submissions but cannot approve, reject, or request
            more information. Contact an administrator to take action on this record.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4" /> Admin Actions
          </h3>
          <p className="text-sm text-muted-foreground italic">
            No actions available — this verification is already{' '}
            <span className="font-medium">{kyc.status.replace(/_/g, ' ')}</span>.
          </p>
        </section>
      )}

      {/* Action history */}
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" /> Action History
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
          <p className="text-sm text-muted-foreground">
            No admin actions recorded for this verification.
          </p>
        )}
      </section>

    </div>
  )
}
