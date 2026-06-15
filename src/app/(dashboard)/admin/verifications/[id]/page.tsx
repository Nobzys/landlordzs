import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, CheckCircle2, XCircle, FileText,
  User, Mail, Phone, Shield, Calendar, MessageSquare,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerProfile } from '@/lib/supabase/server'
import {
  adminApproveProfessional,
  adminRejectProfessional,
  adminAddVerificationNote,
} from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatRelative } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Review Verification — Admin' }

const DOC_LABELS: Record<string, string> = {
  id_front:          'ID Front',
  id_back:           'ID Back',
  professional_cert: 'Professional Licence',
  business_reg:      'Business Registration',
}

const STATUS_PILL: Record<string, string> = {
  under_review: 'bg-blue-100 text-blue-700',
  approved:     'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-700',
  submitted:    'bg-blue-100 text-blue-700',
  pending:      'bg-amber-100 text-amber-700',
  expired:      'bg-gray-100 text-gray-700',
}

const VERIF_TYPE_LABEL: Record<string, string> = {
  identity: 'Identity',
  email:    'Email',
  phone:    'Phone',
  business: 'Business',
  license:  'License',
  address:  'Address',
}

type DocRow = {
  id:           string
  document_type: string
  storage_path:  string
  file_name:     string | null
}

type VerifDetail = {
  id:                string
  verification_type: string
  status:            string
  submitted_at:      string | null
  reviewed_at:       string | null
  notes:             string | null
  profiles: {
    id:             string
    full_name:      string | null
    display_name:   string | null
    email:          string
    role:           string
    phone:          string | null
    account_status: string
  } | null
  verification_documents: DocRow[]
}

interface Params { id: string }

export default async function VerificationReviewPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('verification_requests')
    .select(`
      id, verification_type, status, submitted_at, reviewed_at, notes,
      profiles!user_id ( id, full_name, display_name, email, role, phone, account_status ),
      verification_documents ( id, document_type, storage_path, file_name )
    `)
    .eq('id', id)
    .maybeSingle() as { data: VerifDetail | null }

  if (!raw) notFound()

  const request: VerifDetail = {
    ...raw,
    profiles: Array.isArray(raw.profiles)
      ? ((raw.profiles as any[])[0] ?? null)
      : raw.profiles,
    verification_documents: Array.isArray(raw.verification_documents)
      ? raw.verification_documents
      : [],
  }

  const applicant = request.profiles

  // Generate signed URLs for all uploaded documents
  const docsWithUrls = await Promise.all(
    request.verification_documents.map(async (doc) => {
      const { data } = await adminClient.storage
        .from('verification-documents-v2')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  const canAct = request.status === 'under_review'
  const userId = applicant?.id ?? ''
  const requestId = request.id

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin/verifications"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Verification</h1>
          <p className="text-sm text-muted-foreground">
            {VERIF_TYPE_LABEL[request.verification_type] ?? request.verification_type} · #{request.id.slice(0, 8)}
          </p>
        </div>
        <span className={`ml-auto inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_PILL[request.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {request.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Applicant information */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Applicant Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Full name</p>
              <p className="text-sm font-medium">
                {applicant?.full_name ?? applicant?.display_name ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{applicant?.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{applicant?.phone ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs capitalize">
                  {applicant?.role ? (ROLE_LABELS[applicant.role as UserRole] ?? applicant.role) : '—'}
                </Badge>
                {applicant?.account_status && (
                  <span className="text-xs text-muted-foreground">
                    {applicant.account_status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verification details */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Verification Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Verification type</p>
              <p className="text-sm font-medium capitalize">
                {VERIF_TYPE_LABEL[request.verification_type] ?? request.verification_type}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">
                {request.submitted_at ? formatDate(request.submitted_at) : '—'}
              </p>
            </div>
          </div>
          {request.reviewed_at && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Reviewed</p>
                <p className="text-sm font-medium">{formatDate(request.reviewed_at)}</p>
              </div>
            </div>
          )}
          {request.notes && (
            <div className="sm:col-span-2 flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Review notes</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Uploaded documents */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Uploaded Documents
        </h2>
        {docsWithUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {docsWithUrls.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">
                  {DOC_LABELS[doc.document_type] ?? doc.document_type.replace(/_/g, ' ')}
                </p>
                {doc.signedUrl ? (
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium
                      text-primary hover:bg-primary/5 transition-colors"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {doc.file_name ?? DOC_LABELS[doc.document_type] ?? 'View'}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm
                    text-muted-foreground bg-muted/30">
                    <FileText className="h-4 w-4 shrink-0" />
                    URL unavailable
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin actions */}
      {canAct && (
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Admin Actions
          </h2>

          <div className="flex flex-col gap-4">
            {/* Approve */}
            <form
              action={async () => {
                'use server'
                await adminApproveProfessional(userId)
                redirect('/admin/verifications')
              }}
            >
              <Button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </form>

            {/* Reject with mandatory reason */}
            <form
              action={async (fd: FormData) => {
                'use server'
                const reason = (fd.get('reason') as string | null)?.trim()
                  || 'Documents did not meet requirements.'
                await adminRejectProfessional(userId, reason)
                redirect('/admin/verifications')
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <textarea
                name="reason"
                placeholder="Rejection reason (optional — defaults to 'Documents did not meet requirements.')"
                rows={2}
                className="flex-1 rounded-md border px-3 py-2 text-sm bg-background resize-none
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 sm:self-end shrink-0"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </form>

            {/* Add review notes without changing status */}
            <form
              action={async (fd: FormData) => {
                'use server'
                const notes = (fd.get('notes') as string | null)?.trim() ?? ''
                if (notes) await adminAddVerificationNote(requestId, notes)
                redirect(`/admin/verifications/${requestId}`)
              }}
              className="flex flex-col sm:flex-row gap-2 pt-2 border-t"
            >
              <textarea
                name="notes"
                placeholder="Add review notes (saved without approving or rejecting)"
                rows={2}
                className="flex-1 rounded-md border px-3 py-2 text-sm bg-background resize-none
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                variant="outline"
                className="sm:self-end shrink-0"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Already actioned — read-only notes form */}
      {!canAct && (
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Admin Actions
          </h2>
          <p className="text-sm text-muted-foreground">
            This request has already been {request.status.replace(/_/g, ' ')}.
            No further actions are available.
          </p>
        </section>
      )}
    </div>
  )
}
