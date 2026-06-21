import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck, ChevronLeft, Search, CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getKycStatusCounts } from '@/lib/data/verifications'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatRelative } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

const KYC_LEVELS = ['basic', 'standard', 'enhanced'] as const

export const metadata: Metadata = { title: 'Verification Center — Admin' }

const STATUS_TABS = ['pending', 'approved', 'rejected', 'needs_more_info'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const STATUS_LABEL: Record<StatusTab, string> = {
  pending:          'Pending',
  approved:         'Approved',
  rejected:         'Rejected',
  needs_more_info:  'Needs More Info',
}

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-blue-100 text-blue-700',
  approved:         'bg-emerald-100 text-emerald-700',
  rejected:         'bg-red-100 text-red-700',
  needs_more_info:  'bg-amber-100 text-amber-700',
}

const VERIFIABLE_ROLES: UserRole[] = ['seller', 'vendor', 'agent', 'contractor', 'engineer', 'architect', 'lawyer']

const PAGE_SIZE = 25

type Row = {
  id:           string
  status:       string
  level:        string
  submitted_at: string | null
  created_at:   string
  profiles: {
    id:            string
    full_name:     string | null
    display_name:  string | null
    email:         string
    avatar_url:    string | null
    role:          string
    city:          string | null
    is_verified:   boolean
    verified_at:   string | null
  }
}

interface SearchParams {
  status?: string
  role?: string
  city?: string
  level?: string
  q?: string
  from?: string
  to?: string
  page?: string
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const status: StatusTab = STATUS_TABS.includes(params.status as StatusTab) ? (params.status as StatusTab) : 'pending'
  const roleFilter = VERIFIABLE_ROLES.includes(params.role as UserRole) ? (params.role as UserRole) : undefined
  const cityFilter = CAMEROON_CITIES.some((c) => c.value === params.city) ? params.city : undefined
  const levelFilter = (KYC_LEVELS as readonly string[]).includes(params.level ?? '') ? params.level : undefined
  const q = params.q?.trim() || undefined
  const dateFrom = params.from?.trim() || undefined
  const dateTo = params.to?.trim() || undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q2: any) {
    let query = q2.eq('status', status)
    if (roleFilter) query = query.eq('profiles.role', roleFilter)
    if (cityFilter) query = query.eq('profiles.city', cityFilter)
    if (levelFilter) query = query.eq('level', levelFilter)
    if (dateFrom) query = query.gte('submitted_at', `${dateFrom}T00:00:00Z`)
    if (dateTo) query = query.lte('submitted_at', `${dateTo}T23:59:59Z`)
    if (q) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(q)
      const orParts = [`full_name.ilike.%${q}%`, `email.ilike.%${q}%`]
      if (isUuid) orParts.push(`id.eq.${q}`)
      query = query.or(orParts.join(','), { foreignTable: 'profiles' })
    }
    return query
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count } = await applyFilters(
    (adminClient as any)
      .from('kyc_records')
      .select(
        `id, status, level, submitted_at, created_at,
         profiles!kyc_records_user_id_fkey!inner ( id, full_name, display_name, email, avatar_url, role, city, is_verified, verified_at )`,
        { count: 'exact' }
      )
  )
    .order('submitted_at', { ascending: status === 'pending' })
    .range(from, to) as { data: Row[] | null; count: number | null }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // Counts per status (unfiltered by role/city/search, just for the tab badges).
  // Same helper the admin dashboard's pending-verifications tile uses, so the
  // two can never show different numbers for the same thing.
  const counts: Record<StatusTab, number> = await getKycStatusCounts()

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { status, role: roleFilter, city: cityFilter, level: levelFilter, q, from: dateFrom, to: dateTo, page: String(page), ...overrides }
    const p = new URLSearchParams()
    if (merged.status && merged.status !== 'pending') p.set('status', merged.status)
    if (merged.role) p.set('role', merged.role)
    if (merged.city) p.set('city', merged.city)
    if (merged.level) p.set('level', merged.level)
    if (merged.q) p.set('q', merged.q)
    if (merged.from) p.set('from', merged.from)
    if (merged.to) p.set('to', merged.to)
    if (merged.page && merged.page !== '1') p.set('page', merged.page)
    const qs = p.toString()
    return `/admin/verifications${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verification Center</h1>
            <p className="text-sm text-muted-foreground">{count ?? 0} {STATUS_LABEL[status].toLowerCase()} request{count === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, page: '1' })}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              status === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            }`}
          >
            {STATUS_LABEL[s]}
            {counts[s] > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {counts[s] > 9 ? '9+' : counts[s]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <form className="rounded-xl border p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="status" value={status} />
        <div className="relative lg:col-span-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search name, email, or user ID"
            className="w-full rounded-md border pl-8 pr-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select name="role" defaultValue={roleFilter ?? ''} className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All roles</option>
          {VERIFIABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select name="city" defaultValue={cityFilter ?? ''} className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All cities</option>
          {CAMEROON_CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select name="level" defaultValue={levelFilter ?? ''} className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All verification types</option>
          {KYC_LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" name="from" defaultValue={dateFrom ?? ''} className="w-full rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" name="to" defaultValue={dateTo ?? ''} className="w-full rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2 lg:col-span-5">
          <Button type="submit" size="sm">Apply Filters</Button>
          {(roleFilter || cityFilter || levelFilter || q || dateFrom || dateTo) && (
            <LinkButton href={buildUrl({ role: undefined, city: undefined, level: undefined, q: undefined, from: undefined, to: undefined, page: '1' })} variant="ghost" size="sm">
              Clear
            </LinkButton>
          )}
        </div>
      </form>

      {/* List */}
      {!rows || rows.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground">No {STATUS_LABEL[status].toLowerCase()} verification requests</p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {rows.map((row) => {
            const p = row.profiles
            const displayName = p.full_name?.trim() || p.display_name?.trim() || p.email?.trim() || 'Unnamed user'
            return (
              <Link
                key={row.id}
                href={`/admin/verifications/${row.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors flex-wrap sm:flex-nowrap"
              >
                <Avatar src={p.avatar_url} name={displayName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {displayName}
                    {p.is_verified && <span className="ml-1.5 text-blue-600 text-xs">✓ verified</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{ROLE_LABELS[p.role as UserRole] ?? p.role}</Badge>
                {p.city && <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{p.city}</span>}
                <span className={`inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {row.status === 'needs_more_info' ? <HelpCircle className="h-3 w-3 mr-1 inline" />
                    : row.status === 'approved' ? <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                    : row.status === 'rejected' ? <XCircle className="h-3 w-3 mr-1 inline" />
                    : <Clock className="h-3 w-3 mr-1 inline" />}
                  {STATUS_LABEL[row.status as StatusTab] ?? row.status}
                </span>
                <p className="text-xs text-muted-foreground shrink-0 hidden sm:block w-24 text-right">
                  {row.submitted_at ? formatRelative(row.submitted_at) : '—'}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <LinkButton href={buildUrl({ page: String(page - 1) })} variant="outline" size="sm">Previous</LinkButton>
            )}
            {page < totalPages && (
              <LinkButton href={buildUrl({ page: String(page + 1) })} variant="outline" size="sm">Next</LinkButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
