import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BookmarkCheck, Bell, BellOff, Trash2 } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { deleteSavedSearch, toggleSearchAlert } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Saved Searches — Buyer' }

type SavedSearchRow = {
  id: string
  name: string
  search_type: string
  filters: Record<string, unknown>
  alert_email: boolean
  alert_push: boolean
  last_run_at: string | null
  result_count: number | null
  created_at: string
}

function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = []
  if (filters.city)          parts.push(String(filters.city))
  if (filters.listing_type)  parts.push(String(filters.listing_type).replace('_', ' '))
  if (filters.property_type) parts.push(String(filters.property_type).replace('_', ' '))
  if (filters.min_price)     parts.push(`From ${filters.min_price} XAF`)
  if (filters.max_price)     parts.push(`To ${filters.max_price} XAF`)
  if (filters.bedrooms)      parts.push(`${filters.bedrooms}+ beds`)
  return parts.length > 0 ? parts.join(' · ') : 'All properties'
}

export default async function SavedSearchesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'buyer') redirect('/login')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from('saved_searches')
    .select('id, name, search_type, filters, alert_email, alert_push, last_run_at, result_count, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false }) as { data: SavedSearchRow[] | null }

  const searches = raw ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookmarkCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Saved Searches</h1>
          <p className="text-sm text-muted-foreground">
            Your saved property searches and alert settings
          </p>
        </div>
      </div>

      {searches.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <BookmarkCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No saved searches</p>
          <p className="text-sm text-muted-foreground mt-1">
            Save a search from the property browse page to get alerts.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {searches.map((search) => {
            const searchId = search.id
            const alertEmail = search.alert_email

            return (
              <div key={search.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{search.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {filterSummary(search.filters)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>Saved {formatDate(search.created_at)}</span>
                      {search.last_run_at && (
                        <span>Last checked {formatDate(search.last_run_at)}</span>
                      )}
                      {search.result_count !== null && (
                        <span>{search.result_count} results</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <form
                      action={async () => {
                        'use server'
                        await toggleSearchAlert(searchId, alertEmail)
                      }}
                    >
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        title={search.alert_email ? 'Disable email alerts' : 'Enable email alerts'}
                      >
                        {search.alert_email ? (
                          <>
                            <Bell className="h-3.5 w-3.5 mr-1.5 text-primary" />
                            <span className="text-xs">Alerts on</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-xs">Alerts off</span>
                          </>
                        )}
                      </Button>
                    </form>

                    <form
                      action={async () => {
                        'use server'
                        await deleteSavedSearch(searchId)
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete saved search"
                      >
                        <Trash2 className="h-4 w-4" />
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
