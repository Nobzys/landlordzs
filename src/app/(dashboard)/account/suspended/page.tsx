import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShieldOff, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { signOut, submitAppeal } from '@/lib/actions/auth'
import { SUPPORT_EMAIL } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Account Suspended' }

interface SearchParams { submitted?: string }

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.account_status === 'active') redirect('/account')

  const params = await searchParams
  const submitted = params.submitted === 'true'

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestNotice } = await (supabase as any)
    .from('account_notices')
    .select('id, reason, created_at')
    .eq('user_id', profile.id)
    .eq('type', 'suspension')
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
    redirect('/account/suspended?submitted=true')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Suspended</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your account has been temporarily suspended. You cannot create,
            edit, or publish listings while your account is suspended.
          </p>
        </div>

        {latestNotice && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-left space-y-1">
            <p className="text-sm font-semibold text-red-800">Reason for suspension</p>
            <p className="text-sm text-red-700">{latestNotice.reason}</p>
          </div>
        )}

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 text-left">
            Your appeal has been submitted. Our team will review it shortly.
          </div>
        ) : existingAppeal ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 text-left">
            Your appeal is under review.
          </div>
        ) : (
          <form action={handleAppeal} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Submit an appeal</label>
              <p className="text-xs text-muted-foreground">
                Explain why you believe this suspension should be reviewed.
              </p>
              <textarea
                name="message"
                rows={4}
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Provide context or additional information for our review team..."
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <Send className="h-4 w-4" />
              Submit Appeal
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          <Button asChild variant="outline" className="gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Suspension%20Appeal%20%E2%80%94%20${encodeURIComponent(profile.email)}`}>
              <Mail className="h-4 w-4" />
              Email Support
            </a>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
