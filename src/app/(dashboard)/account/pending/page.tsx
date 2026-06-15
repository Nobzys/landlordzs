import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Clock, Mail, Send, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { submitAppeal } from '@/lib/actions/auth'
import { ROLE_DASHBOARDS, SUPPORT_EMAIL } from '@/lib/utils/constants'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Account Under Review' }

interface SearchParams { submitted?: string }

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.account_status === 'active') {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')
  }

  const params = await searchParams
  const submitted = params.submitted === 'true'

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestNotice } = await (supabase as any)
    .from('account_notices')
    .select('id, reason, created_at')
    .eq('user_id', profile.id)
    .eq('type', 'rejection')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; reason: string; created_at: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAppeal } = await (supabase as any)
    .from('account_appeals')
    .select('id, status, created_at')
    .eq('user_id', profile.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; status: string; created_at: string } | null }

  const noticeId = latestNotice?.id ?? null

  async function handleAppeal(fd: FormData) {
    'use server'
    const message = (fd.get('message') as string | null)?.trim()
    if (!message) return
    await submitAppeal(message, noticeId)
    redirect('/account/pending?submitted=true')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Under Review</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your account is being reviewed by our team. This usually takes
            1–2 business days. You will receive an email once your account
            is approved.
          </p>
        </div>

        {latestNotice && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-left space-y-1">
            <p className="text-sm font-semibold text-red-800">Review feedback</p>
            <p className="text-sm text-red-700">{latestNotice.reason}</p>
          </div>
        )}

        <Button asChild className="w-full gap-2">
          <a href="/account/profile#identity-verification">
            <Upload className="h-4 w-4" />
            Upload Verification Documents
          </a>
        </Button>

        <div className="rounded-xl border bg-muted/40 p-4 text-left space-y-2 text-sm">
          <p className="font-medium">While you wait, you can:</p>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>
              <a href="/account/profile#identity-verification" className="underline underline-offset-2">
                Upload your verification documents
              </a>
            </li>
            <li>Browse available properties</li>
            <li>Contact support if you have questions</li>
          </ul>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 text-left">
            Your correction request has been submitted. Our team will review it shortly.
          </div>
        ) : existingAppeal ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 text-left">
            Your correction request is under review.
          </div>
        ) : (
          <form action={handleAppeal} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Submit a correction request</label>
              <p className="text-xs text-muted-foreground">
                Provide additional context or explain any corrections for our review team.
              </p>
              <textarea
                name="message"
                rows={4}
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe your correction or provide additional context..."
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <Send className="h-4 w-4" />
              Submit Correction Request
            </Button>
          </form>
        )}

        <Button asChild variant="outline" className="gap-2 w-full">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Verification%20%E2%80%94%20${encodeURIComponent(profile.email)}`}>
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </Button>
      </div>
    </div>
  )
}
