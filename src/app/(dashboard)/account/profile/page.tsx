import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/auth/ProfileForm'
import { ROLE_LABELS } from '@/types/auth'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  // Fetch role-specific data in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [agentRes, vendorRes, profRes] = await Promise.all([
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
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
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
    </div>
  )
}
