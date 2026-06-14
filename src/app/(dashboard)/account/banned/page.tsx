import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Ban, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getServerProfile } from '@/lib/supabase/server'
import { SUPPORT_EMAIL } from '@/lib/utils/constants'
import { signOut } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Account Banned' }

export default async function BannedPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.account_status === 'active') redirect('/account')

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <Ban className="h-8 w-8 text-red-700" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Permanently Banned</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your account has been permanently banned from LANDLORDZS due to
            violations of our terms of service. This decision is final.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If you believe this is an error, you may contact our support team
            with evidence of the mistake.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild variant="outline" className="gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Ban%20Review%20%E2%80%94%20${encodeURIComponent(profile.email)}`}>
              <Mail className="h-4 w-4" />
              Contact Support
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
