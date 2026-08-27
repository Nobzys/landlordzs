import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Plus, FolderOpen, Edit, CalendarDays } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { deletePortfolioItem } from '@/lib/actions/profile'
import { LinkButton } from '@/components/ui/link-button'
import { Button } from '@/components/ui/button'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'My Portfolio — Contractor' }

type PortfolioRow = {
  id:           string
  title:        string
  project_type: string | null
  city:         string | null
  client_name:  string | null
  budget_xaf:   number | null
  completed_at: string | null
  created_at:   string
  portfolio_images: { url: string; is_cover: boolean; sort_order: number }[]
}

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CM', { year: 'numeric', month: 'short' })
}

function cityLabel(value: string | null) {
  if (!value) return null
  return CAMEROON_CITIES.find(c => c.value === value)?.label ?? value
}

export default async function ContractorPortfolioPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'contractor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('portfolio_items')
    .select(`
      id, title, project_type, city, client_name, budget_xaf, completed_at, created_at,
      portfolio_images(url, is_cover, sort_order)
    `)
    .eq('professional_id', profile.id)
    .order('created_at', { ascending: false }) as { data: PortfolioRow[] | null }

  const portfolio = items ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
          <p className="text-sm text-muted-foreground">{portfolio.length} project{portfolio.length !== 1 ? 's' : ''}</p>
        </div>
        <LinkButton href="/contractor/portfolio/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </LinkButton>
      </div>

      {portfolio.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium mb-1">No portfolio projects yet</p>
          <p className="text-sm mb-4">
            Showcase your completed work to attract clients.
          </p>
          <LinkButton href="/contractor/portfolio/new">Add Your First Project</LinkButton>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map(item => {
            const cover = item.portfolio_images?.find(i => i.is_cover)?.url
              ?? item.portfolio_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url
            const photoCount = item.portfolio_images?.length ?? 0

            return (
              <div key={item.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                {/* Cover image */}
                <div className="relative aspect-video bg-muted">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {photoCount > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      {photoCount} photo{photoCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div>
                    <p className="font-semibold leading-tight line-clamp-2">{item.title}</p>
                    {item.project_type && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.project_type}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {cityLabel(item.city) && <span>{cityLabel(item.city)}</span>}
                    {item.client_name && <span>· {item.client_name}</span>}
                    {item.completed_at && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(item.completed_at)}
                      </span>
                    )}
                    {item.budget_xaf && (
                      <span>{formatXAF(item.budget_xaf)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t">
                    <Link
                      href={`/contractor/portfolio/${item.id}/edit`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Link>

                    <form
                      action={async () => {
                        'use server'
                        await deletePortfolioItem(item.id)
                      }}
                      className="ml-auto"
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e: React.MouseEvent) => {
                          if (!confirm('Delete this portfolio project? This cannot be undone.')) {
                            e.preventDefault()
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
