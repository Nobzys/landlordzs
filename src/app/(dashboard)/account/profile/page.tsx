import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserCircle, ShieldAlert } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/auth/ProfileForm'
import { KycVerificationSection } from '@/components/auth/KycVerificationSection'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'
import type { KycRecord } from '@/components/dashboard/VerificationBanner'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const needsVerification = (APPROVAL_REQUIRED_ROLES as readonly string[]).includes(profile.role)

  const [agentRes, vendorRes, profRes, kycRes] = await Promise.all([
    profile.role === 'agent'
      ? sb.from('agent_profiles')
          .select('experience_years, specializations, commission_rate')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    profile.role === 'vendor'
      ? sb.from('vendor_profiles')
          .select('store_name, store_description')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    ['contractor', 'engineer', 'architect', 'lawyer'].includes(profile.role)
      ? sb.from('professional_profiles')
          .select('company_name, specializations, experience_years, day_rate')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    needsVerification
      ? (sb
          .from('verification_requests')
          .select('id, status, notes, submitted_at, verification_documents(document_type)')
          .eq('user_id', profile.id)
          .eq('verification_type', 'identity')
          .order('submitted_at', { ascending: false })
          .limit(1)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .maybeSingle() as Promise<{ data: any }>)
      : Promise.resolve({ data: null }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vr = kycRes.data as any
  const kyc: KycRecord | null = vr ? {
    id:                    vr.id,
    status:                vr.status,
    notes:                 vr.notes ?? null,
    submitted_at:          vr.submitted_at ?? null,
    has_id_front:          (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_front'),
    has_id_back:           (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_back'),
    has_professional_cert: (vr.verification_documents ?? []).some((d: any) => d.document_type === 'professional_cert'),
  } : null

  const showPendingBanner =
    needsVerification && profile.account_status === 'pending_verification'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Pending verification banner */}
      {showPendingBanner && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Your account is awaiting verification.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Upload your documents to complete the review process.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
            <a href="#identity-verification">Upload Documents</a>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[profile.role]} · {profile.email}
          </p>
        </div>
      </div>

      <ProfileForm
        profile={profile}
        agentProfile={agentRes.data ?? null}
        vendorProfile={vendorRes.data ?? null}
        professionalProfile={profRes.data ?? null}
      />

      {/* Identity verification — only for roles that require approval */}
      {needsVerification && (
        <KycVerificationSection profile={profile} kyc={kyc} />
      )}
    </div>
  )
}
