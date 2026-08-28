import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ServiceRequestForm } from '@/components/services/ServiceRequestForm'

export const metadata: Metadata = { title: 'Post a Service Request — LandLordz' }

// /services/new falls under the PUBLIC_ROUTES /services prefix in middleware —
// middleware does NOT enforce auth here. This page enforces auth server-side.
export default async function NewServiceRequestPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any)
    .from('service_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order') as { data: { id: string; name: string }[] | null }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/services"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Service Requests
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Post a Service Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe the work you need done and professionals will send you quotations.
        </p>
      </div>

      <ServiceRequestForm categories={categories ?? []} />
    </div>
  )
}
