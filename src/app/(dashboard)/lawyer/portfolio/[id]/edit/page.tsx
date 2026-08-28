import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { PortfolioForm } from '@/components/dashboard/PortfolioForm'
import type { PortfolioImage } from '@/components/dashboard/PortfolioImageUpload'

export const metadata: Metadata = { title: 'Edit Portfolio Project — Lawyer' }

interface EditPortfolioPageProps {
  params: Promise<{ id: string }>
}

type PortfolioRow = {
  id:           string
  title:        string
  description:  string | null
  project_type: string | null
  client_name:  string | null
  city:         string | null
  budget_xaf:   number | null
  completed_at: string | null
  portfolio_images: { id: string; url: string; is_cover: boolean; sort_order: number }[]
}

export default async function EditLawyerPortfolioItemPage({ params }: EditPortfolioPageProps) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile || profile.role !== 'lawyer') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await (supabase as any)
    .from('portfolio_items')
    .select(`
      id, title, description, project_type, client_name, city, budget_xaf, completed_at,
      portfolio_images(id, url, is_cover, sort_order)
    `)
    .eq('id', id)
    .eq('professional_id', profile.id)
    .single() as { data: PortfolioRow | null }

  if (!item) notFound()

  const existingImages: PortfolioImage[] = [...(item.portfolio_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/lawyer/portfolio"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Portfolio
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit project details and manage photos.</p>
      </div>

      <PortfolioForm
        mode="edit"
        portfolioId={item.id}
        userId={profile.id}
        existingImages={existingImages}
        defaultValues={{
          title:        item.title,
          description:  item.description ?? undefined,
          project_type: item.project_type ?? undefined,
          client_name:  item.client_name ?? undefined,
          city:         item.city ?? undefined,
          budget_xaf:   item.budget_xaf ?? undefined,
          completed_at: item.completed_at ?? undefined,
        }}
      />
    </div>
  )
}
