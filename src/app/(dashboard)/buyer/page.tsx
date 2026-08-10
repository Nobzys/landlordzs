import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Search, Wallet, User, Activity } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { ROLE_DASHBOARDS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { formatRelative, formatXAFShort } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Dashboard — Buyer' }

type FavoriteRow = {
  property_id: string
  created_at: string
  properties: {
    id: string
    title: string
    price: number
    city: string
    slug: string
    property_images: { url: string; order_index: number }[]
  } | null
}

type ActivityRow = {
  id: string
  action: string
  entity_type: string | null
  created_at: string
}

const QUICK_ACTIONS = [
  { label: 'Browse Properties', href: '/properties',      icon: Search },
  { label: 'Saved Properties',  href: '/buyer/favorites', icon: Heart },
  { label: 'Wallet',            href: '/account/wallet',  icon: Wallet },
  { label: 'My Profile',        href: '/account/profile', icon: User },
]

export default async function BuyerHomePage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'buyer') {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: favRaw } = await (supabase as any)
    .from('property_favorites')
    .select(`
      property_id,
      created_at,
      properties (
        id, title, price, city, slug,
        property_images ( url, order_index )
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(3) as { data: FavoriteRow[] | null }

  const favorites = (favRaw ?? []).filter((f) => f.properties !== null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: actRaw } = await (supabase as any)
    .from('activity_logs')
    .select('id, action, entity_type, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5) as { data: ActivityRow[] | null }

  const activities = actRaw ?? []

  const firstName = profile.full_name?.split(' ')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your buyer dashboard overview</p>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent saves */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Saves</h2>
            <Link href="/buyer/favorites" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {favorites.length === 0 ? (
            <div className="rounded-xl border text-center py-10">
              <Heart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No saved properties yet.</p>
              <Link href="/properties" className="text-xs text-primary hover:underline mt-1 inline-block">
                Browse properties
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {favorites.map((fav) => {
                const prop = fav.properties!
                const img = prop.property_images
                  ?.slice()
                  .sort((a, b) => a.order_index - b.order_index)[0]
                return (
                  <Link
                    key={fav.property_id}
                    href={`/properties/${prop.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative h-12 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                      {img ? (
                        <Image
                          src={img.url}
                          alt={prop.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                          <Heart className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{prop.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {prop.city} · {formatXAFShort(prop.price)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{formatRelative(fav.created_at)}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
          {activities.length === 0 ? (
            <div className="rounded-xl border text-center py-10">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            </div>
          ) : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {activities.map((act) => (
                <div key={act.id} className="flex items-center gap-3 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">
                      {act.action.replace(/_/g, ' ')}
                    </p>
                    {act.entity_type && (
                      <p className="text-xs text-muted-foreground capitalize">{act.entity_type}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(act.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
