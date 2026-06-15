import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, ChevronLeft } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { adminSuspendAccount, adminActivateAccount, adminAssignRole } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/types/auth'
import { formatRelative } from '@/lib/utils/format'
import type { UserRole } from '@/types/auth'
import type { ProfileRow } from '@/types/database'
import { canAccessAdmin } from '@/lib/roles'

export const metadata: Metadata = { title: 'User Management' }

const ALL_ROLES: UserRole[] = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer', 'admin',
]

const STATUS_OPTIONS = ['active', 'suspended', 'banned', 'pending_verification']

const STATUS_COLOR: Record<string, string> = {
  active:               'bg-green-100 text-green-700',
  suspended:            'bg-red-100 text-red-700',
  banned:               'bg-red-200 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-700',
}

interface SearchParams { role?: string; status?: string; page?: string }

const PAGE_SIZE = 25

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const params = await searchParams
  const roleFilter   = ALL_ROLES.includes(params.role as UserRole) ? params.role : undefined
  const statusFilter = STATUS_OPTIONS.includes(params.status ?? '') ? params.status : undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (roleFilter)   query = query.eq('role',           roleFilter)
  if (statusFilter) query = query.eq('account_status', statusFilter)

  const { data: rawUsers, count } = await (query as unknown as Promise<{
    data: ProfileRow[] | null
    count: number | null
  }>)

  const users = rawUsers ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams()
    const merged = { role: roleFilter, status: statusFilter, page: String(page), ...overrides }
    if (merged.role)   p.set('role',   merged.role)
    if (merged.status) p.set('status', merged.status)
    if (merged.page && merged.page !== '1') p.set('page', merged.page)
    const qs = p.toString()
    return `/admin/users${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">{count ?? 0} users total</p>
          </div>
        </div>
      </div>

      {/* Role filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ role: undefined, page: '1' })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            !roleFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent'
          }`}
        >
          All Roles
        </Link>
        {ALL_ROLES.map((r) => (
          <Link
            key={r}
            href={buildUrl({ role: r, page: '1' })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              roleFilter === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {ROLE_LABELS[r]}
          </Link>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ status: undefined, page: '1' })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
            !statusFilter
              ? 'bg-secondary text-secondary-foreground border-secondary'
              : 'hover:bg-accent'
          }`}
        >
          All Statuses
        </Link>
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, page: '1' })}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-secondary text-secondary-foreground border-secondary'
                : 'hover:bg-accent'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      {/* Users list */}
      <div className="rounded-xl border overflow-hidden">
        {users.length > 0 ? (
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {(u.full_name ?? u.email ?? '?')[0].toUpperCase()}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.full_name ?? u.display_name ?? 'Unnamed'}
                    {u.is_verified && (
                      <span className="ml-1.5 text-blue-600 text-xs">✓</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[u.role as UserRole] ?? u.role}
                  </Badge>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLOR[u.account_status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {u.account_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Created at */}
                <p className="text-xs text-muted-foreground shrink-0 hidden md:block w-24 text-right">
                  {formatRelative(u.created_at)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Role assignment */}
                  {u.id !== profile.id && (() => {
                    const userId = u.id
                    return (
                      <form
                        action={async (fd: FormData) => {
                          'use server'
                          const role = fd.get('role') as string
                          if (!role) return
                          await adminAssignRole(userId, role as import('@/types/auth').UserRole)
                        }}
                        className="flex items-center gap-1"
                      >
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded-md border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <Button type="submit" variant="outline" size="sm" className="text-xs px-2">
                          Assign
                        </Button>
                      </form>
                    )
                  })()}

                  {/* Suspend / Activate */}
                  {u.account_status === 'suspended' ? (
                    <form action={async () => {
                      'use server'
                      await adminActivateAccount(u.id)
                    }}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Activate
                      </Button>
                    </form>
                  ) : u.id !== profile.id ? (
                    <form action={async () => {
                      'use server'
                      await adminSuspendAccount(u.id, 'Admin action')
                    }}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Suspend
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users found matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl({ page: String(page - 1) })}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
