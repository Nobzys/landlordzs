import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Settings, ChevronLeft, Megaphone } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAnnouncement, toggleAnnouncement } from '@/lib/actions/announcements'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Platform Settings — Admin' }

type SettingRow = {
  key:         string
  value:       string
  type:        string
  description: string | null
  updated_at:  string | null
}

type AnnouncementRow = {
  id:         string
  title:      string
  body:       string
  type:       string
  audience:   string
  is_active:  boolean
  starts_at:  string
  ends_at:    string | null
  created_at: string
}

const ANNOUNCEMENT_TYPES = ['info', 'warning', 'maintenance', 'feature'] as const

const AUDIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',        label: 'All users' },
  { value: 'buyer',      label: 'Buyers' },
  { value: 'seller',     label: 'Sellers' },
  { value: 'agent',      label: 'Agents' },
  { value: 'vendor',     label: 'Vendors' },
  { value: 'contractor', label: 'Contractors' },
  { value: 'engineer',   label: 'Engineers' },
  { value: 'architect',  label: 'Architects' },
  { value: 'lawyer',     label: 'Lawyers' },
  { value: 'admin',      label: 'Administrators' },
  { value: 'moderator',  label: 'Moderators' },
]

const TYPE_BADGE: Record<string, string> = {
  info:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  warning:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  feature:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default async function AdminSettingsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('platform_settings')
    .select('key, value, type, description, updated_at')
    .order('key') as { data: SettingRow[] | null }

  const settings: SettingRow[] = raw ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: announcementsRaw } = await (adminClient as any)
    .from('announcements')
    .select('id, title, body, type, audience, is_active, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20) as { data: AnnouncementRow[] | null }

  const announcements: AnnouncementRow[] = announcementsRaw ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">Configure platform-wide behavior and fees</p>
          </div>
        </div>
      </div>

      {/* Platform settings */}
      {settings.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <p className="text-sm text-muted-foreground">No settings found. Run the seed migration to populate defaults.</p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {settings.map((s) => {
            const settingKey = s.key

            return (
              <div key={s.key} className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium font-mono">{s.key}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">Type: {s.type}</p>
                  </div>

                  <form
                    action={async (fd: FormData) => {
                      'use server'
                      const newValue = (fd.get('value') as string | null)?.trim()
                      if (newValue === null || newValue === undefined) return
                      const adminCl = createAdminClient()
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await (adminCl as any)
                        .from('platform_settings')
                        .update({ value: newValue, updated_at: new Date().toISOString() })
                        .eq('key', settingKey)
                      revalidatePath('/admin/settings')
                    }}
                    className="flex items-center gap-2 shrink-0"
                  >
                    {s.type === 'boolean' ? (
                      <select
                        name="value"
                        defaultValue={s.value}
                        className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        name="value"
                        defaultValue={s.value}
                        type={s.type === 'number' ? 'number' : 'text'}
                        step={s.type === 'number' ? 'any' : undefined}
                        className="w-36 rounded-md border px-3 py-1.5 text-sm bg-background
                          focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Announcements ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Announcements</h2>
            <p className="text-sm text-muted-foreground">Broadcast notices to specific user groups</p>
          </div>
        </div>

        {/* Create form */}
        <form action={async (fd: FormData) => {
          'use server'
          await createAnnouncement(fd)
        }} className="rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold">New Announcement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Scheduled maintenance this weekend"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Content *</label>
              <textarea
                name="body"
                required
                rows={3}
                maxLength={2000}
                placeholder="Describe the announcement in detail…"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                name="type"
                defaultValue="info"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Audience</label>
              <select
                name="audience"
                defaultValue="all"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Publish date (defaults to now)</label>
              <input
                name="starts_at"
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expiry date (optional)</label>
              <input
                name="ends_at"
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <Button type="submit" size="sm">Post Announcement</Button>
        </form>

        {/* List */}
        {announcements.length === 0 ? (
          <div className="rounded-xl border text-center py-12">
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border divide-y overflow-hidden">
            {announcements.map((a) => {
              const announcementId = a.id
              const isActive = a.is_active
              return (
                <div key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{a.title}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_BADGE[a.type] ?? ''}`}>
                          {a.type}
                        </span>
                        <Badge variant="secondary" className="text-xs capitalize">{a.audience}</Badge>
                        {a.is_active ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>
                      <p className="text-xs text-muted-foreground">
                        From {formatDate(a.starts_at)}
                        {a.ends_at ? ` · Expires ${formatDate(a.ends_at)}` : ' · No expiry'}
                        {' · Posted '}{formatDate(a.created_at)}
                      </p>
                    </div>
                    <form action={async () => {
                      'use server'
                      await toggleAnnouncement(announcementId, isActive)
                    }}>
                      <Button
                        type="submit"
                        size="sm"
                        variant={a.is_active ? 'outline' : 'default'}
                        className="shrink-0"
                      >
                        {a.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
