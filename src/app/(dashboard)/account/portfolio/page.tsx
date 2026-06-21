import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { getCapabilities } from '@/lib/config/roleCapabilities'
import { PortfolioListClient } from '@/components/portfolio/PortfolioListClient'

export const metadata: Metadata = { title: 'My Portfolio' }

interface PortfolioItemRow {
  id: string
  title: string
  description: string | null
  project_type: string | null
  city: string | null
  completed_at: string | null
  is_featured: boolean
  portfolio_images: { id: string; url: string; caption: string | null; is_cover: boolean }[]
}

export default async function AccountPortfolioPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!getCapabilities(profile.role).hasPortfolio) redirect('/account/profile')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('portfolio_items')
    .select('id, title, description, project_type, city, completed_at, is_featured, portfolio_images(id, url, caption, is_cover)')
    .eq('professional_id', profile.id)
    .order('created_at', { ascending: false })

  const items: PortfolioItemRow[] = data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Showcase past projects on your{' '}
            <Link href={`/professionals/${profile.id}`} className="underline" target="_blank" rel="noopener noreferrer">
              public profile
            </Link>
            .
          </p>
        </div>
      </div>

      <PortfolioListClient items={items} />
    </div>
  )
}
