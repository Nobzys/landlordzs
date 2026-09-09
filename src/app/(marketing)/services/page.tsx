import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Home Services — LandLordz',
  description: 'Find trusted service providers across Cameroon — cleaning, plumbing, electrical, security, and more.',
}

// Fallback emoji icons keyed by category slug
const CATEGORY_ICONS: Record<string, string> = {
  cleaning:        '🧹',
  plumbing:        '🔧',
  electrical:      '⚡',
  landscaping:     '🌳',
  security:        '🔒',
  construction:    '🏗️',
  interior_design: '🛋️',
  architecture:    '📐',
  legal_services:  '⚖️',
  surveying:       '📏',
}

const DEFAULT_ICON = '🔨'

type CategoryRow = {
  id:          string
  name:        string
  slug:        string
  icon:        string | null
  description: string | null
}

export default async function ServicesHubPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, name, slug, icon, description')
    .eq('is_active', true)
    .order('sort_order') as { data: CategoryRow[] | null }

  const cats = categories ?? []

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#1a0505] py-14 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold text-white">Home Services</h1>
          <p className="text-white/80 max-w-xl text-lg">
            Find trusted professionals for cleaning, repairs, security, landscaping, and more across Cameroon.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/services/requests/new"
              className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Post a Request
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services/requests"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Browse Requests
            </Link>
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {cats.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Service categories are coming soon.
          </p>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cats.map(cat => {
                const icon = cat.icon || CATEGORY_ICONS[cat.slug] || DEFAULT_ICON
                return (
                  <Link
                    key={cat.id}
                    href={`/services/${cat.slug}`}
                    className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-5 hover:border-[#B71C1C]/40 hover:shadow-sm transition-all text-center"
                  >
                    <span className="text-4xl" aria-hidden="true">{icon}</span>
                    <span className="text-sm font-semibold leading-tight group-hover:text-[#B71C1C] transition-colors">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                        {cat.description}
                      </span>
                    )}
                  </Link>
                )
              })}

              {/* "All Services" tile */}
              <Link
                href="/services/requests"
                className="group flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-5 hover:bg-muted/50 transition-all text-center"
              >
                <span className="text-4xl" aria-hidden="true">📋</span>
                <span className="text-sm font-semibold leading-tight group-hover:text-[#B71C1C] transition-colors">
                  All Requests
                </span>
                <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                  Browse open service requests
                </span>
              </Link>
            </div>
          </>
        )}

        {/* How it works */}
        <div className="mt-16 border-t pt-12">
          <h2 className="text-xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Choose a Category', desc: 'Browse service providers by category or post a request directly.' },
              { step: '2', title: 'Receive Quotations', desc: 'Professionals review your request and send you competitive quotations.' },
              { step: '3', title: 'Hire & Get It Done', desc: 'Accept the best offer, confirm the contract, and get the work done.' },
            ].map(s => (
              <div key={s.step} className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] flex items-center justify-center text-xl font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className="mt-12 rounded-xl bg-[#1a0505] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <p className="text-white font-semibold text-lg">Need a service done?</p>
            <p className="text-white/70 text-sm">Post a request and let professionals come to you.</p>
          </div>
          <Link
            href="/services/requests/new"
            className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-6 py-3 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <ClipboardList className="h-4 w-4" />
            Post a Service Request
          </Link>
        </div>
      </div>
    </main>
  )
}
