import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, ShieldCheck, CheckCircle2, XCircle, HelpCircle, MapPin, Mail, Calendar, History } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  adminApproveVerification,
  adminRejectVerification,
  adminRequestMoreInfo,
  adminAddVerificationNote,
} from '@/lib/actions/admin-moderation'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { DocumentViewerModal } from '@/components/admin/DocumentViewerModal'
import { formatDate, formatRelative } from '@/lib/utils/format'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Verification Request — Admin' }

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-blue-100 text-blue-700',
  approved:         'bg-emerald-100 text-emerald-700',
  rejected:         'bg-red-100 text-red-700',
  needs_more_info:  'bg-amber-100 text-amber-700',
}

type KycDetail = {
  id:                 string
  status:             string
  level:              string
  national_id_number: string | null
  national_id_front:  string | null
  national_id_back:   string | null
  selfie_url:         string | null
  proof_of_address:   string | null
  business_reg:       string | null
  review_notes:       string | null
  submitted_at:       string | null
  reviewed_at:        string | null
  created_at:         string
  profiles: {
    id:            string
    full_name:     string | null
    display_name:  string | null
    email:         string
    avatar_url:    string | null
    role:          string
    city:          string | null
    phone:         string | null
    is_verified:   boolean
    verified_at:   string | null
    account_status: string
    created_at:    string
  }
}

type AuditRow = {
  id:               string
  previous_status:  string | null
  new_status:       string
  action:            string
  notes:            string | null
  created_at:       string
  admin: { full_name: string | null; display_name: string | null; email: string | null } | null
}

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const { id } = await params
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select(`
      id, status, level, national_id_number, national_id_front, national_id_back,
      selfie_url, proof_of_address, business_reg, review_notes, submitted_at, reviewed_at, created_at,
      profiles!kyc_records_user_id_fkey ( id, full_name, display_name, email, avatar_url, role, city, phone, is_verified, verified_at, account_status, created_at )
    `)
    .eq('id', id)
    .single() as { data: KycDetail | null }

  if (!kyc) notFound()

  const p = kyc.profiles
  const displayName = p.full_name?.trim() || p.display_name?.trim() || p.email?.trim() || 'Unnamed user'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: auditLogs } = await (adminClient as any)
    .from('verification_audit_logs')
    .select('id, previous_status, new_status, action, notes, created_at, admin:profiles!verification_audit_logs_admin_id_fkey(full_name, display_name, email)')
    .eq('verification_id', id)
    .order('created_at', { ascending: false }) as { data: AuditRow[] | null }

  const toSignedUrl = async (path: string | null) => {
    if (!path) return null
    const { data } = await adminClient.storage.from(STORAGE_BUCKETS.VERIFY_DOCS).createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }

  const [front, back, selfie, address, cert] = await Promise.all([
    toSignedUrl(kyc.national_id_front),
    toSignedUrl(kyc.national_id_back),
    toSignedUrl(kyc.selfie_url),
    toSignedUrl(kyc.proof_of_address),
    toSignedUrl(kyc.business_reg),
  ])

  const documents = [
    { label: 'ID Front',          url: front },
    { label: 'ID Back',           url: back },
    { label: 'Selfie',            url: selfie },
    { label: 'Proof of Address',  url: address },
    { label: 'Certificate / Business Registration', url: cert },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin/verifications" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Verification Request</h1>
            <p className="text-sm text-muted-foreground">Submitted {kyc.submitted_at ? formatRelative(kyc.submitted_at) : 'time unknown'}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[kyc.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {kyc.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* User info */}
      <div className="rounded-xl border p-5 flex items-start gap-4 flex-wrap">
        <Avatar src={p.avatar_url} name={displayName} size="lg" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/users/${p.id}`} className="font-semibold hover:underline">{displayName}</Link>
            <Badge variant="secondary" className="text-xs">{ROLE_LABELS[p.role as UserRole] ?? p.role}</Badge>
            {p.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified{p.verified_at ? ` ${formatDate(p.verified_at)}` : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {p.email}</p>
          {p.city && <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {p.city}</p>}
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined {formatDate(p.created_at)}</p>
          {kyc.national_id_number && <p className="text-sm text-muted-foreground">National ID: {kyc.national_id_number}</p>}
        </div>
        <LinkButton href={`/admin/users/${p.id}`} variant="outline" size="sm">View full profile</LinkButton>
      </div>

      {/* Documents */}
      <div className="rounded-xl border p-5 space-y-3">
        <h2 className="text-sm font-semibold">Uploaded Documents</h2>
        <DocumentViewerModal documents={documents} />
      </div>

      {kyc.review_notes && (
        <div className="rounded-xl border p-5 space-y-1">
          <h2 className="text-sm font-semibold">Latest Review Note</h2>
          <p className="text-sm text-muted-foreground">{kyc.review_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold">Take Action</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Approve */}
          <form action={async () => {
            'use server'
            await adminApproveVerification(kyc.id, p.id)
          }}>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
            </Button>
          </form>

          {/* Reject */}
          <form
            action={async (fd: FormData) => {
              'use server'
              const reason = (fd.get('reason') as string | null)?.trim() || ''
              await adminRejectVerification(kyc.id, p.id, reason)
            }}
            className="space-y-2"
          >
            <Textarea name="reason" placeholder="Rejection reason (required)" rows={2} className="text-xs" />
            <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
          </form>

          {/* Request more info */}
          <form
            action={async (fd: FormData) => {
              'use server'
              const message = (fd.get('message') as string | null)?.trim() || ''
              await adminRequestMoreInfo(kyc.id, p.id, message)
            }}
            className="space-y-2"
          >
            <Textarea name="message" placeholder="What's missing? (required)" rows={2} className="text-xs" />
            <Button type="submit" variant="outline" className="w-full text-amber-700 border-amber-200 hover:bg-amber-50">
              <HelpCircle className="h-4 w-4 mr-1.5" /> Request More Info
            </Button>
          </form>
        </div>

        {/* Internal note (no status change) */}
        <form
          action={async (fd: FormData) => {
            'use server'
            const note = (fd.get('note') as string | null)?.trim() || ''
            await adminAddVerificationNote(kyc.id, note)
          }}
          className="flex gap-2 pt-2 border-t"
        >
          <input
            name="note"
            placeholder="Add an internal note (not visible to the user)"
            className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" variant="outline" size="sm">Add Note</Button>
        </form>
      </div>

      {/* Audit history */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Verification History</h2>
        </div>
        {auditLogs && auditLogs.length > 0 ? (
          <div className="divide-y">
            {auditLogs.map((log) => {
              const adminName = log.admin?.full_name?.trim() || log.admin?.display_name?.trim() || log.admin?.email?.trim() || 'System'
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="outline" className="text-xs capitalize shrink-0">{log.action.replace(/_/g, ' ')}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{adminName}</span>
                      {log.previous_status && log.previous_status !== log.new_status && (
                        <span className="text-muted-foreground"> · {log.previous_status} → {log.new_status}</span>
                      )}
                    </p>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(log.created_at)}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No actions recorded yet.</p>
        )}
      </div>
    </div>
  )
}
