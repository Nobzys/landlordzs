import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { ROLE_DASHBOARDS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

// Root "/" — smart redirect:
//   authenticated  → role dashboard (e.g. /seller/listings)
//   unauthenticated → /login
export default async function RootPage() {
  const profile = await getServerProfile().catch(() => null)

  if (profile) {
    const dest = ROLE_DASHBOARDS[profile.role as UserRole] ?? '/properties'
    redirect(dest)
  }

  redirect('/login')
}
