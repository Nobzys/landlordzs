import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { getNotificationPreferences } from '@/lib/actions/notifications'
import { PreferencesForm } from '@/components/notifications/PreferencesForm'

export const metadata: Metadata = { title: 'Notification Preferences' }

export default async function NotificationPreferencesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const prefs = await getNotificationPreferences()

  const initialPrefs = {
    email_enabled: prefs?.email_enabled ?? true,
    push_enabled:  prefs?.push_enabled  ?? true,
    sms_enabled:   prefs?.sms_enabled   ?? false,
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/account/notifications"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notification Preferences</h1>
          <p className="text-sm text-muted-foreground">
            Choose how you want to be notified.
          </p>
        </div>
      </div>
      <PreferencesForm initialPrefs={initialPrefs} />
    </div>
  )
}
