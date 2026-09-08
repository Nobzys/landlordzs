import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { NotificationsList } from '@/components/notifications/NotificationsList'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay up to date with your activity
        </p>
      </div>
      <NotificationsList />
    </div>
  )
}
