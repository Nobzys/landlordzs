import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Settings, ChevronLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { canAccessAdmin } from '@/lib/roles'

export const metadata: Metadata = { title: 'Platform Settings — Admin' }

type SettingRow = {
  key:         string
  value:       string
  type:        string
  description: string | null
  updated_at:  string | null
}

export default async function AdminSettingsPage() {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('platform_settings')
    .select('key, value, type, description, updated_at')
    .order('key') as { data: SettingRow[] | null }

  const settings: SettingRow[] = raw ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
    </div>
  )
}
