import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar profile={profile} />
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Spacer for the fixed mobile header */}
        <div className="h-14 lg:hidden" />
        {children}
      </div>
    </div>
  )
}
