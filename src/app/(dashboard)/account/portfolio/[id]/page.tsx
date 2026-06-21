import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { getCapabilities } from '@/lib/config/roleCapabilities'
import { PortfolioItemEditClient } from '@/components/portfolio/PortfolioItemEditClient'
import { PortfolioImageManager } from '@/components/portfolio/PortfolioImageManager'

export const metadata: Metadata = { title: 'Edit Portfolio Project' }

interface PortfolioItemPageProps {
  params: Promise<{ id: string }>
}

export default async function PortfolioItemPage({ params }: PortfolioItemPageProps) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!getCapabilities(profile.role).hasPortfolio) redirect('/account/profile')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await (supabase as any)
    .from('portfolio_items')
    .select('id, title, description, project_type, city, completed_at, portfolio_images(id, url, caption, is_cover)')
    .eq('id', id)
    .eq('professional_id', profile.id)
    .maybeSingle()

  if (!item) notFound()

  return (
    <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link href="/account/portfolio" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to portfolio
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit project</h1>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Photos</h2>
        <PortfolioImageManager userId={profile.id} portfolioId={item.id} images={item.portfolio_images ?? []} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Details</h2>
        <PortfolioItemEditClient
          initial={{
            id: item.id,
            title: item.title,
            description: item.description,
            project_type: item.project_type,
            city: item.city,
            completed_at: item.completed_at,
          }}
        />
      </div>
    </div>
  )
}
